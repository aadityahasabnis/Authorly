/**
 * Callout Block (Info/Warning/Error/Success boxes)
 */

import type { BlockDefinition, CalloutData, CalloutType } from '../core/types';
import { generateId } from '../utils/helpers';

// Icons from Lucide (https://lucide.dev)
const CALLOUT_ICONS: Record<CalloutType, string> = {
  // Info icon (lucide Info)
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  // AlertTriangle icon (lucide AlertTriangle)
  warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  // CircleX icon (lucide CircleX)
  error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  // CircleCheck icon (lucide CircleCheck)
  success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  // Lightbulb icon (lucide Lightbulb)
  note: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
};

export const calloutBlock: BlockDefinition = {
  name: 'callout',
  tag: 'aside',
  editable: true,
  allowedChildren: ['text', 'inline'],
  className: 'cb-callout',
  icon: 'alertCircle',
  label: 'Callout',

  create(data?: CalloutData): HTMLElement {
    const calloutType = data?.calloutType || 'info';
    
    const aside = document.createElement('aside');
    aside.className = `cb-callout cb-callout-${calloutType}`;
    aside.setAttribute('data-block-id', data?.id || generateId());
    aside.setAttribute('data-block-type', 'callout');
    aside.setAttribute('data-callout-type', calloutType);

    // Icon
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'cb-callout-icon';
    iconWrapper.innerHTML = CALLOUT_ICONS[calloutType];
    aside.appendChild(iconWrapper);

    // Content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'cb-callout-content';

    // Title (optional)
    if (data?.title) {
      const title = document.createElement('div');
      title.className = 'cb-callout-title';
      title.setAttribute('contenteditable', 'true');
      title.textContent = data.title;
      contentWrapper.appendChild(title);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'cb-callout-body';
    body.setAttribute('contenteditable', 'true');
    body.setAttribute('data-placeholder', 'Type callout content...');
    if (data?.content) {
      body.innerHTML = data.content;
    }
    contentWrapper.appendChild(body);

    aside.appendChild(contentWrapper);

    // Type selector (hidden by default, shown on focus)
    const typeSelector = document.createElement('div');
    typeSelector.className = 'cb-callout-type-selector';
    typeSelector.innerHTML = `
      <button type="button" data-type="info" title="Info" class="${calloutType === 'info' ? 'active' : ''}">
        ${CALLOUT_ICONS.info}
      </button>
      <button type="button" data-type="success" title="Success" class="${calloutType === 'success' ? 'active' : ''}">
        ${CALLOUT_ICONS.success}
      </button>
      <button type="button" data-type="warning" title="Warning" class="${calloutType === 'warning' ? 'active' : ''}">
        ${CALLOUT_ICONS.warning}
      </button>
      <button type="button" data-type="error" title="Error" class="${calloutType === 'error' ? 'active' : ''}">
        ${CALLOUT_ICONS.error}
      </button>
      <button type="button" data-type="note" title="Note" class="${calloutType === 'note' ? 'active' : ''}">
        ${CALLOUT_ICONS.note}
      </button>
    `;
    aside.appendChild(typeSelector);

    return aside;
  },

  getData(element: HTMLElement): CalloutData {
    const title = element.querySelector('.cb-callout-title');
    const body = element.querySelector('.cb-callout-body');
    
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'callout',
      calloutType: (element.getAttribute('data-callout-type') || 'info') as CalloutType,
      title: title?.textContent || undefined,
      content: body?.innerHTML || '',
    };
  },

  update(element: HTMLElement, data: Partial<CalloutData>): void {
    if (data.calloutType) {
      setCalloutType(element, data.calloutType);
    }
    if (data.title !== undefined) {
      let title = element.querySelector('.cb-callout-title');
      if (data.title) {
        if (!title) {
          title = document.createElement('div');
          title.className = 'cb-callout-title';
          title.setAttribute('contenteditable', 'true');
          const content = element.querySelector('.cb-callout-content');
          const body = element.querySelector('.cb-callout-body');
          if (content && body) {
            content.insertBefore(title, body);
          }
        }
        title.textContent = data.title;
      } else if (title) {
        title.remove();
      }
    }
    if (data.content !== undefined) {
      const body = element.querySelector('.cb-callout-body');
      if (body) {
        body.innerHTML = data.content;
      }
    }
  },
};

/**
 * Set callout type
 */
export function setCalloutType(element: HTMLElement, type: CalloutType): void {
  // Update class
  element.className = `cb-callout cb-callout-${type}`;
  element.setAttribute('data-callout-type', type);

  // Update icon
  const icon = element.querySelector('.cb-callout-icon');
  if (icon) {
    icon.innerHTML = CALLOUT_ICONS[type];
  }

  // Update type selector
  const selector = element.querySelector('.cb-callout-type-selector');
  if (selector) {
    selector.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });
  }
}

/**
 * Add title to callout
 */
export function addCalloutTitle(element: HTMLElement, text: string): void {
  let title = element.querySelector('.cb-callout-title');
  if (!title) {
    title = document.createElement('div');
    title.className = 'cb-callout-title';
    title.setAttribute('contenteditable', 'true');
    const content = element.querySelector('.cb-callout-content');
    const body = element.querySelector('.cb-callout-body');
    if (content && body) {
      content.insertBefore(title, body);
    }
  }
  title.textContent = text;
}
