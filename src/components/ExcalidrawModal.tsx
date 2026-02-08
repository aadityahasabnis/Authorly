/**
 * ExcalidrawModal Component - Full-screen modal for Excalidraw drawing
 */

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { X, Check } from 'lucide-react';

// Type declarations for Excalidraw - using any for now to avoid import path issues
type ExcalidrawElement = any;
type AppState = any;
type BinaryFiles = any;

interface ExcalidrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageDataUrl: string, elements: readonly ExcalidrawElement[], appState: Partial<AppState>) => void;
  initialElements?: readonly ExcalidrawElement[];
  initialAppState?: Partial<AppState>;
  darkMode?: boolean;
}

export const ExcalidrawModal: React.FC<ExcalidrawModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialElements = [],
  initialAppState = {},
  darkMode = false,
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // MEMORY LEAK FIX (Bug #3): Cleanup Excalidraw API on unmount
  useEffect(() => {
    return () => {
      if (excalidrawAPI) {
        // Clean up API reference
        setExcalidrawAPI(null);
      }
    };
  }, [excalidrawAPI]);

  // Sanitize appState to remove problematic fields that cause errors when re-loading
  const sanitizedAppState = {
    ...initialAppState,
    // Remove fields that Excalidraw doesn't expect or that cause issues
    collaborators: undefined,
    selectedElementIds: undefined,
    hoveredElementIds: undefined,
    // Keep viewport settings
    viewBackgroundColor: initialAppState.viewBackgroundColor || '#ffffff',
    theme: (darkMode ? 'dark' : 'light') as 'dark' | 'light',
  };

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;

    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      // IMPROVED (Bug #2): Validate data size before export
      const elementsStr = JSON.stringify(elements);
      if (elementsStr.length > 1_000_000) {
        console.error('Excalidraw drawing is too large (>1MB). Consider simplifying your drawing.');
        alert('Drawing is too large to save. Please simplify your drawing and try again.');
        setIsSaving(false);
        return;
      }

      // Export to blob
      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: darkMode,
        },
        files,
        getDimensions: () => ({ width: 1200, height: 800 }),
      });

      // Convert blob to data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onSave(dataUrl, elements, appState);
        onClose();
      };
      reader.onerror = () => {
        console.error('Failed to read exported image');
        alert('Failed to save drawing. Please try again.');
        setIsSaving(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to export Excalidraw:', error);
      alert('Failed to save drawing. Please try again.');
      setIsSaving(false);
    }
  }, [excalidrawAPI, onSave, onClose, darkMode]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`cb-excalidraw-modal ${darkMode ? 'cb-dark' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100000,
        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        className="cb-excalidraw-modal-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          backgroundColor: darkMode ? '#111827' : '#f9fafb',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 600,
            color: darkMode ? '#f9fafb' : '#111827',
          }}
        >
          Excalidraw Drawing
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="cb-excalidraw-modal-btn cb-excalidraw-modal-btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            <Check size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="cb-excalidraw-modal-btn"
            onClick={onClose}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: darkMode ? '#f9fafb' : '#374151',
              backgroundColor: darkMode ? '#374151' : '#ffffff',
              border: `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`,
              borderRadius: '0.375rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div
        className="cb-excalidraw-modal-canvas"
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={{
            elements: initialElements,
            appState: sanitizedAppState,
          }}
          theme={darkMode ? 'dark' : 'light'}
        />
      </div>
    </div>,
    document.body
  );
};
