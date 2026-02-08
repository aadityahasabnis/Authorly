/**
 * ContentBlocksEditor - Main React Component
 * Complete rewrite with proper block handling
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import type {
  ContentBlocksEditorProps,
  EditorInstance,
  BlockType,
  BlockData,
  EditorState,
  InlineFormat,
} from '../core/types';
import { blockRegistry } from '../core/block-registry';
import { allBlocks } from '../blocks';
import { sanitizePaste } from '../paste/sanitize';
import { initDragDrop, createDragHandle } from '../drag/drag-handle';
import {
  isCursorAtStart,
  isCursorAtEnd,
  moveCursorToEnd,
  moveCursorToStart,
  getSelectionState,
} from '../core/selection';
import {
  generateId,
  debounce,
  countWords,
  countCharacters,
  getBlockFromChild,
} from '../utils/helpers';
import { Toolbar } from './Toolbar';
import { BlockMenu } from './BlockMenu';
import { StatusBar, calculateReadingTime } from './StatusBar';
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { addTableRow, addTableColumn, deleteTableRow, deleteTableColumn, getFocusedCell, getCellPosition } from '../blocks/table';
import { setImageSrc, createImageFromFile, setImageAlign, createCropModal } from '../blocks/image';
import { setVideoSrc } from '../blocks/video';
import { setCalloutType } from '../blocks/callout';

export interface EditorRef {
  getHTML: () => string;
  setHTML: (html: string) => void;
  getText: () => string;
  focus: () => void;
  blur: () => void;
  insertBlock: (type: BlockType, data?: Partial<BlockData>) => HTMLElement | null;
  getEditor: () => EditorInstance | null;
}

const ContentBlocksEditorInner: React.ForwardRefRenderFunction<
  EditorRef,
  ContentBlocksEditorProps
> = (props, ref) => {
  const {
    initialContent = '',
    blocks: enabledBlocks,
    placeholder = 'Type "/" for commands...',
    readOnly = false,
    classPrefix = 'cb',
    className = '',
    style,
    showToolbar = true,
    toolbarPosition = 'top',
    darkMode = false,
    autoFocus = false,
    spellCheck = true,
    onChange,
    onSave,
    onFocus,
    onBlur,
    onReady,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialContentLoadedRef = useRef(false); // Track if initial content was loaded
  const saveToHistoryImmediateRef = useRef<(() => void) | null>(null); // Ref for history save function
  
  // Enhanced history with cursor position tracking
  interface HistoryEntry {
    html: string;
    cursorPosition: {
      blockId: string | null;
      offset: number;
      isCollapsed: boolean;
    } | null;
    selectedBlockIds: string[]; // Track multi-block selection
  }
  
  const undoStackRef = useRef<HistoryEntry[]>([]); // Enhanced undo stack
  const redoStackRef = useRef<HistoryEntry[]>([]); // Enhanced redo stack
  const selectedBlockIdsRef = useRef<Set<string>>(new Set()); // Ref for current selection (avoids closure issues)
  const [isMounted, setIsMounted] = useState(false); // Track mount state for toolbar
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set()); // Multi-block selection
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ x: 0, y: 0 });
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0); // Force toolbar update on selection change
  const [editorState, setEditorState] = useState<EditorState>({
    blocks: [],
    activeBlock: null,
    selection: null,
    undoStack: [],
    redoStack: [],
    wordCount: 0,
    charCount: 0,
    isDirty: false,
  });

  // Register all blocks on mount
  useEffect(() => {
    allBlocks.forEach(block => {
      blockRegistry.register(block);
    });
  }, []);

  // Set mounted state after initial render to enable toolbar
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync selectedBlockIds ref with state (for drag-drop without re-init)
  useEffect(() => {
    selectedBlockIdsRef.current = selectedBlockIds;
  }, [selectedBlockIds]);

  // Track selection changes to update toolbar active states
  // HIGH-PRIORITY FIX (Bug #13): Use RAF throttling to prevent excessive re-renders during text selection
  useEffect(() => {
    let rafId: number | null = null;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 100; // Minimum 100ms between updates (10 FPS max)
    
    const handleSelectionChange = () => {
      // Throttle using RAF + time-based check for better performance
      if (rafId) return; // Already scheduled
      
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;
      
      if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
        // Schedule for later if updating too frequently
        rafId = requestAnimationFrame(() => {
          rafId = null;
          setTimeout(() => {
            lastUpdateTime = Date.now();
            // Only update if selection is within our editor
            const selection = window.getSelection();
            if (selection && contentRef.current?.contains(selection.anchorNode)) {
              setSelectionVersion(v => v + 1);
            }
          }, MIN_UPDATE_INTERVAL - timeSinceLastUpdate);
        });
      } else {
        // Update immediately if enough time has passed
        rafId = requestAnimationFrame(() => {
          rafId = null;
          lastUpdateTime = Date.now();
          // Only update if selection is within our editor
          const selection = window.getSelection();
          if (selection && contentRef.current?.contains(selection.anchorNode)) {
            setSelectionVersion(v => v + 1);
          }
        });
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Add visual feedback for selected blocks
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Remove all selection classes
    contentRef.current.querySelectorAll('.cb-block').forEach(block => {
      block.classList.remove('cb-block-selected');
    });
    
    // Add selection class to selected blocks
    selectedBlockIds.forEach(blockId => {
      const block = contentRef.current?.querySelector(`[data-block-id="${blockId}"]`);
      if (block) {
        block.classList.add('cb-block-selected');
      }
    });
  }, [selectedBlockIds]);

  // Create a block element with controls
  const createBlockWithControls = useCallback((type: BlockType, data?: Partial<BlockData>): HTMLElement => {
    const blockId = data?.id || generateId();
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'cb-block';
    wrapper.setAttribute('data-block-id', blockId);
    wrapper.setAttribute('data-block-type', type);

    // Create controls container
    const controls = document.createElement('div');
    controls.className = 'cb-block-controls';
    controls.innerHTML = `
      <button type="button" class="cb-block-btn cb-block-add" data-action="add" title="Add block below">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
      <button type="button" class="cb-block-btn cb-block-drag" data-drag-handle title="Drag to reorder">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
        </svg>
      </button>
    `;

    // Create actions container (right side)
    const actions = document.createElement('div');
    actions.className = 'cb-block-actions';
    actions.innerHTML = `
      <button type="button" class="cb-block-btn" data-action="moveup" title="Move up">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      </button>
      <button type="button" class="cb-block-btn" data-action="movedown" title="Move down">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      <button type="button" class="cb-block-btn cb-block-delete" data-action="delete" title="Delete block">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    `;

    // Create content wrapper
    const content = document.createElement('div');
    content.className = 'cb-block-content';

    // Create the actual block content
    const blockElement = blockRegistry.createBlock(type, { ...data, id: blockId } as BlockData);
    if (blockElement) {
      // Remove data attributes from inner element (they're on wrapper now)
      blockElement.removeAttribute('data-block-id');
      blockElement.removeAttribute('data-block-type');
      content.appendChild(blockElement);
    }

    wrapper.appendChild(controls);
    wrapper.appendChild(content);
    wrapper.appendChild(actions);

    return wrapper;
  }, []);

  // Initialize editor content (only on first mount, not on initialContent changes)
  useEffect(() => {
    if (!contentRef.current || initialContentLoadedRef.current) return;
    initialContentLoadedRef.current = true;
    
    contentRef.current.innerHTML = '';

    if (initialContent && initialContent.trim()) {
      // Parse HTML and create blocks
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = initialContent;

      Array.from(tempDiv.children).forEach(child => {
        if (child instanceof HTMLElement) {
          const blockType = detectBlockType(child);
          const blockData = extractBlockData(child, blockType);
          const block = createBlockWithControls(blockType, blockData);
          contentRef.current?.appendChild(block);
        }
      });
    }

    // Ensure at least one paragraph exists
    if (contentRef.current.children.length === 0) {
      const block = createBlockWithControls('paragraph');
      contentRef.current.appendChild(block);
    }

    updateState();
    
    // Save initial state to history (after a small delay to ensure everything is loaded)
    setTimeout(() => {
      if (saveToHistoryImmediateRef.current) {
        saveToHistoryImmediateRef.current();
      }
    }, 100);
    
    // Initialize drag and drop
    if (!readOnly && contentRef.current) {
      initDragDrop({
        container: contentRef.current,
        handleSelector: '[data-drag-handle]',
        getSelectedBlocks: () => {
          // Use ref instead of closure to get current selection
          // This avoids re-initializing drag system on every selection change
          if (!contentRef.current) return [];
          const allBlocks = Array.from(contentRef.current.querySelectorAll('.cb-block')) as HTMLElement[];
          return allBlocks.filter(block => {
            const blockId = block.getAttribute('data-block-id');
            return blockId && selectedBlockIdsRef.current.has(blockId);
          });
        },
        onDragEnd: () => {
          // DON'T clear selection - keep blocks selected after drag
          // The user may want to drag again or perform other operations
          
          // Save to history immediately after reordering blocks
          if (saveToHistoryImmediateRef.current) {
            saveToHistoryImmediateRef.current();
          }
          updateState();
          emitChange();
        },
      });
    }
  }, [readOnly]); // Only re-init when readOnly changes, not on every selection change

  // Auto focus
  useEffect(() => {
    if (autoFocus && contentRef.current) {
      setTimeout(() => {
        const firstEditable = contentRef.current?.querySelector('[contenteditable="true"]');
        if (firstEditable instanceof HTMLElement) {
          firstEditable.focus();
        }
      }, 100);
    }
  }, [autoFocus]);

  // Detect block type from HTML element
  const detectBlockType = (element: HTMLElement): BlockType => {
    const tag = element.tagName.toLowerCase();
    const className = element.className || '';
    
    switch (tag) {
      case 'h1': return 'heading';
      case 'h2': return 'heading';
      case 'h3': return 'heading';
      case 'h4': return 'heading';
      case 'h5': return 'heading';
      case 'h6': return 'heading';
      case 'ul':
        if (className.includes('checklist') || element.querySelector('input[type="checkbox"]')) {
          return 'checkList';
        }
        return 'bulletList';
      case 'ol': return 'numberedList';
      case 'blockquote': return 'quote';
      case 'pre': return 'code';
      case 'figure':
        if (element.querySelector('img')) return 'image';
        if (element.querySelector('video, iframe')) return 'video';
        return 'paragraph';
      case 'hr': return 'divider';
      case 'table': return 'table';
      case 'aside': return 'callout';
      case 'details': return 'accordion';
      case 'div':
        if (className.includes('code')) return 'code';
        if (className.includes('callout')) return 'callout';
        if (className.includes('divider')) return 'divider';
        if (className.includes('table')) return 'table';
        if (className.includes('link-preview')) return 'linkPreview';
        return 'paragraph';
      default:
        return 'paragraph';
    }
  };

  // Extract block data from HTML element
  const extractBlockData = (element: HTMLElement, type: BlockType): Partial<BlockData> => {
    const data: any = { type };
    
    // CRITICAL FIX (Bug #17): Never preserve data-block-id from pasted content
    // Always generate fresh IDs to prevent duplicates
    // The 'id' field will be auto-generated by createBlockWithControls
    
    switch (type) {
      case 'heading':
        const level = parseInt(element.tagName.charAt(1)) || 2;
        data.level = level;
        data.content = element.innerHTML;
        break;
      case 'paragraph':
        data.content = element.innerHTML;
        break;
      case 'bulletList':
      case 'numberedList':
      case 'checkList':
        const items: any[] = [];
        element.querySelectorAll(':scope > li').forEach(li => {
          items.push({
            id: generateId(), // Fresh ID for each list item
            content: li.innerHTML,
            checked: li.querySelector('input[type="checkbox"]')?.hasAttribute('checked'),
          });
        });
        data.items = items;
        break;
      case 'quote':
        data.content = element.innerHTML;
        break;
      case 'code':
        const code = element.querySelector('code') || element;
        data.content = code.textContent || '';
        data.language = element.getAttribute('data-language') || 'plaintext';
        break;
      case 'image':
        const img = element.querySelector('img');
        data.src = img?.src || '';
        data.alt = img?.alt || '';
        data.caption = element.querySelector('figcaption')?.textContent || '';
        break;
      case 'divider':
        data.style = 'solid';
        break;
      case 'callout':
        data.calloutType = element.getAttribute('data-callout-type') || 'info';
        data.content = element.querySelector('.cb-callout-body')?.innerHTML || element.innerHTML;
        break;
      case 'accordion':
        data.title = element.querySelector('summary')?.textContent || '';
        data.content = element.querySelector('.cb-accordion-content')?.innerHTML || '';
        data.open = (element as HTMLDetailsElement).open;
        break;
      case 'table':
        // Parse table structure
        const rows: any[] = [];
        element.querySelectorAll('tr').forEach(tr => {
          const cells: any[] = [];
          tr.querySelectorAll('th, td').forEach(cell => {
            cells.push({ content: cell.innerHTML });
          });
          rows.push({ cells });
        });
        data.rows = rows;
        break;
      case 'linkPreview':
        data.url = element.getAttribute('data-url') || '';
        break;
    }
    
    // CRITICAL FIX (Bug #17): Explicitly exclude any data-block-id that might have been in the element
    // This ensures we never copy IDs from pasted content
    return data;
  };

  /**
   * Get full editor state HTML (internal use for undo/redo)
   * Includes block IDs and structure
   */
  const getEditorStateHTML = useCallback((): string => {
    if (!contentRef.current) return '';
    return contentRef.current.innerHTML;
  }, []);
  
  /**
   * Set full editor state HTML (internal use for undo/redo)
   * Preserves block IDs and structure
   */
  const setEditorStateHTML = useCallback((html: string): void => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = html;
  }, []);

  // Get clean HTML output (no editor artifacts)
  const getHTML = useCallback((): string => {
    if (!contentRef.current) return '';
    
    let html = '';
    
    contentRef.current.querySelectorAll('.cb-block').forEach(wrapper => {
      const type = wrapper.getAttribute('data-block-type') as BlockType;
      const content = wrapper.querySelector('.cb-block-content');
      
      if (!content) return;
      
      // Get the actual content element
      const blockElement = content.firstElementChild as HTMLElement;
      if (!blockElement) return;
      
      // Clone and clean
      const clone = blockElement.cloneNode(true) as HTMLElement;
      
      // Remove editor-specific attributes and elements
      clone.removeAttribute('data-placeholder');
      clone.removeAttribute('contenteditable');
      clone.querySelectorAll('[data-placeholder]').forEach(el => el.removeAttribute('data-placeholder'));
      clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      clone.querySelectorAll('.cb-code-toolbar, .cb-image-controls, .cb-table-controls, .cb-callout-type-selector').forEach(el => el.remove());
      
      // Special handling for different block types
      switch (type) {
        case 'code':
          const codeEl = clone.querySelector('code');
          const preEl = clone.querySelector('pre');
          if (codeEl && preEl) {
            const lang = clone.getAttribute('data-language') || 'plaintext';
            html += `<pre data-language="${lang}"><code>${codeEl.textContent}</code></pre>\n`;
          } else {
            html += clone.outerHTML + '\n';
          }
          break;
        case 'divider':
          html += '<hr>\n';
          break;
        default:
          html += clone.outerHTML + '\n';
      }
    });
    
    return html.trim();
  }, []);

  // Set HTML content
  const setHTML = useCallback((html: string, restoreFocus: boolean = false): void => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    Array.from(tempDiv.children).forEach(child => {
      if (child instanceof HTMLElement) {
        const blockType = detectBlockType(child);
        const blockData = extractBlockData(child, blockType);
        const block = createBlockWithControls(blockType, blockData);
        contentRef.current?.appendChild(block);
      }
    });

    if (contentRef.current.children.length === 0) {
      const block = createBlockWithControls('paragraph');
      contentRef.current.appendChild(block);
    }

    // Restore focus to first editable element if requested
    if (restoreFocus) {
      setTimeout(() => {
        const firstEditable = contentRef.current?.querySelector('[contenteditable="true"]');
        if (firstEditable instanceof HTMLElement) {
          firstEditable.focus();
        }
      }, 0);
    }
  }, [createBlockWithControls]);

  const getText = useCallback((): string => {
    return contentRef.current?.textContent || '';
  }, []);

  const focus = useCallback((): void => {
    const firstEditable = contentRef.current?.querySelector('[contenteditable="true"]');
    if (firstEditable instanceof HTMLElement) {
      firstEditable.focus();
    }
  }, []);

  const blur = useCallback((): void => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const updateState = useCallback(() => {
    if (!contentRef.current) return;

    const text = contentRef.current.textContent || '';

    setEditorState(prev => ({
      ...prev,
      wordCount: countWords(text),
      charCount: countCharacters(text),
    }));
  }, []);

  const emitChange = useCallback(
    debounce(() => {
      if (onChange) {
        onChange(getHTML());
      }
    }, 300),
    [onChange, getHTML]
  );

  /**
   * Get clean HTML from selected blocks/content
   * Removes ALL editor UI elements (controls, buttons, drag handles, icons)
   * Preserves only semantic HTML and block structure
   * Handles both multi-block and inline text selection
   */
  const getCleanSelectionHTML = useCallback((): string => {
    if (!contentRef.current) return '';
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return '';
    
    // Check if we have multi-block selection (entire blocks selected)
    if (selectedBlockIds.size > 0) {
      // Multi-block selection - extract clean HTML for each selected block
      let cleanHTML = '';
      const allBlocks = Array.from(contentRef.current.querySelectorAll('.cb-block'));
      
      allBlocks.forEach(wrapper => {
        const blockId = wrapper.getAttribute('data-block-id');
        if (!blockId || !selectedBlockIds.has(blockId)) return;
        
        const blockType = wrapper.getAttribute('data-block-type');
        const contentWrapper = wrapper.querySelector('.cb-block-content');
        
        if (!contentWrapper) return;
        
        const blockElement = contentWrapper.firstElementChild as HTMLElement;
        if (!blockElement) return;
        
        // Clone the block element
        const clone = blockElement.cloneNode(true) as HTMLElement;
        
        // Remove ALL editor UI elements
        clone.querySelectorAll('.cb-block-controls, .cb-block-actions, .cb-block-btn, .cb-block-add, .cb-block-drag, .cb-block-delete, .cb-image-controls, .cb-image-align, .cb-image-crop, .cb-image-resize-handle, .cb-crop-handle, .cb-crop-overlay, .cb-crop-toolbar, .cb-table-controls, .cb-code-toolbar, .cb-callout-type-selector, svg, button').forEach(el => el.remove());
        
        // Remove editor-specific attributes
        clone.removeAttribute('data-placeholder');
        clone.removeAttribute('contenteditable');
        clone.removeAttribute('data-block-id');
        clone.removeAttribute('data-block-type');
        clone.querySelectorAll('[data-placeholder]').forEach(el => el.removeAttribute('data-placeholder'));
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll('[data-block-id]').forEach(el => el.removeAttribute('data-block-id'));
        clone.querySelectorAll('[data-block-type]').forEach(el => el.removeAttribute('data-block-type'));
        
        // Clean up inline styles that are editor-specific
        clone.querySelectorAll('[style]').forEach(el => {
          const element = el as HTMLElement;
          // Keep width/height for images, remove editor positioning
          if (!element.tagName.match(/^(IMG|VIDEO|IFRAME)$/i)) {
            element.removeAttribute('style');
          }
        });
        
        // Handle specific block types for clean output
        switch (blockType) {
          case 'code':
            const codeEl = clone.querySelector('code');
            const preEl = clone.querySelector('pre');
            if (codeEl && preEl) {
              const lang = clone.getAttribute('data-language') || 'plaintext';
              cleanHTML += `<pre data-language="${lang}"><code>${codeEl.textContent}</code></pre>\n`;
            } else {
              cleanHTML += clone.outerHTML + '\n';
            }
            break;
          case 'divider':
            cleanHTML += '<hr>\n';
            break;
          case 'image':
            const img = clone.querySelector('img');
            const caption = clone.querySelector('figcaption');
            if (img) {
              cleanHTML += '<figure>';
              cleanHTML += `<img src="${img.src}" alt="${img.alt || ''}" />`;
              if (caption && caption.textContent?.trim()) {
                cleanHTML += `<figcaption>${caption.textContent}</figcaption>`;
              }
              cleanHTML += '</figure>\n';
            }
            break;
          default:
            cleanHTML += clone.outerHTML + '\n';
        }
      });
      
      return cleanHTML.trim();
    }
    
    // Inline text selection or partial block selection
    const range = selection.getRangeAt(0);
    const container = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(container);
    
    // Find all selected blocks (partial or full)
    const blocks = tempDiv.querySelectorAll('.cb-block');
    
    if (blocks.length === 0) {
      // No full blocks selected - just inline content
      const clone = tempDiv.cloneNode(true) as HTMLElement;
      
      // Remove ALL editor-specific elements
      clone.querySelectorAll('.cb-block-controls, .cb-block-actions, .cb-block-btn, .cb-block-add, .cb-block-drag, .cb-block-delete, .cb-image-controls, .cb-image-align, .cb-image-crop, .cb-image-resize-handle, .cb-crop-handle, .cb-crop-overlay, .cb-crop-toolbar, .cb-table-controls, .cb-code-toolbar, .cb-callout-type-selector, svg, button').forEach(el => el.remove());
      
      // Remove editor-specific attributes
      clone.querySelectorAll('[data-placeholder]').forEach(el => el.removeAttribute('data-placeholder'));
      clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      clone.querySelectorAll('[data-block-id]').forEach(el => el.removeAttribute('data-block-id'));
      clone.querySelectorAll('[data-block-type]').forEach(el => el.removeAttribute('data-block-type'));
      
      return clone.innerHTML.trim();
    }
    
    // Full blocks are selected via range selection - extract clean semantic HTML
    let cleanHTML = '';
    
    blocks.forEach(wrapper => {
      const blockType = wrapper.getAttribute('data-block-type');
      const contentWrapper = wrapper.querySelector('.cb-block-content');
      
      if (!contentWrapper) return;
      
      const blockElement = contentWrapper.firstElementChild as HTMLElement;
      if (!blockElement) return;
      
      // Clone and clean the block
      const clone = blockElement.cloneNode(true) as HTMLElement;
      
      // Remove ALL editor-specific elements
      clone.querySelectorAll('.cb-block-controls, .cb-block-actions, .cb-block-btn, .cb-block-add, .cb-block-drag, .cb-block-delete, .cb-image-controls, .cb-image-align, .cb-image-crop, .cb-image-resize-handle, .cb-crop-handle, .cb-crop-overlay, .cb-crop-toolbar, .cb-table-controls, .cb-code-toolbar, .cb-callout-type-selector, svg, button').forEach(el => el.remove());
      
      // Remove editor-specific attributes
      clone.removeAttribute('data-placeholder');
      clone.removeAttribute('contenteditable');
      clone.querySelectorAll('[data-placeholder]').forEach(el => el.removeAttribute('data-placeholder'));
      clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      
      // Clean up inline styles that are editor-specific
      clone.querySelectorAll('[style]').forEach(el => {
        const element = el as HTMLElement;
        if (!element.tagName.match(/^(IMG|VIDEO|IFRAME)$/i)) {
          element.removeAttribute('style');
        }
      });
      
      // Handle specific block types
      switch (blockType) {
        case 'code':
          const codeEl = clone.querySelector('code');
          const preEl = clone.querySelector('pre');
          if (codeEl && preEl) {
            const lang = clone.getAttribute('data-language') || 'plaintext';
            cleanHTML += `<pre data-language="${lang}"><code>${codeEl.textContent}</code></pre>\n`;
          } else {
            cleanHTML += clone.outerHTML + '\n';
          }
          break;
        case 'divider':
          cleanHTML += '<hr>\n';
          break;
        case 'image':
          const img = clone.querySelector('img');
          const caption = clone.querySelector('figcaption');
          if (img) {
            cleanHTML += '<figure>';
            cleanHTML += `<img src="${img.src}" alt="${img.alt || ''}" />`;
            if (caption && caption.textContent?.trim()) {
              cleanHTML += `<figcaption>${caption.textContent}</figcaption>`;
            }
            cleanHTML += '</figure>\n';
          }
          break;
        default:
          cleanHTML += clone.outerHTML + '\n';
      }
    });
    
    return cleanHTML.trim();
  }, [selectedBlockIds]);

  /**
   * Capture current cursor position for undo/redo
   * Returns block ID and offset within that block
   */
  const captureCursorPosition = useCallback((): {
    blockId: string | null;
    offset: number;
    isCollapsed: boolean;
  } | null => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    
    const range = selection.getRangeAt(0);
    
    // Find the block containing the cursor
    let node = range.startContainer;
    
    // Walk up to find the block
    while (node && node !== contentRef.current) {
      if (node instanceof HTMLElement && node.classList?.contains('cb-block')) {
        const blockId = node.getAttribute('data-block-id');
        
        // Get the editable element within this block
        const editableElement = node.querySelector('[contenteditable="true"]') as HTMLElement;
        if (!editableElement) return { blockId, offset: 0, isCollapsed: selection.isCollapsed };
        
        // Calculate offset within the editable element
        let offset = 0;
        try {
          const preRange = document.createRange();
          preRange.selectNodeContents(editableElement);
          preRange.setEnd(range.startContainer, range.startOffset);
          offset = preRange.toString().length;
        } catch (e) {
          offset = 0;
        }
        
        return { blockId, offset, isCollapsed: selection.isCollapsed };
      }
      node = node.parentNode as Node;
    }
    
    return null;
  }, []);

  /**
   * Restore cursor position after undo/redo
   * Places cursor back where it was
   */
  const restoreCursorPosition = useCallback((position: {
    blockId: string | null;
    offset: number;
    isCollapsed: boolean;
  } | null): void => {
    if (!position || !position.blockId || !contentRef.current) return;
    
    // Find the block
    const block = contentRef.current.querySelector(`[data-block-id="${position.blockId}"]`);
    if (!block) {
      // Block doesn't exist anymore - focus first available block
      const firstBlock = contentRef.current.querySelector('.cb-block [contenteditable="true"]') as HTMLElement;
      if (firstBlock) {
        firstBlock.focus();
      }
      return;
    }
    
    // Find the editable element
    const editableElement = block.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;
    
    // Restore cursor position within the element
    try {
      const range = document.createRange();
      const selection = window.getSelection();
      if (!selection) return;
      
      // Walk through text nodes to find the offset
      const walker = document.createTreeWalker(
        editableElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentOffset = 0;
      let found = false;
      let node: Node | null = walker.nextNode();
      
      while (node) {
        const nodeLength = node.textContent?.length || 0;
        
        if (currentOffset + nodeLength >= position.offset) {
          // Found the node containing our offset
          const localOffset = position.offset - currentOffset;
          range.setStart(node, Math.min(localOffset, nodeLength));
          range.setEnd(node, Math.min(localOffset, nodeLength));
          found = true;
          break;
        }
        
        currentOffset += nodeLength;
        node = walker.nextNode();
      }
      
      if (!found) {
        // Offset not found - place cursor at end
        range.selectNodeContents(editableElement);
        range.collapse(false);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Focus the element
      editableElement.focus();
    } catch (e) {
      // Fallback: just focus the element
      editableElement.focus();
    }
  }, []);

  // Save to history - IMMEDIATE (for structural changes like add/delete block)
  const saveToHistoryImmediate = useCallback(() => {
    const currentHTML = getEditorStateHTML(); // Use editor state instead of clean HTML
    const cursorPosition = captureCursorPosition();
    
    // Don't save if nothing changed
    const lastEntry = undoStackRef.current[undoStackRef.current.length - 1];
    if (lastEntry && lastEntry.html === currentHTML) {
      return;
    }
    
    const historyEntry: HistoryEntry = {
      html: currentHTML,
      cursorPosition,
      selectedBlockIds: Array.from(selectedBlockIds), // Save current selection
    };
    
    // CRITICAL FIX (Bug #16): Limit both undo AND redo stacks to prevent memory leak
    // Keep last 50 entries in each stack
    undoStackRef.current = [...undoStackRef.current.slice(-49), historyEntry];
    redoStackRef.current = []; // Clear redo stack on new action
    
    setEditorState(prev => ({
      ...prev,
      undoStack: undoStackRef.current,
      redoStack: [],
      isDirty: true,
    }));
  }, [getEditorStateHTML, captureCursorPosition, selectedBlockIds]);
  
  // Store the function in ref for early access
  saveToHistoryImmediateRef.current = saveToHistoryImmediate;

  // Debounced history save (for typing/content changes)
  const debouncedSaveToHistory = useMemo(
    () => debounce(() => {
      saveToHistoryImmediate();
    }, 1000), // Save 1 second after user stops typing
    [saveToHistoryImmediate]
  );
  
  // Main saveToHistory function (uses debounced version)
  const saveToHistory = useCallback(() => {
    debouncedSaveToHistory();
  }, [debouncedSaveToHistory]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) {
      console.log('🔙 Undo: No history available');
      return;
    }

    console.log('🔙 Undo: Stack size =', undoStackRef.current.length);

    // Cancel any pending debounced saves
    debouncedSaveToHistory.cancel();

    // Save current state to redo stack
    const currentHTML = getEditorStateHTML(); // Use editor state
    const currentCursor = captureCursorPosition();
    const currentEntry: HistoryEntry = {
      html: currentHTML,
      cursorPosition: currentCursor,
      selectedBlockIds: Array.from(selectedBlockIds),
    };

    // Get previous state from undo stack
    const previousEntry = undoStackRef.current[undoStackRef.current.length - 1];

    // Update stacks
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    // CRITICAL FIX (Bug #16): Limit redo stack size to prevent memory leak (max 50 entries)
    redoStackRef.current = [...redoStackRef.current, currentEntry].slice(-50);

    setEditorState(prev => ({
      ...prev,
      undoStack: undoStackRef.current,
      redoStack: redoStackRef.current,
    }));

    // Restore HTML
    setEditorStateHTML(previousEntry.html); // Use editor state
    
    // MEDIUM-PRIORITY FIX (Bug #5): Use RAF instead of setTimeout for cursor restoration
    // This ensures DOM is actually updated before restoring cursor, avoiding timing issues
    requestAnimationFrame(() => {
      restoreCursorPosition(previousEntry.cursorPosition);
      
      // Restore block selection
      if (previousEntry.selectedBlockIds && previousEntry.selectedBlockIds.length > 0) {
        setSelectedBlockIds(new Set(previousEntry.selectedBlockIds));
      } else {
        setSelectedBlockIds(new Set());
      }
    });
  }, [getEditorStateHTML, setEditorStateHTML, captureCursorPosition, restoreCursorPosition, debouncedSaveToHistory, selectedBlockIds]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      console.log('🔜 Redo: No redo history available');
      return;
    }

    console.log('🔜 Redo: Stack size =', redoStackRef.current.length);

    // Cancel any pending debounced saves
    debouncedSaveToHistory.cancel();

    // Save current state to undo stack
    const currentHTML = getEditorStateHTML(); // Use editor state
    const currentCursor = captureCursorPosition();
    const currentEntry: HistoryEntry = {
      html: currentHTML,
      cursorPosition: currentCursor,
      selectedBlockIds: Array.from(selectedBlockIds),
    };

    // Get next state from redo stack
    const nextEntry = redoStackRef.current[redoStackRef.current.length - 1];

    // Update stacks
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    // CRITICAL FIX (Bug #16): Limit undo stack size when redoing (max 50 entries)
    undoStackRef.current = [...undoStackRef.current, currentEntry].slice(-50);

    setEditorState(prev => ({
      ...prev,
      redoStack: redoStackRef.current,
      undoStack: undoStackRef.current,
    }));

    // Restore HTML
    setEditorStateHTML(nextEntry.html); // Use editor state
    
    // MEDIUM-PRIORITY FIX (Bug #5): Use RAF instead of setTimeout for cursor restoration
    // This ensures DOM is actually updated before restoring cursor, avoiding timing issues
    requestAnimationFrame(() => {
      restoreCursorPosition(nextEntry.cursorPosition);
      
      // Restore block selection
      if (nextEntry.selectedBlockIds && nextEntry.selectedBlockIds.length > 0) {
        setSelectedBlockIds(new Set(nextEntry.selectedBlockIds));
      } else {
        setSelectedBlockIds(new Set());
      }
    });
  }, [getEditorStateHTML, setEditorStateHTML, captureCursorPosition, restoreCursorPosition, debouncedSaveToHistory, selectedBlockIds]);

  // Insert a new block
  const insertBlockAfter = useCallback((type: BlockType, afterBlockId?: string, data?: Partial<BlockData>): HTMLElement | null => {
    if (!contentRef.current) return null;
    
    saveToHistoryImmediate(); // Use immediate save for structural changes
    
    const newBlock = createBlockWithControls(type, data);
    
    if (afterBlockId) {
      const afterBlock = contentRef.current.querySelector(`[data-block-id="${afterBlockId}"]`);
      if (afterBlock) {
        afterBlock.after(newBlock);
      } else {
        contentRef.current.appendChild(newBlock);
      }
    } else {
      contentRef.current.appendChild(newBlock);
    }
    
    // Focus the new block
    setTimeout(() => {
      // For code blocks, the contenteditable is nested deeper
      const codeEditable = newBlock.querySelector('.cb-code[contenteditable="true"]');
      const editable = codeEditable || newBlock.querySelector('[contenteditable="true"]');
      if (editable instanceof HTMLElement) {
        editable.focus();
        moveCursorToStart(editable);
      }
    }, 50);
    
    updateState();
    emitChange();
    
    return newBlock;
  }, [createBlockWithControls, saveToHistoryImmediate, updateState, emitChange]);

  // Delete a block
  const deleteBlockById = useCallback((blockId: string): void => {
    if (!contentRef.current) return;
    
    const blocks = contentRef.current.querySelectorAll('.cb-block');
    if (blocks.length <= 1) {
      // Don't delete last block, just clear it
      const content = blocks[0]?.querySelector('[contenteditable="true"]');
      if (content instanceof HTMLElement) {
        content.innerHTML = '';
        content.focus();
      }
      return;
    }
    
    saveToHistoryImmediate(); // Use immediate save for structural changes
    
    const block = contentRef.current.querySelector(`[data-block-id="${blockId}"]`);
    if (!block) return;
    
    const prevBlock = block.previousElementSibling as HTMLElement;
    const nextBlock = block.nextElementSibling as HTMLElement;
    
    block.remove();
    
    // Focus adjacent block
    const targetBlock = nextBlock || prevBlock;
    if (targetBlock) {
      const editable = targetBlock.querySelector('[contenteditable="true"]');
      if (editable instanceof HTMLElement) {
        editable.focus();
        if (!nextBlock) {
          moveCursorToEnd(editable);
        }
      }
    }
    
    updateState();
    emitChange();
  }, [saveToHistoryImmediate, updateState, emitChange]); // CRITICAL FIX (Bug #18): Use saveToHistoryImmediate in deps

  // Move block up/down
  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down'): void => {
    if (!contentRef.current) return;
    
    const block = contentRef.current.querySelector(`[data-block-id="${blockId}"]`);
    if (!block) return;
    
    saveToHistoryImmediate(); // Use immediate save for structural changes
    
    if (direction === 'up' && block.previousElementSibling) {
      block.previousElementSibling.before(block);
    } else if (direction === 'down' && block.nextElementSibling) {
      block.nextElementSibling.after(block);
    }
    
    updateState();
    emitChange();
  }, [saveToHistoryImmediate, updateState, emitChange]);

  // Transform block to different type
  const transformBlockType = useCallback((blockId: string, newType: BlockType, data?: Record<string, any>): void => {
    if (!contentRef.current) return;
    
    const wrapper = contentRef.current.querySelector(`[data-block-id="${blockId}"]`);
    if (!wrapper) return;
    
    const currentType = wrapper.getAttribute('data-block-type');
    if (currentType === newType && !data) return;
    
    saveToHistoryImmediate(); // Use immediate save for structural changes
    
    // Get current content
    const contentEl = wrapper.querySelector('[contenteditable="true"]');
    const currentContent = contentEl?.innerHTML || '';
    
    // Create new block with same content where applicable
    const blockData = { content: currentContent, ...data } as any;
    const newBlock = createBlockWithControls(newType, blockData);
    
    // Replace old block
    wrapper.replaceWith(newBlock);
    
    // Focus new block
    setTimeout(() => {
      // For code blocks, the contenteditable is nested deeper
      const codeEditable = newBlock.querySelector('.cb-code[contenteditable="true"]');
      const editable = codeEditable || newBlock.querySelector('[contenteditable="true"]');
      if (editable instanceof HTMLElement) {
        editable.focus();
        moveCursorToStart(editable);
      }
    }, 50);
    
    updateState();
    emitChange();
  }, [createBlockWithControls, saveToHistoryImmediate, updateState, emitChange]);

  // Store editorState in a ref to avoid re-creating instance on every state change
  const editorStateRef = useRef(editorState);
  editorStateRef.current = editorState;

  // Store activeBlockId in a ref to avoid re-creating instance
  const activeBlockIdRef = useRef(activeBlockId);
  activeBlockIdRef.current = activeBlockId;

  // Create stable editor instance that doesn't change on every keystroke
  const editorInstance = useMemo((): EditorInstance | null => {
    // Need isMounted to ensure refs are populated
    if (!isMounted || !containerRef.current || !contentRef.current) return null;

    return {
      container: contentRef.current,
      config: props,
      get state() { return editorStateRef.current; }, // Getter to always return current state
      getHTML,
      setHTML,
      getText,
      insertBlock: (type, data) => insertBlockAfter(type, activeBlockIdRef.current || undefined, data),
      deleteBlock: (block) => {
        const id = block.getAttribute('data-block-id');
        if (id) deleteBlockById(id);
      },
      moveBlock: (block, direction) => {
        const id = block.getAttribute('data-block-id');
        if (id) moveBlock(id, direction);
      },
      transformBlock: (block, newType, data) => {
        const id = block.getAttribute('data-block-id');
        if (id) transformBlockType(id, newType, data);
        return block;
      },
      toggleFormat: (format: InlineFormat) => {
        switch (format) {
          case 'bold': document.execCommand('bold'); break;
          case 'italic': document.execCommand('italic'); break;
          case 'underline': document.execCommand('underline'); break;
          case 'strikethrough': document.execCommand('strikeThrough'); break;
        }
        emitChange();
      },
      isFormatActive: (format: InlineFormat) => {
        switch (format) {
          case 'bold': return document.queryCommandState('bold');
          case 'italic': return document.queryCommandState('italic');
          case 'underline': return document.queryCommandState('underline');
          case 'strikethrough': return document.queryCommandState('strikeThrough');
          default: return false;
        }
      },
      selectionVersion, // Include to trigger toolbar re-render on selection change
      undo: handleUndo,
      redo: handleRedo,
      focus,
      blur,
      destroy: () => {},
      registerBlock: (def) => blockRegistry.register(def),
      registerCommand: () => {},
      executeCommand: () => {},
    };
  // Only recreate when truly necessary - not on editorState or activeBlockId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, selectionVersion, props, getHTML, setHTML, getText, insertBlockAfter, deleteBlockById,
    moveBlock, transformBlockType, handleUndo, handleRedo, focus, blur, emitChange]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getHTML,
    setHTML,
    getText,
    focus,
    blur,
    insertBlock: (type: BlockType, data?: Partial<BlockData>) =>
      insertBlockAfter(type, activeBlockIdRef.current || undefined, data),
    getEditor: () => editorInstance,
  }), [getHTML, setHTML, getText, focus, blur, insertBlockAfter, editorInstance]);

  // Notify ready
  useEffect(() => {
    if (onReady && editorInstance) {
      onReady(editorInstance);
    }
  }, [onReady, editorInstance]);

  // Handle image file upload
  const handleImageUpload = useCallback(async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const figure = input.closest('figure.cb-image') as HTMLElement;
    if (!figure) return;
    
    saveToHistoryImmediate(); // Use immediate save for image upload
    
    try {
      const dataUrl = await createImageFromFile(file);
      setImageSrc(figure, dataUrl, file.name);
      
      // Add alignment controls since we now have an image
      let controls = figure.querySelector('.cb-image-controls');
      if (!controls) {
        controls = document.createElement('div');
        controls.className = 'cb-image-controls';
        controls.innerHTML = `
          <button type="button" class="cb-image-align" data-align="left" title="Align left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="17" x2="3" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="17" x2="3" y1="18" y2="18"/>
            </svg>
          </button>
          <button type="button" class="cb-image-align" data-align="center" title="Align center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" x2="6" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="18" x2="6" y1="18" y2="18"/>
            </svg>
          </button>
          <button type="button" class="cb-image-align" data-align="right" title="Align right">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="21" x2="7" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="21" x2="7" y1="18" y2="18"/>
            </svg>
          </button>
          <span class="cb-image-controls-divider"></span>
          <button type="button" class="cb-image-crop" data-action="crop" title="Crop image">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>
            </svg>
          </button>
        `;
        const caption = figure.querySelector('figcaption');
        if (caption) {
          figure.insertBefore(controls, caption);
        } else {
          figure.appendChild(controls);
        }
      }
      
      emitChange();
    } catch (err) {
      console.error('Failed to load image:', err);
    }
  }, [saveToHistoryImmediate, emitChange]);

  // Set up image input listeners
  useEffect(() => {
    if (!contentRef.current) return;
    
    const handleImageInputChange = (e: Event) => {
      handleImageUpload(e);
    };
    
    const handleImageAlignClick = (e: MouseEvent) => {
      const button = (e.target as HTMLElement).closest('[data-align]') as HTMLElement;
      if (!button) return;
      
      const align = button.getAttribute('data-align') as 'left' | 'center' | 'right';
      const figure = button.closest('figure.cb-image') as HTMLElement;
      
      if (figure && align) {
        saveToHistoryImmediate(); // Use immediate save for image alignment
        setImageAlign(figure, align);
        emitChange();
      }
    };
    
    // Use event delegation for image inputs
    const container = contentRef.current;
    
    container.addEventListener('change', (e) => {
      if ((e.target as HTMLElement).matches('.cb-image-input')) {
        handleImageInputChange(e);
      }
    });
    
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Handle image alignment clicks
      if (target.closest('.cb-image-align')) {
        handleImageAlignClick(e as MouseEvent);
      }
      
      // Handle image crop button click
      if (target.closest('.cb-image-crop')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if crop modal is already open
        if (document.querySelector('.cb-crop-modal')) {
          return;
        }
        
        const figure = target.closest('figure.cb-image') as HTMLElement;
        const img = figure?.querySelector('img') as HTMLImageElement;
        
        if (figure && img && img.src) {
          const modal = createCropModal(
            img.src,
            (croppedSrc) => {
              saveToHistoryImmediate(); // Use immediate save for image crop
              img.src = croppedSrc;
              emitChange();
            },
            () => {} // onCancel - nothing needed
          );
          document.body.appendChild(modal);
        }
      }
      
      // Handle checkbox clicks in checklists
      if (target.classList.contains('cb-checkbox')) {
        const checkbox = target as HTMLInputElement;
        const li = checkbox.closest('.cb-list-item') as HTMLElement;
        if (li) {
          saveToHistoryImmediate(); // Use immediate save for checkbox toggle
          // Toggle cb-checked class based on new checkbox state
          // Note: checkbox.checked is already updated by the browser at this point
          li.classList.toggle('cb-checked', checkbox.checked);
          emitChange();
        }
      }
    });
    
    // Handle video URL input
    container.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('cb-video-url-input') && e.key === 'Enter') {
        e.preventDefault();
        const input = target as HTMLInputElement;
        const url = input.value.trim();
        if (url) {
          const figure = target.closest('figure.cb-video') as HTMLElement;
          if (figure) {
            saveToHistoryImmediate(); // Use immediate save for video URL
            setVideoSrc(figure, url);
            emitChange();
          }
        }
      }
      
      // Handle image URL input
      if (target.classList.contains('cb-image-url-input') && e.key === 'Enter') {
        e.preventDefault();
        const input = target as HTMLInputElement;
        const url = input.value.trim();
        if (url) {
          const figure = target.closest('figure.cb-image') as HTMLElement;
          if (figure) {
            saveToHistory();
            setImageSrc(figure, url);
            
            // Add alignment controls
            let controls = figure.querySelector('.cb-image-controls');
            if (!controls) {
              controls = document.createElement('div');
              controls.className = 'cb-image-controls';
              controls.innerHTML = `
                <button type="button" class="cb-image-align" data-align="left" title="Align left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="17" x2="3" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="17" x2="3" y1="18" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="cb-image-align" data-align="center" title="Align center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" x2="6" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="18" x2="6" y1="18" y2="18"/>
                  </svg>
                </button>
                <button type="button" class="cb-image-align" data-align="right" title="Align right">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="21" x2="7" y1="10" y2="10"/><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="3" y1="14" y2="14"/><line x1="21" x2="7" y1="18" y2="18"/>
                  </svg>
                </button>
                <span class="cb-image-controls-divider"></span>
                <button type="button" class="cb-image-crop" data-action="crop" title="Crop image">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>
                  </svg>
                </button>
              `;
              const caption = figure.querySelector('figcaption');
              if (caption) {
                figure.insertBefore(controls, caption);
              } else {
                figure.appendChild(controls);
              }
            }
            
            emitChange();
          }
        }
      }
    });
    
    // Handle callout type selector clicks
    container.addEventListener('click', (e) => {
      const typeButton = (e.target as HTMLElement).closest('.cb-callout-type-selector button[data-type]') as HTMLElement;
      if (typeButton) {
        e.preventDefault();
        e.stopPropagation();
        const newType = typeButton.getAttribute('data-type') as 'info' | 'warning' | 'error' | 'success' | 'note';
        const callout = typeButton.closest('.cb-callout') as HTMLElement;
        if (callout && newType) {
          saveToHistory();
          setCalloutType(callout, newType);
          emitChange();
        }
      }
    });
    
  }, [handleImageUpload, saveToHistory, emitChange]);

  // Handle image resize
  useEffect(() => {
    if (!contentRef.current || readOnly) return;
    
    // MEDIUM-PRIORITY FIX (Bug #2): Store container reference in closure to prevent race condition during cleanup
    // This ensures the container reference is still valid when the cleanup function runs
    const container = contentRef.current;
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    let currentImg: HTMLImageElement | null = null;
    let currentWrapper: HTMLElement | null = null;
    let handleType: string | null = null;
    
    const handleResizeStart = (e: MouseEvent) => {
      const handle = (e.target as HTMLElement).closest('.cb-image-resize-handle') as HTMLElement;
      if (!handle) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      currentWrapper = handle.closest('.cb-image-resizable') as HTMLElement;
      currentImg = currentWrapper?.querySelector('img') as HTMLImageElement;
      handleType = handle.getAttribute('data-handle');
      
      if (!currentImg || !currentWrapper) return;
      
      isResizing = true;
      startX = e.clientX;
      startWidth = currentImg.offsetWidth;
      
      currentWrapper.classList.add('resizing');
      document.body.style.cursor = handle.style.cursor || 'se-resize';
      document.body.style.userSelect = 'none';
      
      saveToHistory();
    };
    
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !currentImg || !handleType) return;
      
      e.preventDefault();
      
      const diff = e.clientX - startX;
      let newWidth: number;
      
      // Handle direction affects how we calculate width
      if (handleType === 'w' || handleType === 'sw' || handleType === 'nw') {
        newWidth = startWidth - diff;
      } else {
        newWidth = startWidth + diff;
      }
      
      // Constrain width between 50px and 100% of container
      const containerWidth = container.offsetWidth - 100; // Account for padding
      newWidth = Math.max(50, Math.min(newWidth, containerWidth));
      
      currentImg.style.width = `${newWidth}px`;
      currentImg.style.height = 'auto';
    };
    
    const handleResizeEnd = () => {
      if (!isResizing) return;
      
      isResizing = false;
      
      if (currentWrapper) {
        currentWrapper.classList.remove('resizing');
      }
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      currentImg = null;
      currentWrapper = null;
      handleType = null;
      
      emitChange();
    };
    
    container.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // MEDIUM-PRIORITY FIX (Bug #2): Add null check for container in cleanup
    // Prevents errors if container is removed before cleanup runs
    return () => {
      if (container) {
        container.removeEventListener('mousedown', handleResizeStart);
      }
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [readOnly, saveToHistoryImmediate, emitChange]);

  /**
   * Handle block clicks for multi-selection with Shift+Click
   * Also handles clicking on non-editable blocks (divider, image, video)
   */
  const handleBlockClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Handle drag handle clicks for multi-selection
    const dragHandle = target.closest('.cb-block-drag');
    if (dragHandle) {
      console.log('🖱️ Drag handle clicked, shiftKey:', e.shiftKey);
      
      const block = target.closest('.cb-block') as HTMLElement;
      const blockId = block?.getAttribute('data-block-id');
      if (!blockId) return;
      
      console.log('📦 Block ID:', blockId);
      
      // Shift+Click for multi-selection
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('✅ Shift+Click detected, toggling selection');
        
        setSelectedBlockIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(blockId)) {
            newSet.delete(blockId);
            console.log('➖ Removed from selection, new size:', newSet.size);
          } else {
            newSet.add(blockId);
            console.log('➕ Added to selection, new size:', newSet.size);
          }
          // HIGH-PRIORITY FIX (Bug #4): Synchronize ref immediately to prevent race conditions
          // Update ref in the same synchronous block to ensure drag operations use correct data
          selectedBlockIdsRef.current = newSet;
          return newSet;
        });
      } else {
        // Clear selection on regular click
        if (selectedBlockIds.size > 0) {
          console.log('🧹 Clearing selection');
          const emptySet = new Set<string>();
          selectedBlockIdsRef.current = emptySet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
          setSelectedBlockIds(emptySet);
        }
      }
      return;
    }
    
    // Handle clicks on non-editable blocks (divider, image, video)
    const block = target.closest('.cb-block') as HTMLElement;
    if (!block) return;
    
    const blockType = block.getAttribute('data-block-type');
    const blockId = block.getAttribute('data-block-id');
    
    // If clicked on divider, image, or video block (not their controls)
    if (blockType === 'divider' || blockType === 'image' || blockType === 'video') {
      // Don't select if clicking on controls/buttons
      if (target.closest('button, input, .cb-image-controls, .cb-table-controls')) {
        return;
      }
      
      console.log('🎯 Clicked on non-editable block:', blockType);
      
      if (e.shiftKey && blockId) {
        // Shift+Click: toggle selection
        e.preventDefault();
        setSelectedBlockIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(blockId)) {
            newSet.delete(blockId);
          } else {
            newSet.add(blockId);
          }
          // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
          selectedBlockIdsRef.current = newSet;
          return newSet;
        });
      } else {
        // Regular click: select this block only
        if (blockId) {
          const newSet = new Set([blockId]);
          selectedBlockIdsRef.current = newSet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
          setSelectedBlockIds(newSet);
          setActiveBlockId(blockId);
        }
      }
    } else {
      // Clear selection on regular click in editable blocks
      if (selectedBlockIds.size > 0 && !e.shiftKey) {
        console.log('🧹 Clearing selection');
        const emptySet = new Set<string>();
        selectedBlockIdsRef.current = emptySet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
        setSelectedBlockIds(emptySet);
      }
    }
  }, [selectedBlockIds]);

  // Handle block control clicks
  const handleBlockControlClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    if (!button) return;
    
    const action = button.getAttribute('data-action');
    const block = button.closest('.cb-block') as HTMLElement;
    const blockId = block?.getAttribute('data-block-id');
    
    if (!blockId && !action?.startsWith('add') && !action?.startsWith('delete')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    switch (action) {
      case 'add':
        if (blockId) {
          // Insert a new paragraph block after current block
          saveToHistoryImmediate(); // Use immediate save for adding block
          const newBlock = createBlockWithControls('paragraph');
          block.after(newBlock);
          
          // Focus the new block
          const newEditable = newBlock.querySelector('[contenteditable="true"]') as HTMLElement;
          if (newEditable) {
            newEditable.focus();
          }
          
          // Get the new block's ID and open the menu
          const newBlockId = newBlock.getAttribute('data-block-id');
          if (newBlockId) {
            setActiveBlockId(newBlockId);
            setTimeout(() => {
              const rect = newBlock.getBoundingClientRect();
              setBlockMenuPosition({ x: rect.left, y: rect.bottom + 8 });
              setShowBlockMenu(true);
            }, 50);
          }
          
          updateState();
          emitChange();
        }
        break;
      case 'delete':
        if (blockId) deleteBlockById(blockId);
        break;
      case 'moveup':
        if (blockId) moveBlock(blockId, 'up');
        break;
      case 'movedown':
        if (blockId) moveBlock(blockId, 'down');
        break;
      // Table actions
      case 'addRow': {
        const tableWrapper = button.closest('.cb-table-wrapper') as HTMLElement;
        if (tableWrapper) {
          saveToHistoryImmediate(); // Use immediate save for table operations
          addTableRow(tableWrapper);
          emitChange();
        }
        break;
      }
      case 'addCol': {
        const tableWrapper = button.closest('.cb-table-wrapper') as HTMLElement;
        if (tableWrapper) {
          saveToHistoryImmediate(); // Use immediate save for table operations
          addTableColumn(tableWrapper);
          emitChange();
        }
        break;
      }
      case 'deleteRow': {
        const tableWrapper = button.closest('.cb-table-wrapper') as HTMLElement;
        if (tableWrapper) {
          const cell = getFocusedCell(tableWrapper);
          if (cell) {
            const pos = getCellPosition(cell);
            if (pos) {
              saveToHistoryImmediate(); // Use immediate save for table operations
              deleteTableRow(tableWrapper, pos.row);
              emitChange();
            }
          } else {
            // Delete last row if no cell is focused
            const table = tableWrapper.querySelector('table');
            const rows = table?.querySelectorAll('tr');
            if (rows && rows.length > 1) {
              saveToHistoryImmediate(); // Use immediate save for table operations
              deleteTableRow(tableWrapper, rows.length - 1);
              emitChange();
            }
          }
        }
        break;
      }
      case 'deleteCol': {
        const tableWrapper = button.closest('.cb-table-wrapper') as HTMLElement;
        if (tableWrapper) {
          const cell = getFocusedCell(tableWrapper);
          if (cell) {
            const pos = getCellPosition(cell);
            if (pos) {
              saveToHistoryImmediate(); // Use immediate save for table operations
              deleteTableColumn(tableWrapper, pos.col);
              emitChange();
            }
          } else {
            // Delete last column if no cell is focused
            const table = tableWrapper.querySelector('table');
            const firstRow = table?.querySelector('tr');
            const cells = firstRow?.querySelectorAll('th, td');
            if (cells && cells.length > 1) {
              saveToHistoryImmediate(); // Use immediate save for table operations
              deleteTableColumn(tableWrapper, cells.length - 1);
              emitChange();
            }
          }
        }
        break;
      }
    }
  }, [deleteBlockById, moveBlock, saveToHistoryImmediate, emitChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    
    // Don't handle keys if block menu is open (let it handle its own keys)
    if (showBlockMenu) return;

    // Handle multi-block selection operations FIRST
    if (selectedBlockIds.size > 0) {
      // Delete selected blocks
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        console.log('🗑️ Deleting', selectedBlockIds.size, 'selected blocks');
        saveToHistoryImmediate();
        
        // Delete all selected blocks
        selectedBlockIds.forEach(blockId => {
          const block = contentRef.current?.querySelector(`[data-block-id="${blockId}"]`);
          block?.remove();
        });
        
        // Clear selection
        const emptySet = new Set<string>();
        selectedBlockIdsRef.current = emptySet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
        setSelectedBlockIds(emptySet);
        
        // Ensure at least one block remains
        if (contentRef.current && contentRef.current.children.length === 0) {
          const newBlock = createBlockWithControls('paragraph');
          contentRef.current.appendChild(newBlock);
          setTimeout(() => {
            const editable = newBlock.querySelector('[contenteditable="true"]') as HTMLElement;
            editable?.focus();
          }, 0);
        }
        
        updateState();
        emitChange();
        return;
      }
      
      // Duplicate selected blocks (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        console.log('📋 Duplicating', selectedBlockIds.size, 'selected blocks');
        saveToHistoryImmediate();
        
        const allBlocks = Array.from(contentRef.current?.querySelectorAll('.cb-block') || []);
        const selectedBlocks = allBlocks.filter(b => selectedBlockIds.has(b.getAttribute('data-block-id') || ''));
        
        // Clone each selected block
        selectedBlocks.forEach(block => {
          const clone = block.cloneNode(true) as HTMLElement;
          // Generate new block ID for the clone using generateId for better uniqueness
          clone.setAttribute('data-block-id', generateId());
          block.after(clone);
        });
        
        const emptySet = new Set<string>();
        selectedBlockIdsRef.current = emptySet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
        setSelectedBlockIds(emptySet);
        updateState();
        emitChange();
        return;
      }
    }

    const target = e.target as HTMLElement;
    const block = target.closest('.cb-block') as HTMLElement;
    const blockId = block?.getAttribute('data-block-id');
    const blockType = block?.getAttribute('data-block-type') as BlockType;

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          emitChange();
          return;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          emitChange();
          return;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          emitChange();
          return;
        case 'a':
          // Two-level selection: first press selects current block, second selects all
          e.preventDefault();
          
          const selection = window.getSelection();
          if (!selection) return;
          
          // Get current editable element (could be nested in code block, table cell, etc.)
          const editableElement = target.closest('[contenteditable="true"]') as HTMLElement;
          if (!editableElement) return;
          
          // Check if current block content is already fully selected
          const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          const isBlockFullySelected = range && 
            range.startContainer === editableElement && 
            range.endContainer === editableElement &&
            range.toString().trim() === editableElement.textContent?.trim();
          
          // Alternative check: compare selected text length to block content length
          const selectedText = selection.toString();
          const blockText = editableElement.textContent || '';
          const isContentFullySelected = selectedText.trim() === blockText.trim() && selectedText.length > 0;
          
          if (isBlockFullySelected || isContentFullySelected) {
            // Second Ctrl+A: Select all blocks in editor
            if (contentRef.current) {
              const newRange = document.createRange();
              newRange.selectNodeContents(contentRef.current);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else {
            // First Ctrl+A: Select current block content only
            const newRange = document.createRange();
            newRange.selectNodeContents(editableElement);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
          return;
        case 's':
          e.preventDefault();
          if (onSave) onSave(getHTML());
          return;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        case 'y':
          e.preventDefault();
          handleRedo();
          return;
        case '1':
        case '2':
        case '3':
          if (blockId) {
            e.preventDefault();
            // Transform to heading
            saveToHistoryImmediate(); // Use immediate save for block type transformation
            const level = parseInt(e.key);
            const content = target.innerHTML;
            const wrapper = block;
            wrapper.setAttribute('data-block-type', 'heading');
            const contentDiv = wrapper.querySelector('.cb-block-content');
            if (contentDiv) {
              contentDiv.innerHTML = `<h${level} class="cb-heading cb-h${level}" contenteditable="true">${content}</h${level}>`;
              const newEl = contentDiv.querySelector('[contenteditable]') as HTMLElement;
              if (newEl) {
                newEl.focus();
                moveCursorToEnd(newEl);
              }
            }
            emitChange();
          }
          return;
      }
    }

    // Handle escaping from inline code with Right Arrow or Space at the end
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Check if we're at the end of a <code> element
      let node = range.startContainer;
      let codeElement: HTMLElement | null = null;
      
      // Find parent <code> element
      while (node && node !== contentRef.current) {
        if (node instanceof HTMLElement && node.tagName === 'CODE') {
          codeElement = node;
          break;
        }
        node = node.parentNode as Node;
      }
      
      if (codeElement && selection.isCollapsed) {
        // Check if cursor is at the very end of the code element
        const isAtEnd = range.startOffset === (range.startContainer.textContent?.length || 0) &&
                        range.startContainer === codeElement.lastChild;
        
        // Handle Right Arrow or Space when at the end of inline code
        if (isAtEnd && (e.key === 'ArrowRight' || e.key === ' ')) {
          e.preventDefault();
          
          // Create a zero-width space after the code element to place cursor
          let nextNode = codeElement.nextSibling;
          
          // If there's no next sibling or it's another inline element, create a text node
          if (!nextNode || nextNode.nodeType !== Node.TEXT_NODE) {
            const textNode = document.createTextNode(e.key === ' ' ? ' ' : '\u200B');
            codeElement.parentNode?.insertBefore(textNode, codeElement.nextSibling);
            nextNode = textNode;
          } else if (e.key === ' ' && nextNode.nodeType === Node.TEXT_NODE) {
            // Add space to existing text node
            nextNode.textContent = ' ' + (nextNode.textContent || '');
          }
          
          // Move cursor to after the code element
          const newRange = document.createRange();
          if (e.key === ' ') {
            newRange.setStart(nextNode, 1);
            newRange.setEnd(nextNode, 1);
          } else {
            newRange.setStartAfter(codeElement);
            newRange.setEndAfter(codeElement);
          }
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          if (e.key === ' ') {
            emitChange();
          }
          return;
        }
      }
    }

    // Tab key in code blocks - insert indentation
    if (e.key === 'Tab' && blockType === 'code') {
      e.preventDefault();
      
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      
      if (range) {
        // Insert 2 spaces for indentation
        const indent = '  ';
        const textNode = document.createTextNode(indent);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection?.removeAllRanges();
        selection?.addRange(range);
        emitChange();
      }
      return;
    }

    // Tab key in tables - navigate between cells
    if (e.key === 'Tab' && blockType === 'table') {
      e.preventDefault();
      
      const cell = target.closest('td, th') as HTMLTableCellElement;
      if (!cell) return;
      
      const tr = cell.parentElement as HTMLTableRowElement;
      const table = tr.closest('table');
      if (!tr || !table) return;
      
      const cells = Array.from(tr.querySelectorAll('th, td'));
      const currentIndex = cells.indexOf(cell);
      const rows = Array.from(table.querySelectorAll('tr'));
      const currentRowIndex = rows.indexOf(tr);
      
      let nextCell: HTMLTableCellElement | null = null;
      
      if (e.shiftKey) {
        // Move backward
        if (currentIndex > 0) {
          nextCell = cells[currentIndex - 1] as HTMLTableCellElement;
        } else if (currentRowIndex > 0) {
          const prevRow = rows[currentRowIndex - 1];
          const prevCells = prevRow.querySelectorAll('th, td');
          nextCell = prevCells[prevCells.length - 1] as HTMLTableCellElement;
        }
      } else {
        // Move forward
        if (currentIndex < cells.length - 1) {
          nextCell = cells[currentIndex + 1] as HTMLTableCellElement;
        } else if (currentRowIndex < rows.length - 1) {
          const nextRow = rows[currentRowIndex + 1];
          const nextCells = nextRow.querySelectorAll('th, td');
          nextCell = nextCells[0] as HTMLTableCellElement;
        } else {
          // At last cell - add new row
          const tableWrapper = target.closest('.cb-table-wrapper') as HTMLElement;
          if (tableWrapper) {
            saveToHistory();
            addTableRow(tableWrapper);
            const newRow = table.querySelector('tr:last-child');
            const newCells = newRow?.querySelectorAll('td');
            nextCell = newCells?.[0] as HTMLTableCellElement;
            emitChange();
          }
        }
      }
      
      if (nextCell) {
        nextCell.focus();
        // Select all content in the cell
        const range = document.createRange();
        range.selectNodeContents(nextCell);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      return;
    }

    // Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      // Don't split code blocks on enter
      if (blockType === 'code') return;
      
      // For lists, handle specially
      if (blockType === 'bulletList' || blockType === 'numberedList' || blockType === 'checkList') {
        const li = target.closest('li');
        if (!li) return;
        
        // Get the editable content element
        const editableContent = blockType === 'checkList' 
          ? li.querySelector('.cb-checklist-content') as HTMLElement
          : li;
        
        // Check if the list item is empty
        const content = editableContent?.textContent?.trim() || '';
        
        if (content === '') {
          // Empty list item - exit list and create paragraph
          e.preventDefault();
          saveToHistoryImmediate(); // Use immediate save for structural change
          
          const listElement = li.closest('ul, ol') as HTMLElement;
          const wrapper = block;
          
          // Check if this is a nested list
          const isNested = li.parentElement?.classList.contains('cb-nested-list');
          
          if (isNested) {
            // Outdent the item instead of exiting
            const parentList = li.parentElement as HTMLElement;
            const parentLi = parentList.parentElement as HTMLElement;
            const grandparentList = parentLi.parentElement as HTMLElement;
            
            if (grandparentList) {
              grandparentList.insertBefore(li, parentLi.nextSibling);
              if (parentList.children.length === 0) {
                parentList.remove();
              }
              // Focus the moved item
              const focusTarget = blockType === 'checkList' 
                ? li.querySelector('.cb-checklist-content') as HTMLElement
                : li;
              if (focusTarget) {
                focusTarget.focus();
              }
            }
          } else {
            // Top-level empty item - check if it's the only item
            const items = listElement?.querySelectorAll(':scope > li');
            
            if (items && items.length === 1) {
              // Only one item, transform the entire block to paragraph
              if (blockId) {
                transformBlockType(blockId, 'paragraph');
              }
            } else {
              // Remove this item and create a paragraph after the list
              li.remove();
              insertBlockAfter('paragraph', blockId || undefined);
            }
          }
          
          emitChange();
          return;
        }
        
        // Non-empty item - create new list item
        e.preventDefault();
        saveToHistory();
        
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        
        // Get content after cursor
        let afterContent = '';
        if (range && editableContent) {
          const afterRange = document.createRange();
          afterRange.setStart(range.endContainer, range.endOffset);
          afterRange.setEndAfter(editableContent.lastChild || editableContent);
          const fragment = afterRange.extractContents();
          const temp = document.createElement('div');
          temp.appendChild(fragment);
          afterContent = temp.innerHTML;
        }
        
        // Create new list item
        const newLi = document.createElement('li');
        newLi.className = 'cb-list-item';
        newLi.setAttribute('data-item-id', generateId());
        
        if (blockType === 'checkList') {
          const wrapper = document.createElement('div');
          wrapper.className = 'cb-checklist-wrapper';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'cb-checkbox';
          checkbox.setAttribute('tabindex', '-1');
          
          const contentSpan = document.createElement('span');
          contentSpan.className = 'cb-checklist-content';
          contentSpan.setAttribute('contenteditable', 'true');
          contentSpan.innerHTML = afterContent;
          
          wrapper.appendChild(checkbox);
          wrapper.appendChild(contentSpan);
          newLi.appendChild(wrapper);
          
          li.after(newLi);
          contentSpan.focus();
          moveCursorToStart(contentSpan);
        } else {
          newLi.setAttribute('contenteditable', 'true');
          newLi.innerHTML = afterContent;
          
          li.after(newLi);
          newLi.focus();
          moveCursorToStart(newLi);
        }
        
        emitChange();
        return;
      }
      
      e.preventDefault();
      saveToHistory();
      
      // Create new paragraph after current block
      insertBlockAfter('paragraph', blockId || undefined);
      return;
    }

    // Backspace at start
    if (e.key === 'Backspace' && isCursorAtStart(target)) {
      // Transform to paragraph or merge
      if (blockType && blockType !== 'paragraph' && blockType !== 'divider') {
        e.preventDefault();
        if (blockId) transformBlockType(blockId, 'paragraph');
        return;
      }
      
      // Merge with previous block
      const prevBlock = block?.previousElementSibling as HTMLElement;
      if (prevBlock && prevBlock.classList.contains('cb-block')) {
        const prevType = prevBlock.getAttribute('data-block-type');
        if (prevType !== 'divider' && prevType !== 'image' && prevType !== 'video') {
          e.preventDefault();
          saveToHistoryImmediate(); // Use immediate save for merge operation
          
          const prevEditable = prevBlock.querySelector('[contenteditable="true"]') as HTMLElement;
          const currentContent = target.innerHTML;
          
          if (prevEditable && currentContent) {
            prevEditable.innerHTML += currentContent;
          }
          
          if (prevEditable) {
            moveCursorToEnd(prevEditable);
            prevEditable.focus();
          }
          
          if (blockId) deleteBlockById(blockId);
        }
      }
      return;
    }
    
    // Handle Delete/Backspace when entire editor is selected (Ctrl+A twice)
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (!selection || !contentRef.current) return;
      
      // Check if the entire editor content is selected
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (range && 
          range.startContainer === contentRef.current && 
          range.endContainer === contentRef.current &&
          range.startOffset === 0 &&
          range.endOffset === contentRef.current.childNodes.length) {
        // Entire editor is selected - clear everything and create one empty paragraph
        e.preventDefault();
        saveToHistoryImmediate();
        
        contentRef.current.innerHTML = '';
        const block = createBlockWithControls('paragraph');
        contentRef.current.appendChild(block);
        
        // Focus the new empty block
        setTimeout(() => {
          const editable = block.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editable) {
            editable.focus();
          }
        }, 0);
        
        updateState();
        emitChange();
        return;
      }
    }

    // Slash command
    if (e.key === '/' && isCursorAtStart(target) && target.textContent === '') {
      e.preventDefault();
      const rect = block.getBoundingClientRect();
      setBlockMenuPosition({ x: rect.left, y: rect.bottom + 8 });
      setShowBlockMenu(true);
      if (blockId) setActiveBlockId(blockId);
      return;
    }

    // Arrow navigation between blocks
    if (e.key === 'ArrowUp' && isCursorAtStart(target)) {
      const prevBlock = block?.previousElementSibling as HTMLElement;
      if (prevBlock && prevBlock.classList.contains('cb-block')) {
        e.preventDefault();
        const prevEditable = prevBlock.querySelector('[contenteditable="true"]') as HTMLElement;
        if (prevEditable) {
          prevEditable.focus();
          moveCursorToEnd(prevEditable);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown' && isCursorAtEnd(target)) {
      const nextBlock = block?.nextElementSibling as HTMLElement;
      if (nextBlock && nextBlock.classList.contains('cb-block')) {
        e.preventDefault();
        const nextEditable = nextBlock.querySelector('[contenteditable="true"]') as HTMLElement;
        if (nextEditable) {
          nextEditable.focus();
          moveCursorToStart(nextEditable);
        }
      }
      return;
    }
  }, [
    readOnly, showBlockMenu, selectedBlockIds, saveToHistoryImmediate, createBlockWithControls,
    updateState, emitChange, insertBlockAfter, deleteBlockById, transformBlockType,
    handleUndo, handleRedo, onSave, getHTML
  ]);

  // Handle input
  const handleInput = useCallback((e?: React.FormEvent<HTMLDivElement>) => {
    // Check for markdown shortcuts
    if (e?.target instanceof HTMLElement) {
      const target = e.target;
      const block = target.closest('.cb-block');
      const blockType = block?.getAttribute('data-block-type');
      const blockId = block?.getAttribute('data-block-id');
      
      // Only process markdown shortcuts for paragraph blocks
      if (blockType === 'paragraph' && blockId) {
        const text = target.textContent || '';
        
        // Check for markdown patterns at the start of the block
        // Pattern: "- " for bullet list
        if (text === '- ' || text === '* ') {
          target.textContent = '';
          transformBlockType(blockId, 'bulletList');
          return;
        }
        
        // Pattern: "1. " for numbered list
        if (/^\d+\.\s$/.test(text)) {
          target.textContent = '';
          transformBlockType(blockId, 'numberedList');
          return;
        }
        
        // Pattern: "> " for quote
        if (text === '> ') {
          target.textContent = '';
          transformBlockType(blockId, 'quote');
          return;
        }
      }
    }
    
    updateState();
    emitChange();
    saveToHistory(); // Debounced save on content change
  }, [updateState, emitChange, saveToHistory, transformBlockType]);

  /**
   * Handle keyboard events at container level (for global shortcuts like Ctrl+Z)
   * This ensures undo/redo works even when no contenteditable is focused
   */
  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    
    // Escape key - clear block selection
    if (e.key === 'Escape') {
      if (selectedBlockIds.size > 0) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🧹 Escape pressed - clearing selection');
        const emptySet = new Set<string>();
        selectedBlockIdsRef.current = emptySet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
        setSelectedBlockIds(emptySet);
        return;
      }
    }
    
    // Handle global shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Shift+A - Select all blocks
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        e.stopPropagation();
        
        const allBlocks = contentRef.current?.querySelectorAll('.cb-block');
        if (allBlocks && allBlocks.length > 0) {
          const allBlockIds = Array.from(allBlocks)
            .map(block => block.getAttribute('data-block-id'))
            .filter(id => id !== null) as string[];
          
          const newSet = new Set(allBlockIds);
          selectedBlockIdsRef.current = newSet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
          setSelectedBlockIds(newSet);
          console.log('📦 Selected all', allBlockIds.length, 'blocks');
          
          // Focus container to keep keyboard shortcuts active
          if (containerRef.current) {
            containerRef.current.focus();
          }
        }
        return;
      }
      
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      
      if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }
    }
  }, [readOnly, handleUndo, handleRedo, selectedBlockIds]);

  /**
   * Handle clicks on the editor container to keep it "active"
   * This ensures keyboard shortcuts work even when clicking empty space
   * Also clears block selection when clicking outside blocks (unless Shift is held)
   */
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // If clicking inside the editor but not on a contenteditable element,
    // focus the container so keyboard shortcuts work
    if (!containerRef.current) return;
    
    const target = e.target as HTMLElement;
    const clickedContentEditable = target.closest('[contenteditable="true"]');
    const clickedBlock = target.closest('.cb-block');
    const clickedDragHandle = target.closest('.cb-block-drag');
    
    // Clear selection if:
    // 1. Not holding Shift (multi-select modifier)
    // 2. Not clicking on a block or drag handle
    // 3. Have blocks currently selected
    if (!e.shiftKey && !clickedBlock && !clickedDragHandle && selectedBlockIds.size > 0) {
      console.log('🧹 Clearing selection - clicked outside blocks');
      const emptySet = new Set<string>();
      selectedBlockIdsRef.current = emptySet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
      setSelectedBlockIds(emptySet);
    }
    
    // If not clicking on a contenteditable, focus the container
    if (!clickedContentEditable) {
      // Focus the container to enable keyboard shortcuts
      containerRef.current.focus();
    }
  }, [selectedBlockIds]);

  /**
   * Handle copy - extract clean semantic HTML without editor UI
   * This ensures copied content is pristine and professional
   * Handles both text selection and multi-block selection
   */
  const handleCopy = useCallback((e: React.ClipboardEvent) => {
    // Priority 1: Multi-block selection (via Shift+Click)
    if (selectedBlockIds.size > 0) {
      e.preventDefault();
      console.log('📋 Copying', selectedBlockIds.size, 'selected blocks');
      
      // Get clean HTML from selected blocks
      const cleanHTML = getCleanSelectionHTML();
      
      // Get plain text from selected blocks
      const allBlocks = Array.from(contentRef.current?.querySelectorAll('.cb-block') || []);
      const selectedBlocks = allBlocks.filter(b => selectedBlockIds.has(b.getAttribute('data-block-id') || ''));
      const plainText = selectedBlocks.map(b => b.textContent || '').join('\n\n');
      
      // Set clipboard data
      e.clipboardData.setData('text/html', cleanHTML);
      e.clipboardData.setData('text/plain', plainText);
      return;
    }
    
    // Priority 2: Text selection
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    
    // Check if selection is within our editor
    const range = selection.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) return;
    
    e.preventDefault();
    
    // Get clean HTML without editor artifacts
    const cleanHTML = getCleanSelectionHTML();
    const plainText = selection.toString();
    
    // Set both HTML and plain text in clipboard
    e.clipboardData.setData('text/html', cleanHTML);
    e.clipboardData.setData('text/plain', plainText);
  }, [selectedBlockIds, getCleanSelectionHTML]);

  /**
   * Handle cut - same as copy but also delete selection
   * Handles both text selection and multi-block selection
   */
  const handleCut = useCallback((e: React.ClipboardEvent) => {
    // Priority 1: Multi-block selection (via Shift+Click)
    if (selectedBlockIds.size > 0) {
      e.preventDefault();
      console.log('✂️ Cutting', selectedBlockIds.size, 'selected blocks');
      
      // Get clean HTML from selected blocks
      const cleanHTML = getCleanSelectionHTML();
      
      // Get plain text from selected blocks
      const allBlocks = Array.from(contentRef.current?.querySelectorAll('.cb-block') || []);
      const selectedBlocks = allBlocks.filter(b => selectedBlockIds.has(b.getAttribute('data-block-id') || ''));
      const plainText = selectedBlocks.map(b => b.textContent || '').join('\n\n');
      
      // Set clipboard data
      e.clipboardData.setData('text/html', cleanHTML);
      e.clipboardData.setData('text/plain', plainText);
      
      // Delete selected blocks
      saveToHistoryImmediate();
      selectedBlockIds.forEach(blockId => {
        const block = contentRef.current?.querySelector(`[data-block-id="${blockId}"]`);
        block?.remove();
      });
      
      const emptySet = new Set<string>();
      selectedBlockIdsRef.current = emptySet; // HIGH-PRIORITY FIX (Bug #4): Sync ref immediately
      setSelectedBlockIds(emptySet);
      
      // Ensure at least one block remains
      if (contentRef.current && contentRef.current.children.length === 0) {
        const newBlock = createBlockWithControls('paragraph');
        contentRef.current.appendChild(newBlock);
        setTimeout(() => {
          const editable = newBlock.querySelector('[contenteditable="true"]') as HTMLElement;
          editable?.focus();
        }, 0);
      }
      
      updateState();
      emitChange();
      return;
    }
    
    // Priority 2: Text selection
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;
    
    // Check if selection is within our editor
    const range = selection.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) return;
    
    e.preventDefault();
    
    // Get clean HTML without editor artifacts
    const cleanHTML = getCleanSelectionHTML();
    const plainText = selection.toString();
    
    // Set clipboard data
    e.clipboardData.setData('text/html', cleanHTML);
    e.clipboardData.setData('text/plain', plainText);
    
    // Delete the selection
    saveToHistoryImmediate(); // Use immediate save (was debounced before - bug!)
    document.execCommand('delete');
    updateState();
    emitChange();
  }, [selectedBlockIds, getCleanSelectionHTML, saveToHistory, saveToHistoryImmediate, updateState, emitChange, createBlockWithControls]);

  /**
   * Handle paste - create proper blocks instead of merging into one
   * Detects block structure and recreates blocks professionally
   */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return;
    
    e.preventDefault();
    saveToHistoryImmediate(); // Use immediate save for paste operation
    
    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    if (!html && !plainText) return;
    
    console.log('📥 Pasting content, HTML length:', html.length, 'blocks selected:', selectedBlockIds.size);
    
    // Parse HTML to detect blocks
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html || plainText.replace(/\n/g, '<br>');
    
    // Check if pasted content contains block-level elements
    const pastedBlocks = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, pre, hr, table, figure, details, aside, div.cb-callout, div.cb-code');
    
    if (pastedBlocks.length > 0) {
      console.log('📦 Pasting', pastedBlocks.length, 'blocks');
      
      // Multi-block paste - create actual blocks
      const currentBlock = document.activeElement?.closest('.cb-block') as HTMLElement;
      const currentBlockId = currentBlock?.getAttribute('data-block-id');
      
      let previousBlockId = currentBlockId || undefined;
      
      pastedBlocks.forEach((element) => {
        if (!(element instanceof HTMLElement)) return;
        
        const blockType = detectBlockType(element);
        const blockData = extractBlockData(element, blockType);
        
        // Create new block
        const newBlock = insertBlockAfter(blockType, previousBlockId, blockData);
        if (newBlock) {
          previousBlockId = newBlock.getAttribute('data-block-id') || undefined;
        }
      });
      
      // Clear the current block if it was empty
      if (currentBlock) {
        const editable = currentBlock.querySelector('[contenteditable="true"]');
        if (editable && editable.textContent?.trim() === '') {
          const blockId = currentBlock.getAttribute('data-block-id');
          if (blockId) {
            deleteBlockById(blockId);
          }
        }
      }
      
      // Clear multi-block selection after paste
      if (selectedBlockIds.size > 0) {
        console.log('🧹 Clearing multi-block selection after paste');
        setSelectedBlockIds(new Set());
      }
    } else {
      // Inline paste - sanitize and insert
      const cleanHtml = sanitizePaste(e.clipboardData);
      document.execCommand('insertHTML', false, cleanHtml);
    }
    
    updateState();
    emitChange();
  }, [readOnly, selectedBlockIds, saveToHistoryImmediate, insertBlockAfter, deleteBlockById, detectBlockType, extractBlockData, updateState, emitChange]);

  // Handle focus
  const handleFocus = useCallback((e: React.FocusEvent) => {
    const block = (e.target as HTMLElement).closest('.cb-block') as HTMLElement;
    const blockId = block?.getAttribute('data-block-id');
    setActiveBlockId(blockId);
    if (onFocus) onFocus();
  }, [onFocus]);

  // Handle blur
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setActiveBlockId(null);
    if (onBlur) onBlur();
  }, [onBlur]);

  // Handle block selection from menu
  const handleBlockMenuSelect = useCallback((type: BlockType, data?: Record<string, any>, inline?: boolean) => {
    setShowBlockMenu(false);
    
    // Handle inline elements (like date)
    if (inline) {
      if (type === 'date') {
        // Insert today's date inline
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const today = new Date();
        
        // Format date function (same as Toolbar)
        const formatDate = (date: Date): string => {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          
          const dayName = days[date.getDay()];
          const day = date.getDate();
          const monthName = months[date.getMonth()];
          const year = date.getFullYear();
          
          return `${dayName}, ${day} ${monthName} ${year}`;
        };
        
        // Create date span element
        const dateSpan = document.createElement('span');
        dateSpan.className = 'cb-date-inline';
        dateSpan.setAttribute('data-date', today.toISOString());
        dateSpan.setAttribute('contenteditable', 'false');
        dateSpan.textContent = formatDate(today);
        
        // If we have an active block, make sure we insert into its editable area
        if (activeBlockId) {
          const currentBlock = contentRef.current?.querySelector(`[data-block-id="${activeBlockId}"]`);
          const editable = currentBlock?.querySelector('[contenteditable="true"]');
          
          if (editable) {
            // Focus the editable element first
            (editable as HTMLElement).focus();
            
            // Get selection again after focusing
            const newSelection = window.getSelection();
            if (newSelection && newSelection.rangeCount > 0) {
              const newRange = newSelection.getRangeAt(0);
              newRange.deleteContents();
              newRange.insertNode(dateSpan);
              
              // Add a space after the date
              const space = document.createTextNode(' ');
              newRange.setStartAfter(dateSpan);
              newRange.insertNode(space);
              
              // Move cursor after the space
              newRange.setStartAfter(space);
              newRange.setEndAfter(space);
              newSelection.removeAllRanges();
              newSelection.addRange(newRange);
            }
          }
        } else {
          // Insert at cursor
          range.deleteContents();
          range.insertNode(dateSpan);
          
          // Move cursor after the date
          range.setStartAfter(dateSpan);
          range.setEndAfter(dateSpan);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      return;
    }
    
    // Normal block insertion
    if (activeBlockId) {
      // Check if current block is empty - if so, transform it
      const currentBlock = contentRef.current?.querySelector(`[data-block-id="${activeBlockId}"]`);
      const editable = currentBlock?.querySelector('[contenteditable="true"]');
      
      if (editable && editable.textContent?.trim() === '') {
        // For headings with level data, we need to handle specially
        if (type === 'heading' && data?.level) {
          transformBlockType(activeBlockId, type, data);
        } else {
          transformBlockType(activeBlockId, type);
        }
      } else {
        insertBlockAfter(type, activeBlockId, data);
      }
    } else {
      insertBlockAfter(type, undefined, data);
    }
  }, [activeBlockId, transformBlockType, insertBlockAfter]);

  // Mouse enter/leave for block hover
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const block = (e.target as HTMLElement).closest('.cb-block') as HTMLElement;
    const blockId = block?.getAttribute('data-block-id');
    setHoveredBlockId(blockId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredBlockId(null);
  }, []);

  // MEDIUM-PRIORITY FIX (Bug #3): Cleanup debounced function on unmount to prevent memory leaks
  // Cancel any pending debounced saves when component unmounts
  useEffect(() => {
    return () => {
      debouncedSaveToHistory.cancel();
    };
  }, [debouncedSaveToHistory]);

  const editorClasses = [
    `${classPrefix}-editor`,
    darkMode ? `${classPrefix}-dark` : `${classPrefix}-light`,
    readOnly ? `${classPrefix}-readonly` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={containerRef} 
      className={editorClasses} 
      style={style} 
      data-editor-root
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      onClick={handleContainerClick}
    >
      {showToolbar && toolbarPosition === 'top' && editorInstance && (
        <Toolbar editor={editorInstance} darkMode={darkMode} />
      )}

      <div
        ref={contentRef}
        className={`${classPrefix}-content`}
        onClick={(e) => {
          handleBlockClick(e);
          handleBlockControlClick(e);
        }}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseOver={handleMouseEnter}
        onMouseOut={handleMouseLeave}
        data-placeholder={placeholder}
        spellCheck={spellCheck}
        role="textbox"
        aria-multiline="true"
        aria-label="Content editor"
      />

      {showToolbar && toolbarPosition === 'bottom' && editorInstance && (
        <Toolbar editor={editorInstance} darkMode={darkMode} />
      )}

      {showBlockMenu && editorInstance && (
        <BlockMenu
          editor={editorInstance}
          position={blockMenuPosition}
          onSelect={handleBlockMenuSelect}
          onClose={() => setShowBlockMenu(false)}
        />
      )}

      <StatusBar
        wordCount={editorState.wordCount}
        charCount={editorState.charCount}
        readingTime={calculateReadingTime(editorState.wordCount)}
        selectedBlockCount={selectedBlockIds.size}
        darkMode={darkMode}
      />
    </div>
  );
};

export const ContentBlocksEditor = forwardRef(ContentBlocksEditorInner);
