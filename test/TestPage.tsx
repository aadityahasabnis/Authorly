/**
 * Test Page - Real-world testing scenarios
 * Test all editor features with minimal, production-ready code
 */

import React, { useState, useRef } from 'react';
import { AuthorlyEditor, type EditorRef } from '../src';
import { createCloudinaryConfig } from '../src/utils/uploadConfigHelpers';
import '../src/styles/editor.css';

export const TestPage: React.FC = () => {
  const editorRef = useRef<EditorRef>(null);
  const [content, setContent] = useState(`<h1>Test All Features</h1>
<p>This page tests <strong>all editor features</strong> in real-world scenarios.</p>

<h2>1. Text Formatting</h2>
<p>Test <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strikethrough</s>, and <code>inline code</code>.</p>

<h2>2. Lists</h2>
<ul>
  <li>Bullet list item 1</li>
  <li>Bullet list item 2</li>
</ul>

<h2>3. Table</h2>
<p>Type <code>/table</code> to insert a table.</p>

<h2>4. Code Block</h2>
<p>Type <code>/code</code> for code blocks.</p>

<h2>5. Images</h2>
<p>Type <code>/image</code> to upload images.</p>`);

  const [darkMode, setDarkMode] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);

  // Upload config - use Cloudinary if configured, otherwise use mock for testing
  const uploadConfig = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    ? createCloudinaryConfig({
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      })
    : {
        // Mock upload service for testing progress bar
        provider: 'custom' as const,
        customUpload: async (file: File, onProgress?: (progress: any) => void) => {
          // Simulate upload with progress
          console.log('📤 Mock upload started:', file.name);
          
          // Simulate progress increments
          const progressSteps = [0, 10, 25, 40, 55, 70, 85, 95, 100];
          for (const percent of progressSteps) {
            await new Promise(resolve => setTimeout(resolve, 200));
            onProgress?.({
              loaded: (file.size * percent) / 100,
              total: file.size,
              percent,
            });
          }
          
          // Return mock result with base64 URL
          return new Promise<any>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('✅ Mock upload complete:', file.name);
              resolve({
                url: reader.result as string,
                width: 800,
                height: 600,
                format: file.type.split('/')[1],
                publicId: `mock-${Date.now()}`,
              });
            };
            reader.readAsDataURL(file);
          });
        },
      };

  // Test functions
  const tests = {
    getHTML: () => {
      const html = editorRef.current?.getHTML();
      console.log('Editor HTML:', html);
      alert('HTML logged to console');
    },
    setHTML: () => {
      editorRef.current?.setHTML('<h1>New Content</h1><p>Content was replaced programmatically.</p>');
    },
    focus: () => {
      editorRef.current?.focus();
    },
    undo: () => {
      editorRef.current?.undo();
    },
    redo: () => {
      editorRef.current?.redo();
    },
    clear: () => {
      editorRef.current?.setHTML('<p></p>');
      editorRef.current?.focus();
    },
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      paddingTop: '4rem',
      background: darkMode ? '#0f172a' : '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      transition: 'background 0.2s',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 2rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h1 style={{
            margin: 0,
            color: darkMode ? '#f1f5f9' : '#0f172a',
            fontSize: '1.5rem',
            fontWeight: 600,
          }}>
            🧪 Test Page - All Features
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '0.5rem 1rem',
              background: darkMode ? '#1e293b' : '#f1f5f9',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.375rem',
              color: darkMode ? '#f1f5f9' : '#0f172a',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Test Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.5rem',
          padding: '1rem',
          background: darkMode ? '#1e293b' : '#f8fafc',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
        }}>
          <h3 style={{
            gridColumn: '1 / -1',
            margin: '0 0 0.5rem 0',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: darkMode ? '#94a3b8' : '#64748b',
          }}>
            🎯 Test Controls (EditorRef Methods)
          </h3>
          {Object.entries(tests).map(([name, fn]) => (
            <button
              key={name}
              onClick={() => {
                setActiveTest(name);
                fn();
                setTimeout(() => setActiveTest(null), 300);
              }}
              style={{
                padding: '0.5rem 0.75rem',
                background: activeTest === name ? '#3b82f6' : (darkMode ? '#334155' : '#ffffff'),
                border: `1px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                borderRadius: '0.375rem',
                color: activeTest === name ? '#ffffff' : (darkMode ? '#f1f5f9' : '#0f172a'),
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          background: darkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
          padding: '1.5rem',
          minHeight: '600px',
        }}>
          <AuthorlyEditor
            ref={editorRef}
            initialContent={content}
            onChange={setContent}
            onSave={(html) => console.log('Saved:', html)}
            darkMode={darkMode}
            imageUploadConfig={uploadConfig}
            placeholder="Start testing..."
          />
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: darkMode ? '#1e293b' : '#f8fafc',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
        }}>
          <h3 style={{
            margin: '0 0 0.75rem 0',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: darkMode ? '#94a3b8' : '#64748b',
          }}>
            📝 Quick Test Guide
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.8125rem',
            color: darkMode ? '#cbd5e1' : '#475569',
          }}>
            <div>
              <strong>Keyboard Shortcuts:</strong>
              <br />• Ctrl+B = Bold
              <br />• Ctrl+I = Italic
              <br />• Ctrl+Z = Undo
              <br />• Ctrl+Y = Redo
            </div>
            <div>
              <strong>Slash Commands:</strong>
              <br />• /heading1 = H1
              <br />• /image = Image
              <br />• /table = Table
              <br />• /code = Code Block
            </div>
            <div>
              <strong>Features to Test:</strong>
              <br />• Image upload
              <br />• Table navigation (Tab)
              <br />• Arrow keys in tables
              <br />• Undo/Redo (fixed)
            </div>
          </div>
        </div>

        {/* Output Preview */}
        <details style={{ marginTop: '1.5rem' }}>
          <summary style={{
            padding: '0.75rem',
            background: darkMode ? '#1e293b' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: darkMode ? '#f1f5f9' : '#0f172a',
          }}>
            🔍 View HTML Output
          </summary>
          <pre style={{
            marginTop: '0.5rem',
            padding: '1rem',
            background: darkMode ? '#0f172a' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            color: darkMode ? '#94a3b8' : '#64748b',
            overflow: 'auto',
            maxHeight: '300px',
          }}>
            {content}
          </pre>
        </details>
      </div>
    </div>
  );
};
