/**
 * Commands - DOM-based editing commands
 */

import type { EditorInstance, InlineFormat, BlockType } from './types';
import { blockRegistry } from './block-registry';
import {
  getSelectionState,
  wrapSelection,
  unwrapElement,
  findElementsInSelection,
  moveCursorToEnd,
  moveCursorToStart,
} from './selection';
import { getBlockFromChild, insertAfter, insertBefore } from '../utils/helpers';

// Inline format tag mappings
const FORMAT_TAGS: Record<InlineFormat, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strikethrough: 's',
  code: 'code',
  link: 'a',
  textColor: 'span',
  highlight: 'mark',
};

/**
 * Check if a format is active at current selection
 */
export function isFormatActive(format: InlineFormat, container: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;

  // Walk up to find format tag
  const tag = FORMAT_TAGS[format].toUpperCase();
  while (node && node !== container) {
    if (node instanceof HTMLElement && node.tagName === tag) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}

/**
 * Toggle inline format
 */
export function toggleFormat(
  format: InlineFormat,
  container: HTMLElement,
  attributes?: Record<string, string>
): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const tag = FORMAT_TAGS[format];
  const isActive = isFormatActive(format, container);

  if (selection.isCollapsed) {
    // No selection - just return, can't format nothing
    return;
  }

  if (isActive) {
    // Remove format
    const elements = findElementsInSelection(tag, container);
    elements.forEach(el => unwrapElement(el));
  } else {
    // Apply format
    wrapSelection(tag, attributes);
  }
}

/**
 * Apply bold format
 */
export function toggleBold(container: HTMLElement): void {
  // Try execCommand first (better cross-browser support)
  document.execCommand('bold', false);
}

/**
 * Apply italic format
 */
export function toggleItalic(container: HTMLElement): void {
  document.execCommand('italic', false);
}

/**
 * Apply underline format
 */
export function toggleUnderline(container: HTMLElement): void {
  document.execCommand('underline', false);
}

/**
 * Apply strikethrough format
 */
export function toggleStrikethrough(container: HTMLElement): void {
  document.execCommand('strikeThrough', false);
}

/**
 * Apply inline code format
 */
export function toggleInlineCode(container: HTMLElement): void {
  toggleFormat('code', container);
}

/**
 * Insert or edit link
 */
export function insertLink(container: HTMLElement, url: string, text?: string): void {
  const selection = window.getSelection();
  if (!selection) return;

  if (selection.isCollapsed && text) {
    // No selection, insert link with text
    const link = document.createElement('a');
    link.href = url;
    link.textContent = text;
    
    const range = selection.getRangeAt(0);
    range.insertNode(link);
    
    // Move cursor after link
    const newRange = document.createRange();
    newRange.setStartAfter(link);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  } else {
    // Wrap selection in link
    document.execCommand('createLink', false, url);
  }
}

/**
 * Remove link
 */
export function removeLink(container: HTMLElement): void {
  document.execCommand('unlink', false);
}

/**
 * Set text color
 */
export function setTextColor(container: HTMLElement, color: string): void {
  document.execCommand('foreColor', false, color);
}

/**
 * Set background/highlight color
 */
export function setHighlightColor(container: HTMLElement, color: string): void {
  document.execCommand('hiliteColor', false, color);
}

/**
 * Set text alignment
 */
export function setAlignment(
  element: HTMLElement,
  align: 'left' | 'center' | 'right' | 'justify'
): void {
  element.style.textAlign = align;
}

/**
 * Clear all formatting
 */
export function clearFormatting(container: HTMLElement): void {
  document.execCommand('removeFormat', false);
}

/**
 * Insert a new block
 */
export function insertBlock(
  container: HTMLElement,
  type: BlockType,
  position?: 'before' | 'after',
  referenceBlock?: HTMLElement
): HTMLElement | null {
  const block = blockRegistry.createBlock(type);
  if (!block) return null;

  if (referenceBlock) {
    if (position === 'before') {
      insertBefore(block, referenceBlock);
    } else {
      insertAfter(block, referenceBlock);
    }
  } else {
    container.appendChild(block);
  }

  // Focus the new block
  const editableChild = block.querySelector('[contenteditable="true"]') || 
    (block.hasAttribute('contenteditable') ? block : null);
  
  if (editableChild instanceof HTMLElement) {
    editableChild.focus();
    moveCursorToStart(editableChild);
  }

  return block;
}

/**
 * Delete a block
 */
export function deleteBlock(block: HTMLElement, container: HTMLElement): HTMLElement | null {
  const blocks = Array.from(container.querySelectorAll('[data-block-id]'));
  const index = blocks.indexOf(block);
  
  // Find block to focus after deletion
  const prevBlock = blocks[index - 1] as HTMLElement | undefined;
  const nextBlock = blocks[index + 1] as HTMLElement | undefined;
  
  // Remove the block
  block.remove();

  // Focus adjacent block
  const targetBlock = nextBlock || prevBlock;
  if (targetBlock) {
    const editableChild = targetBlock.querySelector('[contenteditable="true"]') || 
      (targetBlock.hasAttribute('contenteditable') ? targetBlock : null);
    
    if (editableChild instanceof HTMLElement) {
      editableChild.focus();
      if (!nextBlock) {
        moveCursorToEnd(editableChild);
      } else {
        moveCursorToStart(editableChild);
      }
    }
  }

  // If no blocks left, create a default block
  if (blocks.length <= 1) {
    const defaultBlock = blockRegistry.createBlock(blockRegistry.getDefaultBlock());
    if (defaultBlock) {
      container.appendChild(defaultBlock);
      return defaultBlock;
    }
  }

  return targetBlock || null;
}

/**
 * Move block up
 */
export function moveBlockUp(block: HTMLElement, container: HTMLElement): boolean {
  const prevSibling = block.previousElementSibling;
  if (prevSibling && prevSibling instanceof HTMLElement) {
    container.insertBefore(block, prevSibling);
    return true;
  }
  return false;
}

/**
 * Move block down
 */
export function moveBlockDown(block: HTMLElement, container: HTMLElement): boolean {
  const nextSibling = block.nextElementSibling;
  if (nextSibling && nextSibling instanceof HTMLElement) {
    container.insertBefore(nextSibling, block);
    return true;
  }
  return false;
}

/**
 * Duplicate a block
 */
export function duplicateBlock(block: HTMLElement): HTMLElement {
  const clone = block.cloneNode(true) as HTMLElement;
  
  // Generate new ID
  const newId = `cb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  clone.setAttribute('data-block-id', newId);
  
  insertAfter(clone, block);
  return clone;
}

/**
 * Transform block to different type
 */
export function transformBlock(
  block: HTMLElement,
  newType: BlockType,
  container: HTMLElement
): HTMLElement | null {
  const newBlock = blockRegistry.transformBlock(block, newType);
  if (!newBlock) return null;

  // Replace old block with new one
  block.parentNode?.replaceChild(newBlock, block);

  // Focus new block
  const editableChild = newBlock.querySelector('[contenteditable="true"]') || 
    (newBlock.hasAttribute('contenteditable') ? newBlock : null);
  
  if (editableChild instanceof HTMLElement) {
    editableChild.focus();
  }

  return newBlock;
}

/**
 * Merge two blocks
 */
export function mergeBlocks(
  sourceBlock: HTMLElement,
  targetBlock: HTMLElement
): void {
  const sourceContent = sourceBlock.innerHTML;
  
  // Append content to target
  const targetEditable = targetBlock.querySelector('[contenteditable="true"]') || targetBlock;
  if (targetEditable instanceof HTMLElement) {
    targetEditable.innerHTML += sourceContent;
    moveCursorToEnd(targetEditable);
  }

  // Remove source block
  sourceBlock.remove();
}

/**
 * Split block at cursor position
 */
export function splitBlock(
  block: HTMLElement,
  container: HTMLElement
): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  
  // Create range for content after cursor
  const afterRange = document.createRange();
  afterRange.setStart(range.endContainer, range.endOffset);
  afterRange.setEndAfter(block.lastChild || block);
  
  // Extract content after cursor
  const afterContent = afterRange.extractContents();
  
  // Create new block with after content
  const blockType = blockRegistry.getBlockType(block) || 'paragraph';
  const newBlock = blockRegistry.createBlock(blockType);
  
  if (!newBlock) return null;

  const newEditable = newBlock.querySelector('[contenteditable="true"]') || newBlock;
  if (newEditable instanceof HTMLElement) {
    newEditable.appendChild(afterContent);
  }

  // Insert new block after current
  insertAfter(newBlock, block);

  // Focus new block
  if (newEditable instanceof HTMLElement) {
    newEditable.focus();
    moveCursorToStart(newEditable);
  }

  return newBlock;
}

/**
 * Indent block (for lists)
 */
export function indentBlock(block: HTMLElement): boolean {
  const blockType = blockRegistry.getBlockType(block);
  if (blockType !== 'bulletList' && blockType !== 'numberedList') {
    return false;
  }

  // Add margin or wrap in nested list
  const currentMargin = parseInt(block.style.marginLeft || '0', 10);
  block.style.marginLeft = `${currentMargin + 24}px`;
  return true;
}

/**
 * Outdent block (for lists)
 */
export function outdentBlock(block: HTMLElement): boolean {
  const blockType = blockRegistry.getBlockType(block);
  if (blockType !== 'bulletList' && blockType !== 'numberedList') {
    return false;
  }

  const currentMargin = parseInt(block.style.marginLeft || '0', 10);
  if (currentMargin > 0) {
    block.style.marginLeft = `${Math.max(0, currentMargin - 24)}px`;
    return true;
  }
  return false;
}

/**
 * Create command executor
 */
export function createCommandExecutor(editor: EditorInstance) {
  return {
    bold: () => toggleBold(editor.container),
    italic: () => toggleItalic(editor.container),
    underline: () => toggleUnderline(editor.container),
    strikethrough: () => toggleStrikethrough(editor.container),
    inlineCode: () => toggleInlineCode(editor.container),
    link: (url: string, text?: string) => insertLink(editor.container, url, text),
    unlink: () => removeLink(editor.container),
    textColor: (color: string) => setTextColor(editor.container, color),
    highlight: (color: string) => setHighlightColor(editor.container, color),
    clearFormat: () => clearFormatting(editor.container),
    alignLeft: (el: HTMLElement) => setAlignment(el, 'left'),
    alignCenter: (el: HTMLElement) => setAlignment(el, 'center'),
    alignRight: (el: HTMLElement) => setAlignment(el, 'right'),
    alignJustify: (el: HTMLElement) => setAlignment(el, 'justify'),
    insertBlock: (type: BlockType, pos?: 'before' | 'after', ref?: HTMLElement) =>
      insertBlock(editor.container, type, pos, ref),
    deleteBlock: (block: HTMLElement) => deleteBlock(block, editor.container),
    moveUp: (block: HTMLElement) => moveBlockUp(block, editor.container),
    moveDown: (block: HTMLElement) => moveBlockDown(block, editor.container),
    duplicate: (block: HTMLElement) => duplicateBlock(block),
    transform: (block: HTMLElement, type: BlockType) =>
      transformBlock(block, type, editor.container),
    merge: (source: HTMLElement, target: HTMLElement) => mergeBlocks(source, target),
    split: (block: HTMLElement) => splitBlock(block, editor.container),
    indent: (block: HTMLElement) => indentBlock(block),
    outdent: (block: HTMLElement) => outdentBlock(block),
  };
}
