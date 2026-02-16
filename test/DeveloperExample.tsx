/**
 * Simple Developer Example - Authorly Editor
 * 
 * Minimal, copy-paste ready code for quick integration.
 * Perfect for documentation and getting started guides.
 */

import React, { useState } from 'react';
import { AuthorlyEditor } from '../src';

export const DeveloperExample: React.FC = () => {
  const [content, setContent] = useState('<p>Start typing...</p>');
  const [darkMode, setDarkMode] = useState(false);

  const handleSave = (html: string) => {
    console.log('💾 Saving content:', html);
    alert('Content saved! Check console for HTML output.');
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: darkMode ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'background 0.2s',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: darkMode ? '#f1f5f9' : '#0f172a',
              letterSpacing: '-0.02em',
            }}>
              Simple Editor Example
            </h1>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: darkMode ? '#94a3b8' : '#64748b',
            }}>
              Copy-paste ready code for quick integration
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '0.5rem 1rem',
              background: darkMode ? '#1e293b' : '#e2e8f0',
              border: 'none',
              borderRadius: '0.375rem',
              color: darkMode ? '#f1f5f9' : '#0f172a',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Editor Card */}
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
            initialContent={content}
            onChange={setContent}
            onSave={handleSave}
            darkMode={darkMode}
            placeholder="Write something amazing... (Ctrl+S to save)"
            style={{ 
              minHeight: '500px',
              padding: '1.5rem',
            }}
          />
        </div>

        {/* Code Example */}
        <div style={{
          marginTop: '2rem',
          background: darkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '0.875rem 1rem',
            background: darkMode ? '#0f172a' : '#f8fafc',
            borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#94a3b8' : '#64748b',
            }}>
              📋 Copy-Paste Ready Code
            </h3>
          </div>
          <pre style={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '0.8125rem',
            fontFamily: 'ui-monospace, Consolas, monospace',
            color: darkMode ? '#e2e8f0' : '#334155',
            overflow: 'auto',
            lineHeight: '1.6',
          }}>
{`import { AuthorlyEditor } from 'authorly-editor';
import 'authorly-editor/styles.css';
import { useState } from 'react';

function MyEditor() {
  const [content, setContent] = useState('<p>Hello</p>');

  const handleSave = (html: string) => {
    // Send to your API
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: html })
    });
  };

  return (
    <AuthorlyEditor
      initialContent={content}
      onChange={setContent}
      onSave={handleSave}
      darkMode={false}
      placeholder="Start writing..."
    />
  );
}`}
          </pre>
        </div>

        {/* Feature Highlights */}
        <div style={{
          marginTop: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
        }}>
          <div style={{
            padding: '1rem',
            background: darkMode ? '#1e293b' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <h4 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#cbd5e1' : '#475569',
            }}>
              ⚡ Quick Setup
            </h4>
            <p style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: darkMode ? '#94a3b8' : '#64748b',
              lineHeight: '1.5',
            }}>
              Just <code style={{
                padding: '0.125rem 0.25rem',
                background: darkMode ? '#0f172a' : '#e2e8f0',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
              }}>npm install authorly-editor</code> and import. No complex configuration required.
            </p>
          </div>

          <div style={{
            padding: '1rem',
            background: darkMode ? '#1e293b' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <h4 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#cbd5e1' : '#475569',
            }}>
              🎨 Clean HTML Output
            </h4>
            <p style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: darkMode ? '#94a3b8' : '#64748b',
              lineHeight: '1.5',
            }}>
              Get pure semantic HTML. No JSON AST, no complex serialization. Just HTML strings ready for your database.
            </p>
          </div>

          <div style={{
            padding: '1rem',
            background: darkMode ? '#1e293b' : '#f8fafc',
            border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
          }}>
            <h4 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#cbd5e1' : '#475569',
            }}>
              🔧 TypeScript Ready
            </h4>
            <p style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: darkMode ? '#94a3b8' : '#64748b',
              lineHeight: '1.5',
            }}>
              Full TypeScript support with type definitions included. Get autocomplete and type safety out of the box.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: darkMode ? '#1e293b' : '#eff6ff',
          border: `1px solid ${darkMode ? '#334155' : '#bfdbfe'}`,
          borderRadius: '0.5rem',
        }}>
          <h4 style={{
            margin: '0 0 0.75rem 0',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: darkMode ? '#cbd5e1' : '#1e40af',
          }}>
            📚 Learn More
          </h4>
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <a
              href="#test"
              style={{
                fontSize: '0.8125rem',
                color: darkMode ? '#60a5fa' : '#2563eb',
                textDecoration: 'none',
              }}
            >
              → Test Page (All Features)
            </a>
            <a
              href="#docs"
              style={{
                fontSize: '0.8125rem',
                color: darkMode ? '#60a5fa' : '#2563eb',
                textDecoration: 'none',
              }}
            >
              → Full Documentation
            </a>
            <a
              href="https://github.com/aadityahasabnis/Authorly"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.8125rem',
                color: darkMode ? '#60a5fa' : '#2563eb',
                textDecoration: 'none',
              }}
            >
              → GitHub Repository
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
