/**
 * AuthorlyEditor - Main React Component
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
  AuthorlyEditorProps,
  EditorInstance,
  BlockType,
  BlockData,
  EditorState,
  InlineFormat,
} from '../core/types';
import { blockRegistry } from '../core/block-registry';
import { allBlocks } from '../blocks';
import { sanitizePaste } from '../paste/sanitize';
import { initDragDrop } from '../drag/drag-handle';
import {
  isCursorAtStart,
  isCursorAtEnd,
  moveCursorToEnd,
  moveCursorToStart,
} from '../core/selection';
import {
  generateId,
  debounce,
  countWords,
  countCharacters,
} from '../utils/helpers';
import { Toolbar } from './Toolbar';
import { SelectionToolbar } from './SelectionToolbar';
import { BlockMenu } from './BlockMenu';
import { StatusBar, calculateReadingTime } from './StatusBar';
import { ExcalidrawModal } from './ExcalidrawModal';

// Type declarations for Excalidraw - using any for now to avoid import path issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = any;
import { addTableRow, addTableColumn, deleteTableRow, deleteTableColumn, getFocusedCell, getCellPosition } from '../blocks/table';
import { setImageSrc, createImageFromFile, setImageAlign, createCropModal } from '../blocks/image';
import { setVideoSrc } from '../blocks/video';
import { setCalloutType } from '../blocks/callout';
import { ImageUploadService } from '../services/uploadService';
import { optimizeCloudinaryUrl, generateCloudinarySrcset } from '../services/cloudinaryUpload';

export interface GetHTMLOptions {
  /** Remove editor UI elements like controls (default: true) */
  stripEditorUI?: boolean;
  /** Remove data-block-id attributes (default: true) */
  stripDataAttributes?: boolean;
  /** Add Cloudinary optimization params (default: true) */
  optimizeImages?: boolean;
  /** Generate responsive srcset for Cloudinary images (default: true) */
  addResponsiveImages?: boolean;
}

export interface EditorRef {
  getHTML: (options?: GetHTMLOptions) => string;
  setHTML: (html: string) => void;
  getText: () => string;
  focus: () => void;
  blur: () => void;
  insertBlock: (type: BlockType, data?: Partial<BlockData>) => HTMLElement | null;
  getEditor: () => EditorInstance | null;
}

const AuthorlyEditorInner: React.ForwardRefRenderFunction<
  EditorRef,
  AuthorlyEditorProps
> = (props, ref) => {
  const {
    initialContent = '',
    blocks: _enabledBlocks, // Reserved for future filtering
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
    imageUploadConfig,
    onUploadStart,
    onUploadSuccess,
    onUploadError,
    onUploadProgress,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialContentLoadedRef = useRef(false); // Track if initial content was loaded
  const saveToHistoryImmediateRef = useRef<(() => void) | null>(null); // Ref for history save function

  // Enhanced history with cursor position tracking and operation descriptions
  interface HistoryEntry {
    html: string;
    cursorPosition: {
      blockId: string | null;
      offset: number;
      isCollapsed: boolean;
    } | null;
    selectedBlockIds: string[]; // Track multi-block selection
    operation?: string; // Description of the operation
    timestamp: number; // When this entry was created
  }

  const undoStackRef = useRef<HistoryEntry[]>([]); // Enhanced undo stack
  const redoStackRef = useRef<HistoryEntry[]>([]); // Enhanced redo stack
  const selectedBlockIdsRef = useRef<Set<string>>(new Set()); // Ref for current selection (avoids closure issues)
  const lastSaveTimestampRef = useRef<number>(0); // PROFESSIONAL FIX: Track last save time to prevent duplicate rapid saves
  const [isMounted, setIsMounted] = useState(false); // Track mount state for toolbar
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set()); // Multi-block selection
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ x: 0, y: 0 });
  const [_hoveredBlockId, _setHoveredBlockId] = useState<string | null>(null); // Reserved for future hover effects
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

  // Excalidraw modal state
  const [excalidrawModal, setExcalidrawModal] = useState<{
    isOpen: boolean;
    blockId: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialElements: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialAppState: any;
  }>({
    isOpen: false,
    blockId: null,
    initialElements: [],
    initialAppState: {},
  });

  // Initialize upload service if config provided
  const uploadService = useMemo(() =>
    imageUploadConfig
      ? new ImageUploadService(imageUploadConfig)
      : null,
    [imageUploadConfig]
  );

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

  // Helper: Update image placeholders with upload service indicator
  const updateImagePlaceholders = useCallback((container: HTMLElement) => {
    const placeholders = container.querySelectorAll('.cb-image-placeholder-hint');
    
    placeholders.forEach(hint => {
      // Don't update if already has indicator
      if (hint.querySelector('.cb-upload-service-badge')) return;
      
      // Determine upload service
      let serviceName = 'Base64 (Local)';
      let serviceColor = '#f59e0b'; // Amber/warning color
      let serviceIcon = '💾';
      
      if (uploadService) {
        const config = imageUploadConfig;
        if (config?.provider === 'cloudinary') {
          serviceName = 'Cloudinary';
          serviceColor = '#3448c5'; // Cloudinary blue
          serviceIcon = '☁️';
        } else if (config?.provider === 's3') {
          serviceName = 'AWS S3';
          serviceColor = '#ff9900'; // AWS orange
          serviceIcon = '🗄️';
        } else if (config?.provider === 'custom') {
          serviceName = 'Custom Upload';
          serviceColor = '#10b981'; // Green
          serviceIcon = '🔧';
        }
      }
      
      // Add service indicator badge
      const badge = document.createElement('span');
      badge.className = 'cb-upload-service-badge';
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 8px;
        padding: 2px 8px;
        background: ${serviceColor}15;
        color: ${serviceColor};
        border: 1px solid ${serviceColor}40;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        vertical-align: middle;
      `;
      badge.innerHTML = `<span style="font-size: 12px;">${serviceIcon}</span> ${serviceName}`;
      
      // Append badge to hint
      hint.appendChild(badge);
    });
  }, [uploadService, imageUploadConfig]);

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

    // Add upload service indicator for image blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (type === 'image' && !(data as any)?.src) {
      setTimeout(() => updateImagePlaceholders(wrapper), 0);
    }

    return wrapper;
  }, [updateImagePlaceholders]);

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

    // Add upload service indicators to image placeholders
    if (contentRef.current) {
      updateImagePlaceholders(contentRef.current);
    }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { type };

    // CRITICAL FIX (Bug #17): Never preserve data-block-id from pasted content
    // Always generate fresh IDs to prevent duplicates
    // The 'id' field will be auto-generated by createBlockWithControls

    switch (type) {
      case 'heading': {
        const level = parseInt(element.tagName.charAt(1)) || 2;
        data.level = level;
        data.content = element.innerHTML;
        break;
      }
      case 'paragraph':
        data.content = element.innerHTML;
        break;
      case 'bulletList':
      case 'numberedList':
      case 'checkList': {
        const items: Array<{id: string; content: string; checked?: boolean}> = [];
        element.querySelectorAll(':scope > li').forEach(li => {
          items.push({
            id: generateId(), // Fresh ID for each list item
            content: li.innerHTML,
            checked: li.querySelector('input[type="checkbox"]')?.hasAttribute('checked'),
          });
        });
        data.items = items;
        break;
      }
      case 'quote':
        data.content = element.innerHTML;
        break;
      case 'code': {
        const code = element.querySelector('code') || element;
        data.content = code.textContent || '';
        data.language = element.getAttribute('data-language') || 'plaintext';
        break;
      }
      case 'image': {
        const img = element.querySelector('img');
        data.src = img?.src || '';
        data.alt = img?.alt || '';
        data.caption = element.querySelector('figcaption')?.textContent || '';
        break;
      }
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
      case 'table': {
        // Parse table structure
        const rows: Array<{cells: Array<{content: string}>}> = [];
        element.querySelectorAll('tr').forEach(tr => {
          const cells: Array<{content: string}> = [];
          tr.querySelectorAll('th, td').forEach(cell => {
            cells.push({ content: cell.innerHTML });
          });
          rows.push({ cells });
        });
        data.rows = rows;
        break;
      }
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
  const getHTML = useCallback((options: GetHTMLOptions = {}): string => {
    const {
      stripEditorUI = true,
      stripDataAttributes = true,
      optimizeImages = true,
      addResponsiveImages = true,
    } = options;

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

      if (stripEditorUI) {
        // Remove all editor UI controls
        clone.querySelectorAll('.cb-code-toolbar, .cb-image-controls, .cb-table-controls, .cb-callout-type-selector').forEach(el => el.remove());
        
        // Remove image editor UI elements (uploading state, alt text input, resize handles)
        clone.querySelectorAll('.cb-image-uploading, .cb-image-error, .cb-image-alt-editor').forEach(el => el.remove());
        
        // Remove resize handles and unwrap resizable wrapper for clean HTML
        clone.querySelectorAll('.cb-image-resizable').forEach(wrapper => {
          const img = wrapper.querySelector('img');
          if (img && wrapper.parentElement) {
            // Move img out of resizable wrapper
            wrapper.parentElement.appendChild(img);
          }
          wrapper.remove();
        });
        
        // Remove image container wrapper for clean semantic HTML
        clone.querySelectorAll('.cb-image-container').forEach(container => {
          const img = container.querySelector('img');
          if (img && container.parentElement) {
            // Move img out of container
            container.parentElement.insertBefore(img, container);
          }
          container.remove();
        });
        
        // Remove all editor CSS classes (cb-* prefix) from all elements
        const stripEditorClasses = (element: HTMLElement) => {
          if (element.className) {
            const classes = Array.from(element.classList);
            const cleanClasses = classes.filter(cls => !cls.startsWith('cb-'));
            if (cleanClasses.length > 0) {
              element.className = cleanClasses.join(' ');
            } else {
              element.removeAttribute('class');
            }
          }
          // Recursively clean child elements
          Array.from(element.children).forEach(child => {
            if (child instanceof HTMLElement) {
              stripEditorClasses(child);
            }
          });
        };
        stripEditorClasses(clone);
      }

      if (stripDataAttributes) {
        // Remove internal data attributes
        clone.removeAttribute('data-block-id');
        clone.querySelectorAll('[data-block-id]').forEach(el => el.removeAttribute('data-block-id'));
      }

      // Optimize images
      if (optimizeImages || addResponsiveImages) {
        clone.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src');
          if (!src) return;

          // Check if it's a Cloudinary URL
          if (src.includes('cloudinary.com')) {
            if (optimizeImages) {
              // Add optimization params (q_auto, f_auto)
              const optimizedUrl = optimizeCloudinaryUrl(src);
              img.setAttribute('src', optimizedUrl);
            }

            if (addResponsiveImages) {
              // Generate responsive srcset based on original image width
              const width = parseInt(img.getAttribute('data-width') || '800', 10);
              // Generate standard responsive widths based on original size
              const widths = [480, 768, 1024, 1280, 1920].filter(w => w <= width * 1.5);
              const srcset = generateCloudinarySrcset(src, widths);
              if (srcset) {
                img.setAttribute('srcset', srcset);
                img.setAttribute('sizes', '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px');
              }
            }
          } 
          // For non-Cloudinary images (S3, custom, etc.), add basic responsive attributes
          else if (addResponsiveImages && !src.startsWith('data:')) {
            // Get original width if available
            const width = parseInt(img.getAttribute('data-width') || '800', 10);
            
            // For S3 and other CDNs, we can't generate transformed URLs automatically
            // But we can still set the sizes attribute for better browser optimization
            img.setAttribute('sizes', '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px');
            
            // Add width/height attributes for better layout stability
            const height = parseInt(img.getAttribute('data-height') || '600', 10);
            img.setAttribute('width', String(width));
            img.setAttribute('height', String(height));
          }

          // Clean up internal data attributes from images
          if (stripDataAttributes) {
            img.removeAttribute('data-width');
            img.removeAttribute('data-height');
            img.removeAttribute('data-public-id');
          }
        });
      }

      // Special handling for different block types
      switch (type) {
        case 'code': {
          const codeEl = clone.querySelector('code');
          const preEl = clone.querySelector('pre');
          if (codeEl && preEl) {
            const lang = clone.getAttribute('data-language') || 'plaintext';
            html += `<pre data-language="${lang}"><code>${codeEl.textContent}</code></pre>\n`;
          } else {
            html += clone.outerHTML + '\n';
          }
          break;
        }
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
          case 'code': {
            const codeEl = clone.querySelector('code');
            const preEl = clone.querySelector('pre');
            if (codeEl && preEl) {
              const lang = clone.getAttribute('data-language') || 'plaintext';
              cleanHTML += `<pre data-language="${lang}"><code>${codeEl.textContent}</code></pre>\n`;
            } else {
              cleanHTML += clone.outerHTML + '\n';
            }
            break;
          }
          case 'divider':
            cleanHTML += '<hr>\n';
            break;
          case 'image': {
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
        }
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
        case 'code': {
          const codeEl = clone.querySelector('code');
          const preEl = clone.querySelector('pre');
          if (codeEl && preEl) {
            const lang = clone.getAttribute('data-language') || 'plaintext';
            cleanHTML += `<pre data-language="${lang}"><code>${codeEl.textContent}</code></pre>\n`;
          } else {
            cleanHTML += clone.outerHTML + '\n';
          }
          break;
        }
        case 'divider':
          cleanHTML += '<hr>\n';
          break;
        case 'image': {
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
        }
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
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

      // PROFESSIONAL FIX: Handle empty blocks (no text nodes)
      // Check if element is empty or has only whitespace
      const textContent = editableElement.textContent || '';
      
      if (textContent.length === 0) {
        // Empty block - just place cursor at start
        range.selectNodeContents(editableElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        editableElement.focus();
        return;
      }

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
        // PROFESSIONAL FIX: Offset not found or beyond content length
        // Place cursor at the last valid position
        if (currentOffset > 0 && walker.currentNode) {
          // We have some text content, place at end of last text node
          const lastTextNode = walker.currentNode;
          const lastNodeLength = lastTextNode.textContent?.length || 0;
          range.setStart(lastTextNode, lastNodeLength);
          range.setEnd(lastTextNode, lastNodeLength);
        } else {
          // Fallback: place at end of element
          range.selectNodeContents(editableElement);
          range.collapse(false);
        }
      }

      selection.removeAllRanges();
      selection.addRange(range);

      // Focus the element
      editableElement.focus();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Fallback: just focus the element
      editableElement.focus();
    }
  }, []);

  // Save to history - IMMEDIATE (for structural changes like add/delete block)
  const saveToHistoryImmediate = useCallback((operation?: string) => {
    // PROFESSIONAL FIX: Throttle rapid saves (minimum 50ms between saves)
    // This prevents duplicate history entries when multiple operations happen in quick succession
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimestampRef.current;
    
    const currentHTML = getEditorStateHTML(); // Use editor state instead of clean HTML
    const cursorPosition = captureCursorPosition();

    // Don't save if nothing changed
    const lastEntry = undoStackRef.current[undoStackRef.current.length - 1];
    if (lastEntry && lastEntry.html === currentHTML) {
      return;
    }

    // PROFESSIONAL FIX: If less than 50ms since last save, defer this save slightly
    // This batches rapid consecutive operations into a single history entry
    if (timeSinceLastSave < 50 && lastEntry) {
      // Skip this immediate save if it's too rapid, unless it's significantly different
      const htmlDiff = Math.abs(currentHTML.length - lastEntry.html.length);
      if (htmlDiff < 10) {
        // Minor change within 50ms window - skip to avoid duplicate
        return;
      }
    }

    // Update last save timestamp
    lastSaveTimestampRef.current = now;

    const historyEntry: HistoryEntry = {
      html: currentHTML,
      cursorPosition,
      selectedBlockIds: Array.from(selectedBlockIds), // Save current selection
      operation: operation || 'Edit content',
      timestamp: now,
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

  // CRITICAL FIX: Cleanup debounced functions on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cancel any pending debounced calls
      debouncedSaveToHistory.cancel();
      emitChange.cancel();
    };
  }, [debouncedSaveToHistory, emitChange]);


  const handleUndo = useCallback(() => {
    // PROFESSIONAL FIX: Check if undo stack has at least one entry
    if (undoStackRef.current.length === 0) {
      console.log('🔙 Undo: No history available');
      return;
    }

    console.log('🔙 Undo: Stack size =', undoStackRef.current.length);

    // Cancel any pending debounced saves to avoid conflicts
    debouncedSaveToHistory.cancel();

    // Get previous state from undo stack (last entry)
    const previousEntry = undoStackRef.current[undoStackRef.current.length - 1];
    
    // Get current state
    const currentHTML = getEditorStateHTML();
    
    // PROFESSIONAL FIX: Don't save to redo if current state is identical to previous state
    // This prevents unnecessary duplicate entries in redo stack
    if (currentHTML !== previousEntry.html) {
      const currentCursor = captureCursorPosition();
      const currentEntry: HistoryEntry = {
        html: currentHTML,
        cursorPosition: currentCursor,
        selectedBlockIds: Array.from(selectedBlockIds),
        operation: "Current state before undo",
        timestamp: Date.now(),
      };
      
      // Save current state to redo stack (limit to 50 entries)
      redoStackRef.current = [...redoStackRef.current, currentEntry].slice(-50);
    }

    // Remove the entry we're about to restore from undo stack
    undoStackRef.current = undoStackRef.current.slice(0, -1);

    // Update editor state
    setEditorState(prev => ({
      ...prev,
      undoStack: undoStackRef.current,
      redoStack: redoStackRef.current,
    }));

    // Restore the previous state's HTML
    setEditorStateHTML(previousEntry.html);

    // PROFESSIONAL FIX: Use double RAF for more reliable cursor restoration
    // First RAF ensures HTML is rendered, second RAF ensures layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreCursorPosition(previousEntry.cursorPosition);

        // Restore block selection
        if (previousEntry.selectedBlockIds && previousEntry.selectedBlockIds.length > 0) {
          setSelectedBlockIds(new Set(previousEntry.selectedBlockIds));
        } else {
          setSelectedBlockIds(new Set());
        }
      });
    });
  }, [getEditorStateHTML, setEditorStateHTML, captureCursorPosition, restoreCursorPosition, debouncedSaveToHistory, selectedBlockIds]);

  const handleRedo = useCallback(() => {
    // PROFESSIONAL FIX: Check if redo stack has at least one entry
    if (redoStackRef.current.length === 0) {
      console.log('🔜 Redo: No redo history available');
      return;
    }

    console.log('🔜 Redo: Stack size =', redoStackRef.current.length);

    // Cancel any pending debounced saves to avoid conflicts
    debouncedSaveToHistory.cancel();

    // Get next state from redo stack (last entry)
    const nextEntry = redoStackRef.current[redoStackRef.current.length - 1];
    
    // Get current state
    const currentHTML = getEditorStateHTML();
    
    // PROFESSIONAL FIX: Don't save to undo if current state is identical to next state
    // This prevents unnecessary duplicate entries in undo stack
    if (currentHTML !== nextEntry.html) {
      const currentCursor = captureCursorPosition();
      const currentEntry: HistoryEntry = {
        html: currentHTML,
        cursorPosition: currentCursor,
        selectedBlockIds: Array.from(selectedBlockIds),
        operation: "Current state before redo",
        timestamp: Date.now(),
      };
      
      // Save current state to undo stack (limit to 50 entries)
      undoStackRef.current = [...undoStackRef.current, currentEntry].slice(-50);
    }

    // Remove the entry we're about to restore from redo stack
    redoStackRef.current = redoStackRef.current.slice(0, -1);

    // Update editor state
    setEditorState(prev => ({
      ...prev,
      redoStack: redoStackRef.current,
      undoStack: undoStackRef.current,
    }));

    // Restore the next state's HTML
    setEditorStateHTML(nextEntry.html);

    // PROFESSIONAL FIX: Use double RAF for more reliable cursor restoration
    // First RAF ensures HTML is rendered, second RAF ensures layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restoreCursorPosition(nextEntry.cursorPosition);

        // Restore block selection
        if (nextEntry.selectedBlockIds && nextEntry.selectedBlockIds.length > 0) {
          setSelectedBlockIds(new Set(nextEntry.selectedBlockIds));
        } else {
          setSelectedBlockIds(new Set());
        }
      });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        moveCursorToEnd(editable);
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
      destroy: () => { },
      registerBlock: (def) => blockRegistry.register(def),
      registerCommand: () => { },
      executeCommand: () => { },
    };
    // Only recreate when truly necessary - not on editorState or activeBlockId changes
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

  // Helper: Show uploading state with progress
  const showImageUploadingState = useCallback((figure: HTMLElement, filename: string) => {
    const container = figure.querySelector('.cb-image-container');
    if (container) {
      container.innerHTML = `
        <div class="cb-image-uploading">
          <div class="cb-spinner"></div>
          <p class="cb-upload-filename">Uploading ${filename}...</p>
          <div class="cb-upload-progress">
            <div class="cb-upload-progress-bar" style="width: 0%"></div>
          </div>
        </div>
      `;
    }
  }, []);

  // Helper: Show upload error state
  const showImageUploadError = useCallback((figure: HTMLElement, error: unknown) => {
    const container = figure.querySelector('.cb-image-container');
    if (container) {
      const message = ImageUploadService.getErrorMessage(error);
      container.innerHTML = `
        <div class="cb-image-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p class="cb-error-message">${message}</p>
          <button type="button" class="cb-retry-upload">Try Again</button>
        </div>
      `;
    }
  }, []);

  // Helper: Add image controls (alignment, crop, alt text)
  const addImageControls = useCallback((figure: HTMLElement) => {
    // Add alignment/crop controls
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

    // Add alt text editor (important for SEO and accessibility)
    let altEditor = figure.querySelector('.cb-image-alt-editor');
    if (!altEditor) {
      const img = figure.querySelector('img');
      const currentAlt = img?.alt || '';

      altEditor = document.createElement('div');
      altEditor.className = 'cb-image-alt-editor';
      altEditor.innerHTML = `
        <label class="cb-image-alt-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          Alt text (for accessibility & SEO)
        </label>
        <input 
          type="text" 
          class="cb-image-alt-input"
          placeholder="Describe this image"
          value="${currentAlt.replace(/"/g, '&quot;')}"
        />
      `;

      const caption = figure.querySelector('figcaption');
      if (caption) {
        figure.insertBefore(altEditor, caption);
      } else {
        figure.appendChild(altEditor);
      }
    }
  }, []);

  // Handle image file upload with cloud storage support
  const handleImageUpload = useCallback(async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const figure = input.closest('figure.cb-image') as HTMLElement;
    if (!figure) return;

    // Store block ID to detect if block is removed during upload
    const blockId = figure.getAttribute('data-block-id');
    if (!blockId) return;

    // Helper to check if block still exists
    const getBlock = (): HTMLElement | null => {
      return contentRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
    };

    saveToHistoryImmediate(); // Use immediate save for image upload

    // Check if upload service is available
    if (!uploadService) {
      // CRITICAL FIX: Validate file size BEFORE processing to prevent browser hangs
      // A 50MB image becomes ~66MB base64 string, which can crash the browser
      const MAX_BASE64_SIZE_MB = 10; // 10MB limit for base64 images
      const maxSizeBytes = MAX_BASE64_SIZE_MB * 1024 * 1024;
      
      if (file.size > maxSizeBytes) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const error = new Error(
          `Image too large (${sizeMB}MB). Maximum size for base64 images is ${MAX_BASE64_SIZE_MB}MB.\n` +
          'Please configure Cloudinary or S3 for larger images, or compress your image.'
        );
        showImageUploadError(figure, error);
        console.error('Image upload failed:', error.message);
        return;
      }

      // Fallback to base64 with warning
      console.warn(
        '⚠️ Authorly: No imageUploadConfig provided. Using base64 fallback.\n' +
        'For production, configure Cloudinary or S3.\n' +
        'See: https://authorly.dev/docs/image-upload'
      );

      try {
        const dataUrl = await createImageFromFile(file);
        
        // Check if block still exists before updating
        const currentBlock = getBlock();
        if (!currentBlock) {
          console.log('Block removed during upload, skipping update');
          return;
        }
        
        setImageSrc(currentBlock as HTMLElement, dataUrl, file.name);
        addImageControls(currentBlock as HTMLElement);
        emitChange();
      } catch (err) {
        console.error('Failed to load image:', err);
        
        // Check if block still exists before showing error
        const currentBlock = getBlock();
        if (currentBlock) {
          showImageUploadError(currentBlock as HTMLElement, err);
        }
      }
      return;
    }

    try {
      // Show loading state
      showImageUploadingState(figure, file.name);

      // Callback: upload started
      onUploadStart?.(file.name);

      // Upload to cloud with progress tracking
      const result = await uploadService.upload(file, (progress) => {
        // Check if block still exists before updating progress
        const currentBlock = getBlock();
        if (!currentBlock) return;
        
        // Update progress bar
        const progressBar = currentBlock.querySelector('.cb-upload-progress-bar') as HTMLElement;
        if (progressBar) {
          progressBar.style.width = `${progress.percent}%`;
        }
        // Call user's progress callback
        onUploadProgress?.(progress);
      });

      // Check if block still exists before setting image
      const currentBlock = getBlock();
      if (!currentBlock) {
        console.log('Block removed during upload, skipping image insertion');
        return;
      }

      // Callback: upload success
      onUploadSuccess?.(result);

      // Insert image with cloud URL
      setImageSrc(currentBlock as HTMLElement, result.url, file.name);

      // Store dimensions as data attributes for responsive images
      const img = currentBlock.querySelector('img');
      if (img) {
        img.setAttribute('data-width', String(result.width));
        img.setAttribute('data-height', String(result.height));
        if (result.publicId) {
          img.setAttribute('data-public-id', result.publicId);
        }
      }

      // Add alignment and crop controls
      addImageControls(currentBlock as HTMLElement);

      emitChange();
    } catch (error) {
      // Callback: upload error
      onUploadError?.(error as Error);

      // Check if block still exists before showing error
      const currentBlock = getBlock();
      if (currentBlock) {
        showImageUploadError(currentBlock as HTMLElement, error);
      }
    }
  }, [uploadService, saveToHistoryImmediate, emitChange, onUploadStart, onUploadSuccess, onUploadError, onUploadProgress, showImageUploadingState, showImageUploadError, addImageControls]);

  // Handle Excalidraw modal save
  const handleExcalidrawSave = useCallback((imageDataUrl: string, elements: readonly ExcalidrawElement[], appState: Partial<AppState>) => {
    if (!excalidrawModal.blockId || !contentRef.current) return;

    // Find the block wrapper
    const blockWrapper = contentRef.current.querySelector(
      `[data-block-id="${excalidrawModal.blockId}"]`
    ) as HTMLElement;

    if (!blockWrapper) return;

    // Get the inner excalidraw element
    const excalidrawElement = blockWrapper.querySelector('.cb-excalidraw') as HTMLElement;
    if (!excalidrawElement) return;

    saveToHistoryImmediate();

    // Update the block with the drawing
    const definition = blockRegistry.get('excalidraw');
    if (definition) {
      definition.update(excalidrawElement, {
        imageDataUrl,
        elements,
        appState,
      });
    }

    emitChange();
    setExcalidrawModal({ isOpen: false, blockId: null, initialElements: [], initialAppState: {} });
  }, [excalidrawModal.blockId, saveToHistoryImmediate, emitChange]);

  // Handle Excalidraw modal close
  const handleExcalidrawClose = useCallback(() => {
    setExcalidrawModal({ isOpen: false, blockId: null, initialElements: [], initialAppState: {} });
  }, []);

  // Set up image input listeners
  // CRITICAL FIX (Bug #1): Properly cleanup event listeners to prevent memory leaks
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

    // Define all event handlers with proper references for cleanup
    const handleChange = (e: Event) => {
      if ((e.target as HTMLElement).matches('.cb-image-input')) {
        handleImageInputChange(e);
      }
    };

    // Handle alt text input changes
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;

      if (target.matches('.cb-image-alt-input')) {
        const figure = target.closest('figure.cb-image') as HTMLElement;
        const img = figure?.querySelector('img');

        if (img) {
          img.alt = target.value;
          emitChange();
        }
      }
    };

    const handleClickMain = (e: Event) => {
      const target = e.target as HTMLElement;

      // Don't interfere with input/textarea interactions
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

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
            () => { } // onCancel - nothing needed
          );
          document.body.appendChild(modal);
        }
      }

      // Handle retry upload button click
      if (target.closest('.cb-retry-upload')) {
        e.preventDefault();
        e.stopPropagation();

        const figure = target.closest('figure.cb-image') as HTMLElement;
        const fileInput = figure?.querySelector('.cb-image-input') as HTMLInputElement;

        if (fileInput) {
          // Trigger file input again
          fileInput.click();
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

      // Handle Excalidraw placeholder click
      if (target.closest('.cb-excalidraw-placeholder')) {
        e.preventDefault();
        e.stopPropagation();
        // Find the block wrapper (not the inner .cb-excalidraw element)
        const blockWrapper = target.closest('.cb-block') as HTMLElement;
        if (blockWrapper) {
          const blockId = blockWrapper.getAttribute('data-block-id');
          if (blockId) {
            setExcalidrawModal({
              isOpen: true,
              blockId,
              initialElements: [],
              initialAppState: {},
            });
          }
        }
      }

      // Handle Excalidraw edit button click
      if (target.closest('.cb-excalidraw-edit-btn')) {
        e.preventDefault();
        e.stopPropagation();
        // Find the block wrapper (not the inner .cb-excalidraw element)
        const blockWrapper = target.closest('.cb-block') as HTMLElement;
        if (blockWrapper) {
          const blockId = blockWrapper.getAttribute('data-block-id');
          if (blockId) {
            // Get the inner excalidraw element to read stored data
            const excalidrawElement = blockWrapper.querySelector('.cb-excalidraw') as HTMLElement;
            if (!excalidrawElement) return;

            // Get stored Excalidraw data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let initialElements: any[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let initialAppState: any = {};

            try {
              const elementsStr = excalidrawElement.getAttribute('data-excalidraw-elements');
              if (elementsStr) {
                initialElements = JSON.parse(elementsStr);
              }
            } catch (err) {
              console.warn('Failed to parse Excalidraw elements:', err);
              // IMPROVED (Bug #6): Better error feedback
              console.error('Excalidraw data may be corrupted. Please try creating a new drawing.');
            }

            try {
              const appStateStr = excalidrawElement.getAttribute('data-excalidraw-appstate');
              if (appStateStr) {
                initialAppState = JSON.parse(appStateStr);
              }
            } catch (err) {
              console.warn('Failed to parse Excalidraw appState:', err);
            }

            setExcalidrawModal({
              isOpen: true,
              blockId,
              initialElements,
              initialAppState,
            });
          }
        }
      }
    };

    const handleKeydown = (e: Event) => {
      const target = e.target as HTMLElement;
      const keyEvent = e as KeyboardEvent;

      if (target.classList.contains('cb-video-url-input') && keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
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
      if (target.classList.contains('cb-image-url-input') && keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
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
    };

    // Handle paste in image/video URL inputs
    const handleInputPaste = (e: Event) => {
      const target = e.target as HTMLElement;
      const pasteEvent = e as ClipboardEvent;

      console.log('🎯 DOM handleInputPaste triggered:', {
        tagName: target.tagName,
        className: target.className,
        hasClipboardData: !!pasteEvent.clipboardData,
        clipboardText: pasteEvent.clipboardData?.getData('text/plain')?.substring(0, 50)
      });

      // Critical: DO NOTHING - let the browser handle paste naturally
      // Don't call preventDefault, don't call stopPropagation
      // Just let the input field work normally
    };

    const handleClickCallout = (e: Event) => {
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
    };

    // Add event listeners
    container.addEventListener('change', handleChange);
    container.addEventListener('input', handleInput);
    container.addEventListener('click', handleClickMain);
    container.addEventListener('keydown', handleKeydown);
    container.addEventListener('click', handleClickCallout);
    container.addEventListener('paste', handleInputPaste, true); // Use capture phase to intercept paste before it bubbles

    // CRITICAL FIX: Cleanup function to remove all event listeners
    return () => {
      if (container) {
        container.removeEventListener('change', handleChange);
        container.removeEventListener('input', handleInput);
        container.removeEventListener('click', handleClickMain);
        container.removeEventListener('keydown', handleKeydown);
        container.removeEventListener('click', handleClickCallout);
        container.removeEventListener('paste', handleInputPaste, true);
      }
    };
  }, [handleImageUpload, saveToHistory, saveToHistoryImmediate, emitChange, setExcalidrawModal]);

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
    let rafId: number | null = null; // PERFORMANCE FIX (Bug #7): RAF throttling

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

    // CRITICAL FIX (Bug #28): Improved RAF throttling - store latest event and process in next frame
    // Previous implementation skipped events when RAF was pending, causing choppy resize
    let latestMouseEvent: MouseEvent | null = null;

    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !currentImg || !handleType) return;

      e.preventDefault();

      // Store the latest mouse event - will be processed in the next available RAF
      latestMouseEvent = e;

      // If RAF is already scheduled, the latest event will be picked up
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;

        if (!currentImg || !isResizing || !latestMouseEvent) return;

        // Use the most recent mouse event
        const mouseEvent = latestMouseEvent;
        latestMouseEvent = null;

        const diff = mouseEvent.clientX - startX;
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
      });
    };

    const handleResizeEnd = () => {
      if (!isResizing) return;

      isResizing = false;

      // PERFORMANCE FIX (Bug #7): Cancel pending RAF on resize end
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

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

        // Get the first selected block to know where to place the replacement paragraph
        const allBlocks = Array.from(contentRef.current?.querySelectorAll('.cb-block') || []);
        const firstSelectedBlock = allBlocks.find(b => selectedBlockIds.has(b.getAttribute('data-block-id') || ''));

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
        } else if (firstSelectedBlock) {
          // Focus the block that's now in the position of the first deleted block
          // This could be the next block or the previous block
          const blockAfterDeletion = firstSelectedBlock.parentElement?.querySelector('.cb-block');
          if (blockAfterDeletion) {
            setTimeout(() => {
              const editable = blockAfterDeletion.querySelector('[contenteditable="true"]') as HTMLElement;
              editable?.focus();
            }, 0);
          }
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
        case 'a': {
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
        }
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
    // But NOT in code blocks or accordion titles (they need space to work normally)
    if ((e.key === 'ArrowRight' || e.key === ' ')) {
      // Get the actual focused element
      const focusedElement = document.activeElement as HTMLElement;
      
      // Skip if we're in a code block or accordion title
      const inCodeBlock = blockType === 'code';
      const inAccordionTitle = !!target.closest('.cb-accordion-title-text') || !!focusedElement?.closest('.cb-accordion-title-text');
      const inAccordionContent = !!target.closest('.cb-accordion-content') || !!focusedElement?.closest('.cb-accordion-content');
      
      if (inCodeBlock || inAccordionTitle || inAccordionContent) {
        // Let space/arrow work normally in code blocks, accordion titles, and accordion content
        return;
      }
      
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
    }

    // Tab key in lists - indent/outdent
    if (e.key === 'Tab' && (blockType === 'bulletList' || blockType === 'numberedList' || blockType === 'checkList')) {
      e.preventDefault();

      const li = target.closest('li');
      if (!li) return;

      saveToHistoryImmediate(); // Use immediate save for structural change

      if (e.shiftKey) {
        // Shift+Tab: Outdent
        const parentList = li.parentElement as HTMLElement;
        const isNested = parentList?.classList.contains('cb-nested-list');

        if (isNested) {
          // Move item to parent list
          const parentLi = parentList.parentElement as HTMLElement;
          const grandparentList = parentLi?.parentElement as HTMLElement;

          if (grandparentList) {
            grandparentList.insertBefore(li, parentLi.nextSibling);

            // Remove empty nested list
            if (parentList.children.length === 0) {
              parentList.remove();
            }

            // Focus the moved item
            const focusTarget = blockType === 'checkList'
              ? li.querySelector('.cb-checklist-content') as HTMLElement
              : li;
            if (focusTarget) {
              setTimeout(() => {
                focusTarget.focus();
                moveCursorToEnd(focusTarget);
              }, 0);
            }
          }
        }
      } else {
        // Tab: Indent
        const prevSibling = li.previousElementSibling as HTMLElement;

        if (prevSibling && prevSibling.tagName === 'LI') {
          // Create or get nested list in previous sibling
          let nestedList = prevSibling.querySelector(':scope > ul, :scope > ol') as HTMLElement;

          if (!nestedList) {
            // Create new nested list
            const listType = blockType === 'numberedList' ? 'ol' : 'ul';
            nestedList = document.createElement(listType);
            // CRITICAL FIX: Add both nested-list class AND the specific list type class for proper CSS styling
            nestedList.className = `cb-list cb-nested-list cb-${blockType}`;
            prevSibling.appendChild(nestedList);
            console.log(`📝 Created nested list (Tab indent) with classes: "${nestedList.className}" for blockType: ${blockType}`);
          }

          // Move current item to nested list
          nestedList.appendChild(li);

          // Focus the moved item
          const focusTarget = blockType === 'checkList'
            ? li.querySelector('.cb-checklist-content') as HTMLElement
            : li;
          if (focusTarget) {
            setTimeout(() => {
              focusTarget.focus();
              moveCursorToEnd(focusTarget);
            }, 0);
          }
        }
      }

      emitChange();
      return;
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

    // Shift+Enter in lists - create nested list item
    if (e.key === 'Enter' && e.shiftKey && (blockType === 'bulletList' || blockType === 'numberedList' || blockType === 'checkList')) {
      e.preventDefault();

      const li = target.closest('li');
      if (!li) return;

      saveToHistoryImmediate(); // Use immediate save for structural change

      // Create or get nested list
      let nestedList = li.querySelector(':scope > ul, :scope > ol') as HTMLElement;

      if (!nestedList) {
        // Create new nested list
        const listType = blockType === 'numberedList' ? 'ol' : 'ul';
        nestedList = document.createElement(listType);
        // CRITICAL FIX: Add both nested-list class AND the specific list type class for proper CSS styling
        nestedList.className = `cb-list cb-nested-list cb-${blockType}`;
        li.appendChild(nestedList);
        console.log(`📝 Created nested list (Shift+Enter) with classes: "${nestedList.className}" for blockType: ${blockType}`);
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

        wrapper.appendChild(checkbox);
        wrapper.appendChild(contentSpan);
        newLi.appendChild(wrapper);

        nestedList.appendChild(newLi);
        contentSpan.focus();
        moveCursorToStart(contentSpan);
      } else {
        newLi.setAttribute('contenteditable', 'true');
        nestedList.appendChild(newLi);
        newLi.focus();
        moveCursorToStart(newLi);
      }

      emitChange();
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

          // Check if this is a nested list
          const isNested = li.parentElement?.classList.contains('cb-nested-list');

          if (isNested) {
            // Exit nested list - remove old item and create fresh parent-level item
            const parentList = li.parentElement as HTMLElement;
            const parentLi = parentList.parentElement as HTMLElement;
            const grandparentList = parentLi.parentElement as HTMLElement;
            
            // Remove the empty nested item FIRST
            li.remove();
            
            // Clean up empty nested list container
            if (parentList.children.length === 0) {
              parentList.remove();
            }
            
            // Create a BRAND NEW parent-level item (don't reuse old one)
            if (grandparentList) {
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
                
                wrapper.appendChild(checkbox);
                wrapper.appendChild(contentSpan);
                newLi.appendChild(wrapper);
                
                // Insert new item at parent level AFTER the parent item
                grandparentList.insertBefore(newLi, parentLi.nextSibling);
                contentSpan.focus();
              } else {
                newLi.setAttribute('contenteditable', 'true');
                
                // Insert new item at parent level AFTER the parent item
                grandparentList.insertBefore(newLi, parentLi.nextSibling);
                newLi.focus();
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
        saveToHistoryImmediate(); // Use immediate save for structural change

        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);

        // Get content after cursor (only within current list item, not nested lists)
        let afterContent = '';
        if (range && editableContent) {
          const afterRange = document.createRange();
          afterRange.setStart(range.endContainer, range.endOffset);
          
          // Only extract to end of current editable content, not nested lists
          afterRange.setEndAfter(editableContent.lastChild || editableContent);
          const fragment = afterRange.extractContents();
          
          // Remove any nested lists from the fragment (they should stay with current item)
          const temp = document.createElement('div');
          temp.appendChild(fragment);
          
          // Remove nested list elements from temp
          const nestedLists = temp.querySelectorAll('.cb-nested-list');
          nestedLists.forEach(nestedList => {
            // Move nested list back to original li
            if (li) {
              li.appendChild(nestedList);
            }
          });
          
          afterContent = temp.innerHTML.trim();
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

    // Backspace in lists - handle empty items and outdenting
    if (e.key === 'Backspace' && (blockType === 'bulletList' || blockType === 'numberedList' || blockType === 'checkList')) {
      const li = target.closest('.cb-list-item') as HTMLElement;
      const editableContent = (blockType === 'checkList'
        ? li?.querySelector('.cb-checklist-content')
        : li) as HTMLElement;
      
      if (li && editableContent && isCursorAtStart(editableContent)) {
        const content = editableContent.textContent?.trim() || '';
        
        // Empty list item - remove it or outdent
        if (content === '') {
          e.preventDefault();
          saveToHistoryImmediate('Remove empty list item');
          
          const isNested = li.parentElement?.classList.contains('cb-nested-list');
          
          if (isNested) {
            // Remove empty nested item and focus parent item
            const parentList = li.parentElement as HTMLElement;
            const parentLi = parentList.parentElement as HTMLElement;
            
            // Remove the empty nested item
            li.remove();
            
            // Clean up empty nested list
            if (parentList.children.length === 0) {
              parentList.remove();
            }
            
            // Focus the parent list item at the end of its content
            if (parentLi) {
              const focusTarget = blockType === 'checkList'
                ? parentLi.querySelector('.cb-checklist-content') as HTMLElement
                : parentLi;
              if (focusTarget) {
                // Move cursor to end of parent item's text (before nested lists)
                const textNodes: Node[] = [];
                for (let i = 0; i < focusTarget.childNodes.length; i++) {
                  const node = focusTarget.childNodes[i];
                  if (node.nodeType === Node.TEXT_NODE || 
                      (node.nodeType === Node.ELEMENT_NODE && !(node as Element).classList.contains('cb-nested-list'))) {
                    textNodes.push(node);
                  }
                }
                
                if (textNodes.length > 0) {
                  const lastTextNode = textNodes[textNodes.length - 1];
                  const range = document.createRange();
                  const sel = window.getSelection();
                  
                  if (lastTextNode.nodeType === Node.TEXT_NODE) {
                    range.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
                  } else {
                    range.setStartAfter(lastTextNode);
                  }
                  range.collapse(true);
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
                
                focusTarget.focus();
              }
            }
          } else {
            // Top-level empty item
            const listElement = li.closest('ul, ol') as HTMLElement;
            const items = listElement?.querySelectorAll(':scope > li');
            
            if (items && items.length === 1) {
              // Last item - transform entire block to paragraph
              if (blockId) {
                transformBlockType(blockId, 'paragraph');
              }
            } else if (items && items.length > 1) {
              // Multiple items - just remove this empty one and focus previous
              const prevItem = li.previousElementSibling as HTMLElement;
              const nextItem = li.nextElementSibling as HTMLElement;
              
              li.remove();
              
              // Focus previous or next item
              const targetItem = prevItem || nextItem;
              if (targetItem) {
                const focusTarget = blockType === 'checkList'
                  ? targetItem.querySelector('.cb-checklist-content') as HTMLElement
                  : targetItem;
                if (focusTarget) {
                  moveCursorToEnd(focusTarget);
                  focusTarget.focus();
                }
              }
            }
          }
          
          emitChange();
          return;
        }
        
        // Non-empty item at start - outdent if nested
        if (li.parentElement?.classList.contains('cb-nested-list')) {
          e.preventDefault();
          saveToHistoryImmediate('Outdent list item');
          
          const parentList = li.parentElement as HTMLElement;
          const parentLi = parentList.parentElement as HTMLElement;
          const grandparentList = parentLi.parentElement as HTMLElement;
          
          if (grandparentList) {
            // Move this item to parent level
            grandparentList.insertBefore(li, parentLi.nextSibling);
            
            // Remove empty nested list
            if (parentList.children.length === 0) {
              parentList.remove();
            }
            
            // Keep focus on the item
            editableContent.focus();
          }
          
          emitChange();
          return;
        }
      }
    }

    // Backspace at start (for non-list blocks)
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
    // ENHANCED: Full nested list support with level-aware navigation
    if (e.key === 'ArrowUp') {
      // For list blocks, handle manual navigation between list items with nested support
      if (blockType === 'bulletList' || blockType === 'numberedList' || blockType === 'checkList') {
        const targetListItem = target.closest('.cb-list-item');
        
        if (targetListItem) {
          // Get the direct parent list (not the root container)
          const parentList = targetListItem.parentElement as HTMLElement;
          
          // Get only direct children list items of this specific list level
          const siblingListItems = Array.from(parentList.children).filter(child => 
            child.classList.contains('cb-list-item')
          ) as HTMLElement[];
          
          const currentIndex = siblingListItems.indexOf(targetListItem as HTMLElement);
          
          // Get the actual editable element to check cursor position
          const editableElement = blockType === 'checkList' 
            ? targetListItem.querySelector('.cb-checklist-content') as HTMLElement
            : targetListItem as HTMLElement;
          
          const isAtStart = editableElement && isCursorAtStart(editableElement);
          
          // If cursor is NOT at start, let browser handle (allows cursor movement within item)
          if (!isAtStart) {
            return;
          }
          
          // Cursor IS at start - handle navigation
          if (currentIndex === 0) {
            // We're at the first item of this list level
            const isNestedList = parentList.classList.contains('cb-nested-list');
            
            if (isNestedList) {
              // We're in a nested list - move to the parent list item
              e.preventDefault();
              const parentListItem = parentList.closest('.cb-list-item') as HTMLElement;
              if (parentListItem) {
                const parentEditable = blockType === 'checkList'
                  ? parentListItem.querySelector('.cb-checklist-content') as HTMLElement
                  : parentListItem as HTMLElement;
                
                if (parentEditable) {
                  parentEditable.focus();
                  moveCursorToEnd(parentEditable);
                  console.log('🔼 Arrow Up: Moved to parent list item from nested list');
                }
              }
              return;
            } else {
              // We're at the first item of the main list - navigate to previous block
              e.preventDefault();
              console.log('🔼 Arrow Up: Navigating away from first list item to previous block');
              const prevBlock = block?.previousElementSibling as HTMLElement;
              if (prevBlock && prevBlock.classList.contains('cb-block')) {
                const prevEditable = prevBlock.querySelector('[contenteditable="true"]') as HTMLElement;
                if (prevEditable) {
                  prevEditable.focus();
                  moveCursorToEnd(prevEditable);
                }
              }
              return;
            }
          } else {
            // Move to previous list item at the same level
            e.preventDefault();
            const prevListItem = siblingListItems[currentIndex - 1];
            
            // Check if previous item has a nested list - if so, move to last item of nested list
            const prevNestedList = prevListItem.querySelector(':scope > .cb-nested-list');
            if (prevNestedList) {
              const nestedItems = Array.from(prevNestedList.children).filter(child =>
                child.classList.contains('cb-list-item')
              ) as HTMLElement[];
              
              if (nestedItems.length > 0) {
                const lastNestedItem = nestedItems[nestedItems.length - 1];
                const lastNestedEditable = blockType === 'checkList'
                  ? lastNestedItem.querySelector('.cb-checklist-content') as HTMLElement
                  : lastNestedItem as HTMLElement;
                
                if (lastNestedEditable) {
                  lastNestedEditable.focus();
                  moveCursorToEnd(lastNestedEditable);
                  console.log('🔼 Arrow Up: Moved to last nested item of previous sibling');
                  return;
                }
              }
            }
            
            // No nested list or nested list is empty - move to previous sibling
            const prevEditableElement = blockType === 'checkList'
              ? prevListItem.querySelector('.cb-checklist-content') as HTMLElement
              : prevListItem as HTMLElement;
            
            if (prevEditableElement) {
              prevEditableElement.focus();
              moveCursorToEnd(prevEditableElement);
              console.log('🔼 Arrow Up: Moved to previous list item at same level (', currentIndex, '->', currentIndex - 1, ')');
            }
            return;
          }
        }
      } else if (isCursorAtStart(target)) {
        // Regular block navigation (non-list)
        e.preventDefault();
        const prevBlock = block?.previousElementSibling as HTMLElement;
        if (prevBlock && prevBlock.classList.contains('cb-block')) {
          const prevEditable = prevBlock.querySelector('[contenteditable="true"]') as HTMLElement;
          if (prevEditable) {
            prevEditable.focus();
            moveCursorToEnd(prevEditable);
          }
        }
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      // For list blocks, handle manual navigation between list items with nested support
      if (blockType === 'bulletList' || blockType === 'numberedList' || blockType === 'checkList') {
        const targetListItem = target.closest('.cb-list-item');
        
        if (targetListItem) {
          // Get the direct parent list (not the root container)
          const parentList = targetListItem.parentElement as HTMLElement;
          
          // Get only direct children list items of this specific list level
          const siblingListItems = Array.from(parentList.children).filter(child => 
            child.classList.contains('cb-list-item')
          ) as HTMLElement[];
          
          const currentIndex = siblingListItems.indexOf(targetListItem as HTMLElement);
          
          // Get the actual editable element to check cursor position
          const editableElement = blockType === 'checkList' 
            ? targetListItem.querySelector('.cb-checklist-content') as HTMLElement
            : targetListItem as HTMLElement;
          
          const isAtEnd = editableElement && isCursorAtEnd(editableElement);
          
          // If cursor is NOT at end, let browser handle (allows cursor movement within item)
          if (!isAtEnd) {
            return;
          }
          
          // Cursor IS at end - handle navigation
          // First check if current item has a nested list
          const nestedList = targetListItem.querySelector(':scope > .cb-nested-list');
          if (nestedList) {
            const nestedItems = Array.from(nestedList.children).filter(child =>
              child.classList.contains('cb-list-item')
            ) as HTMLElement[];
            
            if (nestedItems.length > 0) {
              // Move to first item of nested list
              e.preventDefault();
              const firstNestedItem = nestedItems[0];
              const nestedEditable = blockType === 'checkList'
                ? firstNestedItem.querySelector('.cb-checklist-content') as HTMLElement
                : firstNestedItem as HTMLElement;
              
              if (nestedEditable) {
                nestedEditable.focus();
                moveCursorToStart(nestedEditable);
                console.log('🔽 Arrow Down: Moved to first nested list item');
              }
              return;
            }
          }
          
          // No nested list - check if there's a next sibling at same level
          if (currentIndex < siblingListItems.length - 1) {
            // Move to next list item at the same level
            e.preventDefault();
            const nextListItem = siblingListItems[currentIndex + 1];
            const nextEditableElement = blockType === 'checkList'
              ? nextListItem.querySelector('.cb-checklist-content') as HTMLElement
              : nextListItem as HTMLElement;
            
            if (nextEditableElement) {
              nextEditableElement.focus();
              moveCursorToStart(nextEditableElement);
              console.log('🔽 Arrow Down: Moved to next list item at same level (', currentIndex, '->', currentIndex + 1, ')');
            }
            return;
          } else {
            // We're at the last item of this list level
            const isNestedList = parentList.classList.contains('cb-nested-list');
            
            if (isNestedList) {
              // We're in a nested list - try to move to next item in parent level
              e.preventDefault();
              const parentListItem = parentList.closest('.cb-list-item') as HTMLElement;
              if (parentListItem) {
                const grandParentList = parentListItem.parentElement as HTMLElement;
                const parentSiblings = Array.from(grandParentList.children).filter(child => 
                  child.classList.contains('cb-list-item')
                ) as HTMLElement[];
                
                const parentIndex = parentSiblings.indexOf(parentListItem as HTMLElement);
                if (parentIndex < parentSiblings.length - 1) {
                  // Move to next item at parent level
                  const nextParentItem = parentSiblings[parentIndex + 1];
                  const nextParentEditable = blockType === 'checkList'
                    ? nextParentItem.querySelector('.cb-checklist-content') as HTMLElement
                    : nextParentItem as HTMLElement;
                  
                  if (nextParentEditable) {
                    nextParentEditable.focus();
                    moveCursorToStart(nextParentEditable);
                    console.log('🔽 Arrow Down: Moved to next item at parent level');
                  }
                  return;
                } else {
                  // We're at the last nested item of the last parent item
                  // Try to navigate up further or exit the list
                  console.log('🔽 Arrow Down: At last nested item, checking for higher parent level');
                  // For now, just stay here (could be enhanced to go up multiple levels)
                  return;
                }
              }
              return;
            } else {
              // We're at the last item of the main list - navigate to next block
              e.preventDefault();
              console.log('🔽 Arrow Down: Navigating away from last list item to next block');
              const nextBlock = block?.nextElementSibling as HTMLElement;
              if (nextBlock && nextBlock.classList.contains('cb-block')) {
                const nextEditable = nextBlock.querySelector('[contenteditable="true"]') as HTMLElement;
                if (nextEditable) {
                  nextEditable.focus();
                  moveCursorToStart(nextEditable);
                }
              }
              return;
            }
          }
        }
      } else if (isCursorAtEnd(target)) {
        // Regular block navigation (non-list)
        e.preventDefault();
        const nextBlock = block?.nextElementSibling as HTMLElement;
        if (nextBlock && nextBlock.classList.contains('cb-block')) {
          const nextEditable = nextBlock.querySelector('[contenteditable="true"]') as HTMLElement;
          if (nextEditable) {
            nextEditable.focus();
            moveCursorToStart(nextEditable);
          }
        }
        return;
      }
    }
  }, [
    readOnly, showBlockMenu, selectedBlockIds, saveToHistoryImmediate, createBlockWithControls,
    updateState, emitChange, insertBlockAfter, deleteBlockById, transformBlockType,
    handleUndo, handleRedo, onSave, getHTML
  ]);

  /**
   * Apply hashtag styling to text content
   * Detects #word patterns (no spaces allowed) and wraps them in styled spans
   */
  const applyHashtagStyling = useCallback((element: HTMLElement) => {
    if (!element || element.getAttribute('contenteditable') !== 'true') return;

    // Save cursor position before modification
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const cursorNode = range.startContainer;
    const cursorOffset = range.startOffset;

    // Track the position relative to the element
    let charCount = 0;
    let savedOffset = -1;

    const countCharsBeforeCursor = (node: Node): boolean => {
      if (node === cursorNode) {
        savedOffset = charCount + cursorOffset;
        return true;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        charCount += node.textContent?.length || 0;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // For hashtag spans, count their text content
        if (node instanceof HTMLElement && node.classList.contains('cb-hashtag')) {
          charCount += node.textContent?.length || 0;
          return false;
        }
        // Recurse into children
        for (let i = 0; i < node.childNodes.length; i++) {
          if (countCharsBeforeCursor(node.childNodes[i])) {
            return true;
          }
        }
      }

      return false;
    };

    countCharsBeforeCursor(element);

    // Get plain text content (excluding existing hashtag spans)
    const getText = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        // Skip code, links, and existing hashtags
        if (el.tagName === 'CODE' || el.tagName === 'A' || el.classList.contains('cb-hashtag')) {
          return el.textContent || '';
        }
        let text = '';
        for (let i = 0; i < node.childNodes.length; i++) {
          text += getText(node.childNodes[i]);
        }
        return text;
      }
      return '';
    };

    const plainText = getText(element);

    // Match hashtags: # followed by alphanumeric/underscore characters (no spaces)
    // Hashtag ends at space, punctuation, or end of string
    const hashtagRegex = /#[\w\d_]+(?=\s|[.,!?;:]|$)/g;
    const matches = Array.from(plainText.matchAll(hashtagRegex));

    if (matches.length === 0) {
      // No hashtags found, remove any existing hashtag styling
      const existingHashtags = element.querySelectorAll('.cb-hashtag');
      existingHashtags.forEach(hashtagSpan => {
        const text = document.createTextNode(hashtagSpan.textContent || '');
        hashtagSpan.parentNode?.replaceChild(text, hashtagSpan);
      });
      return;
    }

    // Build new HTML with hashtag spans
    const fragments: (string | HTMLElement)[] = [];
    let lastIndex = 0;

    matches.forEach(match => {
      const matchText = match[0];
      const index = match.index!;

      // Add text before hashtag
      if (index > lastIndex) {
        fragments.push(plainText.substring(lastIndex, index));
      }

      // Create hashtag span
      const hashtagSpan = document.createElement('span');
      hashtagSpan.className = 'cb-hashtag';
      hashtagSpan.textContent = matchText;
      fragments.push(hashtagSpan);

      lastIndex = index + matchText.length;
    });

    // Add remaining text
    if (lastIndex < plainText.length) {
      fragments.push(plainText.substring(lastIndex));
    }

    // Clear element and append fragments
    element.innerHTML = '';
    fragments.forEach(fragment => {
      if (typeof fragment === 'string') {
        element.appendChild(document.createTextNode(fragment));
      } else {
        element.appendChild(fragment);
      }
    });

    // Restore cursor position
    if (savedOffset >= 0) {
      try {
        let currentOffset = 0;
        let targetNode: Node | null = null;
        let targetOffset = 0;

        const findCursorPosition = (node: Node): boolean => {
          if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = node.textContent?.length || 0;
            if (currentOffset + nodeLength >= savedOffset) {
              targetNode = node;
              targetOffset = savedOffset - currentOffset;
              return true;
            }
            currentOffset += nodeLength;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node instanceof HTMLElement && node.classList.contains('cb-hashtag')) {
              const nodeLength = node.textContent?.length || 0;
              if (currentOffset + nodeLength >= savedOffset) {
                // Place cursor after the hashtag span
                targetNode = node.nextSibling || node.parentNode;
                targetOffset = 0;
                return true;
              }
              currentOffset += nodeLength;
              return false;
            }

            for (let i = 0; i < node.childNodes.length; i++) {
              if (findCursorPosition(node.childNodes[i])) {
                return true;
              }
            }
          }
          return false;
        };

        if (findCursorPosition(element) && targetNode) {
          const newRange = document.createRange();
          newRange.setStart(targetNode, targetOffset);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } catch (error) {
        console.warn('Failed to restore cursor:', error);
      }
    }
  }, []);

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
        // Pattern: "- " or "* " for bullet list (with or without content)
        if (text.startsWith('- ') || text.startsWith('* ')) {
          const content = text.startsWith('- ') ? text.slice(2) : text.slice(2);
          target.textContent = '';
          transformBlockType(blockId, 'bulletList', { content });
          return;
        }

        // Pattern: "1. " (or any number + period + space) for numbered list (with or without content)
        const numberedMatch = text.match(/^(\d+)\.\s(.*)$/);
        if (numberedMatch) {
          const content = numberedMatch[2] || '';
          target.textContent = '';
          transformBlockType(blockId, 'numberedList', { content });
          return;
        }

        // Pattern: "[] " for checklist (with or without content)
        if (text.startsWith('[] ')) {
          const content = text.slice(3);
          target.textContent = '';
          transformBlockType(blockId, 'checkList', { content });
          return;
        }

        // Pattern: "> " for quote (with or without content)
        if (text.startsWith('> ')) {
          const content = text.slice(2);
          target.textContent = '';
          transformBlockType(blockId, 'quote', { content });
          return;
        }

        // Pattern: "# " for heading 1 (with or without content)
        if (text.startsWith('# ') && !text.startsWith('## ')) {
          const content = text.slice(2);
          target.textContent = '';
          transformBlockType(blockId, 'heading', { level: 1, content });
          return;
        }

        // Pattern: "## " for heading 2 (with or without content)
        if (text.startsWith('## ') && !text.startsWith('### ')) {
          const content = text.slice(3);
          target.textContent = '';
          transformBlockType(blockId, 'heading', { level: 2, content });
          return;
        }

        // Pattern: "### " for heading 3 (with or without content)
        if (text.startsWith('### ')) {
          const content = text.slice(4);
          target.textContent = '';
          transformBlockType(blockId, 'heading', { level: 3, content });
          return;
        }
      }

      // Apply hashtag styling to any block type (after markdown shortcuts are processed)
      if (e?.target instanceof HTMLElement) {
        const target = e.target;
        applyHashtagStyling(target);
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
    const clickedInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

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

    // If not clicking on a contenteditable or input field, focus the container
    // CRITICAL FIX: Don't steal focus from INPUT/TEXTAREA elements
    if (!clickedContentEditable && !clickedInput) {
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

    // Allow default paste behavior for input fields (like image URL input, video URL input, etc.)
    const target = e.target as HTMLElement;

    console.log('🔍 PASTE EVENT DEBUG:', {
      tagName: target.tagName,
      className: target.className,
      isInput: target.tagName === 'INPUT',
      isTextarea: target.tagName === 'TEXTAREA',
    });

    // Check if pasting into an input or textarea element
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      console.log('✅ Allowing paste in input field:', target.className);
      // DO NOT call preventDefault - let browser handle it
      return;
    }

    console.log('🚫 Preventing default paste (not an input field)');
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    _setHoveredBlockId(blockId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    _setHoveredBlockId(null);
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

      {/* Contextual Selection Toolbar */}
      {editorInstance && (
        <SelectionToolbar editor={editorInstance} darkMode={darkMode} />
      )}

      {/* Excalidraw Modal */}
      <ExcalidrawModal
        isOpen={excalidrawModal.isOpen}
        onClose={handleExcalidrawClose}
        onSave={handleExcalidrawSave}
        initialElements={excalidrawModal.initialElements}
        initialAppState={excalidrawModal.initialAppState}
        darkMode={darkMode}
      />
    </div>
  );
};

export const AuthorlyEditor = forwardRef(AuthorlyEditorInner);

/** @deprecated Use AuthorlyEditor instead */
export const ContentBlocksEditor = AuthorlyEditor;

