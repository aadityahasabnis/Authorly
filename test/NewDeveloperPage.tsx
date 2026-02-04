/**
 * NewDeveloperPage - Comprehensive guide for developers
 * Shows how to use ContentBlocksEditor, ContentBlocksRenderer, and TableOfContents
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  ContentBlocksEditor, 
  ContentBlocksRenderer, 
  TableOfContents,
  type EditorRef 
} from '../src';

// In your project, import like this:
// import { 
//   ContentBlocksEditor, 
//   ContentBlocksRenderer, 
//   TableOfContents 
// } from 'authorly-editor';

// ============================================
// Example 1: Basic Editor Usage
// ============================================
const BasicEditorExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [html, setHtml] = useState('<p>Start typing here...</p>');

  return (
    <div>
      <h3 style={{ color: darkMode ? '#f1f5f9' : '#0f172a', marginBottom: '1rem' }}>
        Basic Editor
      </h3>
      <ContentBlocksEditor
        initialContent={html}
        onChange={setHtml}
        darkMode={darkMode}
        placeholder="Write something..."
        style={{ minHeight: '200px' }}
      />
      <pre style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: darkMode ? '#0f172a' : '#f1f5f9',
        borderRadius: '0.375rem',
        fontSize: '0.75rem',
        color: darkMode ? '#94a3b8' : '#64748b',
        overflow: 'auto',
        maxHeight: '100px',
      }}>
        {html}
      </pre>
    </div>
  );
};

// ============================================
// Example 2: Editor with Ref (Programmatic Control)
// ============================================
const EditorWithRefExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const editorRef = useRef<EditorRef>(null);
  const [output, setOutput] = useState('');

  const handleGetHTML = () => {
    const html = editorRef.current?.getHTML();
    setOutput(html || '');
  };

  const handleSetHTML = () => {
    editorRef.current?.setHTML('<h1>Hello World!</h1><p>This was set programmatically.</p>');
  };

  const handleFocus = () => {
    editorRef.current?.focus();
  };

  return (
    <div>
      <h3 style={{ color: darkMode ? '#f1f5f9' : '#0f172a', marginBottom: '1rem' }}>
        Editor with Ref (Programmatic Control)
      </h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={handleGetHTML} style={buttonStyle(darkMode)}>Get HTML</button>
        <button onClick={handleSetHTML} style={buttonStyle(darkMode)}>Set HTML</button>
        <button onClick={handleFocus} style={buttonStyle(darkMode)}>Focus Editor</button>
      </div>
      <ContentBlocksEditor
        ref={editorRef}
        initialContent="<p>Click the buttons above to control this editor.</p>"
        darkMode={darkMode}
        style={{ minHeight: '150px' }}
      />
      {output && (
        <pre style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: darkMode ? '#0f172a' : '#f1f5f9',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          color: darkMode ? '#94a3b8' : '#64748b',
        }}>
          {output}
        </pre>
      )}
    </div>
  );
};

// ============================================
// Example 3: Renderer Only (Display Content)
// ============================================
const RendererOnlyExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const sampleContent = `
    <h1>Welcome to Our Blog</h1>
    <p>This is a <strong>rendered</strong> content example with <em>various</em> formatting.</p>
    <h2>Code Example</h2>
    <pre><code>const greeting = "Hello World";
console.log(greeting);</code></pre>
    <h2>A List</h2>
    <ul>
      <li>Item one</li>
      <li>Item two</li>
      <li>Item three</li>
    </ul>
    <blockquote><p>This is a blockquote with some important information.</p></blockquote>
  `;

  return (
    <div>
      <h3 style={{ color: darkMode ? '#f1f5f9' : '#0f172a', marginBottom: '1rem' }}>
        Renderer Only (Read-Only Display)
      </h3>
      <div style={{
        padding: '1.5rem',
        background: darkMode ? '#1e293b' : '#ffffff',
        border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        borderRadius: '0.5rem',
      }}>
        <ContentBlocksRenderer
          html={sampleContent}
          darkMode={darkMode}
          enableCodeCopy={true}
        />
      </div>
    </div>
  );
};

// ============================================
// Example 4: Table of Contents
// ============================================
const TableOfContentsExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const contentWithHeadings = `
    <h1>Getting Started</h1>
    <p>Introduction paragraph here.</p>
    <h2>Installation</h2>
    <p>How to install the package.</p>
    <h3>Using npm</h3>
    <p>npm install command.</p>
    <h3>Using yarn</h3>
    <p>yarn add command.</p>
    <h2>Configuration</h2>
    <p>Configuration options.</p>
    <h2>Usage Examples</h2>
    <p>Some usage examples.</p>
    <h3>Basic Usage</h3>
    <p>Simple example.</p>
    <h3>Advanced Usage</h3>
    <p>Complex example.</p>
  `;

  return (
    <div>
      <h3 style={{ color: darkMode ? '#f1f5f9' : '#0f172a', marginBottom: '1rem' }}>
        Table of Contents
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        gap: '1.5rem',
      }}>
        <div style={{
          padding: '1rem',
          background: darkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
        }}>
          <TableOfContents
            html={contentWithHeadings}
            darkMode={darkMode}
            title="Contents"
            maxLevel={3}
          />
        </div>
        <div style={{
          padding: '1.5rem',
          background: darkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
          maxHeight: '300px',
          overflow: 'auto',
        }}>
          <ContentBlocksRenderer
            html={contentWithHeadings}
            darkMode={darkMode}
            enableHeadingIds={true}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// Example 5: Full Blog Editor
// ============================================
const FullBlogEditorExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const editorRef = useRef<EditorRef>(null);
  const [html, setHtml] = useState(`
    <h1>My Blog Post Title</h1>
    <p>Write your blog content here...</p>
  `);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = useCallback((content: string) => {
    console.log('Saved:', content);
    alert('Blog post saved! Check console for HTML.');
  }, []);

  return (
    <div>
      <h3 style={{ color: darkMode ? '#f1f5f9' : '#0f172a', marginBottom: '1rem' }}>
        Full Blog Editor with Preview
      </h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setShowPreview(!showPreview)} 
          style={{
            ...buttonStyle(darkMode),
            background: showPreview ? '#3b82f6' : undefined,
            color: showPreview ? '#ffffff' : undefined,
          }}
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr',
        gap: '1rem',
      }}>
        <ContentBlocksEditor
          ref={editorRef}
          initialContent={html}
          onChange={setHtml}
          onSave={handleSave}
          darkMode={darkMode}
          showToolbar={true}
          placeholder="Write your blog post..."
          style={{ minHeight: '300px' }}
        />
        {showPreview && (
          <div style={{
            padding: '1.5rem',
            background: darkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            maxHeight: '400px',
            overflow: 'auto',
          }}>
            <ContentBlocksRenderer html={html} darkMode={darkMode} />
          </div>
        )}
      </div>
    </div>
  );
};

// Button style helper
const buttonStyle = (darkMode: boolean): React.CSSProperties => ({
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  background: darkMode ? '#334155' : '#f1f5f9',
  border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
  borderRadius: '0.375rem',
  color: darkMode ? '#f1f5f9' : '#334155',
  cursor: 'pointer',
});

// ============================================
// Code Examples (for documentation)
// ============================================
const codeExamples = {
  installation: `npm install authorly-editor
# or
yarn add authorly-editor`,

  basicEditor: `import { ContentBlocksEditor } from 'authorly-editor';

function MyEditor() {
  const [html, setHtml] = useState('<p>Hello</p>');
  
  return (
    <ContentBlocksEditor
      initialContent={html}
      onChange={setHtml}
      darkMode={false}
      placeholder="Start writing..."
    />
  );
}`,

  editorWithRef: `import { ContentBlocksEditor, EditorRef } from 'authorly-editor';

function MyEditor() {
  const editorRef = useRef<EditorRef>(null);
  
  const getContent = () => {
    const html = editorRef.current?.getHTML();
    console.log(html);
  };
  
  const setContent = () => {
    editorRef.current?.setHTML('<p>New content</p>');
  };
  
  return (
    <>
      <button onClick={getContent}>Get HTML</button>
      <button onClick={setContent}>Set HTML</button>
      <ContentBlocksEditor ref={editorRef} />
    </>
  );
}`,

  renderer: `import { ContentBlocksRenderer } from 'authorly-editor';

function BlogPost({ content }) {
  return (
    <ContentBlocksRenderer
      html={content}
      darkMode={false}
      enableCodeCopy={true}
      enableHeadingIds={true}
    />
  );
}`,

  tableOfContents: `import { TableOfContents, ContentBlocksRenderer } from 'authorly-editor';

function DocumentPage({ content }) {
  return (
    <div style={{ display: 'flex' }}>
      <aside style={{ width: 200 }}>
        <TableOfContents
          html={content}
          title="Contents"
          maxLevel={3}
        />
      </aside>
      <main>
        <ContentBlocksRenderer 
          html={content} 
          enableHeadingIds={true}
        />
      </main>
    </div>
  );
}`,

  fullExample: `import { 
  ContentBlocksEditor, 
  ContentBlocksRenderer, 
  TableOfContents,
  EditorRef 
} from 'authorly-editor';

function BlogEditor() {
  const editorRef = useRef<EditorRef>(null);
  const [html, setHtml] = useState('<p>Start writing...</p>');
  const [isPreview, setIsPreview] = useState(false);
  
  const handleSave = (content: string) => {
    // Save to your backend
    fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  };
  
  return (
    <div>
      <button onClick={() => setIsPreview(!isPreview)}>
        {isPreview ? 'Edit' : 'Preview'}
      </button>
      
      {isPreview ? (
        <div style={{ display: 'flex' }}>
          <TableOfContents html={html} />
          <ContentBlocksRenderer html={html} />
        </div>
      ) : (
        <ContentBlocksEditor
          ref={editorRef}
          initialContent={html}
          onChange={setHtml}
          onSave={handleSave}
          showToolbar={true}
        />
      )}
    </div>
  );
}`,
};

// Code block component - Styled like the editor's code blocks
const CodeBlock: React.FC<{ code: string; darkMode: boolean; title?: string }> = ({ 
  code, 
  darkMode,
  title 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      marginBottom: '1rem',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      background: darkMode ? '#1e293b' : '#f8fafc',
    }}>
      {/* Header with title and copy button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        background: darkMode ? '#0f172a' : '#f1f5f9',
        borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: darkMode ? '#94a3b8' : '#64748b',
          fontFamily: 'monospace',
        }}>
          {title || 'Code'}
        </span>
        <button
          onClick={handleCopy}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.6875rem',
            background: copied ? '#22c55e' : (darkMode ? '#334155' : '#e2e8f0'),
            border: 'none',
            borderRadius: '0.25rem',
            color: copied ? '#ffffff' : (darkMode ? '#94a3b8' : '#64748b'),
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code content */}
      <div style={{
        padding: '1rem',
        overflowX: 'auto',
        background: darkMode ? '#0f172a' : '#f8fafc',
      }}>
        <pre style={{
          margin: 0,
          fontSize: '0.8125rem',
          lineHeight: 1.7,
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          color: darkMode ? '#e2e8f0' : '#334155',
          whiteSpace: 'pre',
          tabSize: 2,
        }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

// ============================================
// Main Developer Page
// ============================================
export const NewDeveloperPage: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'examples' | 'api' | 'code'>('examples');

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '1.5rem 2rem',
        background: darkMode ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: 700,
                color: darkMode ? '#f1f5f9' : '#0f172a'
              }}>
                Authorly
              </h1>
              <p style={{ 
                margin: '0.25rem 0 0', 
                fontSize: '0.875rem',
                color: darkMode ? '#94a3b8' : '#64748b'
              }}>
                Rich Text Editor for Blogs & Publishing
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '0.5rem 1rem',
                background: darkMode ? '#334155' : '#f1f5f9',
                border: 'none',
                borderRadius: '0.375rem',
                color: darkMode ? '#f1f5f9' : '#334155',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
          
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
            {(['examples', 'api', 'code'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.5rem 1rem',
                  background: activeTab === tab ? '#3b82f6' : 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: activeTab === tab ? '#ffffff' : (darkMode ? '#94a3b8' : '#64748b'),
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'api' ? 'API Reference' : tab === 'code' ? 'Code Examples' : 'Live Examples'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {activeTab === 'examples' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <BasicEditorExample darkMode={darkMode} />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <EditorWithRefExample darkMode={darkMode} />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <RendererOnlyExample darkMode={darkMode} />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <TableOfContentsExample darkMode={darkMode} />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <FullBlogEditorExample darkMode={darkMode} />
            </section>
          </div>
        )}

        {activeTab === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ContentBlocksEditor API */}
            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                ContentBlocksEditor
              </h2>
              <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '1rem' }}>
                The main editor component for creating and editing content.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Prop</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Default</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Description</th>
                  </tr>
                </thead>
                <tbody style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>
                  {[
                    ['initialContent', 'string', '""', 'Initial HTML content'],
                    ['onChange', '(html: string) => void', '-', 'Called when content changes'],
                    ['onSave', '(html: string) => void', '-', 'Called on Ctrl+S'],
                    ['darkMode', 'boolean', 'false', 'Enable dark theme'],
                    ['showToolbar', 'boolean', 'true', 'Show formatting toolbar'],
                    ['placeholder', 'string', '""', 'Placeholder text'],
                    ['readOnly', 'boolean', 'false', 'Disable editing'],
                    ['autoFocus', 'boolean', 'false', 'Focus on mount'],
                    ['spellCheck', 'boolean', 'true', 'Enable spell check'],
                  ].map(([prop, type, def, desc]) => (
                    <tr key={prop} style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>{prop}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{type}</td>
                      <td style={{ padding: '0.75rem' }}>{def}</td>
                      <td style={{ padding: '0.75rem' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <h4 style={{ margin: '1.5rem 0 0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                Ref Methods (EditorRef)
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Method</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Description</th>
                  </tr>
                </thead>
                <tbody style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>
                  {[
                    ['getHTML()', 'Returns the current HTML content'],
                    ['setHTML(html: string)', 'Sets the editor content'],
                    ['focus()', 'Focuses the editor'],
                    ['blur()', 'Blurs the editor'],
                  ].map(([method, desc]) => (
                    <tr key={method} style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>{method}</td>
                      <td style={{ padding: '0.75rem' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ContentBlocksRenderer API */}
            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                ContentBlocksRenderer
              </h2>
              <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '1rem' }}>
                Renders HTML content with beautiful styling. Perfect for displaying saved content.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Prop</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Default</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Description</th>
                  </tr>
                </thead>
                <tbody style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>
                  {[
                    ['html', 'string', '""', 'HTML content to render'],
                    ['darkMode', 'boolean', 'false', 'Enable dark theme'],
                    ['enableCodeCopy', 'boolean', 'true', 'Add copy button to code blocks'],
                    ['enableHeadingIds', 'boolean', 'true', 'Add IDs to headings for navigation'],
                    ['enableChecklistStyles', 'boolean', 'true', 'Style checked items with strikethrough'],
                    ['className', 'string', '""', 'Custom CSS class'],
                  ].map(([prop, type, def, desc]) => (
                    <tr key={prop} style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>{prop}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{type}</td>
                      <td style={{ padding: '0.75rem' }}>{def}</td>
                      <td style={{ padding: '0.75rem' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* TableOfContents API */}
            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                TableOfContents
              </h2>
              <p style={{ color: darkMode ? '#94a3b8' : '#64748b', marginBottom: '1rem' }}>
                Extracts headings from HTML and generates a navigable table of contents.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Prop</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Default</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>Description</th>
                  </tr>
                </thead>
                <tbody style={{ color: darkMode ? '#cbd5e1' : '#475569' }}>
                  {[
                    ['html', 'string', '""', 'HTML content to extract headings from'],
                    ['darkMode', 'boolean', 'false', 'Enable dark theme'],
                    ['title', 'string', '"Table of Contents"', 'Title shown above TOC'],
                    ['minLevel', 'number', '1', 'Minimum heading level (1-6)'],
                    ['maxLevel', 'number', '6', 'Maximum heading level (1-6)'],
                    ['onNavigate', '(id, item) => void', '-', 'Custom navigation handler'],
                    ['smoothScroll', 'boolean', 'true', 'Enable smooth scrolling'],
                    ['collapsible', 'boolean', 'false', 'Make TOC collapsible'],
                  ].map(([prop, type, def, desc]) => (
                    <tr key={prop} style={{ borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#3b82f6' }}>{prop}</td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{type}</td>
                      <td style={{ padding: '0.75rem' }}>{def}</td>
                      <td style={{ padding: '0.75rem' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {activeTab === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                Installation
              </h2>
              <CodeBlock code={codeExamples.installation} darkMode={darkMode} title="Terminal" />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                Basic Editor
              </h2>
              <CodeBlock code={codeExamples.basicEditor} darkMode={darkMode} title="React Component" />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                Editor with Ref
              </h2>
              <CodeBlock code={codeExamples.editorWithRef} darkMode={darkMode} title="React Component" />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                Renderer (Display Only)
              </h2>
              <CodeBlock code={codeExamples.renderer} darkMode={darkMode} title="React Component" />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                Table of Contents
              </h2>
              <CodeBlock code={codeExamples.tableOfContents} darkMode={darkMode} title="React Component" />
            </section>

            <section style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <h2 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
                Full Blog Editor Example
              </h2>
              <CodeBlock code={codeExamples.fullExample} darkMode={darkMode} title="React Component" />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '1.5rem',
        textAlign: 'center',
        background: darkMode ? '#1e293b' : '#ffffff',
        borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        marginTop: '2rem',
      }}>
        <p style={{ 
          margin: 0, 
          fontSize: '0.875rem',
          color: darkMode ? '#94a3b8' : '#64748b'
        }}>
          Authorly — Rich Text Editor for Blogs & Publishing
        </p>
      </footer>
    </div>
  );
};

export default NewDeveloperPage;
