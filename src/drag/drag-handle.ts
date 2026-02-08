/**
 * Drag & Drop - Block reordering functionality
 */

import { getBlockFromChild } from '../utils/helpers';

export interface DragState {
  isDragging: boolean;
  draggedElement: HTMLElement | null;
  draggedElements: HTMLElement[]; // For group dragging
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
  getSelectedBlocks?: () => HTMLElement[]; // Get currently selected blocks for group drag
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
    draggedElements: [],
    placeholder: null,
    startY: 0,
    currentY: 0,
    scrollInterval: null,
  };

  // Create placeholder element - ALWAYS a thin 4px blue line
  function createPlaceholder(): HTMLElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'cb-drag-placeholder';
    // Force inline styles with !important to override any CSS
    placeholder.style.height = '4px';
    placeholder.style.minHeight = '4px';
    placeholder.style.maxHeight = '4px';
    placeholder.style.lineHeight = '4px';
    placeholder.style.fontSize = '0';
    placeholder.style.overflow = 'hidden';
    placeholder.style.display = 'block';
    placeholder.style.background = 'var(--cb-primary, #3b82f6)';
    placeholder.style.borderRadius = '2px';
    placeholder.style.margin = '4px 0';
    placeholder.style.padding = '0';
    placeholder.style.border = 'none';
    placeholder.style.transition = 'opacity 0.2s';
    placeholder.style.pointerEvents = 'none';
    placeholder.style.flex = 'none';
    placeholder.style.flexShrink = '0';
    placeholder.style.flexGrow = '0';
    return placeholder;
  }

  // Get all blocks
  function getBlocks(): HTMLElement[] {
    return Array.from(container.querySelectorAll('[data-block-id]')) as HTMLElement[];
  }

  // Find drop target
  function findDropTarget(y: number): { element: HTMLElement | null; position: 'before' | 'after' } {
    // Exclude dragged elements from potential drop targets
    const blocks = getBlocks().filter(b => 
      !state.draggedElements.includes(b) && b !== state.draggedElement
    );
    
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

    // Allow Shift+Click through for multi-selection (don't start drag)
    if ('shiftKey' in e && e.shiftKey) {
      return;
    }

    const block = getBlockFromChild(handle);
    if (!block) return;

    e.preventDefault();
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Check if dragging a selected block (for group drag)
    const selectedBlocks = options.getSelectedBlocks?.() || [];
    const blockId = block.getAttribute('data-block-id');
    const isDraggingSelectedBlock = selectedBlocks.some(b => 
      b.getAttribute('data-block-id') === blockId
    );
    
    let draggedElements: HTMLElement[] = [];
    
    if (isDraggingSelectedBlock && selectedBlocks.length > 1) {
      // Group drag: drag all selected blocks together
      console.log('🎯 Group drag: dragging', selectedBlocks.length, 'selected blocks');
      
      // Sort selected blocks by their DOM order to maintain sequence
      const allBlocks = getBlocks();
      draggedElements = selectedBlocks.sort((a, b) => {
        return allBlocks.indexOf(a) - allBlocks.indexOf(b);
      });
      
      console.log('📋 Blocks to drag in order:', draggedElements.map(el => el.getAttribute('data-block-id')));
    } else {
      // Single block drag
      draggedElements = [block];
      console.log('📦 Single block drag:', blockId);
    }

    state = {
      ...state,
      isDragging: true,
      draggedElement: block,
      draggedElements,
      placeholder: createPlaceholder(),
      startY: clientY,
      currentY: clientY,
    };

    // Style all dragged elements
    draggedElements.forEach((el, idx) => {
      el.style.opacity = '0.5';
      el.style.pointerEvents = 'none';
      console.log(`  ${idx + 1}. Styling block:`, el.getAttribute('data-block-id'));
    });
    
    // Add placeholder after the last dragged element
    const lastElement = draggedElements[draggedElements.length - 1];
    lastElement.parentNode?.insertBefore(state.placeholder!, lastElement.nextSibling);
    
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

    console.log('🎯 Drag end - analyzing drop position');
    console.log('  Blocks to move:', state.draggedElements.map(el => el.getAttribute('data-block-id')));

    // Check if we're doing a group drag
    const isGroupDrag = state.draggedElements.length > 1;
    
    if (isGroupDrag && state.placeholder?.parentNode) {
      // For group drag, check if placeholder would split selected blocks
      // Get ALL children (including placeholder) - not just blocks with data-block-id
      const allChildren = Array.from(state.placeholder.parentNode.children) as HTMLElement[];
      
      // Find where the placeholder is in ALL children
      const placeholderIndex = allChildren.indexOf(state.placeholder);
      
      console.log('  📍 Placeholder at index:', placeholderIndex, 'of', allChildren.length, 'children');
      
      // Get the elements immediately before and after the placeholder
      const beforeElement = allChildren[placeholderIndex - 1];
      const afterElement = allChildren[placeholderIndex + 1]; // Skip placeholder itself
      
      // Check if BOTH neighbors are in the dragged selection
      // This detects if we're trying to split a contiguous group
      const beforeIsDragged = beforeElement && state.draggedElements.includes(beforeElement);
      const afterIsDragged = afterElement && state.draggedElements.includes(afterElement);
      
      console.log('  📊 Before placeholder:', beforeElement?.getAttribute('data-block-id'), 'isDragged:', beforeIsDragged);
      console.log('  📊 After placeholder:', afterElement?.getAttribute('data-block-id'), 'isDragged:', afterIsDragged);
      
      if (beforeIsDragged && afterIsDragged) {
        console.log('  ⚠️ Cannot split selected blocks - canceling drag');
        
        // Reset styles without moving
        state.draggedElements.forEach(el => {
          el.style.opacity = '';
          el.style.pointerEvents = '';
        });
        
        // Remove placeholder
        if (state.placeholder) {
          state.placeholder.remove();
          state.placeholder = null;
        }
        
        cleanup();
        return; // Don't move blocks or save to history
      }
      
      console.log('  ✅ Valid drop position - moving all blocks');
    }

    // Move all dragged elements to new position as a group
    if (state.placeholder?.parentNode) {
      const placeholderParent = state.placeholder.parentNode;
      
      console.log('  Inserting blocks before placeholder...');
      
      // Create a document fragment to hold all blocks in order
      const fragment = document.createDocumentFragment();
      
      // Add all dragged elements to the fragment in the correct order
      state.draggedElements.forEach((draggedEl, idx) => {
        fragment.appendChild(draggedEl);
        console.log(`    ${idx + 1}. Added to fragment:`, draggedEl.getAttribute('data-block-id'));
      });
      
      // Insert the entire fragment at once before the placeholder
      // This maintains the order and inserts all blocks together
      placeholderParent.insertBefore(fragment, state.placeholder);
      
      console.log('✅ All blocks moved successfully (maintaining order)');
    }

    // Calculate new index
    const blocks = getBlocks();
    const newIndex = blocks.indexOf(state.draggedElement);
    console.log('📍 New index:', newIndex);

    // Reset styles for all dragged elements
    state.draggedElements.forEach(el => {
      el.style.opacity = '';
      el.style.pointerEvents = '';
    });

    // CRITICAL: Remove placeholder BEFORE calling onDragEnd
    // Otherwise the placeholder gets saved to undo/redo history!
    if (state.placeholder) {
      state.placeholder.remove();
      state.placeholder = null;
    }

    // Now safe to save history (placeholder is gone from DOM)
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
      draggedElements: [],
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
