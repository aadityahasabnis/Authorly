/**
 * Developer Example - Simple usage demonstration
 * 
 * This file shows the minimal setup needed to use Content Blocks Editor.
 * Copy this as a starting point for your own implementation.
 */

import React, { useState, useRef } from 'react';
import {
  ContentBlocksEditor,
  ContentBlocksRenderer,
  TableOfContents,
  type EditorRef
} from '../src';
// Note: In your app, import from the package instead:
// import { ContentBlocksEditor, ContentBlocksRenderer, TableOfContents } from '@content-blocks/editor';

export const DeveloperExample: React.FC = () => {
  const editorRef = useRef<EditorRef>(null);
  const [html, setHtml] = useState('<p>Start typing here...</p>');
  const [darkMode, setDarkMode] = useState(false);
  const [view, setView] = useState<'editor' | 'preview' | 'split'>('split');

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: darkMode ? '#0f172a' : '#f8fafc',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: darkMode ? '#1e293b' : '#ffffff',
        borderRadius: '0.5rem',
        border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.25rem',
          color: darkMode ? '#f1f5f9' : '#0f172a'
        }}>
          Content Blocks Editor
        </h1>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {(['editor', 'split', 'preview'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '0.5rem 1rem',
                  background: view === v ? '#3b82f6' : (darkMode ? '#334155' : '#f1f5f9'),
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: view === v ? '#ffffff' : (darkMode ? '#f1f5f9' : '#334155'),
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textTransform: 'capitalize',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '0.5rem 1rem',
              background: darkMode ? '#334155' : '#f1f5f9',
              border: 'none',
              borderRadius: '0.25rem',
              color: darkMode ? '#f1f5f9' : '#334155',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: view === 'split' ? '1fr 1fr' : '1fr',
        gap: '1.5rem',
      }}>
        {/* Editor */}
        {(view === 'editor' || view === 'split') && (
          <div>
            <h2 style={{
              margin: '0 0 0.75rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              Editor
            </h2>

            {/* 
              ContentBlocksEditor - The main editor component
              
              Key props:
              - initialContent: Starting HTML content
              - onChange: Called whenever content changes
              - darkMode: Enable dark theme
              - showToolbar: Show/hide the formatting toolbar
              - placeholder: Placeholder text when empty
            */}
            <ContentBlocksEditor
              ref={editorRef}
              initialContent={html}
              darkMode={darkMode}
              showToolbar={true}
              placeholder="Start writing..."
              onChange={setHtml}
              style={{ minHeight: '400px' }}
            />
          </div>
        )}

        {/* Preview with TOC */}
        {(view === 'preview' || view === 'split') && (
          <div>
            <h2 style={{
              margin: '0 0 0.75rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: darkMode ? '#94a3b8' : '#64748b'
            }}>
              Preview
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: '1rem',
              background: darkMode ? '#1e293b' : '#ffffff',
              border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
            }}>
              {/* 
                TableOfContents - Generates navigation from HTML headings
                
                Key props:
                - html: The HTML content to extract headings from
                - darkMode: Enable dark theme
                - title: Title shown above the TOC
                - onNavigate: Custom navigation handler (optional)
                - minLevel/maxLevel: Filter heading levels (1-6)
              */}
              <div style={{
                padding: '1rem',
                borderRight: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                maxHeight: '500px',
                overflowY: 'auto',
              }}>
                <TableOfContents
                  html={html}
                  darkMode={darkMode}
                  title="Contents"
                  minLevel={1}
                  maxLevel={3}
                />
              </div>

              {/* 
                ContentBlocksRenderer - Renders HTML with beautiful styles
                
                Key props:
                - html: The HTML content to render
                - darkMode: Enable dark theme
                - enableCodeCopy: Add copy button to code blocks
                - enableHeadingIds: Add IDs to headings for navigation
              */}
              <div style={{
                padding: '1.5rem',
                maxHeight: '500px',
                overflowY: 'auto',
              }}>
                <ContentBlocksRenderer
                  html={html}
                  darkMode={darkMode}
                  enableCodeCopy={true}
                  enableHeadingIds={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage Info */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: darkMode ? '#1e293b' : '#ffffff',
        border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        borderRadius: '0.5rem',
      }}>
        <h3 style={{
          margin: '0 0 1rem',
          fontSize: '1rem',
          color: darkMode ? '#f1f5f9' : '#0f172a'
        }}>
          Quick Start
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
          {`import { ContentBlocksEditor, ContentBlocksRenderer, TableOfContents } from '@content-blocks/editor';

function App() {
  const [html, setHtml] = useState('<p>Hello world</p>');
  
  return (
    <div>
      {/* Editor - for editing content */}
      <ContentBlocksEditor
        initialContent={html}
        onChange={setHtml}
        darkMode={false}
      />
      
      {/* Renderer - for displaying content (read-only) */}
      <ContentBlocksRenderer
        html={html}
        darkMode={false}
      />
      
      {/* TOC - for navigation */}
      <TableOfContents
        html={html}
        darkMode={false}
      />
    </div>
  );
}`}
        </pre>
      </div>
    </div>
  );
};

export default DeveloperExample;
