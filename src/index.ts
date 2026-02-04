/**
 * Authorly — Rich Text Editor for Blogs & Publishing
 * A rich text editor for authors, blogs, and documentation with clean, publish-ready output.
 * 
 * @packageDocumentation
 */

// Styles
import './styles/editor.css';

// Main components
export { ContentBlocksEditor, type EditorRef } from './components/Editor';
export { ContentBlocksRenderer, type ContentBlocksRendererProps } from './components/Renderer';
export { TableOfContents, parseHeadings, type TocItem, type TableOfContentsProps } from './components/TableOfContents';
export { Toolbar } from './components/Toolbar';
export { BlockMenu } from './components/BlockMenu';
export { BlockWrapper } from './components/BlockWrapper';

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

// Paste handling
export { sanitizeHtml, sanitizePaste, convertPlainTextToHtml, normalizeHtml } from './paste/sanitize';

// Drag & drop
export { initDragDrop, createDragHandle, isDragDropSupported } from './drag/drag-handle';

// Icons (re-export from lucide-react)
export { iconMap, getIcon, type IconName } from './icons';
