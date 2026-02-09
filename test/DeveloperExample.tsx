import React, { useState } from 'react';
import { ContentBlocksEditor } from '../src';

export const DeveloperExample: React.FC = () => {
  const [content, setContent] = useState('<p>Start typing...</p>');
  const [darkMode, setDarkMode] = useState(false);

  const handleSave = (html: string) => {
    console.log('Saving:', html);
    alert('Content saved! Check console.');
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: darkMode ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            color: darkMode ? '#f1f5f9' : '#0f172a'
          }}>
            Simple Editor Example
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '0.5rem 1rem',
              background: darkMode ? '#334155' : '#e2e8f0',
              border: 'none',
              borderRadius: '0.375rem',
              color: darkMode ? '#f1f5f9' : '#0f172a',
              cursor: 'pointer',
            }}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>

        <ContentBlocksEditor
          initialContent={content}
          onChange={setContent}
          onSave={handleSave}
          darkMode={darkMode}
          placeholder="Write something amazing..."
          style={{ minHeight: '500px' }}
        />

        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: darkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
          borderRadius: '0.5rem',
        }}>
          <h3 style={{
            margin: '0 0 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: darkMode ? '#94a3b8' : '#64748b'
          }}>
            COPY-PASTE READY CODE
          </h3>
          <pre style={{
            margin: 0,
            padding: '1rem',
            background: darkMode ? '#0f172a' : '#f8fafc',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            overflow: 'auto',
            color: darkMode ? '#e2e8f0' : '#334155',
          }}>
{`import { ContentBlocksEditor } from 'authorly-editor';
import { useState } from 'react';

function MyEditor() {
  const [content, setContent] = useState('<p>Hello</p>');

  const handleSave = (html: string) => {
    // Send to your API
    fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ content: html })
    });
  };

  return (
    <ContentBlocksEditor
      initialContent={content}
      onChange={setContent}
      onSave={handleSave}
      darkMode={false}
    />
  );
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DeveloperExample;
