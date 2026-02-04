/**
 * Drag & Drop - Block reordering functionality
 */

import { getBlockFromChild } from '../utils/helpers';

export interface DragState {
  isDragging: boolean;
  draggedElement: HTMLElement | null;
  placeholder: HTMLElement | null;
  startY: number;
  currentY: number;
  scrollInterval: number | null;
}

export interface DragDropOptions {
  container: HTMLElement;
  handleSelector?: string;
  onDragStart?: (element: HTMLElement) => void;
  onDragMove?: (element: HTMLElement, targetElement: HTMLElement | null, position: 'before' | 'after') => void;
  onDragEnd?: (element: HTMLElement, newIndex: number) => void;
  onDragCancel?: () => void;
}

const SCROLL_THRESHOLD = 50;
const SCROLL_SPEED = 10;

/**
 * Initialize drag and drop for blocks
 */
export function initDragDrop(options: DragDropOptions) {
  const { container, handleSelector = '[data-drag-handle]' } = options;
  
  let state: DragState = {
    isDragging: false,
    draggedElement: null,
    placeholder: null,
    startY: 0,
    currentY: 0,
    scrollInterval: null,
  };

  // Create placeholder element
  function createPlaceholder(): HTMLElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'cb-drag-placeholder';
    placeholder.style.cssText = `
      height: 4px;
      background: var(--cb-primary, #3b82f6);
      border-radius: 2px;
      margin: 4px 0;
      transition: opacity 0.2s;
    `;
    return placeholder;
  }

  // Get all blocks
  function getBlocks(): HTMLElement[] {
    return Array.from(container.querySelectorAll('[data-block-id]')) as HTMLElement[];
  }

  // Find drop target
  function findDropTarget(y: number): { element: HTMLElement | null; position: 'before' | 'after' } {
    const blocks = getBlocks().filter(b => b !== state.draggedElement);
    
    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (y < midY) {
        return { element: block, position: 'before' };
      }
    }

    const lastBlock = blocks[blocks.length - 1];
    return { element: lastBlock || null, position: 'after' };
  }

  // Update placeholder position
  function updatePlaceholder(target: HTMLElement | null, position: 'before' | 'after') {
    if (!state.placeholder || !target) return;

    if (position === 'before') {
      target.parentNode?.insertBefore(state.placeholder, target);
    } else {
      target.parentNode?.insertBefore(state.placeholder, target.nextSibling);
    }
  }

  // Auto scroll when near edges
  function handleAutoScroll(clientY: number) {
    const containerRect = container.getBoundingClientRect();
    
    if (state.scrollInterval) {
      clearInterval(state.scrollInterval);
      state.scrollInterval = null;
    }

    if (clientY < containerRect.top + SCROLL_THRESHOLD) {
      // Scroll up
      state.scrollInterval = window.setInterval(() => {
        container.scrollTop -= SCROLL_SPEED;
      }, 16);
    } else if (clientY > containerRect.bottom - SCROLL_THRESHOLD) {
      // Scroll down
      state.scrollInterval = window.setInterval(() => {
        container.scrollTop += SCROLL_SPEED;
      }, 16);
    }
  }

  // Handle drag start
  function handleDragStart(e: MouseEvent | TouchEvent) {
    const target = e.target as HTMLElement;
    const handle = target.closest(handleSelector);
    
    if (!handle) return;

    const block = getBlockFromChild(handle);
    if (!block) return;

    e.preventDefault();
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    state = {
      ...state,
      isDragging: true,
      draggedElement: block,
      placeholder: createPlaceholder(),
      startY: clientY,
      currentY: clientY,
    };

    // Style dragged element
    block.style.opacity = '0.5';
    block.style.pointerEvents = 'none';
    
    // Add placeholder
    block.parentNode?.insertBefore(state.placeholder!, block.nextSibling);
    
    // Add document listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);

    options.onDragStart?.(block);
  }

  // Handle drag move
  function handleDragMove(e: MouseEvent | TouchEvent) {
    if (!state.isDragging || !state.draggedElement) return;

    e.preventDefault();
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    state.currentY = clientY;

    // Auto scroll
    handleAutoScroll(clientY);

    // Find and update drop target
    const { element, position } = findDropTarget(clientY);
    updatePlaceholder(element, position);

    options.onDragMove?.(state.draggedElement, element, position);
  }

  // Handle drag end
  function handleDragEnd(e: MouseEvent | TouchEvent) {
    if (!state.isDragging || !state.draggedElement) {
      cleanup();
      return;
    }

    const { element, position } = findDropTarget(state.currentY);

    // Move element to new position
    if (element && state.placeholder?.parentNode) {
      state.placeholder.parentNode.insertBefore(
        state.draggedElement,
        state.placeholder
      );
    }

    // Calculate new index
    const blocks = getBlocks();
    const newIndex = blocks.indexOf(state.draggedElement);

    // Reset styles
    state.draggedElement.style.opacity = '';
    state.draggedElement.style.pointerEvents = '';

    options.onDragEnd?.(state.draggedElement, newIndex);

    cleanup();
  }

  // Cleanup
  function cleanup() {
    // Remove placeholder
    state.placeholder?.remove();
    
    // Clear scroll interval
    if (state.scrollInterval) {
      clearInterval(state.scrollInterval);
    }

    // Remove listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);

    // Reset state
    state = {
      isDragging: false,
      draggedElement: null,
      placeholder: null,
      startY: 0,
      currentY: 0,
      scrollInterval: null,
    };
  }

  // Add container listeners
  container.addEventListener('mousedown', handleDragStart);
  container.addEventListener('touchstart', handleDragStart, { passive: false });

  // Return cleanup function
  return () => {
    container.removeEventListener('mousedown', handleDragStart);
    container.removeEventListener('touchstart', handleDragStart);
    cleanup();
  };
}

/**
 * Create a drag handle element
 */
export function createDragHandle(): HTMLElement {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'cb-drag-handle';
  handle.setAttribute('data-drag-handle', 'true');
  handle.setAttribute('tabindex', '-1');
  handle.setAttribute('aria-label', 'Drag to reorder');
  handle.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="3" r="1.5"/>
      <circle cx="11" cy="3" r="1.5"/>
      <circle cx="5" cy="8" r="1.5"/>
      <circle cx="11" cy="8" r="1.5"/>
      <circle cx="5" cy="13" r="1.5"/>
      <circle cx="11" cy="13" r="1.5"/>
    </svg>
  `;
  return handle;
}

/**
 * Check if drag and drop is supported
 */
export function isDragDropSupported(): boolean {
  return 'draggable' in document.createElement('div');
}
