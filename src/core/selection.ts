/**
 * Selection Utilities - DOM-based selection handling
 */

import { getBlockFromChild } from '../utils/helpers';

export interface SelectionState {
  range: Range | null;
  anchorNode: Node | null;
  focusNode: Node | null;
  anchorOffset: number;
  focusOffset: number;
  isCollapsed: boolean;
  block: HTMLElement | null;
}

/**
 * Get current selection state
 */
export function getSelectionState(): SelectionState {
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    return {
      range: null,
      anchorNode: null,
      focusNode: null,
      anchorOffset: 0,
      focusOffset: 0,
      isCollapsed: true,
      block: null,
    };
  }

  const range = selection.getRangeAt(0);
  const block = getBlockFromChild(range.commonAncestorContainer);

  return {
    range: range.cloneRange(),
    anchorNode: selection.anchorNode,
    focusNode: selection.focusNode,
    anchorOffset: selection.anchorOffset,
    focusOffset: selection.focusOffset,
    isCollapsed: selection.isCollapsed,
    block,
  };
}

/**
 * Save selection state
 */
export function saveSelection(): SelectionState {
  return getSelectionState();
}

/**
 * Restore selection from state
 */
export function restoreSelection(state: SelectionState): boolean {
  if (!state.range) return false;

  try {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(state.range);
      return true;
    }
  } catch {
    // Range might be invalid
  }
  return false;
}

/**
 * Get selected text
 */
export function getSelectedText(): string {
  const selection = window.getSelection();
  return selection?.toString() || '';
}

/**
 * Get selected HTML
 */
export function getSelectedHtml(): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';

  const range = selection.getRangeAt(0);
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  return container.innerHTML;
}

/**
 * Check if selection is within element
 */
export function isSelectionInElement(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  return element.contains(range.commonAncestorContainer);
}

/**
 * Check if selection spans multiple blocks
 */
export function isMultiBlockSelection(container: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const startBlock = getBlockFromChild(range.startContainer);
  const endBlock = getBlockFromChild(range.endContainer);

  return startBlock !== endBlock;
}

/**
 * Select all content in element
 */
export function selectAllInElement(element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Collapse selection to start
 */
export function collapseToStart(): void {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    selection.collapseToStart();
  }
}

/**
 * Collapse selection to end
 */
export function collapseToEnd(): void {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    selection.collapseToEnd();
  }
}

/**
 * Set cursor position at offset in element
 */
export function setCursorPosition(
  element: HTMLElement,
  offset: number
): boolean {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const nodeLength = node.textContent?.length || 0;
    
    if (currentOffset + nodeLength >= offset) {
      const range = document.createRange();
      range.setStart(node, offset - currentOffset);
      range.collapse(true);

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
    }
    currentOffset += nodeLength;
  }

  return false;
}

/**
 * Get cursor offset in element
 */
export function getCursorOffset(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  return preCaretRange.toString().length;
}

/**
 * Check if cursor is at start of element
 */
export function isCursorAtStart(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;

  // Check if at very start
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  return preCaretRange.toString().length === 0;
}

/**
 * Check if cursor is at end of element
 */
export function isCursorAtEnd(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;

  // Check if at very end
  const postCaretRange = range.cloneRange();
  postCaretRange.selectNodeContents(element);
  postCaretRange.setStart(range.endContainer, range.endOffset);

  return postCaretRange.toString().length === 0;
}

/**
 * Move cursor to start of element
 */
export function moveCursorToStart(element: HTMLElement): void {
  const range = document.createRange();
  const selection = window.getSelection();

  // Find first text node or use element itself
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  const firstTextNode = walker.nextNode();

  if (firstTextNode) {
    range.setStart(firstTextNode, 0);
  } else {
    range.setStart(element, 0);
  }
  range.collapse(true);

  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Move cursor to end of element
 */
export function moveCursorToEnd(element: HTMLElement): void {
  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(false);

  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Wrap selection with element
 */
export function wrapSelection(tagName: string, attributes?: Record<string, string>): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const wrapper = document.createElement(tagName);

  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      wrapper.setAttribute(key, value);
    }
  }

  try {
    range.surroundContents(wrapper);
    return wrapper;
  } catch {
    // Cannot wrap - selection spans multiple elements
    // Extract contents and wrap them
    const contents = range.extractContents();
    wrapper.appendChild(contents);
    range.insertNode(wrapper);
    return wrapper;
  }
}

/**
 * Unwrap element (replace with its contents)
 */
export function unwrapElement(element: HTMLElement): void {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

/**
 * Find all elements of type within selection
 */
export function findElementsInSelection(
  tagName: string,
  container: HTMLElement
): HTMLElement[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return [];

  const range = selection.getRangeAt(0);
  const elements: HTMLElement[] = [];

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (node instanceof HTMLElement && node.tagName.toLowerCase() === tagName.toLowerCase()) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    }
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node instanceof HTMLElement && range.intersectsNode(node)) {
      elements.push(node);
    }
  }

  return elements;
}
