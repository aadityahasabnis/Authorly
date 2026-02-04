/**
 * Toolbar Component - Professional with floating popovers
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ToolbarProps, InlineFormat, BlockType } from '../core/types';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Video,
  Minus,
  Table,
  Eraser,
  Download,
  FileCode,
  ChevronDown,
  AlertCircle,
  Palette,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  toggleInlineCode,
  insertLink,
  setHighlightColor,
  setTextColor,
  clearFormatting,
  setAlignment,
} from '../core/commands';
import { isFormatActive } from '../core/commands';
import { getBlockFromChild } from '../utils/helpers';

interface ToolbarButton {
  icon: LucideIcon;
  label: string;
  action: (e: React.MouseEvent) => void;
  isActive?: () => boolean;
  shortcut?: string;
}

interface ToolbarGroup {
  name: string;
  buttons: ToolbarButton[];
}

type PopoverType = 'link' | 'highlight' | 'textColor' | null;

export const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  className = '',
  darkMode = false,
}) => {
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Update format state on selection change (debounced to avoid flicker)
  useEffect(() => {
    const updateFormatState = () => {
      // Only update if selection is within the editor
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const container = editor?.container;
      if (!container || !container.contains(range.commonAncestorContainer)) return;
      
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
      });
    };

    document.addEventListener('selectionchange', updateFormatState);
    return () => document.removeEventListener('selectionchange', updateFormatState);
  }, [editor]);

  // Text colors
  const textColors = [
    { color: '#000000', label: 'Black' },
    { color: '#374151', label: 'Gray' },
    { color: '#dc2626', label: 'Red' },
    { color: '#ea580c', label: 'Orange' },
    { color: '#ca8a04', label: 'Yellow' },
    { color: '#16a34a', label: 'Green' },
    { color: '#0891b2', label: 'Cyan' },
    { color: '#2563eb', label: 'Blue' },
    { color: '#7c3aed', label: 'Purple' },
    { color: '#db2777', label: 'Pink' },
  ];

  // Highlight colors  
  const highlightColors = [
    { color: '#fef08a', label: 'Yellow' },
    { color: '#bbf7d0', label: 'Green' },
    { color: '#bfdbfe', label: 'Blue' },
    { color: '#fecaca', label: 'Red' },
    { color: '#e9d5ff', label: 'Purple' },
    { color: '#fed7aa', label: 'Orange' },
    { color: '#99f6e4', label: 'Teal' },
    { color: '#fce7f3', label: 'Pink' },
    { color: '#e5e7eb', label: 'Gray' },
    { color: 'transparent', label: 'None' },
  ];

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          !toolbarRef.current?.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open popover at button position
  const openPopover = useCallback((type: PopoverType, e: React.MouseEvent) => {
    if (activePopover === type) {
      setActivePopover(null);
      return;
    }
    
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const toolbarRect = toolbarRef.current?.getBoundingClientRect();
    
    setPopoverPosition({
      x: rect.left - (toolbarRect?.left || 0),
      y: rect.bottom - (toolbarRect?.top || 0) + 8,
    });
    setActivePopover(type);
    setLinkUrl('');
    setLinkText('');
  }, [activePopover]);

  // Handle link insertion
  const handleInsertLink = useCallback(() => {
    if (linkUrl && editor?.container) {
      insertLink(editor.container, linkUrl, linkText || undefined);
      setActivePopover(null);
      setLinkUrl('');
      setLinkText('');
    }
  }, [linkUrl, linkText, editor]);

  // Handle text color
  const handleTextColor = useCallback((color: string) => {
    if (editor?.container) {
      setTextColor(editor.container, color);
      setActivePopover(null);
    }
  }, [editor]);

  // Handle highlight color
  const handleHighlight = useCallback((color: string) => {
    if (editor?.container) {
      if (color === 'transparent') {
        document.execCommand('removeFormat', false);
      } else {
        setHighlightColor(editor.container, color);
      }
      setActivePopover(null);
    }
  }, [editor]);

  // Handle export
  const handleExport = useCallback((format: 'html' | 'json') => {
    if (!editor) return;
    
    const html = editor.getHTML();
    let content: string;
    let filename: string;
    let type: string;

    if (format === 'html') {
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    img { max-width: 100%; height: auto; }
    pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { font-family: monospace; }
    blockquote { border-left: 4px solid #3b82f6; margin: 1rem 0; padding: 0.5rem 1rem; background: #f8fafc; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
      filename = 'document.html';
      type = 'text/html';
    } else {
      content = JSON.stringify({ content: html }, null, 2);
      filename = 'document.json';
      type = 'application/json';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor]);

  if (!editor) return null;

  // Helper to transform or insert block
  const handleBlockAction = (type: BlockType, data?: Record<string, any>) => {
    const activeElement = document.activeElement;
    const block = activeElement?.closest('.cb-block');
    const blockId = block?.getAttribute('data-block-id');
    const currentType = block?.getAttribute('data-block-type');
    const editable = block?.querySelector('[contenteditable="true"]');
    
    if (blockId && currentType === 'paragraph' && editable && !editable.textContent?.trim()) {
      editor.transformBlock(block as HTMLElement, type, data);
    } else {
      editor.insertBlock(type, data as any);
    }
  };

  const toolbarGroups: ToolbarGroup[] = [
    {
      name: 'history',
      buttons: [
        {
          icon: Undo,
          label: 'Undo',
          action: () => editor.undo(),
          shortcut: 'Ctrl+Z',
        },
        {
          icon: Redo,
          label: 'Redo',
          action: () => editor.redo(),
          shortcut: 'Ctrl+Y',
        },
      ],
    },
    {
      name: 'formatting',
      buttons: [
        {
          icon: Bold,
          label: 'Bold',
          action: () => toggleBold(editor.container),
          isActive: () => formatState.bold,
          shortcut: 'Ctrl+B',
        },
        {
          icon: Italic,
          label: 'Italic',
          action: () => toggleItalic(editor.container),
          isActive: () => formatState.italic,
          shortcut: 'Ctrl+I',
        },
        {
          icon: Underline,
          label: 'Underline',
          action: () => toggleUnderline(editor.container),
          isActive: () => formatState.underline,
          shortcut: 'Ctrl+U',
        },
        {
          icon: Strikethrough,
          label: 'Strikethrough',
          action: () => toggleStrikethrough(editor.container),
          isActive: () => formatState.strikethrough,
        },
        {
          icon: Code,
          label: 'Inline Code',
          action: () => toggleInlineCode(editor.container),
        },
      ],
    },
    {
      name: 'richtext',
      buttons: [
        {
          icon: Link,
          label: 'Insert Link',
          action: (e) => openPopover('link', e),
        },
        {
          icon: Highlighter,
          label: 'Highlight',
          action: (e) => openPopover('highlight', e),
        },
        {
          icon: Palette,
          label: 'Text Color',
          action: (e) => openPopover('textColor', e),
        },
      ],
    },
    {
      name: 'alignment',
      buttons: [
        {
          icon: AlignLeft,
          label: 'Align Left',
          action: () => {
            const block = getBlockFromChild(document.activeElement);
            if (block) setAlignment(block, 'left');
          },
        },
        {
          icon: AlignCenter,
          label: 'Align Center',
          action: () => {
            const block = getBlockFromChild(document.activeElement);
            if (block) setAlignment(block, 'center');
          },
        },
        {
          icon: AlignRight,
          label: 'Align Right',
          action: () => {
            const block = getBlockFromChild(document.activeElement);
            if (block) setAlignment(block, 'right');
          },
        },
      ],
    },
    {
      name: 'headings',
      buttons: [
        {
          icon: Heading1,
          label: 'Heading 1',
          action: () => handleBlockAction('heading', { level: 1 }),
          shortcut: 'Ctrl+1',
        },
        {
          icon: Heading2,
          label: 'Heading 2',
          action: () => handleBlockAction('heading', { level: 2 }),
          shortcut: 'Ctrl+2',
        },
        {
          icon: Heading3,
          label: 'Heading 3',
          action: () => handleBlockAction('heading', { level: 3 }),
          shortcut: 'Ctrl+3',
        },
      ],
    },
    {
      name: 'blocks',
      buttons: [
        {
          icon: List,
          label: 'Bullet List',
          action: () => handleBlockAction('bulletList'),
        },
        {
          icon: ListOrdered,
          label: 'Numbered List',
          action: () => handleBlockAction('numberedList'),
        },
        {
          icon: CheckSquare,
          label: 'Checklist',
          action: () => handleBlockAction('checkList'),
        },
        {
          icon: Quote,
          label: 'Quote',
          action: () => handleBlockAction('quote'),
        },
        {
          icon: FileCode,
          label: 'Code Block',
          action: () => handleBlockAction('code'),
        },
      ],
    },
    {
      name: 'media',
      buttons: [
        {
          icon: Image,
          label: 'Image',
          action: () => editor.insertBlock('image'),
        },
        {
          icon: Video,
          label: 'Video',
          action: () => editor.insertBlock('video'),
        },
        {
          icon: Table,
          label: 'Table',
          action: () => editor.insertBlock('table'),
        },
        {
          icon: AlertCircle,
          label: 'Callout',
          action: () => handleBlockAction('callout'),
        },
        {
          icon: Minus,
          label: 'Divider',
          action: () => editor.insertBlock('divider'),
        },
      ],
    },
    {
      name: 'utils',
      buttons: [
        {
          icon: Eraser,
          label: 'Clear Formatting',
          action: () => clearFormatting(editor.container),
        },
        {
          icon: Download,
          label: 'Export HTML',
          action: () => handleExport('html'),
        },
      ],
    },
  ];

  return (
    <div
      ref={toolbarRef}
      className={`cb-toolbar ${className} ${darkMode ? 'cb-toolbar-dark' : ''}`}
      role="toolbar"
      aria-label="Editor formatting options"
      onMouseDown={(e) => {
        // Only prevent default if not clicking inside a popover input
        if (!(e.target as HTMLElement).closest('.cb-popover')) {
          e.preventDefault();
        }
      }}
    >
      {toolbarGroups.map((group) => (
        <div key={group.name} className="cb-toolbar-group" role="group">
          {group.buttons.map((button) => (
            <button
              key={button.label}
              type="button"
              className={`cb-toolbar-btn ${button.isActive?.() ? 'cb-toolbar-btn-active' : ''}`}
              onClick={button.action}
              title={`${button.label}${button.shortcut ? ` (${button.shortcut})` : ''}`}
              aria-label={button.label}
              aria-pressed={button.isActive?.()}
            >
              <button.icon size={18} />
            </button>
          ))}
        </div>
      ))}

      {/* Floating Popovers */}
      {activePopover && (
        <div
          ref={popoverRef}
          className="cb-popover"
          style={{
            position: 'absolute',
            left: popoverPosition.x,
            top: popoverPosition.y,
            zIndex: 1000,
          }}
        >
          {/* Link Popover */}
          {activePopover === 'link' && (
            <div className="cb-popover-content cb-link-popover">
              <div className="cb-popover-header">
                <span>Insert Link</span>
                <button 
                  type="button" 
                  className="cb-popover-close"
                  onClick={() => setActivePopover(null)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="cb-popover-body">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="cb-popover-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInsertLink();
                    if (e.key === 'Escape') setActivePopover(null);
                  }}
                />
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text (optional)"
                  className="cb-popover-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInsertLink();
                    if (e.key === 'Escape') setActivePopover(null);
                  }}
                />
                <button
                  type="button"
                  className="cb-popover-btn-primary"
                  onClick={handleInsertLink}
                  disabled={!linkUrl}
                >
                  Insert Link
                </button>
              </div>
            </div>
          )}

          {/* Highlight Color Popover */}
          {activePopover === 'highlight' && (
            <div className="cb-popover-content cb-color-popover">
              <div className="cb-popover-header">
                <span>Highlight Color</span>
                <button 
                  type="button" 
                  className="cb-popover-close"
                  onClick={() => setActivePopover(null)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="cb-color-grid">
                {highlightColors.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    className="cb-color-swatch"
                    style={{ 
                      backgroundColor: color === 'transparent' ? '#fff' : color,
                      border: color === 'transparent' ? '2px dashed #ccc' : undefined,
                    }}
                    onClick={() => handleHighlight(color)}
                    title={label}
                  >
                    {color === 'transparent' && <X size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text Color Popover */}
          {activePopover === 'textColor' && (
            <div className="cb-popover-content cb-color-popover">
              <div className="cb-popover-header">
                <span>Text Color</span>
                <button 
                  type="button" 
                  className="cb-popover-close"
                  onClick={() => setActivePopover(null)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="cb-color-grid">
                {textColors.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    className="cb-color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => handleTextColor(color)}
                    title={label}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
