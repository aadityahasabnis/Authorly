/**
 * Block Menu Component - Slash command menu for inserting blocks
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { BlockMenuProps, BlockType } from '../core/types';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
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
  Link,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

interface BlockMenuItem {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  data?: Record<string, any>; // Additional data to pass when creating block
  inline?: boolean; // If true, insert inline in current block instead of creating new block
}

const BLOCK_MENU_ITEMS: BlockMenuItem[] = [
  {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Plain text paragraph',
    icon: Type,
    keywords: ['text', 'paragraph', 'p'],
  },
  {
    type: 'heading',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1,
    keywords: ['h1', 'heading', 'title', 'header'],
    data: { level: 1 },
  },
  {
    type: 'heading',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    keywords: ['h2', 'heading', 'subtitle'],
    data: { level: 2 },
  },
  {
    type: 'heading',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: Heading3,
    keywords: ['h3', 'heading'],
    data: { level: 3 },
  },
  {
    type: 'bulletList',
    label: 'Bullet List',
    description: 'Create a bulleted list',
    icon: List,
    keywords: ['bullet', 'list', 'ul', 'unordered'],
  },
  {
    type: 'numberedList',
    label: 'Numbered List',
    description: 'Create a numbered list',
    icon: ListOrdered,
    keywords: ['number', 'list', 'ol', 'ordered'],
  },
  {
    type: 'checkList',
    label: 'Checklist',
    description: 'Track tasks with checkboxes',
    icon: CheckSquare,
    keywords: ['check', 'todo', 'task', 'checkbox'],
  },
  {
    type: 'quote',
    label: 'Quote',
    description: 'Capture a quote',
    icon: Quote,
    keywords: ['quote', 'blockquote', 'citation'],
  },
  {
    type: 'code',
    label: 'Code Block',
    description: 'Display code with syntax highlighting',
    icon: Code,
    keywords: ['code', 'pre', 'syntax', 'programming'],
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Upload or embed an image',
    icon: Image,
    keywords: ['image', 'picture', 'photo', 'img'],
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embed a video from YouTube, Vimeo, etc.',
    icon: Video,
    keywords: ['video', 'youtube', 'vimeo', 'embed'],
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Visual separator between sections',
    icon: Minus,
    keywords: ['divider', 'hr', 'line', 'separator'],
  },
  {
    type: 'callout',
    label: 'Callout',
    description: 'Highlight important information',
    icon: AlertCircle,
    keywords: ['callout', 'alert', 'info', 'warning', 'note'],
  },
  {
    type: 'accordion',
    label: 'Accordion',
    description: 'Collapsible content section',
    icon: ChevronDown,
    keywords: ['accordion', 'collapse', 'toggle', 'details'],
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Insert formatted date',
    icon: Calendar,
    keywords: ['date', 'time', 'calendar', 'today'],
    inline: true, // Insert inline, not as a block
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Add a table',
    icon: Table,
    keywords: ['table', 'grid', 'rows', 'columns'],
  },
  {
    type: 'linkPreview',
    label: 'Link Preview',
    description: 'Rich preview card for URLs',
    icon: Link,
    keywords: ['link', 'url', 'preview', 'embed', 'opengraph'],
  },
];

export const BlockMenu: React.FC<BlockMenuProps> = ({
  editor,
  position,
  onSelect,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Filter items based on search
  const filteredItems = BLOCK_MENU_ITEMS.filter((item) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.keywords.some((k) => k.includes(searchLower))
    );
  });

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Scroll selected item into view when selection changes
  useEffect(() => {
    const selectedElement = itemRefs.current.get(selectedIndex);
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            const item = filteredItems[selectedIndex];
            onSelect(item.type, item.data, item.inline);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredItems, selectedIndex, onSelect, onClose]
  );

  // Calculate position (ensure menu stays in viewport)
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 400),
    zIndex: 1000,
  };

  return (
    <div
      ref={menuRef}
      className="cb-block-menu"
      style={style}
      role="listbox"
      aria-label="Insert block"
    >
      <div className="cb-block-menu-search">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search blocks..."
          className="cb-block-menu-input"
          aria-label="Search blocks"
        />
      </div>

      <div className="cb-block-menu-list">
        {filteredItems.length === 0 ? (
          <div className="cb-block-menu-empty">No matching blocks</div>
        ) : (
          filteredItems.map((item, index) => (
            <button
              key={`${item.type}-${item.label}`}
              ref={(el) => {
                if (el) {
                  itemRefs.current.set(index, el);
                } else {
                  itemRefs.current.delete(index);
                }
              }}
              type="button"
              className={`cb-block-menu-item ${
                index === selectedIndex ? 'cb-block-menu-item-selected' : ''
              }`}
              onClick={() => onSelect(item.type, item.data, item.inline)}
              onMouseEnter={() => setSelectedIndex(index)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="cb-block-menu-item-icon">
                <item.icon size={20} />
              </div>
              <div className="cb-block-menu-item-content">
                <span className="cb-block-menu-item-label">{item.label}</span>
                <span className="cb-block-menu-item-description">
                  {item.description}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="cb-block-menu-footer">
        <span>↑↓ Navigate</span>
        <span>↵ Select</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
};
