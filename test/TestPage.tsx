/**
 * Test Page - Full demo of Content Blocks Editor
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ContentBlocksEditor, type EditorRef } from '../src';
import '../src/styles/editor.css';

// Table of Contents Item type
interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

// Parse headings from HTML and build nested TOC
function parseHeadings(html: string): TocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

  const items: TocItem[] = [];
  const stack: { level: number; item: TocItem }[] = [];

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent?.trim() || '';
    if (!text) return;

    const id = `toc-heading-${index}`;

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

// Process HTML for preview - add IDs to headings and enhance code blocks
function processHtmlForPreview(html: string, darkMode: boolean): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Add IDs to headings for TOC navigation
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading, index) => {
    heading.id = `toc-heading-${index}`;
  });

  // Enhance code blocks with wrapper and copy button
  const codeBlocks = doc.querySelectorAll('pre');
  codeBlocks.forEach((pre, index) => {
    const code = pre.querySelector('code');
    const codeContent = code?.textContent || pre.textContent || '';

    const wrapper = doc.createElement('div');
    wrapper.className = 'preview-code-wrapper';
    wrapper.innerHTML = `
      <div class="preview-code-toolbar">
        <span class="preview-code-lang">Code</span>
        <button class="preview-code-copy" data-code-index="${index}" onclick="
          navigator.clipboard.writeText(this.closest('.preview-code-wrapper').querySelector('code').textContent);
          this.textContent = 'Copied!';
          setTimeout(() => this.textContent = 'Copy', 2000);
        ">Copy</button>
      </div>
      <pre class="preview-code-block"><code>${escapeHtml(codeContent)}</code></pre>
    `;

    pre.replaceWith(wrapper);
  });

  // Handle checklist items - add strikethrough for checked items
  const checklistItems = doc.querySelectorAll('li');
  checklistItems.forEach((li) => {
    const checkbox = li.querySelector('input[type="checkbox"]');
    if (checkbox && (checkbox as HTMLInputElement).checked) {
      li.classList.add('checked-item');
    }
  });

  return doc.body.innerHTML;
}

// Escape HTML for code display
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Recursive TOC renderer
const TocList: React.FC<{ items: TocItem[]; darkMode: boolean; onNavigate: (id: string) => void; depth?: number }> = ({
  items, darkMode, onNavigate, depth = 0
}) => {
  if (items.length === 0) return null;

  return (
    <ul style={{
      listStyle: 'none',
      margin: 0,
      padding: 0,
      paddingLeft: depth > 0 ? '0.75rem' : 0,
    }}>
      {items.map(item => (
        <li key={item.id} style={{ margin: '0.125rem 0' }}>
          <button
            onClick={() => onNavigate(item.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem 0.5rem',
              fontSize: item.level === 1 ? '0.875rem' : item.level === 2 ? '0.8125rem' : '0.75rem',
              fontWeight: item.level <= 2 ? 500 : 400,
              color: darkMode ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              borderRadius: '0.25rem',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkMode ? '#334155' : '#f1f5f9';
              e.currentTarget.style.color = darkMode ? '#f1f5f9' : '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = darkMode ? '#94a3b8' : '#64748b';
            }}
          >
            {item.text}
          </button>
          {item.children.length > 0 && (
            <TocList items={item.children} darkMode={darkMode} onNavigate={onNavigate} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
};

// Preview styles as a component
const PreviewStyles: React.FC<{ darkMode: boolean }> = ({ darkMode }) => (
  <style>{`
    .preview-content {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.7;
      color: ${darkMode ? '#e2e8f0' : '#334155'};
    }
    .preview-content h1 { font-size: 2.25rem; font-weight: 700; margin: 1.5rem 0 1rem; line-height: 1.2; }
    .preview-content h2 { font-size: 1.75rem; font-weight: 600; margin: 1.25rem 0 0.75rem; line-height: 1.3; }
    .preview-content h3 { font-size: 1.5rem; font-weight: 600; margin: 1rem 0 0.5rem; line-height: 1.4; }
    .preview-content h4 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
    .preview-content h5 { font-size: 1.125rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
    .preview-content h6 { font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
    .preview-content p { margin: 0.75rem 0; }
    .preview-content ul, .preview-content ol { margin: 0.75rem 0; padding-left: 1.5rem; }
    .preview-content li { margin: 0.25rem 0; }
    .preview-content li.checked-item { text-decoration: line-through; color: ${darkMode ? '#64748b' : '#94a3b8'}; }
    .preview-content blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid #3b82f6;
      background: ${darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff'};
      border-radius: 0 0.375rem 0.375rem 0;
    }
    .preview-content blockquote p { margin: 0; font-style: italic; }
    .preview-content img { max-width: 100%; height: auto; border-radius: 0.5rem; }
    .preview-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    .preview-content th, .preview-content td {
      border: 1px solid ${darkMode ? '#374151' : '#e5e7eb'};
      padding: 0.5rem 0.75rem;
      text-align: left;
    }
    .preview-content th {
      background: ${darkMode ? '#374151' : '#f9fafb'};
      font-weight: 600;
    }
    .preview-content hr {
      border: none;
      border-top: 1px solid ${darkMode ? '#374151' : '#e5e7eb'};
      margin: 1.5rem 0;
    }
    .preview-content code:not(.preview-code-block code) {
      padding: 0.2em 0.4em;
      font-size: 0.875em;
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      background: ${darkMode ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6'};
      border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : '#e5e7eb'};
      border-radius: 0.25rem;
      color: ${darkMode ? '#f472b6' : '#d63384'};
    }
    .preview-content a {
      color: #3b82f6;
      text-decoration: underline;
    }
    .preview-content a:hover {
      color: #2563eb;
    }
    /* Text alignment */
    .preview-content [style*="text-align: center"], .preview-content [data-align="center"] { text-align: center; }
    .preview-content [style*="text-align: right"], .preview-content [data-align="right"] { text-align: right; }
    .preview-content [style*="text-align: left"], .preview-content [data-align="left"] { text-align: left; }
    .preview-content [style*="text-align: justify"], .preview-content [data-align="justify"] { text-align: justify; }
    
    /* Image alignment */
    .preview-content figure[data-align="center"] { text-align: center; }
    .preview-content figure[data-align="center"] img { display: inline-block; }
    .preview-content figure[data-align="right"] { text-align: right; }
    .preview-content figure[data-align="right"] img { display: inline-block; }
    .preview-content figure[data-align="left"] { text-align: left; }
    .preview-content figure { margin: 1rem 0; }
    .preview-content figcaption { 
      font-size: 0.875rem; 
      color: ${darkMode ? '#94a3b8' : '#64748b'}; 
      margin-top: 0.5rem; 
    }
    /* Callouts */
    .preview-content aside, .preview-content .callout {
      display: flex;
      gap: 0.75rem;
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid;
    }
    .preview-content aside[data-callout-type="info"], .preview-content .callout-info {
      background: ${darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff'};
      border-color: ${darkMode ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'};
    }
    .preview-content aside[data-callout-type="success"], .preview-content .callout-success {
      background: ${darkMode ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4'};
      border-color: ${darkMode ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0'};
    }
    .preview-content aside[data-callout-type="warning"], .preview-content .callout-warning {
      background: ${darkMode ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb'};
      border-color: ${darkMode ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'};
    }
    .preview-content aside[data-callout-type="error"], .preview-content .callout-error {
      background: ${darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'};
      border-color: ${darkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'};
    }
    /* Code block wrapper */
    .preview-code-wrapper {
      margin: 1rem 0;
      border: 1px solid ${darkMode ? '#374151' : '#e5e7eb'};
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .preview-code-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: ${darkMode ? '#374151' : '#f3f4f6'};
      border-bottom: 1px solid ${darkMode ? '#4b5563' : '#e5e7eb'};
    }
    .preview-code-lang {
      font-size: 0.75rem;
      color: ${darkMode ? '#9ca3af' : '#6b7280'};
      font-weight: 500;
    }
    .preview-code-copy {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0.25rem;
      color: ${darkMode ? '#9ca3af' : '#6b7280'};
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .preview-code-copy:hover {
      background: ${darkMode ? '#4b5563' : '#e5e7eb'};
      color: ${darkMode ? '#f3f4f6' : '#1f2937'};
    }
    .preview-code-block {
      margin: 0;
      padding: 1rem;
      background: ${darkMode ? '#1f2937' : '#f9fafb'};
      overflow-x: auto;
    }
    .preview-code-block code {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      color: ${darkMode ? '#e5e7eb' : '#374151'};
      background: none !important;
      border: none !important;
      padding: 0 !important;
    }
  `}</style>
);

// Sample initial content
const SAMPLE_CONTENT = `
<h1>Welcome to Content Blocks Editor</h1>
<p>This is a <strong>lightweight</strong>, <em>block-based</em> content editor for React. It outputs <code>pure semantic HTML</code> with no bloat.</p>
<h2>Features</h2>
<ul>
  <li>Block-based editing (paragraphs, headings, lists, etc.)</li>
  <li>Inline formatting (bold, italic, underline, links)</li>
  <li>Drag & drop block reordering</li>
  <li>Paste sanitization</li>
  <li>Keyboard shortcuts</li>
</ul>
<h2>Code Example</h2>
<pre><code>import { ContentBlocksEditor } from '@content-blocks/editor';

function App() {
  return (
    &lt;ContentBlocksEditor
      initialContent="&lt;p&gt;Hello world&lt;/p&gt;"
      onChange={(html) =&gt; console.log(html)}
    /&gt;
  );
}</code></pre>
<blockquote>
  <p>The editor is designed to be simple, fast, and produce clean HTML output.</p>
</blockquote>
<p>Try it out below!</p>
`;

export const TestPage: React.FC = () => {
  const editorRef = useRef<EditorRef>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [htmlOutput, setHtmlOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showToc, setShowToc] = useState(true);

  // Parse TOC from HTML output
  const tocItems = useMemo(() => parseHeadings(htmlOutput), [htmlOutput]);

  // Process HTML for preview
  const processedHtml = useMemo(() => processHtmlForPreview(htmlOutput, darkMode), [htmlOutput, darkMode]);

  const handleChange = useCallback((html: string) => {
    setHtmlOutput(html);
  }, []);

  const handleSave = useCallback((html: string) => {
    console.log('Saved:', html);
    alert('Content saved! Check console for HTML output.');
  }, []);

  const handleExportHtml = useCallback(() => {
    const html = editorRef.current?.getHTML();
    if (html) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'content.html';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  const handleCopyHtml = useCallback(() => {
    const html = editorRef.current?.getHTML();
    if (html) {
      navigator.clipboard.writeText(html);
      alert('HTML copied to clipboard!');
    }
  }, []);

  const handleClear = useCallback(() => {
    editorRef.current?.setHTML('<p></p>');
  }, []);

  // Navigate to heading in preview
  const handleTocNavigate = useCallback((id: string) => {
    const element = previewRef.current?.querySelector(`#${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode ? '#0f172a' : '#f8fafc',
      transition: 'background 0.3s ease'
    }}>
      <PreviewStyles darkMode={darkMode} />

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        background: darkMode ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 600,
            color: darkMode ? '#f1f5f9' : '#0f172a'
          }}>
            Content Blocks Editor
          </h1>
          <p style={{
            margin: '0.25rem 0 0',
            fontSize: '0.875rem',
            color: darkMode ? '#94a3b8' : '#64748b'
          }}>
            Lightweight block-based content editor
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              background: darkMode ? '#334155' : '#f1f5f9',
              border: 'none',
              borderRadius: '0.375rem',
              color: darkMode ? '#f1f5f9' : '#334155',
              cursor: 'pointer',
            }}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
          {/* TOC button hidden for now
          <button
            onClick={() => setShowToc(!showToc)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              background: showToc ? '#8b5cf6' : (darkMode ? '#334155' : '#f1f5f9'),
              border: 'none',
              borderRadius: '0.375rem',
              color: showToc ? '#ffffff' : (darkMode ? '#f1f5f9' : '#334155'),
              cursor: 'pointer',
            }}
          >
            TOC
          </button>
          */}
          <button
            onClick={() => setShowOutput(!showOutput)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              background: showOutput ? '#3b82f6' : (darkMode ? '#334155' : '#f1f5f9'),
              border: 'none',
              borderRadius: '0.375rem',
              color: showOutput ? '#ffffff' : (darkMode ? '#f1f5f9' : '#334155'),
              cursor: 'pointer',
            }}
          >
            HTML
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              background: showPreview ? '#10b981' : (darkMode ? '#334155' : '#f1f5f9'),
              border: 'none',
              borderRadius: '0.375rem',
              color: showPreview ? '#ffffff' : (darkMode ? '#f1f5f9' : '#334155'),
              cursor: 'pointer',
            }}
          >
            Preview
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', maxWidth: '1800px', margin: '0 auto', overflow: 'hidden' }}>
        {/* Table of Contents Sidebar - Commented out for now
        {showToc && tocItems.length > 0 && (
          <aside style={{
            width: '220px',
            flexShrink: 0,
            padding: '1.5rem 1rem',
            borderRight: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            background: darkMode ? '#1e293b' : '#ffffff',
            position: 'sticky',
            top: 0,
            height: 'calc(100vh - 80px)',
            overflowY: 'auto',
          }}>
            <h3 style={{
              margin: '0 0 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: darkMode ? '#64748b' : '#94a3b8',
            }}>
              Table of Contents
            </h3>
            <TocList items={tocItems} darkMode={darkMode} onNavigate={handleTocNavigate} />
          </aside>
        )}
        */}

        {/* Main Grid */}
        <main style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: (showOutput || showPreview) ? '1fr 1fr' : '1fr',
          gap: '1rem',
          padding: '2rem',
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
        }}>
          {/* Editor */}
          <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 600,
                color: darkMode ? '#f1f5f9' : '#0f172a'
              }}>
                Editor
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleClear}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    background: darkMode ? '#334155' : '#f1f5f9',
                    border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                    borderRadius: '0.25rem',
                    color: darkMode ? '#f1f5f9' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={handleCopyHtml}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    background: darkMode ? '#334155' : '#f1f5f9',
                    border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                    borderRadius: '0.25rem',
                    color: darkMode ? '#f1f5f9' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Copy HTML
                </button>
                <button
                  onClick={handleExportHtml}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '0.25rem',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Export
                </button>
              </div>
            </div>

            <ContentBlocksEditor
              ref={editorRef}
              initialContent={SAMPLE_CONTENT}
              darkMode={darkMode}
              showToolbar={true}
              toolbarPosition="top"
              placeholder="Start writing..."
              autoFocus={false}
              spellCheck={true}
              onChange={handleChange}
              onSave={handleSave}
              style={{
                minHeight: '500px',
                maxHeight: 'calc(100vh - 200px)',
              }}
            />
          </div>

          {/* HTML Output */}
          {showOutput && (
            <div>
              <h2 style={{
                margin: '0 0 1rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: darkMode ? '#f1f5f9' : '#0f172a'
              }}>
                HTML Output
              </h2>
              <div style={{
                background: darkMode ? '#1e293b' : '#ffffff',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                borderRadius: '0.5rem',
                overflow: 'hidden',
              }}>
                <pre style={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.75rem',
                  fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                  color: darkMode ? '#e2e8f0' : '#334155',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 'calc(100vh - 200px)',
                  overflow: 'auto',
                }}>
                  {htmlOutput || '<p></p>'}
                </pre>
              </div>
            </div>
          )}

          {/* Rendered Preview */}
          {showPreview && (
            <div>
              <h2 style={{
                margin: '0 0 1rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: darkMode ? '#f1f5f9' : '#0f172a'
              }}>
                Rendered Preview
              </h2>
              <div
                ref={previewRef}
                style={{
                  background: darkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  maxHeight: 'calc(100vh - 200px)',
                  overflow: 'auto',
                }}
              >
                <div
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: processedHtml || '<p style="color: #9ca3af;">No content yet...</p>' }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Features Section */}
      <section style={{
        padding: '2rem',
        background: darkMode ? '#1e293b' : '#ffffff',
        borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            margin: '0 0 1.5rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: darkMode ? '#f1f5f9' : '#0f172a',
            textAlign: 'center'
          }}>
            Available Blocks
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { name: 'Paragraph', desc: 'Plain text content', shortcut: 'Type /' },
              { name: 'Heading 1-3', desc: 'Section headings', shortcut: 'Ctrl+1-3' },
              { name: 'Bullet List', desc: 'Unordered list', shortcut: 'Ctrl+Shift+8' },
              { name: 'Numbered List', desc: 'Ordered list', shortcut: 'Ctrl+Shift+7' },
              { name: 'Checklist', desc: 'Task list', shortcut: '/' },
              { name: 'Quote', desc: 'Blockquote', shortcut: 'Ctrl+Shift+.' },
              { name: 'Code Block', desc: 'Syntax highlighting', shortcut: 'Ctrl+Shift+C' },
              { name: 'Image', desc: 'Upload or embed', shortcut: '/' },
              { name: 'Video', desc: 'YouTube, Vimeo', shortcut: '/' },
              { name: 'Divider', desc: 'Horizontal rule', shortcut: 'Ctrl+Shift+-' },
              { name: 'Callout', desc: 'Info/warning boxes', shortcut: '/' },
              { name: 'Table', desc: 'Data tables', shortcut: '/' },
            ].map((block) => (
              <div
                key={block.name}
                style={{
                  padding: '1rem',
                  background: darkMode ? '#334155' : '#f8fafc',
                  borderRadius: '0.5rem',
                  border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                }}
              >
                <h3 style={{
                  margin: '0 0 0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: darkMode ? '#f1f5f9' : '#0f172a'
                }}>
                  {block.name}
                </h3>
                <p style={{
                  margin: '0 0 0.5rem',
                  fontSize: '0.75rem',
                  color: darkMode ? '#94a3b8' : '#64748b'
                }}>
                  {block.desc}
                </p>
                <code style={{
                  fontSize: '0.625rem',
                  padding: '0.125rem 0.375rem',
                  background: darkMode ? '#1e293b' : '#e2e8f0',
                  borderRadius: '0.25rem',
                  color: darkMode ? '#94a3b8' : '#64748b',
                }}>
                  {block.shortcut}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section style={{
        padding: '2rem',
        background: darkMode ? '#0f172a' : '#f8fafc',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            margin: '0 0 1.5rem',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: darkMode ? '#f1f5f9' : '#0f172a',
            textAlign: 'center'
          }}>
            Keyboard Shortcuts
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
          }}>
            {[
              { keys: 'Ctrl+B', action: 'Bold' },
              { keys: 'Ctrl+I', action: 'Italic' },
              { keys: 'Ctrl+U', action: 'Underline' },
              { keys: 'Ctrl+S', action: 'Save' },
              { keys: 'Ctrl+Z', action: 'Undo' },
              { keys: 'Ctrl+Y', action: 'Redo' },
              { keys: 'Enter', action: 'New block' },
              { keys: 'Backspace', action: 'Delete/merge' },
              { keys: '/', action: 'Block menu' },
              { keys: 'Arrow keys', action: 'Navigate' },
            ].map((shortcut) => (
              <div
                key={shortcut.keys}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 1rem',
                  background: darkMode ? '#1e293b' : '#ffffff',
                  borderRadius: '0.25rem',
                  border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                }}
              >
                <code style={{
                  fontSize: '0.75rem',
                  color: darkMode ? '#94a3b8' : '#64748b',
                }}>
                  {shortcut.keys}
                </code>
                <span style={{
                  fontSize: '0.75rem',
                  color: darkMode ? '#f1f5f9' : '#334155',
                }}>
                  {shortcut.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem',
        textAlign: 'center',
        background: darkMode ? '#1e293b' : '#ffffff',
        borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      }}>
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: darkMode ? '#94a3b8' : '#64748b'
        }}>
          Content Blocks Editor - Lightweight, Block-based, Pure HTML Output
        </p>
      </footer>
    </div>
  );
};
