/**
 * Excalidraw Block - Interactive drawing block that opens Excalidraw editor
 */

import type { BlockDefinition } from '../core/types';
import { generateId } from '../utils/helpers';

// Type declarations for Excalidraw - using any for now to avoid import path issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = any;

interface ExcalidrawData {
  id?: string;
  imageDataUrl?: string;
  elements?: readonly ExcalidrawElement[];
  appState?: Partial<AppState>;
}

export const excalidrawBlock: BlockDefinition = {
  name: 'excalidraw',
  tag: 'div',
  editable: false,
  allowedChildren: [],
  className: 'cb-excalidraw',
  icon: 'pen-tool',
  label: 'Excalidraw',

  create(data?: ExcalidrawData): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cb-excalidraw';
    container.setAttribute('data-block-id', data?.id || generateId());
    container.setAttribute('data-block-type', 'excalidraw');

    if (data?.imageDataUrl) {
      // CRITICAL FIX (Bug #2): Store Excalidraw data with size limits and error handling
      if (data.elements) {
        try {
          const elementsStr = JSON.stringify(data.elements);
          // Check size limit (1MB) to prevent browser attribute size limits
          if (elementsStr.length > 1_000_000) {
            console.error('Excalidraw elements data too large (>1MB). Data may not be saved correctly.');
            // Store a warning in the attribute
            container.setAttribute('data-excalidraw-error', 'Data too large');
          } else {
            container.setAttribute('data-excalidraw-elements', elementsStr);
          }
        } catch (error) {
          console.error('Failed to serialize Excalidraw elements:', error);
          container.setAttribute('data-excalidraw-error', 'Serialization failed');
        }
      }
      if (data.appState) {
        try {
          const appStateStr = JSON.stringify(data.appState);
          // Check size limit (500KB for appState)
          if (appStateStr.length > 500_000) {
            console.error('Excalidraw appState data too large (>500KB).');
          } else {
            container.setAttribute('data-excalidraw-appstate', appStateStr);
          }
        } catch (error) {
          console.error('Failed to serialize Excalidraw appState:', error);
        }
      }

      // Create image preview
      const wrapper = document.createElement('div');
      wrapper.className = 'cb-excalidraw-wrapper';

      const img = document.createElement('img');
      img.className = 'cb-excalidraw-image';
      img.src = data.imageDataUrl;
      img.alt = 'Excalidraw drawing';

      // Edit button overlay
      const editButton = document.createElement('button');
      editButton.className = 'cb-excalidraw-edit-btn';
      editButton.type = 'button';
      editButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Edit Drawing</span>
      `;
      editButton.title = 'Edit Excalidraw drawing';

      wrapper.appendChild(img);
      wrapper.appendChild(editButton);
      container.appendChild(wrapper);
    } else {
      // Placeholder - prompt to create drawing
      const placeholder = document.createElement('div');
      placeholder.className = 'cb-excalidraw-placeholder';
      placeholder.innerHTML = `
        <div class="cb-excalidraw-placeholder-content">
          <div class="cb-excalidraw-placeholder-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
          </div>
          <div class="cb-excalidraw-placeholder-text">
            <span class="cb-excalidraw-placeholder-title">Click to create a drawing</span>
            <span class="cb-excalidraw-placeholder-hint">Use Excalidraw to create diagrams, sketches, and illustrations</span>
          </div>
        </div>
      `;
      container.appendChild(placeholder);
    }

    return container;
  },

  getData(element: HTMLElement): ExcalidrawData {
    const id = element.getAttribute('data-block-id') || undefined;
    const img = element.querySelector('.cb-excalidraw-image') as HTMLImageElement;
    const imageDataUrl = img?.src || undefined;
    
    let elements: readonly ExcalidrawElement[] | undefined;
    let appState: Partial<AppState> | undefined;

    // IMPROVED (Bug #6): Better error handling with user feedback
    try {
      const elementsStr = element.getAttribute('data-excalidraw-elements');
      if (elementsStr) {
        elements = JSON.parse(elementsStr);
      }
    } catch (e) {
      console.error('Failed to parse Excalidraw elements:', e);
      // Check if there's a stored error
      const errorMsg = element.getAttribute('data-excalidraw-error');
      if (errorMsg) {
        console.error('Stored error:', errorMsg);
      }
    }

    try {
      const appStateStr = element.getAttribute('data-excalidraw-appstate');
      if (appStateStr) {
        appState = JSON.parse(appStateStr);
      }
    } catch (e) {
      console.error('Failed to parse Excalidraw appState:', e);
    }

    return {
      id,
      imageDataUrl,
      elements,
      appState,
    };
  },

  update(element: HTMLElement, data: ExcalidrawData): void {
    if (data.imageDataUrl) {
      // Update or create image
      let wrapper = element.querySelector('.cb-excalidraw-wrapper') as HTMLElement;
      
      if (!wrapper) {
        // Remove placeholder
        const placeholder = element.querySelector('.cb-excalidraw-placeholder');
        if (placeholder) {
          placeholder.remove();
        }

        // Create wrapper and image
        wrapper = document.createElement('div');
        wrapper.className = 'cb-excalidraw-wrapper';

        const img = document.createElement('img');
        img.className = 'cb-excalidraw-image';
        img.src = data.imageDataUrl;
        img.alt = 'Excalidraw drawing';

        const editButton = document.createElement('button');
        editButton.className = 'cb-excalidraw-edit-btn';
        editButton.type = 'button';
        editButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Edit Drawing</span>
        `;
        editButton.title = 'Edit Excalidraw drawing';

        wrapper.appendChild(img);
        wrapper.appendChild(editButton);
        element.appendChild(wrapper);
      } else {
        // Update existing image
        const img = wrapper.querySelector('.cb-excalidraw-image') as HTMLImageElement;
        if (img) {
          img.src = data.imageDataUrl;
        }
      }

      // CRITICAL FIX (Bug #2): Store Excalidraw data with size limits and error handling
      if (data.elements) {
        try {
          const elementsStr = JSON.stringify(data.elements);
          if (elementsStr.length > 1_000_000) {
            console.error('Excalidraw elements data too large (>1MB). Data may not be saved correctly.');
            element.setAttribute('data-excalidraw-error', 'Data too large');
          } else {
            element.setAttribute('data-excalidraw-elements', elementsStr);
            // Clear any previous error
            element.removeAttribute('data-excalidraw-error');
          }
        } catch (error) {
          console.error('Failed to serialize Excalidraw elements:', error);
          element.setAttribute('data-excalidraw-error', 'Serialization failed');
        }
      }
      if (data.appState) {
        try {
          const appStateStr = JSON.stringify(data.appState);
          if (appStateStr.length > 500_000) {
            console.error('Excalidraw appState data too large (>500KB).');
          } else {
            element.setAttribute('data-excalidraw-appstate', appStateStr);
          }
        } catch (error) {
          console.error('Failed to serialize Excalidraw appState:', error);
        }
      }
    }
  },
};
