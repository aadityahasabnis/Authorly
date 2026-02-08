/**
 * Authorly — Rich Text Editor for Blogs & Publishing
 * A rich text editor for authors, blogs, and documentation with clean, publish-ready output.
 * 
 * @packageDocumentation
 */

// Styles
import './styles/editor.css';

// Main components
export { ContentBlocksEditor, type EditorRef, type GetHTMLOptions } from './components/Editor';
export { ContentBlocksRenderer, type ContentBlocksRendererProps } from './components/Renderer';
export { TableOfContents, parseHeadings, type TocItem, type TableOfContentsProps } from './components/TableOfContents';
export { Toolbar } from './components/Toolbar';
export { BlockMenu } from './components/BlockMenu';
export { BlockWrapper } from './components/BlockWrapper';
export { StatusBar, calculateReadingTime, type StatusBarProps } from './components/StatusBar';
export { MetadataPanel, type EditorMetadata, type MetadataPanelProps } from './components/MetadataPanel';

// Core
export { blockRegistry, BlockRegistry } from './core/block-registry';
export * from './core/types';
export {
  getSelectionState,
  saveSelection as saveSelectionState,
  restoreSelection as restoreSelectionState,
  getSelectedText,
  getSelectedHtml,
  isSelectionInElement,
  isMultiBlockSelection,
  selectAllInElement,
  collapseToStart,
  collapseToEnd,
  setCursorPosition,
  getCursorOffset,
  isCursorAtStart,
  isCursorAtEnd,
  moveCursorToStart,
  moveCursorToEnd,
  wrapSelection,
  unwrapElement,
  findElementsInSelection,
  type SelectionState,
} from './core/selection';
export * from './core/commands';

// Blocks
export * from './blocks';

// Utilities
export * from './utils/helpers';
export * from './utils/uploadConfigHelpers';

// Upload services
export { ImageUploadService } from './services/uploadService';
export { uploadToCloudinary, optimizeCloudinaryUrl, generateCloudinarySrcset } from './services/cloudinaryUpload';
export { uploadToS3, generateS3Url, generateCloudFrontUrl } from './services/s3Upload';
export * from './types/upload';

// Paste handling
export { sanitizeHtml, sanitizePaste, convertPlainTextToHtml, normalizeHtml } from './paste/sanitize';

// Drag & drop
export { initDragDrop, createDragHandle, isDragDropSupported } from './drag/drag-handle';

// Icons (re-export from lucide-react)
export { iconMap, getIcon, type IconName } from './icons';
