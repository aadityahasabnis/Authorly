import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { TestPage } from './TestPage';
import { NewDeveloperPage } from './NewDeveloperPage';
import { DeveloperExample } from './DeveloperExample';

// Simple hash-based router
const App: React.FC = () => {
  const [page, setPage] = useState<'test' | 'developer' | 'docs'>('test');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'developer') setPage('developer');
      else if (hash === 'docs') setPage('docs');
      else setPage('test');
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigation bar
  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    gap: '0.25rem',
    padding: '0.5rem',
    background: 'rgba(0,0,0,0.8)',
    borderRadius: '0 0 0.5rem 0.5rem',
  };

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    background: isActive ? '#3b82f6' : 'transparent',
    border: 'none',
    borderRadius: '0.25rem',
    color: '#ffffff',
    cursor: 'pointer',
    textDecoration: 'none',
  });

  return (
    <>
      <nav style={navStyle}>
        <a href="#test" style={linkStyle(page === 'test')}>Test Page</a>
        <a href="#developer" style={linkStyle(page === 'developer')}>Simple Example</a>
        <a href="#docs" style={linkStyle(page === 'docs')}>Full Docs</a>
      </nav>
      {page === 'test' && <TestPage />}
      {page === 'developer' && <DeveloperExample />}
      {page === 'docs' && <NewDeveloperPage />}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
