import React, { useState, useRef } from 'react';
import { AuthorlyEditor, AuthorlyRenderer, AuthorlyTOC, processHtml, type EditorRef } from '../src';
import '../src/styles/editor.css';
import '../src/styles/renderer.css';

export const Playground: React.FC = () => {
  const editorRef = useRef<EditorRef>(null);
  const [content, setContent] = useState(`<h1>Welcome to Authorly Editor</h1>
<p>Start editing to see the live preview and table of contents update in real-time.</p>

<h2>Features</h2>
<ul>
  <li>Rich text editing with keyboard shortcuts</li>
  <li>Live preview with AuthorlyRenderer</li>
  <li>Automatic table of contents generation</li>
  <li>Dark mode support</li>
</ul>

<h2>Getting Started</h2>
<p>Type <code>/</code> to see available block commands, or use the toolbar to format your text.</p>

<h3>Callouts</h3>
<aside data-callout-type="info" class="cb-callout cb-callout-info">
  <div class="cb-callout-icon-container">
    <div class="cb-callout-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    </div>
  </div>
  <div class="cb-callout-content">
    <div class="cb-callout-body">This is an info callout with an icon!</div>
  </div>
</aside>

<h3>Code Blocks</h3>
<pre data-language="javascript"><code>const editor = new AuthorlyEditor({
  darkMode: true,
  onChange: (html) => console.log(html)
});</code></pre>`);

  const [darkMode, setDarkMode] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [showTOC, setShowTOC] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'renderer' | 'html'>('renderer');

  // Calculate grid columns based on visible panels
  const visiblePanels = [showEditor, showTOC, showPreview].filter(Boolean).length;
  const gridCols = visiblePanels === 0 ? '1fr' 
    : visiblePanels === 1 ? '1fr'
    : visiblePanels === 2 ? '1fr 1fr'
    : showTOC ? '2fr 200px 2fr' : '1fr 1fr 1fr';

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: darkMode ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        padding: '1rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: darkMode ? '#f1f5f9' : '#0f172a',
            }}>
              Authorly Playground
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Panel Toggles */}
            <div style={{
              display: 'flex',
              gap: '0.25rem',
              padding: '0.25rem',
              background: darkMode ? '#0f172a' : '#f1f5f9',
              borderRadius: '0.375rem',
            }}>
              <button
                onClick={() => setShowEditor(!showEditor)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: showEditor ? (darkMode ? '#3b82f6' : '#3b82f6') : 'transparent',
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: showEditor ? '#ffffff' : (darkMode ? '#cbd5e1' : '#64748b'),
                  cursor: 'pointer',
                  fontWeight: showEditor ? 600 : 500,
                  transition: 'all 0.15s',
                }}
              >
                Editor
              </button>
              <button
                onClick={() => setShowTOC(!showTOC)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: showTOC ? (darkMode ? '#3b82f6' : '#3b82f6') : 'transparent',
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: showTOC ? '#ffffff' : (darkMode ? '#cbd5e1' : '#64748b'),
                  cursor: 'pointer',
                  fontWeight: showTOC ? 600 : 500,
                  transition: 'all 0.15s',
                }}
              >
                TOC
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: showPreview ? (darkMode ? '#3b82f6' : '#3b82f6') : 'transparent',
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: showPreview ? '#ffffff' : (darkMode ? '#cbd5e1' : '#64748b'),
                  cursor: 'pointer',
                  fontWeight: showPreview ? 600 : 500,
                  transition: 'all 0.15s',
                }}
              >
                Preview
              </button>
            </div>

            {/* Preview Mode Toggle */}
            {showPreview && (
              <div style={{
                display: 'flex',
                gap: '0.25rem',
                padding: '0.25rem',
                background: darkMode ? '#0f172a' : '#f1f5f9',
                borderRadius: '0.375rem',
              }}>
                <button
                  onClick={() => setPreviewMode('renderer')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: previewMode === 'renderer' ? (darkMode ? '#10b981' : '#10b981') : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    color: previewMode === 'renderer' ? '#ffffff' : (darkMode ? '#cbd5e1' : '#64748b'),
                    cursor: 'pointer',
                    fontWeight: previewMode === 'renderer' ? 600 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  Renderer
                </button>
                <button
                  onClick={() => setPreviewMode('html')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: previewMode === 'html' ? (darkMode ? '#10b981' : '#10b981') : 'transparent',
                    border: 'none',
                    borderRadius: '0.25rem',
                    color: previewMode === 'html' ? '#ffffff' : (darkMode ? '#cbd5e1' : '#64748b'),
                    cursor: 'pointer',
                    fontWeight: previewMode === 'html' ? 600 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  Raw HTML
                </button>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '0.5rem 1rem',
                background: darkMode ? '#334155' : '#f1f5f9',
                border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                borderRadius: '0.375rem',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: '1.5rem',
          height: 'calc(100vh - 140px)',
        }}>
          {/* Editor Panel */}
          {showEditor && (
            <div style={{
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                background: darkMode ? '#0f172a' : '#f8fafc',
                borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: darkMode ? '#cbd5e1' : '#475569',
              }}>
                Editor
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <AuthorlyEditor
                  ref={editorRef}
                  initialContent={content}
                  onChange={setContent}
                  darkMode={darkMode}
                  placeholder="Start typing..."
                  style={{ 
                    minHeight: '100%',
                    padding: '1.5rem',
                  }}
                />
              </div>
            </div>
          )}

          {/* Table of Contents Panel */}
          {showTOC && (
            <div style={{
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                background: darkMode ? '#0f172a' : '#f8fafc',
                borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: darkMode ? '#cbd5e1' : '#475569',
              }}>
                Contents
              </div>
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                padding: '1rem',
              }}>
                <AuthorlyTOC 
                  html={content} 
                  darkMode={darkMode}
                  maxLevel={3}
                />
              </div>
            </div>
          )}

          {/* Preview Panel */}
          {showPreview && (
            <div style={{
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                background: darkMode ? '#0f172a' : '#f8fafc',
                borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: darkMode ? '#cbd5e1' : '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>Preview ({previewMode === 'renderer' ? 'Renderer' : 'Raw HTML'})</span>
              </div>
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                padding: '1.5rem',
              }}>
                {previewMode === 'renderer' ? (
                  <AuthorlyRenderer 
                    html={content} 
                    darkMode={darkMode}
                    enableCodeCopy
                    enableHeadingIds
                    enableSyntaxHighlighting
                  />
                ) : (
                  <div
                    className={`cbr-content${darkMode ? ' cbr-dark' : ''}`}
                    dangerouslySetInnerHTML={{ __html: processHtml(content, {
                      enableCodeCopy: true,
                      enableChecklistStyles: true,
                      enableHeadingIds: true,
                      enableSyntaxHighlighting: false,
                    }) }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Playground;
