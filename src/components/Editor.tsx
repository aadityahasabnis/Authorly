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
  const undoStackRef = useRef<string[]>([]); // Ref for undo stack to avoid stale closures
  const redoStackRef = useRef<string[]>([]); // Ref for redo stack to avoid stale closures
  const [isMounted, setIsMounted] = useState(false); // Track mount state for toolbar
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
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

  // Track selection changes to update toolbar active states
  useEffect(() => {
    const handleSelectionChange = () => {
      // Only update if selection is within our editor
      const selection = window.getSelection();
      if (selection && contentRef.current?.contains(selection.anchorNode)) {
        setSelectionVersion(v => v + 1);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

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
    
    // Initialize drag and drop
    if (!readOnly && contentRef.current) {
      initDragDrop({
        container: contentRef.current,
        handleSelector: '[data-drag-handle]',
        onDragEnd: () => {
          updateState();
          emitChange();
        },
      });
    }
  }, [readOnly]);

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
            id: generateId(),
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
    
    return data;
  };

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

  const saveToHistory = useCallback(() => {
    const currentHTML = getHTML();
    undoStackRef.current = [...undoStackRef.current.slice(-49), currentHTML];
    redoStackRef.current = [];
    setEditorState(prev => ({
      ...prev,
      undoStack: undoStackRef.current,
      redoStack: [],
      isDirty: true,
    }));
  }, [getHTML]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    const current = getHTML();
    const previous = undoStackRef.current[undoStackRef.current.length - 1];

    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, current];

    setEditorState(prev => ({
      ...prev,
      undoStack: undoStackRef.current,
      redoStack: redoStackRef.current,
    }));

    setHTML(previous, true); // true = restore focus
  }, [getHTML, setHTML]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    const current = getHTML();
    const next = redoStackRef.current[redoStackRef.current.length - 1];

    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, current];

    setEditorState(prev => ({
      ...prev,
      redoStack: redoStackRef.current,
      undoStack: undoStackRef.current,
    }));

    setHTML(next, true); // true = restore focus
  }, [getHTML, setHTML]);

  // Insert a new block
  const insertBlockAfter = useCallback((type: BlockType, afterBlockId?: string, data?: Partial<BlockData>): HTMLElement | null => {
    if (!contentRef.current) return null;
    
    saveToHistory();
    
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
  }, [createBlockWithControls, saveToHistory, updateState, emitChange]);

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
    
    saveToHistory();
    
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
  }, [saveToHistory, updateState, emitChange]);

  // Move block up/down
  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down'): void => {
    if (!contentRef.current) return;
    
    const block = contentRef.current.querySelector(`[data-block-id="${blockId}"]`);
    if (!block) return;
    
    saveToHistory();
    
    if (direction === 'up' && block.previousElementSibling) {
      block.previousElementSibling.before(block);
    } else if (direction === 'down' && block.nextElementSibling) {
      block.nextElementSibling.after(block);
    }
    
    updateState();
    emitChange();
  }, [saveToHistory, updateState, emitChange]);

  // Transform block to different type
  const transformBlockType = useCallback((blockId: string, newType: BlockType, data?: Record<string, any>): void => {
    if (!contentRef.current) return;
    
    const wrapper = contentRef.current.querySelector(`[data-block-id="${blockId}"]`);
    if (!wrapper) return;
    
    const currentType = wrapper.getAttribute('data-block-type');
    if (currentType === newType && !data) return;
    
    saveToHistory();
    
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
  }, [createBlockWithControls, saveToHistory, updateState, emitChange]);

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
    
    saveToHistory();
    
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
  }, [saveToHistory, emitChange]);

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
        saveToHistory();
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
              saveToHistory();
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
          saveToHistory();
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
            saveToHistory();
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
    
    return () => {
      container.removeEventListener('mousedown', handleResizeStart);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [readOnly, saveToHistory, emitChange]);

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
          saveToHistory();
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
          saveToHistory();
          addTableRow(tableWrapper);
          emitChange();
        }
        break;
      }
      case 'addCol': {
        const tableWrapper = button.closest('.cb-table-wrapper') as HTMLElement;
        if (tableWrapper) {
          saveToHistory();
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
              saveToHistory();
              deleteTableRow(tableWrapper, pos.row);
              emitChange();
            }
          } else {
            // Delete last row if no cell is focused
            const table = tableWrapper.querySelector('table');
            const rows = table?.querySelectorAll('tr');
            if (rows && rows.length > 1) {
              saveToHistory();
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
              saveToHistory();
              deleteTableColumn(tableWrapper, pos.col);
              emitChange();
            }
          } else {
            // Delete last column if no cell is focused
            const table = tableWrapper.querySelector('table');
            const firstRow = table?.querySelector('tr');
            const cells = firstRow?.querySelectorAll('th, td');
            if (cells && cells.length > 1) {
              saveToHistory();
              deleteTableColumn(tableWrapper, cells.length - 1);
              emitChange();
            }
          }
        }
        break;
      }
    }
  }, [deleteBlockById, moveBlock, saveToHistory, emitChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    
    // Don't handle keys if block menu is open (let it handle its own keys)
    if (showBlockMenu) return;

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
            saveToHistory();
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
          saveToHistory();
          
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
          saveToHistory();
          
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
    readOnly, saveToHistory, insertBlockAfter, deleteBlockById, transformBlockType,
    handleUndo, handleRedo, onSave, getHTML, emitChange
  ]);

  // Handle input
  const handleInput = useCallback(() => {
    updateState();
    emitChange();
  }, [updateState, emitChange]);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return;
    
    e.preventDefault();
    saveToHistory();
    
    const cleanHtml = sanitizePaste(e.clipboardData);
    document.execCommand('insertHTML', false, cleanHtml);
    
    updateState();
    emitChange();
  }, [readOnly, saveToHistory, updateState, emitChange]);

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
  const handleBlockMenuSelect = useCallback((type: BlockType, data?: Record<string, any>) => {
    setShowBlockMenu(false);
    
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

  const editorClasses = [
    `${classPrefix}-editor`,
    darkMode ? `${classPrefix}-dark` : `${classPrefix}-light`,
    readOnly ? `${classPrefix}-readonly` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className={editorClasses} style={style} data-editor-root>
      {showToolbar && toolbarPosition === 'top' && editorInstance && (
        <Toolbar editor={editorInstance} darkMode={darkMode} />
      )}

      <div
        ref={contentRef}
        className={`${classPrefix}-content`}
        onClick={handleBlockControlClick}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
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
        darkMode={darkMode}
      />
    </div>
  );
};

export const ContentBlocksEditor = forwardRef(ContentBlocksEditorInner);
