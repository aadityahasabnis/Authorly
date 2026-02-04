/**
 * Heading Block (H1-H6)
 */

import type { BlockDefinition, HeadingData, HeadingLevel } from '../core/types';
import { generateId } from '../utils/helpers';

function createHeadingBlock(defaultLevel: HeadingLevel): BlockDefinition {
  return {
    name: 'heading',
    tag: `h${defaultLevel}`,
    editable: true,
    allowedChildren: ['text', 'inline'],
    className: `cb-heading cb-h${defaultLevel}`,
    icon: `heading${defaultLevel}`,
    label: defaultLevel === 1 ? 'Title' : `Heading ${defaultLevel}`,
    shortcut: `Ctrl+${defaultLevel}`,

    create(data?: HeadingData): HTMLElement {
      // Use level from data if provided, otherwise use default
      const level = data?.level || defaultLevel;
      const tag = `h${level}` as const;
      
      const heading = document.createElement(tag);
      heading.className = `cb-heading cb-h${level}`;
      heading.setAttribute('contenteditable', 'true');
      heading.setAttribute('data-block-id', data?.id || generateId());
      heading.setAttribute('data-block-type', 'heading');
      heading.setAttribute('data-heading-level', String(level));
      
      if (data?.content) {
        heading.innerHTML = data.content;
      }
      
      if (data?.align) {
        heading.style.textAlign = data.align;
      }

      if (!data?.content) {
        heading.setAttribute('data-placeholder', level === 1 ? 'Title' : `Heading ${level}`);
      }

      return heading;
    },

    getData(element: HTMLElement): HeadingData {
      const levelAttr = element.getAttribute('data-heading-level');
      return {
        id: element.getAttribute('data-block-id') || generateId(),
        type: 'heading',
        level: (levelAttr ? parseInt(levelAttr, 10) : defaultLevel) as HeadingLevel,
        content: element.innerHTML,
        align: element.style.textAlign as HeadingData['align'],
      };
    },

    update(element: HTMLElement, data: Partial<HeadingData>): void {
      if (data.content !== undefined) {
        element.innerHTML = data.content;
      }
      if (data.align) {
        element.style.textAlign = data.align;
      }
      if (data.level && data.level !== defaultLevel) {
        // Need to transform to different heading level
        element.setAttribute('data-heading-level', String(data.level));
      }
    },
  };
}

// Export individual heading levels
export const heading1Block = createHeadingBlock(1);
export const heading2Block = createHeadingBlock(2);
export const heading3Block = createHeadingBlock(3);
export const heading4Block = createHeadingBlock(4);
export const heading5Block = createHeadingBlock(5);
export const heading6Block = createHeadingBlock(6);

// Factory function for creating heading blocks
export function createHeading(level: HeadingLevel, data?: Partial<HeadingData>): HTMLElement {
  const block = createHeadingBlock(level);
  return block.create({ ...data, level, type: 'heading' } as HeadingData);
}
