/**
 * SelectionToolbar Component - Contextual floating toolbar above selected text
 * Appears when text is selected, positioned above the selection
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { EditorInstance } from '../core/types';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Palette,
  Highlighter,
  Link,
  CaseSensitive,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  TextCursorInput,
  X,
} from 'lucide-react';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  toggleInlineCode,
  insertLink,
  setTextColor,
  setHighlightColor,
  setAlignment,
  setFontFamily,
  setFontSize,
} from '../core/commands';
import { getBlockFromChild } from '../utils/helpers';

interface SelectionToolbarProps {
  editor: EditorInstance | null;
  darkMode?: boolean;
}

type PopoverType = 'textColor' | 'highlight' | 'link' | 'textCase' | 'align' | 'fontFamily' | 'fontSize' | null;

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  editor,
  darkMode = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isInteractingRef = useRef(false);

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

  // Font families
  const fontFamilies = [
    { value: 'inherit', label: 'Default' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: '"Courier New", monospace', label: 'Courier New' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
    { value: 'Impact, sans-serif', label: 'Impact' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet' },
    { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  ];

  // Font sizes
  const fontSizes = [
    { value: '0.75rem', label: '12px' },
    { value: '0.875rem', label: '14px' },
    { value: '1rem', label: '16px' },
    { value: '1.125rem', label: '18px' },
    { value: '1.25rem', label: '20px' },
    { value: '1.5rem', label: '24px' },
    { value: '1.875rem', label: '30px' },
    { value: '2.25rem', label: '36px' },
    { value: '3rem', label: '48px' },
  ];

  // Save selection before toolbar interaction
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor?.container && editor.container.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, [editor]);

  // Restore selection after toolbar interaction
  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current && editor?.container) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
        
        // Focus the contenteditable element
        const editableElement = savedRangeRef.current.commonAncestorContainer;
        let focusTarget = editableElement.nodeType === Node.ELEMENT_NODE 
          ? editableElement as HTMLElement 
          : editableElement.parentElement;
        
        while (focusTarget && focusTarget !== editor.container) {
          if (focusTarget.getAttribute('contenteditable') === 'true') {
            focusTarget.focus();
            break;
          }
          focusTarget = focusTarget.parentElement;
        }
      }
    }
  }, [editor]);

  // Update toolbar position and visibility based on selection
  const updateToolbar = useCallback(() => {
    // Don't hide if user is interacting with toolbar/popover
    if (isInteractingRef.current) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      // Hide toolbar when no selection
      setIsVisible(false);
      setActivePopover(null);
      savedRangeRef.current = null;
      return;
    }

    // Check if selection is within our editor
    const range = selection.getRangeAt(0);
    if (!editor?.container || !editor.container.contains(range.commonAncestorContainer)) {
      setIsVisible(false);
      setActivePopover(null);
      savedRangeRef.current = null;
      return;
    }

    // Get selection bounding rect
    const rect = range.getBoundingClientRect();
    
    // Calculate position above selection
    const top = rect.top + window.scrollY - 50; // 50px above selection
    const left = rect.left + window.scrollX + (rect.width / 2); // Center of selection

    setPosition({ top, left });
    setIsVisible(true);
    saveSelection();
  }, [editor, saveSelection]);

  // Listen to selection changes
  useEffect(() => {
    let rafId: number | null = null;
    
    const handleSelectionChange = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateToolbar();
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [updateToolbar]);

  // Handle mouse enter/leave for toolbar and popover
  useEffect(() => {
    const handleMouseEnter = () => {
      isInteractingRef.current = true;
    };

    const handleMouseLeave = () => {
      isInteractingRef.current = false;
      // Check selection after a delay
      setTimeout(() => {
        if (!isInteractingRef.current) {
          updateToolbar();
        }
      }, 100);
    };

    const toolbar = toolbarRef.current;
    const popover = popoverRef.current;

    if (toolbar) {
      toolbar.addEventListener('mouseenter', handleMouseEnter);
      toolbar.addEventListener('mouseleave', handleMouseLeave);
    }

    if (popover) {
      popover.addEventListener('mouseenter', handleMouseEnter);
      popover.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (toolbar) {
        toolbar.removeEventListener('mouseenter', handleMouseEnter);
        toolbar.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (popover) {
        popover.removeEventListener('mouseenter', handleMouseEnter);
        popover.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [updateToolbar, activePopover]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          !toolbarRef.current?.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };

    if (activePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activePopover]);

  // Handle Escape key to close popover
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePopover) {
        e.preventDefault();
        setActivePopover(null);
        restoreSelection();
      }
    };

    if (activePopover) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [activePopover, restoreSelection]);

  // Toolbar action handlers
  const handleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setTimeout(() => {
      restoreSelection();
      if (editor?.container) toggleBold(editor.container);
    }, 0);
  };

  const handleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setTimeout(() => {
      restoreSelection();
      if (editor?.container) toggleItalic(editor.container);
    }, 0);
  };

  const handleUnderline = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setTimeout(() => {
      restoreSelection();
      if (editor?.container) toggleUnderline(editor.container);
    }, 0);
  };

  const handleStrikethrough = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setTimeout(() => {
      restoreSelection();
      if (editor?.container) toggleStrikethrough(editor.container);
    }, 0);
  };

  const handleInlineCode = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setTimeout(() => {
      restoreSelection();
      if (editor?.container) toggleInlineCode(editor.container);
    }, 0);
  };

  const handleTextColorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setActivePopover(activePopover === 'textColor' ? null : 'textColor');
  };

  const handleTextColor = (color: string) => {
    restoreSelection();
    if (editor?.container) {
      setTextColor(editor.container, color);
    }
    setActivePopover(null);
  };

  const handleHighlightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setActivePopover(activePopover === 'highlight' ? null : 'highlight');
  };

  const handleHighlight = (color: string) => {
    restoreSelection();
    if (editor?.container) {
      setHighlightColor(editor.container, color);
    }
    setActivePopover(null);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    
    // Check if there's already a link
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer as Node | null;
      while (node && node !== editor?.container) {
        if (node instanceof HTMLAnchorElement) {
          setLinkUrl(node.href);
          break;
        }
        node = node.parentNode;
      }
    }
    
    setActivePopover(activePopover === 'link' ? null : 'link');
  };

  const handleInsertLink = () => {
    restoreSelection();
    if (editor?.container && linkUrl) {
      insertLink(editor.container, linkUrl);
    }
    setLinkUrl('');
    setActivePopover(null);
  };

  const handleAlignClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setActivePopover(activePopover === 'align' ? null : 'align');
  };

  const handleAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    restoreSelection();
    if (savedRangeRef.current) {
      // Get the block element containing the selection
      const block = getBlockFromChild(savedRangeRef.current.commonAncestorContainer as HTMLElement);
      if (block) {
        setAlignment(block, align);
      }
    }
    setActivePopover(null);
  };

  const handleTextCaseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setActivePopover(activePopover === 'textCase' ? null : 'textCase');
  };

  const handleTextCase = (caseType: 'uppercase' | 'lowercase' | 'capitalize') => {
    restoreSelection();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = range.toString();
      let newText = text;
      
      switch (caseType) {
        case 'uppercase':
          newText = text.toUpperCase();
          break;
        case 'lowercase':
          newText = text.toLowerCase();
          break;
        case 'capitalize':
          newText = text.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          break;
      }
      
      document.execCommand('insertText', false, newText);
    }
    setActivePopover(null);
  };

  const handleFontFamilyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setActivePopover(activePopover === 'fontFamily' ? null : 'fontFamily');
  };

  const handleFontFamily = (font: string) => {
    restoreSelection();
    if (editor?.container) {
      setFontFamily(editor.container, font);
    }
    setActivePopover(null);
  };

  const handleFontSizeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    setActivePopover(activePopover === 'fontSize' ? null : 'fontSize');
  };

  const handleFontSize = (size: string) => {
    restoreSelection();
    if (editor?.container) {
      setFontSize(editor.container, size);
    }
    setActivePopover(null);
  };

  const handleClosePopover = () => {
    setActivePopover(null);
    setTimeout(() => {
      restoreSelection();
    }, 0);
  };

  if (!isVisible) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      className={`cb-selection-toolbar ${darkMode ? 'cb-dark' : ''}`}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 10000,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        saveSelection();
      }}
    >
      <div className="cb-selection-toolbar-content">
        <button
          className="cb-toolbar-btn"
          onClick={handleBold}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold size={16} />
        </button>

        <button
          className="cb-toolbar-btn"
          onClick={handleItalic}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic size={16} />
        </button>

        <button
          className="cb-toolbar-btn"
          onClick={handleUnderline}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <Underline size={16} />
        </button>

        <button
          className="cb-toolbar-btn"
          onClick={handleStrikethrough}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>

        <button
          className="cb-toolbar-btn"
          onClick={handleInlineCode}
          title="Inline Code"
          aria-label="Inline Code"
        >
          <Code size={16} />
        </button>

        <div className="cb-selection-toolbar-divider" />

        <button
          className={`cb-toolbar-btn ${activePopover === 'fontFamily' ? 'cb-toolbar-btn-active' : ''}`}
          onClick={handleFontFamilyClick}
          title="Font Family"
          aria-label="Font Family"
        >
          <Type size={16} />
        </button>

        <button
          className={`cb-toolbar-btn ${activePopover === 'fontSize' ? 'cb-toolbar-btn-active' : ''}`}
          onClick={handleFontSizeClick}
          title="Font Size"
          aria-label="Font Size"
        >
          <TextCursorInput size={16} />
        </button>

        <div className="cb-selection-toolbar-divider" />

        <button
          className={`cb-toolbar-btn ${activePopover === 'textColor' ? 'cb-toolbar-btn-active' : ''}`}
          onClick={handleTextColorClick}
          title="Text Color"
          aria-label="Text Color"
        >
          <Palette size={16} />
        </button>

        <button
          className={`cb-toolbar-btn ${activePopover === 'highlight' ? 'cb-toolbar-btn-active' : ''}`}
          onClick={handleHighlightClick}
          title="Highlight"
          aria-label="Highlight"
        >
          <Highlighter size={16} />
        </button>

        <div className="cb-selection-toolbar-divider" />

        <button
          className={`cb-toolbar-btn ${activePopover === 'link' ? 'cb-toolbar-btn-active' : ''}`}
          onClick={handleLinkClick}
          title="Insert Link"
          aria-label="Insert Link"
        >
          <Link size={16} />
        </button>

        <button
          className={`cb-toolbar-btn ${activePopover === 'align' ? 'cb-toolbar-btn-active' : ''}`}
          onClick={handleAlignClick}
          title="Alignment"
          aria-label="Alignment"
        >
          <AlignLeft size={16} />
        </button>

        <button
          className={`cb-toolbar-btn ${activePopover === 'textCase' ? 'cb-toolbar-btn-active' : ''}`}
          onClick={handleTextCaseClick}
          title="Text Case"
          aria-label="Text Case"
        >
          <CaseSensitive size={16} />
        </button>
      </div>

      {/* Popovers */}
      {activePopover === 'textColor' && (
        <div
          ref={popoverRef}
          className="cb-selection-toolbar-popover cb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
          }}
        >
          <div className="cb-popover-header">
            <span className="cb-popover-title">Text Color</span>
            <button className="cb-popover-close-btn" onClick={handleClosePopover}>
              <X size={14} />
            </button>
          </div>
          <div className="cb-color-grid">
            {textColors.map(({ color, label }) => (
              <button
                key={color}
                className="cb-color-swatch"
                style={{ backgroundColor: color }}
                onClick={() => handleTextColor(color)}
                title={label}
                aria-label={`Set text color to ${label}`}
              />
            ))}
          </div>
        </div>
      )}

      {activePopover === 'highlight' && (
        <div
          ref={popoverRef}
          className="cb-selection-toolbar-popover cb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
          }}
        >
          <div className="cb-popover-header">
            <span className="cb-popover-title">Highlight</span>
            <button className="cb-popover-close-btn" onClick={handleClosePopover}>
              <X size={14} />
            </button>
          </div>
          <div className="cb-color-grid">
            {highlightColors.map(({ color, label }) => (
              <button
                key={color}
                className="cb-color-swatch"
                style={{ backgroundColor: color }}
                onClick={() => handleHighlight(color)}
                title={label}
                aria-label={`Set highlight to ${label}`}
              />
            ))}
          </div>
        </div>
      )}

      {activePopover === 'link' && (
        <div
          ref={popoverRef}
          className="cb-selection-toolbar-popover cb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
          }}
        >
          <div className="cb-popover-header">
            <span className="cb-popover-title">Insert Link</span>
            <button className="cb-popover-close-btn" onClick={handleClosePopover}>
              <X size={14} />
            </button>
          </div>
          <div className="cb-popover-content">
            <input
              type="url"
              className="cb-popover-input"
              placeholder="Enter URL..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInsertLink();
                }
              }}
              autoFocus
            />
            <button
              className="cb-popover-btn cb-popover-btn-primary"
              onClick={handleInsertLink}
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {activePopover === 'align' && (
        <div
          ref={popoverRef}
          className="cb-selection-toolbar-popover cb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
          }}
        >
          <div className="cb-popover-header">
            <span className="cb-popover-title">Alignment</span>
            <button className="cb-popover-close-btn" onClick={handleClosePopover}>
              <X size={14} />
            </button>
          </div>
          <div className="cb-popover-menu">
            <button
              className="cb-popover-menu-item cb-popover-menu-item-align"
              onClick={() => handleAlign('left')}
            >
              <AlignLeft size={16} />
              <span>Align Left</span>
            </button>
            <button
              className="cb-popover-menu-item cb-popover-menu-item-align"
              onClick={() => handleAlign('center')}
            >
              <AlignCenter size={16} />
              <span>Align Center</span>
            </button>
            <button
              className="cb-popover-menu-item cb-popover-menu-item-align"
              onClick={() => handleAlign('right')}
            >
              <AlignRight size={16} />
              <span>Align Right</span>
            </button>
            <button
              className="cb-popover-menu-item cb-popover-menu-item-align"
              onClick={() => handleAlign('justify')}
            >
              <AlignJustify size={16} />
              <span>Justify</span>
            </button>
          </div>
        </div>
      )}

      {activePopover === 'textCase' && (
        <div
          ref={popoverRef}
          className="cb-selection-toolbar-popover cb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
          }}
        >
          <div className="cb-popover-header">
            <span className="cb-popover-title">Text Case</span>
            <button className="cb-popover-close-btn" onClick={handleClosePopover}>
              <X size={14} />
            </button>
          </div>
          <div className="cb-popover-menu">
            <button
              className="cb-popover-menu-item"
              onClick={() => handleTextCase('uppercase')}
            >
              UPPERCASE
            </button>
            <button
              className="cb-popover-menu-item"
              onClick={() => handleTextCase('lowercase')}
            >
              lowercase
            </button>
            <button
              className="cb-popover-menu-item"
              onClick={() => handleTextCase('capitalize')}
            >
              Capitalize Each Word
            </button>
          </div>
        </div>
      )}

      {activePopover === 'fontFamily' && (
        <div
          ref={popoverRef}
          className="cb-selection-toolbar-popover cb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
          }}
        >
          <div className="cb-popover-header">
            <span className="cb-popover-title">Font Family</span>
            <button className="cb-popover-close-btn" onClick={handleClosePopover}>
              <X size={14} />
            </button>
          </div>
          <div className="cb-popover-menu">
            {fontFamilies.map(({ value, label }) => (
              <button
                key={value}
                className="cb-popover-menu-item"
                onClick={() => handleFontFamily(value)}
                style={{ fontFamily: value }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activePopover === 'fontSize' && (
        <div
          ref={popoverRef}
          className="cb-selection-toolbar-popover cb-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
          }}
        >
          <div className="cb-popover-header">
            <span className="cb-popover-title">Font Size</span>
            <button className="cb-popover-close-btn" onClick={handleClosePopover}>
              <X size={14} />
            </button>
          </div>
          <div className="cb-popover-menu">
            {fontSizes.map(({ value, label }) => (
              <button
                key={value}
                className="cb-popover-menu-item"
                onClick={() => handleFontSize(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
