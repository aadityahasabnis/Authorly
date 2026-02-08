/**
 * Core Types for Content Blocks Editor
 * Pure HTML output, DOM-first architecture
 */

import type { UploadConfig, UploadResult, UploadProgress } from '../types/upload';

// ============================================
// Block Types
// ============================================

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'numberedList'
  | 'checkList'
  | 'quote'
  | 'code'
  | 'image'
  | 'video'
  | 'divider'
  | 'callout'
  | 'accordion'
  | 'table'
  | 'linkPreview'
  | 'date'
  | 'excalidraw';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type InlineFormat =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'textColor'
  | 'highlight';

export type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'note';

// ============================================
// Block Definition Interface
// ============================================

export interface BlockDefinition {
  /** Unique name for the block */
  name: BlockType;
  /** HTML tag this block renders to */
  tag: string;
  /** Whether the content is editable */
  editable: boolean;
  /** Allowed child types */
  allowedChildren: ('text' | 'inline' | 'block')[];
  /** Default CSS class */
  className?: string;
  /** Icon name for UI */
  icon?: string;
  /** Display label */
  label: string;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Create the DOM element */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data?: any) => HTMLElement;
  /** Get block data from element */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData: (element: HTMLElement) => any;
  /** Update element with new data */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (element: HTMLElement, data: any) => void;
}

// ============================================
// Block Data Types
// ============================================

export interface BaseBlockData {
  id: string;
  type: BlockType;
  className?: string;
}

export interface ParagraphData extends BaseBlockData {
  type: 'paragraph';
  content: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface HeadingData extends BaseBlockData {
  type: 'heading';
  level: HeadingLevel;
  content: string;
  align?: 'left' | 'center' | 'right';
}

export interface ListData extends BaseBlockData {
  type: 'bulletList' | 'numberedList' | 'checkList';
  items: ListItem[];
}

export interface ListItem {
  id: string;
  content: string;
  checked?: boolean;
  children?: ListItem[];
}

export interface QuoteData extends BaseBlockData {
  type: 'quote';
  content: string;
  citation?: string;
}

export interface CodeData extends BaseBlockData {
  type: 'code';
  content: string;
  language?: string;
}

export interface ImageData extends BaseBlockData {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
  width?: number | string;
  height?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface VideoData extends BaseBlockData {
  type: 'video';
  src: string;
  poster?: string;
  caption?: string;
  width?: number | string;
  height?: number | string;
}

export interface DividerData extends BaseBlockData {
  type: 'divider';
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface CalloutData extends BaseBlockData {
  type: 'callout';
  calloutType: CalloutType;
  title?: string;
  content: string;
}

export interface AccordionData extends BaseBlockData {
  type: 'accordion';
  title: string;
  content: string;
  open?: boolean;
}

export interface TableData extends BaseBlockData {
  type: 'table';
  rows: TableRow[];
  hasHeader?: boolean;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  content: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
  rowSpan?: number;
}

export interface DateData extends BaseBlockData {
  type: 'date';
  date: Date | string;
  format?: string;
}

export type BlockData =
  | ParagraphData
  | HeadingData
  | ListData
  | QuoteData
  | CodeData
  | ImageData
  | VideoData
  | DividerData
  | CalloutData
  | AccordionData
  | TableData
  | DateData;

// ============================================
// Editor Configuration
// ============================================

export interface EditorConfig {
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Initial HTML content */
  initialContent?: string;
  /** Enabled block types */
  blocks?: BlockType[];
  /** Enabled inline formats */
  inlineFormats?: InlineFormat[];
  /** Placeholder text */
  placeholder?: string;
  /** Enable autosave */
  autosave?: boolean;
  /** Autosave interval in ms */
  autosaveInterval?: number;
  /** Max undo history */
  maxHistory?: number;
  /** CSS class prefix */
  classPrefix?: string;
  /** Enable spell check */
  spellCheck?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Custom class mappings */
  classMap?: Partial<Record<BlockType, string>>;
  /** Callbacks */
  onChange?: (html: string) => void;
  onSave?: (html: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onBlockAdd?: (block: HTMLElement) => void;
  onBlockRemove?: (block: HTMLElement) => void;
  onBlockMove?: (block: HTMLElement, fromIndex: number, toIndex: number) => void;
}

// ============================================
// Editor State
// ============================================

export interface HistoryEntry {
  html: string;
  cursorPosition: {
    blockId: string | null;
    offset: number;
    isCollapsed: boolean;
  } | null;
}

export interface EditorState {
  /** All block elements */
  blocks: HTMLElement[];
  /** Currently focused block */
  activeBlock: HTMLElement | null;
  /** Current selection */
  selection: Selection | null;
  /** Undo stack with cursor position tracking */
  undoStack: HistoryEntry[];
  /** Redo stack with cursor position tracking */
  redoStack: HistoryEntry[];
  /** Current word count */
  wordCount: number;
  /** Current character count */
  charCount: number;
  /** Is content modified */
  isDirty: boolean;
}

// ============================================
// Command Types
// ============================================

export type CommandName =
  | 'insertBlock'
  | 'deleteBlock'
  | 'moveBlockUp'
  | 'moveBlockDown'
  | 'duplicateBlock'
  | 'transformBlock'
  | 'toggleFormat'
  | 'setAlignment'
  | 'indent'
  | 'outdent'
  | 'undo'
  | 'redo'
  | 'selectAll'
  | 'insertLink'
  | 'insertImage';

export interface Command {
  name: CommandName;
  execute: (editor: EditorInstance, ...args: unknown[]) => void;
  canExecute?: (editor: EditorInstance) => boolean;
  shortcut?: string;
}

// ============================================
// Editor Instance
// ============================================

export interface EditorInstance {
  /** Root container element */
  container: HTMLElement;
  /** Editor config */
  config: EditorConfig;
  /** Current state */
  state: EditorState;
  /** Selection version for tracking changes (used for toolbar updates) */
  selectionVersion?: number;
  /** Get HTML output */
  getHTML: () => string;
  /** Set HTML content */
  setHTML: (html: string) => void;
  /** Get plain text */
  getText: () => string;
  /** Insert a block */
  insertBlock: (type: BlockType, data?: Partial<BlockData>, position?: number) => HTMLElement | null;
  /** Delete a block */
  deleteBlock: (block: HTMLElement) => void;
  /** Move a block */
  moveBlock: (block: HTMLElement, direction: 'up' | 'down') => void;
  /** Transform block type */
  transformBlock: (block: HTMLElement, newType: BlockType, data?: Record<string, any>) => HTMLElement;
  /** Apply inline format */
  toggleFormat: (format: InlineFormat) => void;
  /** Check if format is active */
  isFormatActive: (format: InlineFormat) => boolean;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
  /** Destroy the editor */
  destroy: () => void;
  /** Register a custom block */
  registerBlock: (definition: BlockDefinition) => void;
  /** Register a command */
  registerCommand: (command: Command) => void;
  /** Execute a command */
  executeCommand: (name: CommandName, ...args: unknown[]) => void;
}

// ============================================
// Event Types
// ============================================

export interface EditorEvents {
  change: { html: string };
  focus: { block: HTMLElement | null };
  blur: { block: HTMLElement | null };
  blockAdd: { block: HTMLElement; index: number };
  blockRemove: { block: HTMLElement; index: number };
  blockMove: { block: HTMLElement; fromIndex: number; toIndex: number };
  selectionChange: { selection: Selection | null };
  input: { block: HTMLElement };
  paste: { data: DataTransfer; block: HTMLElement };
  keydown: { event: KeyboardEvent; block: HTMLElement };
}

// ============================================
// Utility Types
// ============================================

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface DragState {
  isDragging: boolean;
  draggedBlock: HTMLElement | null;
  dropTarget: HTMLElement | null;
  dropPosition: 'before' | 'after' | null;
}

// ============================================
// React Component Props
// ============================================

export interface ContentBlocksEditorProps {
  /** Initial HTML content */
  initialContent?: string;
  /** Enabled blocks */
  blocks?: BlockType[];
  /** Enabled inline formats */
  inlineFormats?: InlineFormat[];
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** CSS class prefix */
  classPrefix?: string;
  /** Custom class name for container */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Toolbar position */
  toolbarPosition?: 'top' | 'bottom' | 'floating';
  /** Enable dark mode */
  darkMode?: boolean;
  /** Autofocus on mount */
  autoFocus?: boolean;
  /** Spell check */
  spellCheck?: boolean;
  /** Content change callback */
  onChange?: (html: string) => void;
  /** Save callback */
  onSave?: (html: string) => void;
  /** Focus callback */
  onFocus?: () => void;
  /** Blur callback */
  onBlur?: () => void;
  /** Editor ready callback */
  onReady?: (editor: EditorInstance) => void;
  
  // ============================================
  // Upload Configuration (NEW)
  // ============================================
  
  /** Image upload configuration (Cloudinary, S3, or custom) */
  imageUploadConfig?: UploadConfig;
  
  /** Called when image upload starts */
  onUploadStart?: (filename: string) => void;
  
  /** Called when image upload succeeds */
  onUploadSuccess?: (result: UploadResult) => void;
  
  /** Called when image upload fails */
  onUploadError?: (error: Error) => void;
  
  /** Called to track upload progress */
  onUploadProgress?: (progress: UploadProgress) => void;
}

export interface ToolbarProps {
  editor: EditorInstance;
  className?: string;
  position?: 'top' | 'bottom' | 'floating';
  darkMode?: boolean;
}

export interface BlockMenuProps {
  editor: EditorInstance;
  position: Point;
  onSelect: (type: BlockType, data?: Record<string, any>, inline?: boolean) => void;
  onClose: () => void;
}
