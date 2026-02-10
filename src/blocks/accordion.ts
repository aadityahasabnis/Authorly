/**
 * Accordion Block (Collapsible content)
 */

import type { BlockDefinition, AccordionData } from '../core/types';
import { generateId } from '../utils/helpers';

export const accordionBlock: BlockDefinition = {
  name: 'accordion',
  tag: 'details',
  editable: true,
  allowedChildren: ['text', 'inline', 'block'],
  className: 'cb-accordion',
  icon: 'chevronDown',
  label: 'Accordion',

  create(data?: AccordionData): HTMLElement {
    const details = document.createElement('details');
    details.className = 'cb-accordion';
    details.setAttribute('data-block-id', data?.id || generateId());
    details.setAttribute('data-block-type', 'accordion');
    
    if (data?.open) {
      details.open = true;
    }

    // Summary (title)
    const summary = document.createElement('summary');
    summary.className = 'cb-accordion-title';
    
    const titleText = document.createElement('span');
    titleText.className = 'cb-accordion-title-text';
    titleText.setAttribute('contenteditable', 'true');
    titleText.setAttribute('data-placeholder', 'Accordion title...');
    if (data?.title) {
      titleText.textContent = data.title;
    }
    
    const chevron = document.createElement('span');
    chevron.className = 'cb-accordion-chevron';
    chevron.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    `;
    
    // CRITICAL FIX: Prevent summary default toggle behavior when clicking/typing in title text
    // The summary element has special browser behavior that intercepts clicks and keys
    summary.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Only prevent default if clicking on title text (allow chevron to work)
      if (target.closest('.cb-accordion-title-text')) {
        e.preventDefault();
      }
    });
    
    summary.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      // Prevent space/enter from toggling when in title text
      if (target.closest('.cb-accordion-title-text') && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        // For space, manually insert it
        if (e.key === ' ') {
          document.execCommand('insertText', false, ' ');
        }
      }
    });
    
    // Handle chevron click to toggle accordion
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      details.open = !details.open;
    });
    
    summary.appendChild(titleText);
    summary.appendChild(chevron);
    details.appendChild(summary);

    // Content
    const content = document.createElement('div');
    content.className = 'cb-accordion-content';
    content.setAttribute('contenteditable', 'true');
    content.setAttribute('data-placeholder', 'Accordion content...');
    if (data?.content) {
      content.innerHTML = data.content;
    }
    details.appendChild(content);

    return details;
  },

  getData(element: HTMLElement): AccordionData {
    const details = element as HTMLDetailsElement;
    const title = element.querySelector('.cb-accordion-title-text');
    const content = element.querySelector('.cb-accordion-content');
    
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'accordion',
      title: title?.textContent || '',
      content: content?.innerHTML || '',
      open: details.open,
    };
  },

  update(element: HTMLElement, data: Partial<AccordionData>): void {
    const details = element as HTMLDetailsElement;
    
    if (data.title !== undefined) {
      const title = element.querySelector('.cb-accordion-title-text');
      if (title) title.textContent = data.title;
    }
    if (data.content !== undefined) {
      const content = element.querySelector('.cb-accordion-content');
      if (content) content.innerHTML = data.content;
    }
    if (data.open !== undefined) {
      details.open = data.open;
    }
  },
};

/**
 * Toggle accordion open/closed
 */
export function toggleAccordion(element: HTMLElement): boolean {
  const details = element as HTMLDetailsElement;
  details.open = !details.open;
  return details.open;
}

/**
 * Set accordion open state
 */
export function setAccordionOpen(element: HTMLElement, open: boolean): void {
  const details = element as HTMLDetailsElement;
  details.open = open;
}
