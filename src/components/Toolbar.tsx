/**
 * Toolbar Component - Professional with floating popovers
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ToolbarProps, BlockType } from '../core/types';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  toggleInlineCode,
  insertLink,
  removeLink,
  setTextColor,
  setHighlightColor,
  setAlignment,
  clearFormatting,
} from '../core/commands';
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
  PenTool,
  Eraser,
  Download,
  FileCode,
  FileText,
  ChevronDown,
  AlertCircle,
  Palette,
  X,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  Circle,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  CaseSensitive,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
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

type PopoverType = 'link' | 'highlight' | 'textColor' | 'date' | 'time' | 'textCase' | null;

export const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  className = '',
  darkMode = false,
}) => {
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [linkUrl, setLinkUrl] = useState('');
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });
  
  // Link preview state
  const [linkPreview, setLinkPreview] = useState<{
    url: string;
    element: HTMLAnchorElement;
    position: { x: number; y: number };
  } | null>(null);
  
  // Date calendar picker state
  const [dateCalendar, setDateCalendar] = useState<{
    date: Date;
    element: HTMLElement;
    position: { x: number; y: number };
  } | null>(null);
  
  // Time picker state
  const [timePickerState, setTimePickerState] = useState({
    hour: 12,
    minute: 0,
    period: 'AM' as 'AM' | 'PM',
    timezone: 'IST',
  });
  
  // Time picker hover state (for editing existing time)
  const [timePicker, setTimePicker] = useState<{
    element: HTMLElement;
    position: { x: number; y: number };
  } | null>(null);
  
  const toolbarRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const linkPreviewRef = useRef<HTMLDivElement>(null);
  const dateCalendarRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const linkHoverTimeoutRef = useRef<number | null>(null);
  const linkCloseTimeoutRef = useRef<number | null>(null);
  const dateHoverTimeoutRef = useRef<number | null>(null);
  const dateCloseTimeoutRef = useRef<number | null>(null);
  const timeHoverTimeoutRef = useRef<number | null>(null);
  const timeCloseTimeoutRef = useRef<number | null>(null);

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

  // FIXED (Bug #20): Optimize year range from 201 to 51 options (±25 years)
  // Most use cases don't need dates beyond ±25 years from current year
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: JSX.Element[] = [];
    const yearRange = 25; // ±25 years is sufficient for most use cases
    for (let year = currentYear - yearRange; year <= currentYear + yearRange; year++) {
      years.push(
        <option key={year} value={year}>
          {year}
        </option>
      );
    }
    return years;
  }, []); // Empty deps - only calculate once on mount

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          !toolbarRef.current?.contains(e.target as Node)) {
        setActivePopover(null);
        
        // Restore selection when clicking outside
        setTimeout(() => {
          if (savedRangeRef.current && editor?.container) {
            try {
              const selection = window.getSelection();
              if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedRangeRef.current);
                
                // Focus the contenteditable element
                const editableElement = savedRangeRef.current.commonAncestorContainer;
                let focusTarget: HTMLElement | null = null;
                
                if (editableElement.nodeType === Node.ELEMENT_NODE) {
                  focusTarget = editableElement as HTMLElement;
                } else {
                  focusTarget = editableElement.parentElement;
                }
                
                while (focusTarget && focusTarget !== editor.container) {
                  if (focusTarget.getAttribute('contenteditable') === 'true') {
                    focusTarget.focus();
                    break;
                  }
                  focusTarget = focusTarget.parentElement;
                }
              }
            } catch (error) {
              console.error('Failed to restore selection:', error);
            } finally {
              savedRangeRef.current = null;
            }
          }
        }, 0);
      }
      
      // Close link preview when clicking outside
      if (linkPreviewRef.current && !linkPreviewRef.current.contains(e.target as Node)) {
        setLinkPreview(null);
      }
      
      // Close date calendar when clicking outside
      if (dateCalendarRef.current && !dateCalendarRef.current.contains(e.target as Node)) {
        setDateCalendar(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editor]);

  // Detect link hover and show preview
  useEffect(() => {
    if (!editor?.container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Clear close timeout if hovering back
      if (linkCloseTimeoutRef.current) {
        window.clearTimeout(linkCloseTimeoutRef.current);
        linkCloseTimeoutRef.current = null;
      }
      
      // Check if hovering over a link
      const link = target.closest('a.cb-link') as HTMLAnchorElement;
      if (link && link.href) {
        // Clear any existing open timeout
        if (linkHoverTimeoutRef.current) {
          window.clearTimeout(linkHoverTimeoutRef.current);
        }
        
        // Show preview after short delay
        linkHoverTimeoutRef.current = window.setTimeout(() => {
          const rect = link.getBoundingClientRect();
          
          setLinkPreview({
            url: link.href,
            element: link,
            position: {
              x: rect.left + window.scrollX,
              y: rect.bottom + window.scrollY + 8,
            },
          });
        }, 300); // 300ms delay
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      const link = target.closest('a.cb-link');
      
      if (link) {
        // Clear the open timeout if mouse leaves before preview shows
        if (linkHoverTimeoutRef.current) {
          window.clearTimeout(linkHoverTimeoutRef.current);
          linkHoverTimeoutRef.current = null;
        }
        
        // Don't close if moving to the preview card
        const movingToPreview = relatedTarget?.closest?.('.cb-link-preview');
        if (!movingToPreview) {
          // Close after a short delay
          linkCloseTimeoutRef.current = window.setTimeout(() => {
            setLinkPreview(null);
          }, 200);
        }
      }
    };

    // Hide preview on scroll
    const handleScroll = () => {
      setLinkPreview(null);
      if (linkCloseTimeoutRef.current) {
        window.clearTimeout(linkCloseTimeoutRef.current);
        linkCloseTimeoutRef.current = null;
      }
    };

    editor.container.addEventListener('mouseover', handleMouseOver);
    editor.container.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events

    return () => {
      editor.container.removeEventListener('mouseover', handleMouseOver);
      editor.container.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('scroll', handleScroll, true);
      if (linkHoverTimeoutRef.current) {
        window.clearTimeout(linkHoverTimeoutRef.current);
      }
      if (linkCloseTimeoutRef.current) {
        window.clearTimeout(linkCloseTimeoutRef.current);
      }
    };
  }, [editor]);

  // Detect date hover and show calendar picker
  useEffect(() => {
    if (!editor?.container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Clear close timeout if hovering back
      if (dateCloseTimeoutRef.current) {
        window.clearTimeout(dateCloseTimeoutRef.current);
        dateCloseTimeoutRef.current = null;
      }
      
      // Check if hovering over a date element
      const dateEl = target.closest('.cb-date-inline') as HTMLElement;
      if (dateEl) {
        // Clear any existing open timeout
        if (dateHoverTimeoutRef.current) {
          window.clearTimeout(dateHoverTimeoutRef.current);
        }
        
        // Show calendar after short delay
        dateHoverTimeoutRef.current = window.setTimeout(() => {
          const rect = dateEl.getBoundingClientRect();
          const dateStr = dateEl.getAttribute('data-date') || new Date().toISOString();
          const date = new Date(dateStr);
          
          setDateCalendar({
            date,
            element: dateEl,
            position: {
              x: rect.left + window.scrollX,
              y: rect.bottom + window.scrollY + 8,
            },
          });
        }, 300); // 300ms delay
      }
      
      // Check if hovering over a time element
      const timeEl = target.closest('.cb-time-inline') as HTMLElement;
      if (timeEl) {
        // Clear any existing open timeout
        if (timeHoverTimeoutRef.current) {
          window.clearTimeout(timeHoverTimeoutRef.current);
        }
        
        // Show time picker after short delay
        timeHoverTimeoutRef.current = window.setTimeout(() => {
          const rect = timeEl.getBoundingClientRect();
          const hour = parseInt(timeEl.getAttribute('data-hour') || '12', 10);
          const minute = parseInt(timeEl.getAttribute('data-minute') || '0', 10);
          const period = (timeEl.getAttribute('data-period') || 'AM') as 'AM' | 'PM';
          const timezone = timeEl.getAttribute('data-timezone') || 'IST';
          
          setTimePickerState({ hour, minute, period, timezone });
          setTimePicker({
            element: timeEl,
            position: {
              x: rect.left + window.scrollX,
              y: rect.bottom + window.scrollY + 8,
            },
          });
        }, 300); // 300ms delay
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      const dateEl = target.closest('.cb-date-inline');
      
      if (dateEl) {
        // Clear the open timeout if mouse leaves before calendar shows
        if (dateHoverTimeoutRef.current) {
          window.clearTimeout(dateHoverTimeoutRef.current);
          dateHoverTimeoutRef.current = null;
        }
        
        // Don't close if moving to the calendar
        const movingToCalendar = relatedTarget?.closest?.('.cb-date-calendar');
        if (!movingToCalendar) {
          // Close after a short delay
          dateCloseTimeoutRef.current = window.setTimeout(() => {
            setDateCalendar(null);
          }, 200);
        }
      }
      
      const timeEl = target.closest('.cb-time-inline');
      
      if (timeEl) {
        // Clear the open timeout if mouse leaves before picker shows
        if (timeHoverTimeoutRef.current) {
          window.clearTimeout(timeHoverTimeoutRef.current);
          timeHoverTimeoutRef.current = null;
        }
        
        // Don't close if moving to the time picker
        const movingToPicker = relatedTarget?.closest?.('.cb-time-picker-hover');
        if (!movingToPicker) {
          // Close after a short delay
          timeCloseTimeoutRef.current = window.setTimeout(() => {
            setTimePicker(null);
          }, 200);
        }
      }
    };

    // Hide calendar on scroll
    const handleScroll = () => {
      setDateCalendar(null);
      setTimePicker(null);
      if (dateCloseTimeoutRef.current) {
        window.clearTimeout(dateCloseTimeoutRef.current);
        dateCloseTimeoutRef.current = null;
      }
      if (timeCloseTimeoutRef.current) {
        window.clearTimeout(timeCloseTimeoutRef.current);
        timeCloseTimeoutRef.current = null;
      }
    };

    editor.container.addEventListener('mouseover', handleMouseOver);
    editor.container.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      editor.container.removeEventListener('mouseover', handleMouseOver);
      editor.container.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('scroll', handleScroll, true);
      if (dateHoverTimeoutRef.current) {
        window.clearTimeout(dateHoverTimeoutRef.current);
      }
      if (dateCloseTimeoutRef.current) {
        window.clearTimeout(dateCloseTimeoutRef.current);
      }
      if (timeHoverTimeoutRef.current) {
        window.clearTimeout(timeHoverTimeoutRef.current);
      }
      if (timeCloseTimeoutRef.current) {
        window.clearTimeout(timeCloseTimeoutRef.current);
      }
    };
  }, [editor]);

  // Cleanup all timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      const timeoutRefs = [
        linkHoverTimeoutRef,
        linkCloseTimeoutRef,
        dateHoverTimeoutRef,
        dateCloseTimeoutRef,
        timeHoverTimeoutRef,
        timeCloseTimeoutRef,
      ];
      
      timeoutRefs.forEach(ref => {
        if (ref.current !== null) {
          window.clearTimeout(ref.current);
          ref.current = null;
        }
      });
    };
  }, []);

  // Open popover at button position
  const openPopover = useCallback((type: PopoverType, e: React.MouseEvent) => {
    if (activePopover === type) {
      setActivePopover(null);
      return;
    }
    
    // Note: Selection is saved in toolbar button's onMouseDown handler
    // to capture it before the editor loses focus
    
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const toolbarRect = toolbarRef.current?.getBoundingClientRect();
    
    setPopoverPosition({
      x: rect.left - (toolbarRect?.left || 0),
      y: rect.bottom - (toolbarRect?.top || 0) + 8,
    });
    setActivePopover(type);
    setLinkUrl('');
  }, [activePopover]);

  // Close popover and restore selection
  const handleClosePopover = useCallback(() => {
    setActivePopover(null);
    
    // Restore the saved selection after popover closes
    setTimeout(() => {
      if (savedRangeRef.current && editor?.container) {
        try {
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
            
            // Focus the editor to ensure selection is visible
            const editableElement = savedRangeRef.current.commonAncestorContainer;
            let focusTarget: HTMLElement | null = null;
            
            if (editableElement.nodeType === Node.ELEMENT_NODE) {
              focusTarget = editableElement as HTMLElement;
            } else {
              focusTarget = editableElement.parentElement;
            }
            
            // Find the contenteditable element
            while (focusTarget && focusTarget !== editor.container) {
              if (focusTarget.getAttribute('contenteditable') === 'true') {
                focusTarget.focus();
                break;
              }
              focusTarget = focusTarget.parentElement;
            }
          }
        } catch (error) {
          console.error('Failed to restore selection:', error);
        } finally {
          savedRangeRef.current = null;
        }
      }
    }, 0);
  }, [editor]);

  // Handle link insertion
  const handleInsertLink = useCallback(() => {
    if (linkUrl && editor?.container) {
      // Restore the saved selection before inserting link
      if (savedRangeRef.current) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedRangeRef.current);
        }
      }
      
      insertLink(editor.container, linkUrl);
      setActivePopover(null);
      setLinkUrl('');
      savedRangeRef.current = null;
    }
  }, [linkUrl, editor]);

  // Handle text color
  const handleTextColor = useCallback((color: string) => {
    if (editor?.container) {
      // Restore selection before applying color
      if (savedRangeRef.current) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedRangeRef.current);
        }
      }
      
      setTextColor(editor.container, color);
      setActivePopover(null);
      savedRangeRef.current = null;
    }
  }, [editor]);

  // Handle highlight color
  const handleHighlight = useCallback((color: string) => {
    if (editor?.container) {
      // Restore selection before applying highlight
      if (savedRangeRef.current) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedRangeRef.current);
        }
      }
      
      if (color === 'transparent') {
        document.execCommand('removeFormat', false);
      } else {
        setHighlightColor(editor.container, color);
      }
      setActivePopover(null);
      savedRangeRef.current = null;
    }
  }, [editor]);

  // Handle link preview - edit link
  const handleEditLink = useCallback(() => {
    if (linkPreview) {
      const url = linkPreview.url;
      setLinkUrl(url);
      
      // Select the link element
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(linkPreview.element);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRangeRef.current = range.cloneRange();
      }
      
      setLinkPreview(null);
      setActivePopover('link');
      
      // Position the popup near the link
      const rect = linkPreview.element.getBoundingClientRect();
      const toolbarRect = toolbarRef.current?.getBoundingClientRect();
      setPopoverPosition({
        x: rect.left - (toolbarRect?.left || 0),
        y: rect.bottom - (toolbarRect?.top || 0) + 8,
      });
    }
  }, [linkPreview]);

  // Handle link preview - visit link (reserved for future use)
  const _handleVisitLink = useCallback(() => {
    if (linkPreview) {
      window.open(linkPreview.url, '_blank', 'noopener,noreferrer');
    }
  }, [linkPreview]);

  // Handle link preview - remove link
  const handleRemoveLink = useCallback(() => {
    if (linkPreview && editor?.container) {
      // Select the link
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(linkPreview.element);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      removeLink(editor.container);
      setLinkPreview(null);
    }
  }, [linkPreview, editor]);

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

  // Handle PDF export
  const handleExportPDF = useCallback(() => {
    if (!editor) return;
    
    const html = editor.getHTML();
    
    // Create a temporary iframe for PDF generation
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }
    
    // Write styled content to iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Document</title>
        <style>
          @page {
            size: A4;
            margin: 1.5cm;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 100%;
            margin: 0;
            padding: 0;
            line-height: 1.6;
            color: #111827;
            font-size: 11pt;
          }
          h1 { font-size: 24pt; margin: 12pt 0; font-weight: 700; }
          h2 { font-size: 20pt; margin: 10pt 0; font-weight: 600; }
          h3 { font-size: 16pt; margin: 8pt 0; font-weight: 600; }
          h4 { font-size: 14pt; margin: 6pt 0; font-weight: 600; }
          h5 { font-size: 12pt; margin: 6pt 0; font-weight: 600; }
          h6 { font-size: 11pt; margin: 6pt 0; font-weight: 600; }
          p { margin: 6pt 0; }
          ul, ol { margin: 6pt 0; padding-left: 20pt; }
          li { margin: 3pt 0; }
          img { max-width: 100%; height: auto; page-break-inside: avoid; }
          pre {
            background: #f3f4f6;
            padding: 8pt;
            border-radius: 4pt;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            page-break-inside: avoid;
          }
          code {
            font-family: 'Courier New', monospace;
            background: #f3f4f6;
            padding: 2pt 4pt;
            border-radius: 2pt;
            font-size: 9pt;
          }
          blockquote {
            border-left: 3pt solid #3b82f6;
            margin: 8pt 0;
            padding: 4pt 12pt;
            background: #f8fafc;
            page-break-inside: avoid;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 8pt 0;
            page-break-inside: avoid;
          }
          th, td {
            border: 1pt solid #e5e7eb;
            padding: 4pt 6pt;
            text-align: left;
          }
          th {
            background: #f9fafb;
            font-weight: 600;
          }
          hr {
            border: none;
            border-top: 1pt solid #e5e7eb;
            margin: 12pt 0;
          }
          a {
            color: #2563eb;
            text-decoration: underline;
          }
          strong { font-weight: 700; }
          em { font-style: italic; }
          .cb-hashtag {
            background: #dbeafe;
            border: 1pt solid #93c5fd;
            border-radius: 2pt;
            padding: 1pt 3pt;
            color: #1e40af;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `);
    iframeDoc.close();
    
    // Wait for content to load, then print
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      
      // Remove iframe after a delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }, [editor]);

  // Handle date insertion
  const handleInsertDate = useCallback((date: Date) => {
    if (!editor?.container) return;
    
    // Restore the saved selection before inserting date
    let range: Range;
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
      range = savedRangeRef.current;
    } else {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      range = selection.getRangeAt(0);
    }
    
    const selection = window.getSelection();
    if (!selection) return;
    
    // Import date block functions
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
    dateSpan.setAttribute('data-date', date.toISOString());
    dateSpan.setAttribute('contenteditable', 'false');
    dateSpan.textContent = formatDate(date);
    
    // Insert at cursor
    range.deleteContents();
    range.insertNode(dateSpan);
    
    // Move cursor after the date
    range.setStartAfter(dateSpan);
    range.setEndAfter(dateSpan);
    selection.removeAllRanges();
    selection.addRange(range);
    
    setActivePopover(null);
    savedRangeRef.current = null;
  }, [editor]);

  // Handle time insertion
  const handleInsertTime = useCallback((hour: number, minute: number, period: 'AM' | 'PM', timezone: string) => {
    if (!editor?.container) return;
    
    // Restore the saved selection before inserting time
    let range: Range;
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
      range = savedRangeRef.current;
    } else {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      range = selection.getRangeAt(0);
    }
    
    const selection = window.getSelection();
    if (!selection) return;
    
    // Format time as HH:MM AM/PM TZ
    const timeString = `${hour}:${minute.toString().padStart(2, '0')} ${period} ${timezone}`;
    
    // Create time span element
    const timeSpan = document.createElement('span');
    timeSpan.className = 'cb-time-inline';
    timeSpan.setAttribute('data-time', timeString);
    timeSpan.setAttribute('data-hour', hour.toString());
    timeSpan.setAttribute('data-minute', minute.toString());
    timeSpan.setAttribute('data-period', period);
    timeSpan.setAttribute('data-timezone', timezone);
    timeSpan.setAttribute('contenteditable', 'false');
    timeSpan.textContent = timeString;
    
    // Insert at cursor
    range.deleteContents();
    range.insertNode(timeSpan);
    
    // Move cursor after the time
    range.setStartAfter(timeSpan);
    range.setEndAfter(timeSpan);
    selection.removeAllRanges();
    selection.addRange(range);
    
    setActivePopover(null);
    savedRangeRef.current = null;
  }, [editor]);

  // Handle text case transformation
  const handleTextCase = useCallback((caseType: 'lowercase' | 'uppercase' | 'capitalize') => {
    if (!editor?.container) return;
    
    // Restore the saved selection before transforming
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
    
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // No text selected
    
    // Get selected text
    const selectedText = range.toString();
    if (!selectedText) return;
    
    // Check if already transformed
    const container = range.commonAncestorContainer;
    const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
    const currentCase = parent?.getAttribute('data-text-case');
    
    // If clicking the same transformation, revert to original
    if (currentCase === caseType) {
      const originalText = parent?.getAttribute('data-original-text');
      if (originalText) {
        const textNode = document.createTextNode(originalText);
        range.deleteContents();
        range.insertNode(textNode);
        parent?.removeAttribute('data-text-case');
        parent?.removeAttribute('data-original-text');
        setActivePopover(null);
        savedRangeRef.current = null;
        return;
      }
    }
    
    // Transform text
    let transformedText = selectedText;
    switch (caseType) {
      case 'lowercase':
        transformedText = selectedText.toLowerCase();
        break;
      case 'uppercase':
        transformedText = selectedText.toUpperCase();
        break;
      case 'capitalize':
        transformedText = selectedText
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
    }
    
    // Save original text for toggle behavior
    if (!currentCase) {
      parent?.setAttribute('data-original-text', selectedText);
    }
    parent?.setAttribute('data-text-case', caseType);
    
    // Replace text
    const textNode = document.createTextNode(transformedText);
    range.deleteContents();
    range.insertNode(textNode);
    
    // Restore selection
    range.selectNodeContents(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    setActivePopover(null);
    savedRangeRef.current = null;
  }, [editor]);

  // Handle date update from calendar
  const handleUpdateDate = useCallback((newDate: Date) => {
    if (!dateCalendar) return;
    
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
    
    const element = dateCalendar.element;
    element.setAttribute('data-date', newDate.toISOString());
    element.textContent = formatDate(newDate);
    
    setDateCalendar(null);
  }, [dateCalendar]);

  // Update time on hover picker
  const handleUpdateTime = useCallback((hour: number, minute: number, period: 'AM' | 'PM', timezone: string) => {
    if (!timePicker) return;
    
    const timeString = `${hour}:${minute.toString().padStart(2, '0')} ${period} ${timezone}`;
    
    const element = timePicker.element;
    element.setAttribute('data-time', timeString);
    element.setAttribute('data-hour', hour.toString());
    element.setAttribute('data-minute', minute.toString());
    element.setAttribute('data-period', period);
    element.setAttribute('data-timezone', timezone);
    element.textContent = timeString;
    
    setTimePicker(null);
  }, [timePicker]);

  if (!editor) return null;

  // Helper to transform or insert block
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBlockAction = (type: BlockType, data?: Record<string, any>) => {
    const activeElement = document.activeElement;
    const block = activeElement?.closest('.cb-block');
    const blockId = block?.getAttribute('data-block-id');
    const currentType = block?.getAttribute('data-block-type');
    const editable = block?.querySelector('[contenteditable="true"]');
    
    if (blockId && currentType === 'paragraph' && editable && !editable.textContent?.trim()) {
      editor.transformBlock(block as HTMLElement, type, data);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        {
          icon: CaseSensitive,
          label: 'Text Case',
          action: (e) => openPopover('textCase', e),
        },
        {
          icon: Calendar,
          label: 'Insert Date',
          action: (e) => openPopover('date', e),
        },
        {
          icon: Clock,
          label: 'Insert Time',
          action: (e) => openPopover('time', e),
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
          icon: PenTool,
          label: 'Excalidraw',
          action: () => editor.insertBlock('excalidraw'),
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
          icon: ChevronDown,
          label: 'Accordion',
          action: () => handleBlockAction('accordion'),
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
        {
          icon: FileText,
          label: 'Export PDF',
          action: () => handleExportPDF(),
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
        const target = e.target as HTMLElement;
        
        // Save selection BEFORE anything else happens
        // This captures the cursor position before the editor loses focus
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // Only save if the selection is within the editor
          if (editor?.container && editor.container.contains(range.commonAncestorContainer)) {
            savedRangeRef.current = range.cloneRange();
          }
        }
        
        // Allow clicks on input and select elements to work normally
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
          return;
        }
        // Only prevent default if not clicking inside a popover
        if (!target.closest('.cb-popover')) {
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
            zIndex: 10001, // Higher than selection toolbar (10000)
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
                    if (e.key === 'Escape') handleClosePopover();
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

          {/* Date Picker Popover */}
          {activePopover === 'date' && (
            <div className="cb-popover-content cb-date-popover">
              <div className="cb-popover-header">
                <span>Insert Date</span>
                <button 
                  type="button" 
                  className="cb-popover-close"
                  onClick={handleClosePopover}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="cb-popover-body">
                <div className="cb-date-quick-options">
                  <button
                    type="button"
                    className="cb-date-option-btn"
                    onClick={() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      handleInsertDate(today);
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="cb-date-option-btn"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(0, 0, 0, 0);
                      handleInsertDate(tomorrow);
                    }}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    className="cb-date-option-btn"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      yesterday.setHours(0, 0, 0, 0);
                      handleInsertDate(yesterday);
                    }}
                  >
                    Yesterday
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Time Picker Popover */}
          {activePopover === 'time' && (
            <div className="cb-popover-content cb-time-popover">
              <div className="cb-popover-header">
                <span>Set Time</span>
                <button 
                  type="button" 
                  className="cb-popover-close"
                  onClick={handleClosePopover}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="cb-popover-body">
                <div className="cb-time-picker-compact">
                  {/* Time Display - Compact Row with Now button */}
                  <div className="cb-time-input-group-compact">
                    {/* Hour Input */}
                    <div className="cb-time-input-box-compact">
                      <input
                        type="text"
                        maxLength={2}
                        value={timePickerState.hour.toString().padStart(2, '0')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const num = parseInt(val, 10);
                          if (val === '') {
                            setTimePickerState({ ...timePickerState, hour: 12 });
                          } else if (num >= 1 && num <= 12) {
                            setTimePickerState({ ...timePickerState, hour: num });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const newHour = timePickerState.hour === 12 ? 1 : timePickerState.hour + 1;
                            setTimePickerState({ ...timePickerState, hour: newHour });
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const newHour = timePickerState.hour === 1 ? 12 : timePickerState.hour - 1;
                            setTimePickerState({ ...timePickerState, hour: newHour });
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="cb-time-input-compact"
                      />
                      <div className="cb-time-arrows-compact">
                        <button
                          type="button"
                          onClick={() => {
                            const newHour = timePickerState.hour === 12 ? 1 : timePickerState.hour + 1;
                            setTimePickerState({ ...timePickerState, hour: newHour });
                          }}
                          className="cb-time-arrow-compact"
                        >
                          <ChevronUp size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newHour = timePickerState.hour === 1 ? 12 : timePickerState.hour - 1;
                            setTimePickerState({ ...timePickerState, hour: newHour });
                          }}
                          className="cb-time-arrow-compact"
                        >
                          <ChevronDownIcon size={10} />
                        </button>
                      </div>
                    </div>
                    
                    <span className="cb-time-colon-compact">:</span>
                    
                    {/* Minute Input */}
                    <div className="cb-time-input-box-compact">
                      <input
                        type="text"
                        maxLength={2}
                        value={timePickerState.minute.toString().padStart(2, '0')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const num = parseInt(val, 10);
                          if (val === '') {
                            setTimePickerState({ ...timePickerState, minute: 0 });
                          } else if (num >= 0 && num <= 59) {
                            setTimePickerState({ ...timePickerState, minute: num });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const newMinute = (timePickerState.minute + 1) % 60;
                            setTimePickerState({ ...timePickerState, minute: newMinute });
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const newMinute = (timePickerState.minute - 1 + 60) % 60;
                            setTimePickerState({ ...timePickerState, minute: newMinute });
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="cb-time-input-compact"
                      />
                      <div className="cb-time-arrows-compact">
                        <button
                          type="button"
                          onClick={() => {
                            const newMinute = (timePickerState.minute + 1) % 60;
                            setTimePickerState({ ...timePickerState, minute: newMinute });
                          }}
                          className="cb-time-arrow-compact"
                        >
                          <ChevronUp size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newMinute = (timePickerState.minute - 1 + 60) % 60;
                            setTimePickerState({ ...timePickerState, minute: newMinute });
                          }}
                          className="cb-time-arrow-compact"
                        >
                          <ChevronDownIcon size={10} />
                        </button>
                      </div>
                    </div>
                    
                    {/* AM/PM Toggle */}
                    <button
                      type="button"
                      className="cb-time-period-compact"
                      onClick={() => {
                        setTimePickerState({
                          ...timePickerState,
                          period: timePickerState.period === 'AM' ? 'PM' : 'AM'
                        });
                      }}
                    >
                      {timePickerState.period}
                    </button>
                    
                    {/* Now Button - Icon Only */}
                    <button
                      type="button"
                      className="cb-time-now-icon-compact"
                      onClick={() => {
                        const now = new Date();
                        let hour = now.getHours();
                        const period = hour >= 12 ? 'PM' : 'AM';
                        hour = hour % 12 || 12;
                        const minute = now.getMinutes();
                        setTimePickerState({ ...timePickerState, hour, minute, period });
                      }}
                      title="Set current time"
                    >
                      <Circle size={6} fill="currentColor" className="cb-pulse-dot" />
                    </button>
                  </div>
                  
                  {/* Timezone and Insert Button Row */}
                  <div className="cb-time-bottom-row">
                    <select
                      className="cb-time-zone-compact"
                      value={timePickerState.timezone}
                      onChange={(e) => {
                        setTimePickerState({ ...timePickerState, timezone: e.target.value });
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="IST">🇮🇳 IST - India</option>
                      <option value="UTC">🌍 UTC - Universal</option>
                      <option value="EST">🇺🇸 EST - Eastern</option>
                      <option value="PST">🇺🇸 PST - Pacific</option>
                      <option value="CST">🇺🇸 CST - Central</option>
                      <option value="JST">🇯🇵 JST - Japan</option>
                    </select>
                    
                    <button
                      type="button"
                      className="cb-time-insert-icon-compact"
                      onClick={() => {
                        handleInsertTime(
                          timePickerState.hour,
                          timePickerState.minute,
                          timePickerState.period,
                          timePickerState.timezone
                        );
                      }}
                      title="Insert time"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Text Case Popover */}
          {activePopover === 'textCase' && (
            <div className="cb-popover-content cb-case-popover">
              <div className="cb-popover-header">
                <span>Text Case</span>
                <button 
                  type="button" 
                  className="cb-popover-close"
                  onClick={handleClosePopover}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="cb-popover-body">
                <div className="cb-case-options">
                  <button
                    type="button"
                    className="cb-case-option-btn"
                    onClick={() => handleTextCase('lowercase')}
                  >
                    <span>abc</span>
                    <span className="cb-case-label">lowercase</span>
                  </button>
                  <button
                    type="button"
                    className="cb-case-option-btn"
                    onClick={() => handleTextCase('uppercase')}
                  >
                    <span>ABC</span>
                    <span className="cb-case-label">UPPERCASE</span>
                  </button>
                  <button
                    type="button"
                    className="cb-case-option-btn"
                    onClick={() => handleTextCase('capitalize')}
                  >
                    <span>Abc</span>
                    <span className="cb-case-label">Capitalize</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link Preview Card - rendered in portal for proper positioning */}
      {linkPreview && typeof document !== 'undefined' && createPortal(
        <div
          ref={linkPreviewRef}
          className="cb-link-preview"
          style={{
            position: 'absolute',
            left: linkPreview.position.x,
            top: linkPreview.position.y,
            zIndex: 10000,
          }}
          onMouseEnter={() => {
            // Cancel close timeout when entering preview
            if (linkCloseTimeoutRef.current) {
              window.clearTimeout(linkCloseTimeoutRef.current);
              linkCloseTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            // Close preview when leaving
            linkCloseTimeoutRef.current = window.setTimeout(() => {
              setLinkPreview(null);
            }, 200);
          }}
        >
          <div className="cb-link-preview-content">
            <a 
              href={linkPreview.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="cb-link-preview-url"
              title={linkPreview.url}
            >
              {linkPreview.url}
            </a>
            <div className="cb-link-preview-divider"></div>
            <div className="cb-link-preview-actions">
              <button
                type="button"
                className="cb-link-preview-btn"
                onClick={handleEditLink}
                title="Edit link"
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                className="cb-link-preview-btn cb-link-preview-btn-danger"
                onClick={handleRemoveLink}
                title="Remove link"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Date Calendar Picker - rendered in portal */}
      {dateCalendar && typeof document !== 'undefined' && createPortal(
        <div
          ref={dateCalendarRef}
          className={`cb-date-calendar ${darkMode ? 'cb-dark' : ''}`}
          style={{
            position: 'absolute',
            left: dateCalendar.position.x,
            top: dateCalendar.position.y,
            zIndex: 10000,
          }}
          onMouseEnter={() => {
            // Cancel close timeout when entering calendar
            if (dateCloseTimeoutRef.current) {
              window.clearTimeout(dateCloseTimeoutRef.current);
              dateCloseTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            // Close calendar when leaving
            dateCloseTimeoutRef.current = window.setTimeout(() => {
              setDateCalendar(null);
            }, 200);
          }}
        >
          <div className="cb-calendar-content">
            <div className="cb-calendar-header">
              <button
                type="button"
                className="cb-calendar-nav-btn"
                onClick={() => {
                  const newDate = new Date(dateCalendar.date);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setDateCalendar({ ...dateCalendar, date: newDate });
                }}
              >
                ‹
              </button>
              <div className="cb-calendar-month-year">
                <span className="cb-calendar-month">
                  {dateCalendar.date.toLocaleDateString('en-US', { month: 'long' })}
                </span>
                <select
                  className="cb-calendar-year-select"
                  value={dateCalendar.date.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(dateCalendar.date);
                    newDate.setFullYear(parseInt(e.target.value, 10));
                    setDateCalendar({ ...dateCalendar, date: newDate });
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {yearOptions}
                </select>
              </div>
              <button
                type="button"
                className="cb-calendar-nav-btn"
                onClick={() => {
                  const newDate = new Date(dateCalendar.date);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setDateCalendar({ ...dateCalendar, date: newDate });
                }}
              >
                ›
              </button>
            </div>
            
            <div className="cb-calendar-grid">
              <div className="cb-calendar-weekdays">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="cb-calendar-weekday">{day}</div>
                ))}
              </div>
              
              <div className="cb-calendar-days">
                {(() => {
                  const year = dateCalendar.date.getFullYear();
                  const month = dateCalendar.date.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const startingDayOfWeek = firstDay.getDay();
                  const daysInMonth = lastDay.getDate();
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  const days: JSX.Element[] = [];
                  
                  // Empty cells for days before the first day of the month
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="cb-calendar-day-empty"></div>);
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    date.setHours(0, 0, 0, 0);
                    const isToday = date.getTime() === today.getTime();
                    const isSelected = date.getTime() === new Date(dateCalendar.date).setHours(0, 0, 0, 0);
                    
                    days.push(
                      <button
                        key={day}
                        type="button"
                        className={`cb-calendar-day ${isToday ? 'cb-calendar-day-today' : ''} ${isSelected ? 'cb-calendar-day-selected' : ''}`}
                        onClick={() => handleUpdateDate(date)}
                      >
                        {day}
                      </button>
                    );
                  }
                  
                  return days;
                })()}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Time Picker on Hover - rendered in portal for proper positioning */}
      {timePicker && typeof document !== 'undefined' && createPortal(
        <div
          ref={timePickerRef}
          className={`cb-time-picker-hover ${darkMode ? 'cb-dark' : ''}`}
          style={{
            position: 'absolute',
            left: timePicker.position.x,
            top: timePicker.position.y,
            zIndex: 10000,
          }}
          onMouseEnter={() => {
            if (timeCloseTimeoutRef.current) {
              window.clearTimeout(timeCloseTimeoutRef.current);
              timeCloseTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            timeCloseTimeoutRef.current = window.setTimeout(() => {
              setTimePicker(null);
            }, 200);
          }}
        >
          <div className="cb-time-picker-hover-content">
            <div className="cb-time-hover-header">Edit Time</div>
            
            {/* Time Display - Compact with Now button */}
            <div className="cb-time-input-group-compact">
              {/* Hour */}
              <div className="cb-time-input-box-compact">
                <input
                  type="text"
                  maxLength={2}
                  value={timePickerState.hour.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const num = parseInt(val, 10);
                    if (val === '') {
                      setTimePickerState({ ...timePickerState, hour: 12 });
                    } else if (num >= 1 && num <= 12) {
                      setTimePickerState({ ...timePickerState, hour: num });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const newHour = timePickerState.hour === 12 ? 1 : timePickerState.hour + 1;
                      setTimePickerState({ ...timePickerState, hour: newHour });
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const newHour = timePickerState.hour === 1 ? 12 : timePickerState.hour - 1;
                      setTimePickerState({ ...timePickerState, hour: newHour });
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="cb-time-input-compact"
                />
                <div className="cb-time-arrows-compact">
                  <button
                    type="button"
                    onClick={() => {
                      const newHour = timePickerState.hour === 12 ? 1 : timePickerState.hour + 1;
                      setTimePickerState({ ...timePickerState, hour: newHour });
                    }}
                    className="cb-time-arrow-compact"
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newHour = timePickerState.hour === 1 ? 12 : timePickerState.hour - 1;
                      setTimePickerState({ ...timePickerState, hour: newHour });
                    }}
                    className="cb-time-arrow-compact"
                  >
                    <ChevronDownIcon size={10} />
                  </button>
                </div>
              </div>
              
              <span className="cb-time-colon-compact">:</span>
              
              {/* Minute */}
              <div className="cb-time-input-box-compact">
                <input
                  type="text"
                  maxLength={2}
                  value={timePickerState.minute.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const num = parseInt(val, 10);
                    if (val === '') {
                      setTimePickerState({ ...timePickerState, minute: 0 });
                    } else if (num >= 0 && num <= 59) {
                      setTimePickerState({ ...timePickerState, minute: num });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const newMinute = (timePickerState.minute + 1) % 60;
                      setTimePickerState({ ...timePickerState, minute: newMinute });
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const newMinute = (timePickerState.minute - 1 + 60) % 60;
                      setTimePickerState({ ...timePickerState, minute: newMinute });
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="cb-time-input-compact"
                />
                <div className="cb-time-arrows-compact">
                  <button
                    type="button"
                    onClick={() => {
                      const newMinute = (timePickerState.minute + 1) % 60;
                      setTimePickerState({ ...timePickerState, minute: newMinute });
                    }}
                    className="cb-time-arrow-compact"
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newMinute = (timePickerState.minute - 1 + 60) % 60;
                      setTimePickerState({ ...timePickerState, minute: newMinute });
                    }}
                    className="cb-time-arrow-compact"
                  >
                    <ChevronDownIcon size={10} />
                  </button>
                </div>
              </div>
              
              {/* AM/PM */}
              <button
                type="button"
                className="cb-time-period-compact"
                onClick={() => {
                  setTimePickerState({
                    ...timePickerState,
                    period: timePickerState.period === 'AM' ? 'PM' : 'AM'
                  });
                }}
              >
                {timePickerState.period}
              </button>
              
              {/* Now Button - Icon Only */}
              <button
                type="button"
                className="cb-time-now-icon-compact"
                onClick={() => {
                  const now = new Date();
                  let hour = now.getHours();
                  const period = hour >= 12 ? 'PM' : 'AM';
                  hour = hour % 12 || 12;
                  const minute = now.getMinutes();
                  setTimePickerState({ ...timePickerState, hour, minute, period });
                }}
                title="Set current time"
              >
                <Circle size={6} fill="currentColor" className="cb-pulse-dot" />
              </button>
            </div>
            
            {/* Timezone and Update Button Row */}
            <div className="cb-time-bottom-row">
              <select
                className="cb-time-zone-compact"
                value={timePickerState.timezone}
                onChange={(e) => {
                  setTimePickerState({ ...timePickerState, timezone: e.target.value });
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="IST">🇮🇳 IST - India</option>
                <option value="UTC">🌍 UTC - Universal</option>
                <option value="EST">🇺🇸 EST - Eastern</option>
                <option value="PST">🇺🇸 PST - Pacific</option>
                <option value="CST">🇺🇸 CST - Central</option>
                <option value="JST">🇯🇵 JST - Japan</option>
              </select>
              
              <button
                type="button"
                className="cb-time-insert-icon-compact"
                onClick={() => {
                  handleUpdateTime(
                    timePickerState.hour,
                    timePickerState.minute,
                    timePickerState.period,
                    timePickerState.timezone
                  );
                }}
                title="Update time"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
