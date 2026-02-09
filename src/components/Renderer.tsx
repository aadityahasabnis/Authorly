/**
 * AuthorlyRenderer - Renders HTML content with all styles included
 * A self-contained component that displays editor output beautifully
 * No external CSS required - just import and use
 * 
 * @example
 * ```tsx
 * import { AuthorlyRenderer } from 'authorly';
 * 
 * function BlogPost({ content }) {
 *   return <AuthorlyRenderer html={content} darkMode={false} />;
 * }
 * ```
 */

import React, { useMemo } from 'react';

export interface AuthorlyRendererProps {
  /** HTML content to render */
  html: string;
  /** Enable dark mode */
  darkMode?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Process code blocks with copy button */
  enableCodeCopy?: boolean;
  /** Process checklist items with strikethrough */
  enableChecklistStyles?: boolean;
  /** Add IDs to headings for navigation */
  enableHeadingIds?: boolean;
  /** Class prefix for custom styling */
  classPrefix?: string;
}

/** @deprecated Use AuthorlyRendererProps instead */
export type ContentBlocksRendererProps = AuthorlyRendererProps;


// Escape HTML for code display
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Process HTML for rendering
function processHtml(
  html: string, 
  options: {
    enableCodeCopy: boolean;
    enableChecklistStyles: boolean;
    enableHeadingIds: boolean;
  }
): string {
  if (!html) return '';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Add IDs to headings for navigation
  if (options.enableHeadingIds) {
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }
    });
  }
  
  // Enhance code blocks with wrapper and copy button
  if (options.enableCodeCopy) {
    const codeBlocks = doc.querySelectorAll('pre');
    codeBlocks.forEach((pre, index) => {
      // Skip if already processed
      if (pre.parentElement?.classList.contains('cbr-code-wrapper')) return;
      
      const code = pre.querySelector('code');
      const codeContent = code?.textContent || pre.textContent || '';
      
      const wrapper = doc.createElement('div');
      wrapper.className = 'cbr-code-wrapper';
      wrapper.innerHTML = `
        <div class="cbr-code-toolbar">
          <span class="cbr-code-lang">Code</span>
          <button class="cbr-code-copy" data-code-index="${index}" onclick="
            navigator.clipboard.writeText(this.closest('.cbr-code-wrapper').querySelector('code').textContent);
            this.textContent = 'Copied!';
            setTimeout(() => this.textContent = 'Copy', 2000);
          ">Copy</button>
        </div>
        <pre class="cbr-code-block"><code>${escapeHtml(codeContent)}</code></pre>
      `;
      
      pre.replaceWith(wrapper);
    });
  }
  
  // Handle checklist items - add class for checked items
  if (options.enableChecklistStyles) {
    const checklistItems = doc.querySelectorAll('li');
    checklistItems.forEach((li) => {
      const checkbox = li.querySelector('input[type="checkbox"]');
      if (checkbox && (checkbox as HTMLInputElement).checked) {
        li.classList.add('cbr-checked-item');
      }
    });
  }

  // Remove editor-only elements
  doc.querySelectorAll('.cb-image-controls, .cb-image-placeholder, .cb-video-placeholder, .cb-callout-type-selector, .cb-image-resize-handle').forEach(el => el.remove());
  
  return doc.body.innerHTML;
}

// Generate CSS styles based on dark mode
function generateStyles(darkMode: boolean, classPrefix: string): string {
  const p = classPrefix;
  
  // Color variables
  const colors = darkMode ? {
    bg: '#1f2937',
    bgSecondary: '#111827',
    bgTertiary: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    border: '#374151',
    borderLight: '#4b5563',
    primary: '#3b82f6',
    link: '#60a5fa',
    code: '#f472b6',
    codeBg: 'rgba(255, 255, 255, 0.1)',
    quoteBg: 'rgba(59, 130, 246, 0.1)',
    calloutInfo: 'rgba(59, 130, 246, 0.1)',
    calloutInfoBorder: 'rgba(59, 130, 246, 0.3)',
    calloutSuccess: 'rgba(16, 185, 129, 0.1)',
    calloutSuccessBorder: 'rgba(16, 185, 129, 0.3)',
    calloutWarning: 'rgba(245, 158, 11, 0.1)',
    calloutWarningBorder: 'rgba(245, 158, 11, 0.3)',
    calloutError: 'rgba(239, 68, 68, 0.1)',
    calloutErrorBorder: 'rgba(239, 68, 68, 0.3)',
    tableBg: '#374151',
  } : {
    bg: '#ffffff',
    bgSecondary: '#f9fafb',
    bgTertiary: '#f3f4f6',
    text: '#111827',
    textSecondary: '#4b5563',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    borderLight: '#d1d5db',
    primary: '#3b82f6',
    link: '#2563eb',
    code: '#d63384',
    codeBg: '#f3f4f6',
    quoteBg: '#eff6ff',
    calloutInfo: '#eff6ff',
    calloutInfoBorder: '#bfdbfe',
    calloutSuccess: '#f0fdf4',
    calloutSuccessBorder: '#bbf7d0',
    calloutWarning: '#fffbeb',
    calloutWarningBorder: '#fde68a',
    calloutError: '#fef2f2',
    calloutErrorBorder: '#fecaca',
    tableBg: '#f9fafb',
  };

  return `
    .${p} {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.7;
      color: ${colors.text};
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Typography */
    .${p} h1 { font-size: 2.25rem; font-weight: 700; margin: 1.5rem 0 1rem; line-height: 1.2; }
    .${p} h2 { font-size: 1.75rem; font-weight: 600; margin: 1.25rem 0 0.75rem; line-height: 1.3; }
    .${p} h3 { font-size: 1.5rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.4; }
    .${p} h4 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
    .${p} h5 { font-size: 1.125rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
    .${p} h6 { font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
    .${p} p { margin: 0.75rem 0; }
    
    /* Links */
    .${p} a { color: ${colors.link}; text-decoration: underline; }
    .${p} a:hover { color: ${colors.primary}; }

    /* Lists */
    .${p} ul, .${p} ol { margin: 0.75rem 0; padding-left: 1.5rem; }
    .${p} li { margin: 0.25rem 0; }
    .${p} li.cbr-checked-item { text-decoration: line-through; color: ${colors.textMuted}; }

    /* Checklist specific */
    .${p} ul:has(input[type="checkbox"]) { list-style: none; padding-left: 0; }
    .${p} li:has(input[type="checkbox"]) { display: flex; align-items: flex-start; gap: 0.5rem; }
    .${p} input[type="checkbox"] { margin-top: 0.25rem; accent-color: ${colors.primary}; }

    /* Blockquote */
    .${p} blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid ${colors.primary};
      background: ${colors.quoteBg};
      border-radius: 0 0.375rem 0.375rem 0;
    }
    .${p} blockquote p { margin: 0; font-style: italic; }

    /* Inline code */
    .${p} code:not(.cbr-code-block code) {
      padding: 0.2em 0.4em;
      font-size: 0.875em;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      background: ${colors.codeBg};
      border: 1px solid ${colors.border};
      border-radius: 0.25rem;
      color: ${colors.code};
    }

    /* Code block wrapper */
    .${p} .cbr-code-wrapper {
      margin: 1rem 0;
      border: 1px solid ${colors.border};
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .${p} .cbr-code-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: ${colors.bgTertiary};
      border-bottom: 1px solid ${colors.borderLight};
    }
    .${p} .cbr-code-lang {
      font-size: 0.75rem;
      color: ${colors.textMuted};
      font-weight: 500;
    }
    .${p} .cbr-code-copy {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0.25rem;
      color: ${colors.textMuted};
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .${p} .cbr-code-copy:hover {
      background: ${colors.border};
      color: ${colors.text};
    }
    .${p} .cbr-code-block {
      margin: 0;
      padding: 1rem;
      background: ${colors.bgSecondary};
      overflow-x: auto;
    }
    .${p} .cbr-code-block code {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      color: ${colors.textSecondary};
      background: none !important;
      border: none !important;
      padding: 0 !important;
    }

    /* Images */
    .${p} img { max-width: 100%; height: auto; border-radius: 0.5rem; }
    .${p} figure { margin: 1rem 0; }
    .${p} figure[data-align="center"] { text-align: center; }
    .${p} figure[data-align="center"] img { display: inline-block; }
    .${p} figure[data-align="right"] { text-align: right; }
    .${p} figure[data-align="right"] img { display: inline-block; }
    .${p} figure[data-align="left"] { text-align: left; }
    .${p} figcaption { 
      font-size: 0.875rem; 
      color: ${colors.textMuted}; 
      margin-top: 0.5rem; 
    }

    /* Video */
    .${p} .cb-video { margin: 1rem 0; }
    .${p} .cb-video iframe { max-width: 100%; border-radius: 0.5rem; }

    /* Tables */
    .${p} table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    .${p} th, .${p} td {
      border: 1px solid ${colors.border};
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    .${p} th {
      background: ${colors.tableBg};
      font-weight: 600;
    }

    /* Horizontal rule */
    .${p} hr {
      border: none;
      border-top: 1px solid ${colors.border};
      margin: 1.5rem 0;
    }

    /* Callouts */
    .${p} aside, .${p} .cb-callout {
      display: flex;
      gap: 0.75rem;
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid;
    }
    .${p} aside[data-callout-type="info"], .${p} .cb-callout[data-callout-type="info"] {
      background: ${colors.calloutInfo};
      border-color: ${colors.calloutInfoBorder};
    }
    .${p} aside[data-callout-type="success"], .${p} .cb-callout[data-callout-type="success"] {
      background: ${colors.calloutSuccess};
      border-color: ${colors.calloutSuccessBorder};
    }
    .${p} aside[data-callout-type="warning"], .${p} .cb-callout[data-callout-type="warning"] {
      background: ${colors.calloutWarning};
      border-color: ${colors.calloutWarningBorder};
    }
    .${p} aside[data-callout-type="error"], .${p} .cb-callout[data-callout-type="error"] {
      background: ${colors.calloutError};
      border-color: ${colors.calloutErrorBorder};
    }
    .${p} aside[data-callout-type="note"], .${p} .cb-callout[data-callout-type="note"] {
      background: ${colors.bgTertiary};
      border-color: ${colors.border};
    }
    .${p} .cb-callout-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
    }
    .${p} .cb-callout-content { flex: 1; }
    .${p} .cb-callout-content p { margin: 0; }

    /* Accordion */
    .${p} details {
      margin: 1rem 0;
      border: 1px solid ${colors.border};
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .${p} summary {
      padding: 0.75rem 1rem;
      background: ${colors.bgSecondary};
      cursor: pointer;
      font-weight: 500;
    }
    .${p} summary:hover { background: ${colors.bgTertiary}; }
    .${p} details > div, .${p} details > p:not(:first-child) {
      padding: 1rem;
    }

    /* Text alignment */
    .${p} [style*="text-align: center"], .${p} [data-align="center"] { text-align: center; }
    .${p} [style*="text-align: right"], .${p} [data-align="right"] { text-align: right; }
    .${p} [style*="text-align: left"], .${p} [data-align="left"] { text-align: left; }
    .${p} [style*="text-align: justify"], .${p} [data-align="justify"] { text-align: justify; }
  `;
}

/**
 * AuthorlyRenderer - Renders HTML content with beautiful styling
 * 
 * @example
 * ```tsx
 * import { AuthorlyRenderer } from 'authorly';
 * 
 * function Preview({ html }) {
 *   return <AuthorlyRenderer html={html} darkMode={false} />;
 * }
 * ```
 */
export const AuthorlyRenderer: React.FC<AuthorlyRendererProps> = ({
  html,
  darkMode = false,
  className = '',
  style,
  enableCodeCopy = true,
  enableChecklistStyles = true,
  enableHeadingIds = true,
  classPrefix = 'cbr-content',
}) => {
  // Process HTML
  const processedHtml = useMemo(() => {
    return processHtml(html, {
      enableCodeCopy,
      enableChecklistStyles,
      enableHeadingIds,
    });
  }, [html, enableCodeCopy, enableChecklistStyles, enableHeadingIds]);

  // Generate styles
  const styles = useMemo(() => {
    return generateStyles(darkMode, classPrefix);
  }, [darkMode, classPrefix]);

  if (!html) {
    return (
      <div className={`${classPrefix} ${className}`.trim()} style={style}>
        <style>{styles}</style>
        <p style={{ color: darkMode ? '#64748b' : '#9ca3af' }}>No content to display</p>
      </div>
    );
  }

  return (
    <div className={`${classPrefix} ${className}`.trim()} style={style}>
      <style>{styles}</style>
      <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
    </div>
  );
};

/** @deprecated Use AuthorlyRenderer instead */
export const ContentBlocksRenderer = AuthorlyRenderer;

export default AuthorlyRenderer;

