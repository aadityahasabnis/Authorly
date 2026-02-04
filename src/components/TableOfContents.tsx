/**
 * TableOfContents - Extracts headings from HTML and renders navigation
 * A self-contained component with all styles included
 */

import React, { useMemo, useCallback } from 'react';

export interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

export interface TableOfContentsProps {
  /** HTML content to extract headings from */
  html: string;
  /** Enable dark mode */
  darkMode?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Title to display above the TOC */
  title?: string;
  /** Minimum heading level to include (1-6) */
  minLevel?: number;
  /** Maximum heading level to include (1-6) */
  maxLevel?: number;
  /** Callback when a heading is clicked */
  onNavigate?: (id: string, item: TocItem) => void;
  /** Whether to scroll smoothly to the heading */
  smoothScroll?: boolean;
  /** Element or selector to find headings in (for navigation) */
  targetContainer?: HTMLElement | string | null;
  /** Show as collapsible */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
}

// Parse headings from HTML and build nested TOC
function parseHeadings(html: string, minLevel: number, maxLevel: number): TocItem[] {
  if (!html) return [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Build selector for heading levels
  const selectors = [];
  for (let i = minLevel; i <= maxLevel; i++) {
    selectors.push(`h${i}`);
  }
  const headings = doc.querySelectorAll(selectors.join(', '));
  
  const items: TocItem[] = [];
  const stack: { level: number; item: TocItem }[] = [];
  
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent?.trim() || '';
    if (!text) return;
    
    // Use existing ID or generate one
    const id = heading.id || `heading-${index}`;
    
    const item: TocItem = { id, text, level, children: [] };
    
    // Find parent for nesting
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    
    if (stack.length === 0) {
      items.push(item);
    } else {
      stack[stack.length - 1].item.children.push(item);
    }
    
    stack.push({ level, item });
  });
  
  return items;
}

// Generate CSS styles
function generateStyles(darkMode: boolean): string {
  const colors = darkMode ? {
    bg: '#1e293b',
    bgHover: '#334155',
    text: '#94a3b8',
    textHover: '#f1f5f9',
    textActive: '#60a5fa',
    border: '#334155',
    title: '#64748b',
  } : {
    bg: '#ffffff',
    bgHover: '#f1f5f9',
    text: '#64748b',
    textHover: '#0f172a',
    textActive: '#3b82f6',
    border: '#e2e8f0',
    title: '#94a3b8',
  };

  return `
    .cbtoc {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .cbtoc-title {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${colors.title};
    }
    .cbtoc-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .cbtoc-list-nested {
      padding-left: 0.75rem;
    }
    .cbtoc-item {
      margin: 0.125rem 0;
    }
    .cbtoc-link {
      display: block;
      padding: 0.25rem 0.5rem;
      font-size: 0.8125rem;
      color: ${colors.text};
      background: none;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cbtoc-link:hover {
      background: ${colors.bgHover};
      color: ${colors.textHover};
    }
    .cbtoc-link-h1 { font-weight: 600; font-size: 0.875rem; }
    .cbtoc-link-h2 { font-weight: 500; font-size: 0.8125rem; }
    .cbtoc-link-h3, .cbtoc-link-h4, .cbtoc-link-h5, .cbtoc-link-h6 { font-weight: 400; font-size: 0.75rem; }
    .cbtoc-empty {
      font-size: 0.75rem;
      color: ${colors.text};
      padding: 0.5rem;
    }
    .cbtoc-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: none;
      border: none;
      border-bottom: 1px solid ${colors.border};
      cursor: pointer;
      color: ${colors.title};
    }
    .cbtoc-toggle:hover {
      background: ${colors.bgHover};
    }
    .cbtoc-toggle-icon {
      transition: transform 0.2s ease;
    }
    .cbtoc-toggle-icon-collapsed {
      transform: rotate(-90deg);
    }
    .cbtoc-content {
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    .cbtoc-content-collapsed {
      max-height: 0;
    }
    .cbtoc-content-expanded {
      max-height: 2000px;
    }
  `;
}

// Recursive TOC list component
const TocList: React.FC<{
  items: TocItem[];
  depth: number;
  onNavigate: (id: string, item: TocItem) => void;
}> = ({ items, depth, onNavigate }) => {
  if (items.length === 0) return null;

  return (
    <ul className={`cbtoc-list ${depth > 0 ? 'cbtoc-list-nested' : ''}`}>
      {items.map((item) => (
        <li key={item.id} className="cbtoc-item">
          <button
            className={`cbtoc-link cbtoc-link-h${item.level}`}
            onClick={() => onNavigate(item.id, item)}
            title={item.text}
          >
            {item.text}
          </button>
          {item.children.length > 0 && (
            <TocList items={item.children} depth={depth + 1} onNavigate={onNavigate} />
          )}
        </li>
      ))}
    </ul>
  );
};

/**
 * TableOfContents - Generates navigation from HTML headings
 * 
 * @example
 * ```tsx
 * import { TableOfContents } from 'authorly';
 * 
 * function Sidebar({ html }) {
 *   return (
 *     <TableOfContents 
 *       html={html} 
 *       darkMode={false}
 *       title="Contents"
 *       onNavigate={(id) => {
 *         document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export const TableOfContents: React.FC<TableOfContentsProps> = ({
  html,
  darkMode = false,
  className = '',
  style,
  title = 'Table of Contents',
  minLevel = 1,
  maxLevel = 6,
  onNavigate,
  smoothScroll = true,
  targetContainer = null,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  // Parse headings
  const tocItems = useMemo(() => {
    return parseHeadings(html, minLevel, maxLevel);
  }, [html, minLevel, maxLevel]);

  // Generate styles
  const styles = useMemo(() => {
    return generateStyles(darkMode);
  }, [darkMode]);

  // Handle navigation
  const handleNavigate = useCallback((id: string, item: TocItem) => {
    // Call custom handler if provided
    if (onNavigate) {
      onNavigate(id, item);
      return;
    }

    // Default navigation behavior
    let element: HTMLElement | null = null;

    if (targetContainer) {
      const container = typeof targetContainer === 'string' 
        ? document.querySelector(targetContainer) 
        : targetContainer;
      element = container?.querySelector(`#${id}`) as HTMLElement;
    } else {
      element = document.getElementById(id);
    }

    if (element) {
      element.scrollIntoView({ 
        behavior: smoothScroll ? 'smooth' : 'auto', 
        block: 'start' 
      });
    }
  }, [onNavigate, smoothScroll, targetContainer]);

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  if (tocItems.length === 0) {
    return (
      <nav className={`cbtoc ${className}`.trim()} style={style}>
        <style>{styles}</style>
        {title && <h3 className="cbtoc-title">{title}</h3>}
        <p className="cbtoc-empty">No headings found</p>
      </nav>
    );
  }

  if (collapsible) {
    return (
      <nav className={`cbtoc ${className}`.trim()} style={style}>
        <style>{styles}</style>
        <button className="cbtoc-toggle" onClick={toggleCollapsed}>
          <span className="cbtoc-title" style={{ margin: 0 }}>{title}</span>
          <svg 
            className={`cbtoc-toggle-icon ${isCollapsed ? 'cbtoc-toggle-icon-collapsed' : ''}`}
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div className={`cbtoc-content ${isCollapsed ? 'cbtoc-content-collapsed' : 'cbtoc-content-expanded'}`}>
          <div style={{ padding: '0.5rem' }}>
            <TocList items={tocItems} depth={0} onNavigate={handleNavigate} />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className={`cbtoc ${className}`.trim()} style={style}>
      <style>{styles}</style>
      {title && <h3 className="cbtoc-title">{title}</h3>}
      <TocList items={tocItems} depth={0} onNavigate={handleNavigate} />
    </nav>
  );
};

export default TableOfContents;

// Export utility functions for custom implementations
export { parseHeadings };
