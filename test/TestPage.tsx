/**
 * Modern Test Page - Authorly Editor
 * 
 * Tests all features with production-ready patterns:
 * - Compact vertical popovers (Text Case, Insert, Alignment)
 * - Fixed image upload with Cloudinary
 * - Code block improvements (click, type, paste, Enter key)
 * - EditorRef API testing
 * - Dark mode support
 * - Upload callbacks
 * - Clean HTML output
 */

import React, { useState, useRef } from 'react';
import { AuthorlyEditor, type EditorRef } from '../src';
import { createCloudinaryConfig } from '../src/utils/uploadConfigHelpers';
import '../src/styles/editor.css';

export const TestPage: React.FC = () => {
  const editorRef = useRef<EditorRef>(null);
  const [content, setContent] = useState(`<h1>✨ Authorly Editor - Feature Test</h1>
<p>Welcome to the <strong>comprehensive test page</strong> for all editor features!</p>

<h2>📝 Text Formatting</h2>
<p>Try: <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strikethrough</s>, and <code>inline code</code></p>

<h2>📋 Lists & Structure</h2>
<ul>
  <li>Bullet lists with Tab/Shift+Tab indentation</li>
  <li>Ordered lists (numbered)</li>
  <li>Checklist items with interactive checkboxes</li>
</ul>

<h2>🎨 New Features - Compact Toolbar</h2>
<p><strong>Vertical Popovers:</strong></p>
<ul>
  <li>Text Case popover (lowercase, UPPERCASE, Capitalize, Strikethrough)</li>
  <li>Insert popover (Date, Time, Accordion, Callout, Image, Video, Code, Divider, Excalidraw)</li>
  <li>Alignment buttons (Left, Center, Right in horizontal layout)</li>
</ul>

<h2>🖼️ Image Upload (Fixed)</h2>
<p>Upload images via:</p>
<ul>
  <li>Click Insert → Image</li>
  <li>Slash command: <code>/image</code></li>
  <li>Drag and drop</li>
  <li>Paste from clipboard</li>
</ul>

<h2>💻 Code Blocks (Fixed)</h2>
<p>Type <code>/code</code> to create a code block. Test these fixes:</p>
<ul>
  <li>✅ Click to focus and place cursor correctly</li>
  <li>✅ Type smoothly without interference</li>
  <li>✅ Press Enter to insert newline (not &lt;br&gt; tags)</li>
  <li>✅ Paste plain text only (strips HTML)</li>
</ul>

<h2>📊 Tables</h2>
<p>Type <code>/table</code> to insert a table. Use Tab/Shift+Tab to navigate cells.</p>

<h2>🎯 Advanced Blocks</h2>
<ul>
  <li><strong>Accordion:</strong> <code>/accordion</code> - Collapsible sections</li>
  <li><strong>Callout:</strong> <code>/callout</code> - Info, Warning, Success, Error boxes</li>
  <li><strong>Quote:</strong> <code>/quote</code> - Blockquotes</li>
  <li><strong>Divider:</strong> <code>/divider</code> - Horizontal rule</li>
  <li><strong>Date/Time:</strong> <code>/date</code> or <code>/time</code> - Interactive pickers</li>
</ul>`);

  const [darkMode, setDarkMode] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Cloudinary config with upload callbacks
  const uploadConfig = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    ? createCloudinaryConfig({
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        folder: import.meta.env.VITE_CLOUDINARY_FOLDER || 'authorly-test',
      })
    : {
        // Mock upload for testing without Cloudinary
        provider: 'custom' as const,
        customUpload: async (file: File, onProgress?: (progress: any) => void) => {
          console.log('📤 Mock upload:', file.name);
          setUploadStatus(`Uploading ${file.name}...`);
          
          const steps = [0, 15, 30, 50, 70, 85, 100];
          for (const percent of steps) {
            await new Promise(resolve => setTimeout(resolve, 150));
            onProgress?.({
              loaded: (file.size * percent) / 100,
              total: file.size,
              percent,
            });
          }
          
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onloadend = () => {
              setUploadStatus(`✅ ${file.name} uploaded`);
              setTimeout(() => setUploadStatus(''), 3000);
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

  // EditorRef API tests
  const editorTests = {
    getHTML: () => {
      const html = editorRef.current?.getHTML();
      console.log('📄 HTML Output:', html);
      alert('HTML output logged to console (check DevTools)');
    },
    getCleanHTML: () => {
      const html = editorRef.current?.getHTML({
        stripEditorUI: true,
        stripDataAttributes: true,
      });
      console.log('🧹 Clean HTML:', html);
      alert('Clean HTML (no editor classes) logged to console');
    },
    setHTML: () => {
      editorRef.current?.setHTML('<h1>Programmatic Update</h1><p>Content replaced via setHTML() method.</p>');
    },
    insertBlock: () => {
      editorRef.current?.insertBlock?.('callout');
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
      if (confirm('Clear all content?')) {
        editorRef.current?.setHTML('<p></p>');
        editorRef.current?.focus();
      }
    },
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '1.5rem',
      paddingTop: '3.5rem',
      background: darkMode ? '#0f172a' : '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'background 0.2s ease',
    }}>
      {/* Header Bar */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 1.5rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.25rem 0',
              color: darkMode ? '#f1f5f9' : '#0f172a',
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}>
              🧪 Authorly Editor - Test Suite
            </h1>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: darkMode ? '#94a3b8' : '#64748b',
            }}>
              Test all features including compact toolbar, image upload, and code blocks
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {uploadStatus && (
              <span style={{
                padding: '0.375rem 0.75rem',
                background: darkMode ? '#1e293b' : '#f0fdf4',
                border: `1px solid ${darkMode ? '#334155' : '#bbf7d0'}`,
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                color: darkMode ? '#94a3b8' : '#16a34a',
              }}>
                {uploadStatus}
              </span>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '0.5rem 1rem',
                background: darkMode ? '#1e293b' : '#f8fafc',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                borderRadius: '0.375rem',
                color: darkMode ? '#f1f5f9' : '#0f172a',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode ? '#334155' : '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = darkMode ? '#1e293b' : '#f8fafc';
              }}
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <div style={{
          background: darkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
          overflow: 'hidden',
          boxShadow: darkMode 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          <AuthorlyEditor
            ref={editorRef}
            initialContent={content}
            onChange={setContent}
            onSave={(html) => {
              console.log('💾 Saved:', html);
              alert('Content saved! (Check console for HTML)');
            }}
            darkMode={darkMode}
            imageUploadConfig={uploadConfig}
            onUploadStart={(filename) => {
              console.log('📤 Upload started:', filename);
              setUploadStatus(`Uploading ${filename}...`);
            }}
            onUploadProgress={(progress) => {
              console.log('📊 Progress:', progress.percent + '%');
            }}
            onUploadSuccess={(result) => {
              console.log('✅ Upload success:', result);
              setUploadStatus(`✅ Upload complete`);
              setTimeout(() => setUploadStatus(''), 3000);
            }}
            onUploadError={(error) => {
              console.error('❌ Upload error:', error);
              setUploadStatus(`❌ Upload failed`);
              setTimeout(() => setUploadStatus(''), 5000);
            }}
            placeholder="Start typing or press '/' for commands..."
            style={{ 
              minHeight: '600px',
              padding: '1.5rem',
            }}
          />
        </div>

        {/* Feature Guide */}
        <div style={{
          marginTop: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        }}>
          {/* Keyboard Shortcuts */}
          <div style={{
            padding: '1rem',
            background: darkMode ? '#1e293b' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <h3 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#cbd5e1' : '#475569',
            }}>
              ⌨️ Keyboard Shortcuts
            </h3>
            <div style={{
              fontSize: '0.8125rem',
              color: darkMode ? '#94a3b8' : '#64748b',
              lineHeight: '1.6',
            }}>
              <div><strong>Ctrl+B</strong> - Bold</div>
              <div><strong>Ctrl+I</strong> - Italic</div>
              <div><strong>Ctrl+U</strong> - Underline</div>
              <div><strong>Ctrl+Z</strong> - Undo</div>
              <div><strong>Ctrl+Y</strong> - Redo</div>
              <div><strong>Ctrl+S</strong> - Save</div>
              <div><strong>Ctrl+K</strong> - Insert Link</div>
            </div>
          </div>

          {/* Slash Commands */}
          <div style={{
            padding: '1rem',
            background: darkMode ? '#1e293b' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <h3 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#cbd5e1' : '#475569',
            }}>
              ⚡ Slash Commands
            </h3>
            <div style={{
              fontSize: '0.8125rem',
              color: darkMode ? '#94a3b8' : '#64748b',
              lineHeight: '1.6',
            }}>
              <div><strong>/heading1-3</strong> - Headings</div>
              <div><strong>/image</strong> - Upload Image</div>
              <div><strong>/table</strong> - Insert Table</div>
              <div><strong>/code</strong> - Code Block</div>
              <div><strong>/callout</strong> - Callout Box</div>
              <div><strong>/accordion</strong> - Accordion</div>
              <div><strong>/date</strong> - Date Picker</div>
            </div>
          </div>

          {/* New Features */}
          <div style={{
            padding: '1rem',
            background: darkMode ? '#1e293b' : '#eff6ff',
            border: `1px solid ${darkMode ? '#334155' : '#bfdbfe'}`,
            borderRadius: '0.5rem',
          }}>
            <h3 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#cbd5e1' : '#1e40af',
            }}>
              ✨ Recent Updates
            </h3>
            <div style={{
              fontSize: '0.8125rem',
              color: darkMode ? '#94a3b8' : '#1e40af',
              lineHeight: '1.6',
            }}>
              <div>✅ Vertical popovers (compact)</div>
              <div>✅ Fixed image upload</div>
              <div>✅ Fixed code block editing</div>
              <div>✅ Enter key in code blocks</div>
              <div>✅ Paste plain text in code</div>
              <div>✅ Click to focus code blocks</div>
            </div>
          </div>
        </div>

        {/* HTML Output Viewer */}
        <details 
          style={{ 
            marginTop: '1.5rem',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
        >
          <summary style={{
            padding: '0.875rem 1rem',
            background: darkMode ? '#1e293b' : '#f8fafc',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: darkMode ? '#f1f5f9' : '#0f172a',
            userSelect: 'none',
          }}>
            🔍 View HTML Output ({content.length} characters)
          </summary>
          <div style={{
            background: darkMode ? '#0f172a' : '#ffffff',
            borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          }}>
            <pre style={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.75rem',
              fontFamily: 'ui-monospace, monospace',
              color: darkMode ? '#94a3b8' : '#64748b',
              overflow: 'auto',
              maxHeight: '400px',
              lineHeight: '1.5',
            }}>
              {content}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
};
