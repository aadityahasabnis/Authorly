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
import { Highlight, Prism, normalizeTokens, themes } from 'prism-react-renderer';

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
  /** Enable syntax highlighting for code blocks */
  enableSyntaxHighlighting?: boolean;
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

/** Options for processHtml */
export interface ProcessHtmlOptions {
  /** Wrap code blocks with a toolbar (mac dots, language label, copy button). Default: true */
  enableCodeCopy?: boolean;
  /** Add cbr-checked-item class to completed checklist items. Default: true */
  enableChecklistStyles?: boolean;
  /** Add id attributes to headings for anchor navigation. Default: true */
  enableHeadingIds?: boolean;
  /**
   * When true, syntax-highlight code blocks using Prism (same engine as AuthorlyRenderer).
   * Pass darkMode to select Night Owl (dark) or GitHub (light) theme. Default: false
   */
  enableSyntaxHighlighting?: boolean;
  /** Select Night Owl (dark) or GitHub (light) syntax theme. Default: false */
  darkMode?: boolean;
  /** @internal — used by AuthorlyRenderer to leave code blocks for React handling */
  _skipCodeBlocks?: boolean;
}

/**
 * Transform raw editor HTML into renderer-ready HTML.
 *
 * SSR-safe: uses DOMParser in the browser, regex fallback in Node.js
 * (Next.js server components, API routes, etc.).
 *
 * @example Next.js page
 * ```tsx
 * import { processHtml } from 'authorly-editor';
 * import 'authorly-editor/styles/renderer.css';
 *
 * export default function BlogPost({ html }) {
 *   return (
 *     <div
 *       className="cbr-content"
 *       dangerouslySetInnerHTML={{ __html: processHtml(html) }}
 *     />
 *   );
 * }
 * ```
 */
export function processHtml(html: string, options: ProcessHtmlOptions = {}): string {
  if (!html) return '';
  const opts = {
    enableCodeCopy: options.enableCodeCopy ?? true,
    enableChecklistStyles: options.enableChecklistStyles ?? true,
    enableHeadingIds: options.enableHeadingIds ?? true,
    enableSyntaxHighlighting: options.enableSyntaxHighlighting ?? false,
    darkMode: options.darkMode ?? false,
    _skipCodeBlocks: options._skipCodeBlocks ?? false,
  };
  // Browser: DOMParser handles nested/malformed HTML more reliably
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    return _processHtmlDom(html, opts);
  }
  // SSR (Next.js server components, Node.js): regex-based fallback
  return _processHtmlRegex(html, opts);
}

// --- Syntax highlighting helpers (shared by DOM + regex paths) ---

type TokenStyleMap = Map<string, { color?: string; fontStyle?: string; fontWeight?: string }>;

function _buildTokenStyleMap(theme: typeof themes.nightOwl): TokenStyleMap {
  const map: TokenStyleMap = new Map();
  for (const { types, style } of theme.styles) {
    const s = {
      color: style.color as string | undefined,
      fontStyle: style.fontStyle as string | undefined,
      fontWeight: style.fontWeight as string | undefined,
    };
    for (const type of types) {
      const existing = map.get(type) || {};
      map.set(type, { ...existing, ...s });
    }
  }
  return map;
}

function _getTokenInlineStyle(types: string[], map: TokenStyleMap): string {
  let color: string | undefined;
  let fontStyle: string | undefined;
  let fontWeight: string | undefined;
  for (const type of types) {
    const s = map.get(type);
    if (s) {
      color = s.color ?? color;
      fontStyle = s.fontStyle ?? fontStyle;
      fontWeight = s.fontWeight ?? fontWeight;
    }
  }
  const parts: string[] = [];
  if (color) parts.push(`color:${color}`);
  if (fontStyle) parts.push(`font-style:${fontStyle}`);
  if (fontWeight) parts.push(`font-weight:${fontWeight}`);
  return parts.join(';');
}

function _decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

/**
 * Generate a full .cbr-code-wrapper HTML string with Prism syntax highlighting.
 * Colors exactly match SyntaxHighlightedCode (same Prism engine, same theme objects).
 */
function _generateHighlightedCodeHtml(
  rawCode: string,
  language: string,
  darkMode: boolean,
  enableCopy: boolean,
): string {
  const theme = darkMode ? themes.nightOwl : themes.github;
  const tokenStyleMap = _buildTokenStyleMap(theme);
  const plainColor = (theme.plain as { color?: string }).color || (darkMode ? '#d6deeb' : '#393a34');
  const lineNumColor = darkMode ? '#52525b' : '#d4d4d8';

  const langKey = language?.toLowerCase() || '';
  const grammar = langKey ? (Prism.languages as Record<string, unknown>)[langKey] : null;

  let innerHtml: string;
  if (grammar) {
    try {
      const rawTokens = Prism.tokenize(rawCode.trim(), grammar as Prism.Grammar);
      const lines = normalizeTokens(rawTokens as Parameters<typeof normalizeTokens>[0]);
      innerHtml = lines.map((line, i) => {
        const cells = line.map(token => {
          const inlineStyle = _getTokenInlineStyle(token.types, tokenStyleMap);
          const content = escapeHtml(token.content);
          return inlineStyle ? `<span style="${inlineStyle}">${content}</span>` : content;
        }).join('');
        const lineNum = `<span style="display:table-cell;padding-right:1rem;text-align:right;min-width:2rem;color:${lineNumColor};user-select:none">${i + 1}</span>`;
        return `<span style="display:table-row">${lineNum}<span style="display:table-cell">${cells}</span></span>`;
      }).join('');
    } catch {
      innerHtml = escapeHtml(rawCode.trim());
    }
  } else {
    innerHtml = escapeHtml(rawCode.trim());
  }

  const displayLang = language && language !== 'text' && language !== 'plain' ? language : '';
  const dataCode = escapeHtml(rawCode);

  const copyBtn = enableCopy
    ? `<button class="cbr-code-copy" onclick="(function(b){` +
        `navigator.clipboard.writeText(b.closest('.cbr-code-wrapper').dataset.code);` +
        `var p=b.innerHTML;b.innerHTML='Copied!';b.style.color='#22c55e';` +
        `setTimeout(function(){b.innerHTML=p;b.style.color=''},2000)` +
      `})(this)">` +
      `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">` +
        `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>` +
      `</svg>Copy</button>`
    : '';

  return (
    `<div class="cbr-code-wrapper" data-code="${dataCode}">` +
      `<div class="cbr-code-toolbar">` +
        `<div class="cbr-code-toolbar-left">` +
          `<div class="cbr-code-dots">` +
            `<span class="cbr-code-dot cbr-code-dot-red"></span>` +
            `<span class="cbr-code-dot cbr-code-dot-yellow"></span>` +
            `<span class="cbr-code-dot cbr-code-dot-green"></span>` +
          `</div>` +
          (displayLang ? `<span class="cbr-code-lang">${displayLang}</span>` : '') +
        `</div>` +
        copyBtn +
      `</div>` +
      `<pre class="cbr-code-block">` +
        `<code style="display:table;width:100%;color:${plainColor}">` +
          innerHtml +
        `</code>` +
      `</pre>` +
    `</div>`
  );
}

// --- DOMParser implementation (browser) ---
function _processHtmlDom(html: string, options: Required<ProcessHtmlOptions>): string {
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

  // Enhance code blocks with wrapper and (optionally) Prism syntax highlighting.
  // Skip entirely when AuthorlyRenderer will handle code blocks with React.
  if (!options._skipCodeBlocks) {
    const codeBlocks = doc.querySelectorAll('pre');
    codeBlocks.forEach((pre, index) => {
      if (pre.parentElement?.classList.contains('cbr-code-wrapper')) return;

      const code = pre.querySelector('code');
      const codeContent = code?.textContent || pre.textContent || '';

      let language = pre.getAttribute('data-language') || '';
      if (!language) {
        const codeClass = code?.className || '';
        const langMatch = codeClass.match(/language-(\w+)/);
        if (langMatch) language = langMatch[1];
      }

      if (options.enableSyntaxHighlighting) {
        // Generate Prism-highlighted HTML — matches SyntaxHighlightedCode visually
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = _generateHighlightedCodeHtml(
          codeContent,
          language,
          options.darkMode,
          options.enableCodeCopy,
        );
        const generatedWrapper = tempDiv.firstElementChild;
        if (generatedWrapper) pre.replaceWith(generatedWrapper);
        return;
      }

      if (!options.enableCodeCopy) return;

      // Plain code block wrapper (no syntax highlighting)
      const displayLang = language || 'Code';
      const wrapper = doc.createElement('div');
      wrapper.className = 'cbr-code-wrapper';
      wrapper.innerHTML = `
        <div class="cbr-code-toolbar">
          <div class="cbr-code-toolbar-left">
            <div class="cbr-code-dots">
              <span class="cbr-code-dot cbr-code-dot-red"></span>
              <span class="cbr-code-dot cbr-code-dot-yellow"></span>
              <span class="cbr-code-dot cbr-code-dot-green"></span>
            </div>
            <span class="cbr-code-lang">${escapeHtml(displayLang)}</span>
          </div>
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

  // Remove editor-only elements (keep callout icons)
  doc.querySelectorAll('.cb-image-controls, .cb-image-placeholder, .cb-video-placeholder, .cb-image-resize-handle').forEach(el => el.remove());

  // Remove callout dropdown, keep icon
  doc.querySelectorAll('.cb-callout-icon-container').forEach(container => {
    const dropdown = container.querySelector('.cb-callout-type-selector');
    if (dropdown) dropdown.remove();
    const icon = container.querySelector('.cb-callout-icon');
    if (icon) {
      icon.removeAttribute('role');
      icon.removeAttribute('tabindex');
      icon.removeAttribute('title');
    }
  });

  // Ensure all links open safely in a new tab
  doc.querySelectorAll('a[href]').forEach((anchor) => {
    const a = anchor as HTMLAnchorElement;
    if (!a.target) a.target = '_blank';
    if (!a.rel) a.rel = 'noopener noreferrer';
  });

  return doc.body.innerHTML;
}

// --- Regex implementation (SSR / Node.js) ---
function _processHtmlRegex(html: string, options: Required<ProcessHtmlOptions>): string {
  let result = html;

  // Remove editor-only elements (self-contained divs injected by the editor UI)
  const editorOnlyClasses = [
    'cb-image-controls', 'cb-image-placeholder',
    'cb-video-placeholder', 'cb-image-resize-handle',
    'cb-callout-type-selector',
  ];
  editorOnlyClasses.forEach(cls => {
    result = result.replace(
      new RegExp(`<[^>]+class="[^"]*${cls}[^"]*"[^>]*>[\\s\\S]*?<\\/[a-z][a-z0-9]*>`, 'gi'),
      ''
    );
  });

  // Add heading IDs
  if (options.enableHeadingIds) {
    let idx = 0;
    result = result.replace(/<(h[1-6])([^>]*)>/gi, (_, tag, attrs) => {
      if (/\bid=/.test(attrs)) return `<${tag}${attrs}>`;
      return `<${tag}${attrs} id="heading-${idx++}">`;
    });
  }

  // Wrap / syntax-highlight code blocks — skip when AuthorlyRenderer will handle them
  if (!options._skipCodeBlocks) {
    result = result.replace(
      /<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/gi,
      (_, preAttrs, codeAttrs, content) => {
        let lang = '';
        const m1 = preAttrs.match(/data-language="([^"]*)"/i);
        const m2 = codeAttrs.match(/language-(\w+)/i);
        if (m1?.[1]) lang = m1[1];
        else if (m2?.[1]) lang = m2[1];

        if (options.enableSyntaxHighlighting) {
          // content is HTML-escaped by the editor — decode before tokenising
          const rawCode = _decodeHtmlEntities(content);
          return _generateHighlightedCodeHtml(rawCode, lang, options.darkMode, options.enableCodeCopy);
        }

        if (!options.enableCodeCopy) {
          // No toolbar at all — return a plain pre/code unchanged
          return `<pre${preAttrs}><code${codeAttrs}>${content}</code></pre>`;
        }

        // Plain wrapper (toolbar, no syntax highlighting)
        const displayLang = lang || 'Code';
        const safeL = displayLang.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return (
          `<div class="cbr-code-wrapper">` +
            `<div class="cbr-code-toolbar">` +
              `<div class="cbr-code-toolbar-left">` +
                `<div class="cbr-code-dots">` +
                  `<span class="cbr-code-dot cbr-code-dot-red"></span>` +
                  `<span class="cbr-code-dot cbr-code-dot-yellow"></span>` +
                  `<span class="cbr-code-dot cbr-code-dot-green"></span>` +
                `</div>` +
                `<span class="cbr-code-lang">${safeL}</span>` +
              `</div>` +
              `<button class="cbr-code-copy" onclick="(function(b){` +
                `navigator.clipboard.writeText(b.closest('.cbr-code-wrapper').querySelector('code').textContent);` +
                `b.textContent='Copied!';` +
                `setTimeout(function(){b.textContent='Copy'},2000)` +
              `})(this)">Copy</button>` +
            `</div>` +
            `<pre class="cbr-code-block"><code>${content}</code></pre>` +
          `</div>`
        );
      }
    );
  }

  // Handle checklist items
  if (options.enableChecklistStyles) {
    result = result.replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (match, attrs, content) => {
      if (/\bchecked\b/.test(content) && /type="checkbox"/.test(content)) {
        const clsMatch = attrs.match(/class="([^"]*)"/);
        if (clsMatch) {
          return `<li${attrs.replace(/class="[^"]*"/, `class="${clsMatch[1]} cbr-checked-item"`)}>${content}</li>`;
        }
        return `<li${attrs} class="cbr-checked-item">${content}</li>`;
      }
      return match;
    });
  }

  // Add target="_blank" to links
  result = result.replace(/<a(\s[^>]*)>/gi, (match, attrs) => {
    if (/\btarget=/.test(attrs)) return match;
    return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
  });

  return result;
}

// Syntax Highlighted Code Component with Mac-style header (matching test-authorly-next)
interface SyntaxHighlightedCodeProps {
  code: string;
  language: string;
  darkMode: boolean;
}

const SyntaxHighlightedCode: React.FC<SyntaxHighlightedCodeProps> = ({ code, language, darkMode }) => {
  const [copied, setCopied] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      style={{ 
        position: 'relative',
        margin: '1.5rem 0',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        border: darkMode ? '1px solid #27272a' : '1px solid #e4e4e7',
        background: darkMode ? '#011627' : '#f9fafb',
        boxShadow: darkMode 
          ? '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2)' 
          : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Mac-style header with dots and language badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 1rem',
          background: darkMode ? 'rgba(39, 39, 42, 0.5)' : 'rgba(244, 244, 245, 0.8)',
          borderBottom: darkMode ? '1px solid #27272a' : '1px solid #e4e4e7',
        }}
      >
        {/* Left: Mac dots + language */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Mac window dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ 
              width: '0.75rem', 
              height: '0.75rem', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.8)' 
            }} />
            <div style={{ 
              width: '0.75rem', 
              height: '0.75rem', 
              borderRadius: '50%', 
              background: 'rgba(234, 179, 8, 0.8)' 
            }} />
            <div style={{ 
              width: '0.75rem', 
              height: '0.75rem', 
              borderRadius: '50%', 
              background: 'rgba(34, 197, 94, 0.8)' 
            }} />
          </div>
          {/* Language label */}
          {language && language !== 'text' && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: darkMode ? '#a1a1aa' : '#71717a',
                marginLeft: '0.5rem',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {language}
            </span>
          )}
        </div>
        
        {/* Right: Copy button */}
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            background: 'transparent',
            border: 'none',
            borderRadius: '0.375rem',
            color: darkMode ? '#a1a1aa' : '#71717a',
            fontSize: '0.75rem',
            cursor: 'pointer',
            opacity: isHovered ? 1 : 0,
            transition: 'all 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkMode ? '#27272a' : '#e4e4e7';
            e.currentTarget.style.color = darkMode ? '#e4e4e7' : '#18181b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = darkMode ? '#a1a1aa' : '#71717a';
          }}
        >
          {copied ? (
            <>
              <svg width="14" height="14" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ color: '#22c55e' }}>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content with syntax highlighting */}
      <Highlight
        theme={darkMode ? themes.nightOwl : themes.github}
        code={code.trim()}
        language={language as any}
      >
        {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={highlightClassName}
            style={{
              ...style,
              background: 'transparent',
              margin: 0,
              padding: '1rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.7',
              fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace",
            }}
          >
            {tokens.map((line, i) => (
              <div key={i} style={{ display: 'table-row' }} {...getLineProps({ line })}>
                {/* Line number */}
                <span 
                  style={{ 
                    display: 'table-cell',
                    paddingRight: '1rem',
                    textAlign: 'right',
                    width: '2rem',
                    color: darkMode ? '#52525b' : '#d4d4d8',
                    userSelect: 'none',
                  }}
                >
                  {i + 1}
                </span>
                {/* Line content */}
                <span style={{ display: 'table-cell' }}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

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
      background: ${colors.bgSecondary};
    }
    .${p} .cbr-code-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: ${colors.bgTertiary};
      border-bottom: 1px solid ${colors.borderLight};
    }
    .${p} .cbr-code-toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .${p} .cbr-code-dots {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .${p} .cbr-code-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .${p} .cbr-code-dot-red {
      background-color: #ff5f56;
    }
    .${p} .cbr-code-dot-yellow {
      background-color: #ffbd2e;
    }
    .${p} .cbr-code-dot-green {
      background-color: #27c93f;
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
    .${p} img { max-width: 100%; height: auto; border-radius: 0.5rem; display: block; }
    .${p} figure {
      margin: 1.5rem 0;
    }
    .${p} figure[data-align="center"] { text-align: center; }
    .${p} figure[data-align="center"] img,
    .${p} figure[data-align="center"] video { display: inline-block; }
    .${p} figure[data-align="right"] { text-align: right; }
    .${p} figure[data-align="right"] img,
    .${p} figure[data-align="right"] video { display: inline-block; }
    .${p} figure[data-align="left"] { text-align: left; }
    .${p} figcaption {
      font-size: 0.8125rem;
      color: ${colors.textMuted};
      margin-top: 0.5rem;
      text-align: center;
    }

    /* Video */
    .${p} figure[data-block-type="video"] > div {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      border-radius: 0.5rem;
      overflow: hidden;
      background: ${colors.bgSecondary};
    }
    .${p} figure[data-block-type="video"] > div iframe,
    .${p} figure[data-block-type="video"] > div video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 0.5rem;
    }
    .${p} .cb-video { margin: 1.5rem 0; }
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
      gap: 1rem;
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 0.375rem;
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
    
    /* Callout icon container */
    .${p} .cb-callout-icon-container {
      flex-shrink: 0;
    }
    
    /* Callout icon with colored background */
    .${p} .cb-callout-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 0.375rem;
      margin-top: 2px;
    }
    
    /* Info icon */
    .${p} .cb-callout[data-callout-type="info"] .cb-callout-icon,
    .${p} aside[data-callout-type="info"] .cb-callout-icon {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
    
    /* Success icon */
    .${p} .cb-callout[data-callout-type="success"] .cb-callout-icon,
    .${p} aside[data-callout-type="success"] .cb-callout-icon {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
    
    /* Warning icon */
    .${p} .cb-callout[data-callout-type="warning"] .cb-callout-icon,
    .${p} aside[data-callout-type="warning"] .cb-callout-icon {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }
    
    /* Error icon */
    .${p} .cb-callout[data-callout-type="error"] .cb-callout-icon,
    .${p} aside[data-callout-type="error"] .cb-callout-icon {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    
    /* Note icon */
    .${p} .cb-callout[data-callout-type="note"] .cb-callout-icon,
    .${p} aside[data-callout-type="note"] .cb-callout-icon {
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
    }
    
    /* Callout content */
    .${p} .cb-callout-content { 
      flex: 1;
      min-width: 0;
    }
    .${p} .cb-callout-content p { margin: 0; }

    /* Accordion */
    .${p} details {
      margin: 1rem 0;
      border: 1px solid ${colors.border};
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .${p} summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: ${colors.bgSecondary};
      cursor: pointer;
      font-weight: 500;
      list-style: none;
      user-select: none;
    }
    .${p} summary::-webkit-details-marker { display: none; }
    .${p} summary::marker { display: none; }
    .${p} summary:hover { background: ${colors.bgTertiary}; }
    .${p} details[open] summary { border-bottom: 1px solid ${colors.border}; }
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
 * AuthorlyRenderer - Renders HTML content with beautiful styling and syntax highlighting
 * 
 * @example
 * ```tsx
 * import { AuthorlyRenderer } from 'authorly';
 * 
 * function Preview({ html }) {
 *   return <AuthorlyRenderer html={html} darkMode={false} enableSyntaxHighlighting />;
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
  enableSyntaxHighlighting = true,
  classPrefix = 'cbr-content',
}) => {
  // Process HTML — when enableSyntaxHighlighting is on, React handles code blocks
  // via SyntaxHighlightedCode, so tell processHtml to leave <pre> elements alone.
  const processedHtml = useMemo(() => {
    return processHtml(html, {
      enableCodeCopy,
      enableChecklistStyles,
      enableHeadingIds,
      _skipCodeBlocks: enableSyntaxHighlighting,
      darkMode,
    });
  }, [html, enableCodeCopy, enableChecklistStyles, enableHeadingIds, enableSyntaxHighlighting, darkMode]);

  // Generate styles
  const styles = useMemo(() => {
    return generateStyles(darkMode, classPrefix);
  }, [darkMode, classPrefix]);

  // Parse HTML and render with syntax highlighting
  const content = useMemo(() => {
    if (!enableSyntaxHighlighting) {
      return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />;
    }

    // Parse HTML to extract code blocks
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');
    const codeBlocks = doc.querySelectorAll('pre code');
    
    if (codeBlocks.length === 0) {
      return <div dangerouslySetInnerHTML={{ __html: processedHtml }} />;
    }

    // Replace each code block with a unique placeholder
    const codeBlocksData: Array<{ code: string; language: string; placeholder: string }> = [];
    codeBlocks.forEach((codeEl, index) => {
      const pre = codeEl.parentElement;
      if (pre && pre.tagName === 'PRE') {
        const language = pre.getAttribute('data-language') || 'text';
        const code = codeEl.textContent || '';
        const placeholder = `___CODE_BLOCK_${index}___`;
        codeBlocksData.push({ code, language, placeholder });
        
        // Replace the entire <pre> element with placeholder
        const placeholderNode = doc.createTextNode(placeholder);
        pre.parentNode?.replaceChild(placeholderNode, pre);
      }
    });

    // Get the modified HTML with placeholders
    const htmlWithPlaceholders = doc.body.innerHTML;
    
    // Split by placeholders and build React elements
    const parts: React.ReactNode[] = [];
    let remainingHtml = htmlWithPlaceholders;
    
    codeBlocksData.forEach(({ code, language, placeholder }, index) => {
      const splitIndex = remainingHtml.indexOf(placeholder);
      
      if (splitIndex !== -1) {
        // Add HTML before the placeholder
        const htmlBefore = remainingHtml.substring(0, splitIndex);
        if (htmlBefore.trim()) {
          parts.push(
            <div key={`html-${index}`} dangerouslySetInnerHTML={{ __html: htmlBefore }} />
          );
        }
        
        // Add the syntax highlighted code block
        parts.push(
          <SyntaxHighlightedCode
            key={`code-${index}`}
            code={code}
            language={language}
            darkMode={darkMode}
          />
        );
        
        // Update remaining HTML (skip the placeholder)
        remainingHtml = remainingHtml.substring(splitIndex + placeholder.length);
      }
    });
    
    // Add any remaining HTML after the last code block
    if (remainingHtml.trim()) {
      parts.push(
        <div key="html-end" dangerouslySetInnerHTML={{ __html: remainingHtml }} />
      );
    }
    
    return <>{parts}</>;
  }, [processedHtml, enableSyntaxHighlighting, darkMode]);

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
      {content}
    </div>
  );
};

/** @deprecated Use AuthorlyRenderer instead */
export const ContentBlocksRenderer = AuthorlyRenderer;

export default AuthorlyRenderer;

