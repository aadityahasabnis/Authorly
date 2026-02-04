/**
 * Paragraph Block
 */

import type { BlockDefinition, ParagraphData } from '../core/types';
import { generateId } from '../utils/helpers';

export const paragraphBlock: BlockDefinition = {
  name: 'paragraph',
  tag: 'p',
  editable: true,
  allowedChildren: ['text', 'inline'],
  className: 'cb-paragraph',
  icon: 'paragraph',
  label: 'Paragraph',
  shortcut: 'Ctrl+0',

  create(data?: ParagraphData): HTMLElement {
    const p = document.createElement('p');
    p.className = 'cb-paragraph';
    p.setAttribute('contenteditable', 'true');
    p.setAttribute('data-block-id', data?.id || generateId());
    p.setAttribute('data-block-type', 'paragraph');
    
    if (data?.content) {
      p.innerHTML = data.content;
    }
    
    if (data?.align) {
      p.style.textAlign = data.align;
    }
    
    if (data?.className) {
      p.className = `cb-paragraph ${data.className}`;
    }

    // Placeholder
    if (!data?.content) {
      p.setAttribute('data-placeholder', 'Type something...');
    }

    return p;
  },

  getData(element: HTMLElement): ParagraphData {
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'paragraph',
      content: element.innerHTML,
      align: element.style.textAlign as ParagraphData['align'],
      className: element.className,
    };
  },

  update(element: HTMLElement, data: Partial<ParagraphData>): void {
    if (data.content !== undefined) {
      element.innerHTML = data.content;
    }
    if (data.align) {
      element.style.textAlign = data.align;
    }
    if (data.className) {
      element.className = `cb-paragraph ${data.className}`;
    }
  },
};
