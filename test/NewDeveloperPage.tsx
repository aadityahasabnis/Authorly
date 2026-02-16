import React, { useState, useRef } from 'react';
import { 
  AuthorlyEditor, 
  AuthorlyRenderer, 
  AuthorlyTOC,
  type EditorRef 
} from '../src';

// Scenario 1: Blog Post Editor with Auto-Save
const BlogEditorExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [content, setContent] = useState('<h1>My Blog Post</h1><p>Start writing...</p>');
  const [saved, setSaved] = useState(false);

  const handleSave = (html: string) => {
    console.log('Auto-saving blog post...');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: darkMode ? '#f1f5f9' : '#0f172a' }}>
          Blog Post Editor
        </h3>
        {saved && (
          <span style={{ fontSize: '0.875rem', color: '#22c55e' }}>
            ✓ Saved
          </span>
        )}
      </div>
      <AuthorlyEditor
        initialContent={content}
        onChange={setContent}
        onSave={handleSave}
        darkMode={darkMode}
        placeholder="Write your blog post... (Ctrl+S to save)"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};

// Scenario 2: Documentation Page with Live Preview & TOC
const DocumentationExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [content, setContent] = useState(`<h1>Getting Started</h1>
<p>Welcome to our documentation.</p>
<h2>Installation</h2>
<p>Run npm install to get started.</p>
<h2>Configuration</h2>
<p>Configure your settings here.</p>
<h2>API Reference</h2>
<p>See our complete API reference.</p>`);
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: darkMode ? '#f1f5f9' : '#0f172a' }}>
          Documentation Editor
        </h3>
        <button onClick={() => setShowPreview(!showPreview)} style={buttonStyle(darkMode)}>
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        <AuthorlyEditor
          initialContent={content}
          onChange={setContent}
          darkMode={darkMode}
          style={{ minHeight: '300px' }}
        />
        {showPreview && (
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
              height: 'fit-content',
            }}>
              <AuthorlyTOC html={content} darkMode={darkMode} title="Contents" maxLevel={2} />
            </div>
            <div style={{
              padding: '1.5rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
            }}>
              <AuthorlyRenderer html={content} darkMode={darkMode} enableHeadingIds />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Scenario 3: Read-Only Article Renderer
const ArticleRendererExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const article = `<h1>The Future of Web Development</h1>
<p>Published on <em>February 10, 2026</em></p>
<blockquote><p>The web is evolving faster than ever before.</p></blockquote>
<h2>Introduction</h2>
<p>In this article, we'll explore the latest trends in web development and what they mean for developers.</p>
<h2>Code Example</h2>
<pre><code>const editor = new RichTextEditor({
  darkMode: true,
  placeholder: "Start writing..."
});</code></pre>
<h2>Key Takeaways</h2>
<ul>
  <li>Rich text editors are essential for content platforms</li>
  <li>Dark mode is no longer optional</li>
  <li>Performance matters more than ever</li>
</ul>`;

  return (
    <div>
      <h3 style={{ margin: '0 0 1rem', color: darkMode ? '#f1f5f9' : '#0f172a' }}>
        Article Renderer (Read-Only)
      </h3>
      <div style={{
        padding: '2rem',
        background: darkMode ? '#1e293b' : '#ffffff',
        border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        borderRadius: '0.5rem',
        maxWidth: '700px',
      }}>
        <AuthorlyRenderer html={article} darkMode={darkMode} enableCodeCopy />
      </div>
    </div>
  );
};

// Scenario 4: Template System with Programmatic Control
const TemplateSystemExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const editorRef = useRef<EditorRef>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = {
    blog: '<h1>Blog Post Title</h1><p>Introduction paragraph...</p><h2>Section 1</h2><p>Content here.</p>',
    announcement: '<h1>📢 Announcement</h1><p><strong>Important:</strong> Details here...</p>',
    tutorial: '<h1>Tutorial: How to...</h1><h2>Prerequisites</h2><ul><li>Item 1</li></ul><h2>Steps</h2><ol><li>Step 1</li></ol>',
  };

  const loadTemplate = (templateKey: keyof typeof templates) => {
    editorRef.current?.setHTML(templates[templateKey]);
    setSelectedTemplate(templateKey);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: darkMode ? '#f1f5f9' : '#0f172a' }}>
          Template System
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {Object.keys(templates).map((key) => (
            <button
              key={key}
              onClick={() => loadTemplate(key as keyof typeof templates)}
              style={{
                ...buttonStyle(darkMode),
                background: selectedTemplate === key ? '#3b82f6' : undefined,
                color: selectedTemplate === key ? '#ffffff' : undefined,
              }}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <AuthorlyEditor
        ref={editorRef}
        initialContent="<p>Select a template above to get started...</p>"
        darkMode={darkMode}
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};

// Scenario 5: Email Newsletter Editor
const NewsletterEditorExample: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const [content, setContent] = useState(`<h1>Weekly Newsletter</h1>
<p>Here's what happened this week...</p>
<h2>📰 Top Stories</h2>
<ul>
  <li>Story headline 1</li>
  <li>Story headline 2</li>
</ul>`);
  const [recipientCount] = useState(1250);

  const handleSendNewsletter = () => {
    console.log('Sending newsletter to', recipientCount, 'subscribers');
    alert(`Newsletter sent to ${recipientCount} subscribers!`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: darkMode ? '#f1f5f9' : '#0f172a' }}>
          Newsletter Editor
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: darkMode ? '#94a3b8' : '#64748b' }}>
            {recipientCount} subscribers
          </span>
          <button onClick={handleSendNewsletter} style={{
            ...buttonStyle(darkMode),
            background: '#3b82f6',
            color: '#ffffff',
          }}>
            Send Newsletter
          </button>
        </div>
      </div>
      <AuthorlyEditor
        initialContent={content}
        onChange={setContent}
        darkMode={darkMode}
        placeholder="Write your newsletter..."
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};

const buttonStyle = (darkMode: boolean): React.CSSProperties => ({
  padding: '0.5rem 1rem',
  fontSize: '0.875rem',
  background: darkMode ? '#334155' : '#f1f5f9',
  border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
  borderRadius: '0.375rem',
  color: darkMode ? '#f1f5f9' : '#334155',
  cursor: 'pointer',
});

export const NewDeveloperPage: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
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
                Real-World Usage Examples
              </h1>
              <p style={{ 
                margin: '0.25rem 0 0', 
                fontSize: '0.875rem',
                color: darkMode ? '#94a3b8' : '#64748b'
              }}>
                See how to use Authorly Editor in production apps
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
              {darkMode ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section style={{
            padding: '1.5rem',
            background: darkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <BlogEditorExample darkMode={darkMode} />
          </section>

          <section style={{
            padding: '1.5rem',
            background: darkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <DocumentationExample darkMode={darkMode} />
          </section>

          <section style={{
            padding: '1.5rem',
            background: darkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <ArticleRendererExample darkMode={darkMode} />
          </section>

          <section style={{
            padding: '1.5rem',
            background: darkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <TemplateSystemExample darkMode={darkMode} />
          </section>

          <section style={{
            padding: '1.5rem',
            background: darkMode ? '#1e293b' : '#ffffff',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <NewsletterEditorExample darkMode={darkMode} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default NewDeveloperPage;
