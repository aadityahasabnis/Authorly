/**
 * Icons - Using Lucide React
 */

import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Image,
  Video,
  Minus,
  AlertCircle,
  ChevronDown,
  Table,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Link2Off,
  Highlighter,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Plus,
  GripVertical,
  MoreHorizontal,
  ChevronUp,
  MoveUp,
  MoveDown,
  Maximize2,
  X,
  Check,
  Search,
  Settings,
  Sun,
  Moon,
  FileText,
  FileCode,
  Download,
  Upload,
  ExternalLink,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  FileIcon,
  Indent,
  Outdent,
  RotateCcw,
  Columns,
  Rows,
  Eraser,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'list'
  | 'listOrdered'
  | 'checkList'
  | 'quote'
  | 'code'
  | 'image'
  | 'video'
  | 'divider'
  | 'callout'
  | 'accordion'
  | 'table'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'link'
  | 'unlink'
  | 'highlight'
  | 'textColor'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'delete'
  | 'plus'
  | 'drag'
  | 'more'
  | 'chevronUp'
  | 'chevronDown'
  | 'moveUp'
  | 'moveDown'
  | 'maximize'
  | 'close'
  | 'check'
  | 'search'
  | 'settings'
  | 'sun'
  | 'moon'
  | 'document'
  | 'codeFile'
  | 'download'
  | 'upload'
  | 'externalLink'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'file'
  | 'indent'
  | 'outdent'
  | 'clear'
  | 'columns'
  | 'rows'
  | 'eraser';

/**
 * Icon map - maps icon names to Lucide components
 */
export const iconMap: Record<IconName, LucideIcon> = {
  paragraph: Type,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  heading4: Heading4,
  heading5: Heading5,
  heading6: Heading6,
  list: List,
  listOrdered: ListOrdered,
  checkList: CheckSquare,
  quote: Quote,
  code: Code,
  image: Image,
  video: Video,
  divider: Minus,
  callout: AlertCircle,
  accordion: ChevronDown,
  table: Table,
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strikethrough: Strikethrough,
  link: Link,
  unlink: Link2Off,
  highlight: Highlighter,
  textColor: Palette,
  alignLeft: AlignLeft,
  alignCenter: AlignCenter,
  alignRight: AlignRight,
  alignJustify: AlignJustify,
  undo: Undo,
  redo: Redo,
  copy: Copy,
  cut: Scissors,
  paste: ClipboardPaste,
  delete: Trash2,
  plus: Plus,
  drag: GripVertical,
  more: MoreHorizontal,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  moveUp: MoveUp,
  moveDown: MoveDown,
  maximize: Maximize2,
  close: X,
  check: Check,
  search: Search,
  settings: Settings,
  sun: Sun,
  moon: Moon,
  document: FileText,
  codeFile: FileCode,
  download: Download,
  upload: Upload,
  externalLink: ExternalLink,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
  file: FileIcon,
  indent: Indent,
  outdent: Outdent,
  clear: RotateCcw,
  columns: Columns,
  rows: Rows,
  eraser: Eraser,
};

/**
 * Get icon component by name
 */
export function getIcon(name: IconName): LucideIcon {
  return iconMap[name] || Type;
}

// Re-export commonly used icons
export {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Link,
  Code,
  List,
  ListOrdered,
  Quote,
  Image,
  Table,
  Minus,
  Plus,
  GripVertical,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Settings,
  Download,
  ChevronDown,
  X,
  Check,
  MoreHorizontal,
};
