/**
 * Divider Block (Horizontal Rule)
 */

import type { BlockDefinition, DividerData } from '../core/types';
import { generateId } from '../utils/helpers';

export const dividerBlock: BlockDefinition = {
  name: 'divider',
  tag: 'hr',
  editable: false,
  allowedChildren: [],
  className: 'cb-divider',
  icon: 'minus',
  label: 'Divider',
  shortcut: 'Ctrl+Shift+-',

  create(data?: DividerData): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cb-divider-wrapper';
    wrapper.setAttribute('data-block-id', data?.id || generateId());
    wrapper.setAttribute('data-block-type', 'divider');
    wrapper.setAttribute('contenteditable', 'false');

    const hr = document.createElement('hr');
    hr.className = 'cb-divider';
    
    if (data?.style) {
      hr.setAttribute('data-style', data.style);
      wrapper.setAttribute('data-divider-style', data.style);
    }

    wrapper.appendChild(hr);
    return wrapper;
  },

  getData(element: HTMLElement): DividerData {
    const hr = element.querySelector('hr');
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'divider',
      style: (hr?.getAttribute('data-style') || element.getAttribute('data-divider-style') || 'solid') as DividerData['style'],
    };
  },

  update(element: HTMLElement, data: Partial<DividerData>): void {
    if (data.style) {
      const hr = element.querySelector('hr');
      if (hr) {
        hr.setAttribute('data-style', data.style);
      }
      element.setAttribute('data-divider-style', data.style);
    }
  },
};

/**
 * Set divider style
 */
export function setDividerStyle(wrapper: HTMLElement, style: 'solid' | 'dashed' | 'dotted'): void {
  const hr = wrapper.querySelector('hr');
  if (hr) {
    hr.setAttribute('data-style', style);
  }
  wrapper.setAttribute('data-divider-style', style);
}
