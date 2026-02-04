/**
 * List Blocks (Bullet, Numbered, Checklist)
 */

import type { BlockDefinition, ListData, ListItem, BlockType } from '../core/types';
import { generateId } from '../utils/helpers';

type ListType = 'bulletList' | 'numberedList' | 'checkList';

function createListItemElement(item: ListItem, type: ListType): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'cb-list-item';
  li.setAttribute('data-item-id', item.id);

  if (type === 'checkList') {
    // Create checkbox wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'cb-checklist-wrapper';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'cb-checkbox';
    checkbox.checked = item.checked || false;
    checkbox.setAttribute('tabindex', '-1');

    const content = document.createElement('span');
    content.className = 'cb-checklist-content';
    content.setAttribute('contenteditable', 'true');
    content.innerHTML = item.content;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(content);
    li.appendChild(wrapper);

    if (item.checked) {
      li.classList.add('cb-checked');
    }
  } else {
    li.setAttribute('contenteditable', 'true');
    li.innerHTML = item.content;
  }

  // Handle nested items
  if (item.children && item.children.length > 0) {
    const nestedList = document.createElement(type === 'numberedList' ? 'ol' : 'ul');
    nestedList.className = `cb-nested-list cb-${type}`;
    item.children.forEach(child => {
      nestedList.appendChild(createListItemElement(child, type));
    });
    li.appendChild(nestedList);
  }

  return li;
}

function parseListItems(listElement: HTMLElement, type: ListType): ListItem[] {
  const items: ListItem[] = [];
  
  listElement.querySelectorAll(':scope > li').forEach(li => {
    const item: ListItem = {
      id: li.getAttribute('data-item-id') || generateId(),
      content: '',
      checked: false,
      children: [],
    };

    if (type === 'checkList') {
      const checkbox = li.querySelector('.cb-checkbox') as HTMLInputElement;
      const content = li.querySelector('.cb-checklist-content');
      item.checked = checkbox?.checked || false;
      item.content = content?.innerHTML || '';
    } else {
      // Get direct text content, excluding nested lists
      const clone = li.cloneNode(true) as HTMLElement;
      const nestedList = clone.querySelector('ul, ol');
      if (nestedList) nestedList.remove();
      item.content = clone.innerHTML;
    }

    // Parse nested list
    const nestedList = li.querySelector(':scope > ul, :scope > ol');
    if (nestedList) {
      item.children = parseListItems(nestedList as HTMLElement, type);
    }

    items.push(item);
  });

  return items;
}

function createListBlock(type: ListType): BlockDefinition {
  const tag = type === 'numberedList' ? 'ol' : 'ul';
  const name = type as BlockType;
  
  return {
    name,
    tag,
    editable: true,
    allowedChildren: ['text', 'inline', 'block'],
    className: `cb-list cb-${type}`,
    icon: type === 'bulletList' ? 'list' : type === 'numberedList' ? 'listOrdered' : 'checkList',
    label: type === 'bulletList' ? 'Bullet List' : type === 'numberedList' ? 'Numbered List' : 'Checklist',
    shortcut: type === 'bulletList' ? 'Ctrl+Shift+8' : type === 'numberedList' ? 'Ctrl+Shift+7' : undefined,

    create(data?: ListData): HTMLElement {
      const list = document.createElement(tag);
      list.className = `cb-list cb-${type}`;
      list.setAttribute('data-block-id', data?.id || generateId());
      list.setAttribute('data-block-type', type);

      if (data?.items && data.items.length > 0) {
        data.items.forEach(item => {
          list.appendChild(createListItemElement(item, type));
        });
      } else {
        // Create default empty item
        const defaultItem: ListItem = {
          id: generateId(),
          content: '',
          checked: false,
        };
        list.appendChild(createListItemElement(defaultItem, type));
      }

      return list;
    },

    getData(element: HTMLElement): ListData {
      return {
        id: element.getAttribute('data-block-id') || generateId(),
        type,
        items: parseListItems(element, type),
      };
    },

    update(element: HTMLElement, data: Partial<ListData>): void {
      if (data.items) {
        element.innerHTML = '';
        data.items.forEach(item => {
          element.appendChild(createListItemElement(item, type));
        });
      }
    },
  };
}

// Export list blocks
export const bulletListBlock = createListBlock('bulletList');
export const numberedListBlock = createListBlock('numberedList');
export const checkListBlock = createListBlock('checkList');

/**
 * Add item to list
 */
export function addListItem(
  listElement: HTMLElement,
  afterItemId?: string,
  content = ''
): ListItem {
  const type = listElement.getAttribute('data-block-type') as ListType;
  const item: ListItem = {
    id: generateId(),
    content,
    checked: false,
  };

  const li = createListItemElement(item, type);

  if (afterItemId) {
    const afterLi = listElement.querySelector(`[data-item-id="${afterItemId}"]`);
    if (afterLi && afterLi.parentElement === listElement) {
      afterLi.after(li);
    } else {
      listElement.appendChild(li);
    }
  } else {
    listElement.appendChild(li);
  }

  // Focus the new item
  const editable = type === 'checkList' 
    ? li.querySelector('.cb-checklist-content')
    : li;
  if (editable instanceof HTMLElement) {
    editable.focus();
  }

  return item;
}

/**
 * Remove item from list
 */
export function removeListItem(listElement: HTMLElement, itemId: string): boolean {
  const li = listElement.querySelector(`[data-item-id="${itemId}"]`);
  if (!li) return false;

  const items = listElement.querySelectorAll(':scope > li');
  if (items.length <= 1) {
    // Don't remove last item, just clear it
    const content = li.querySelector('.cb-checklist-content') || li;
    if (content instanceof HTMLElement) {
      content.innerHTML = '';
    }
    return false;
  }

  li.remove();
  return true;
}

/**
 * Toggle checkbox in checklist
 */
export function toggleChecklistItem(li: HTMLElement): boolean {
  const checkbox = li.querySelector('.cb-checkbox') as HTMLInputElement;
  if (!checkbox) return false;

  checkbox.checked = !checkbox.checked;
  li.classList.toggle('cb-checked', checkbox.checked);
  return checkbox.checked;
}

/**
 * Indent list item (create nested list)
 */
export function indentListItem(li: HTMLElement): boolean {
  const prevLi = li.previousElementSibling as HTMLElement;
  if (!prevLi) return false;

  const listElement = li.parentElement;
  if (!listElement) return false;

  const type = listElement.getAttribute('data-block-type') as ListType;
  const tag = type === 'numberedList' ? 'ol' : 'ul';

  // Check if prev item already has a nested list
  let nestedList = prevLi.querySelector(`:scope > ${tag}`) as HTMLElement;
  if (!nestedList) {
    nestedList = document.createElement(tag);
    nestedList.className = `cb-nested-list cb-${type}`;
    prevLi.appendChild(nestedList);
  }

  nestedList.appendChild(li);
  return true;
}

/**
 * Outdent list item (move to parent list)
 */
export function outdentListItem(li: HTMLElement): boolean {
  const parentList = li.parentElement;
  if (!parentList || !parentList.classList.contains('cb-nested-list')) {
    return false;
  }

  const parentLi = parentList.parentElement;
  if (!parentLi) return false;

  const grandparentList = parentLi.parentElement;
  if (!grandparentList) return false;

  // Move li after its parent li
  grandparentList.insertBefore(li, parentLi.nextSibling);

  // Remove empty nested list
  if (parentList.children.length === 0) {
    parentList.remove();
  }

  return true;
}
