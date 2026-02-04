/**
 * Link Preview Block - Rich embed for pasted URLs
 */

import type { BlockDefinition } from '../core/types';
import { generateId } from '../utils/helpers';
import { ExternalLink, Loader } from 'lucide-react';
import type { LinkPreviewData } from '../utils/opengraph';
import { fetchLinkPreview, extractDomain, getFaviconUrl } from '../utils/opengraph';

export interface LinkPreviewBlockData {
  id: string;
  type: 'linkPreview';
  url: string;
  preview?: LinkPreviewData;
  loading?: boolean;
}

/**
 * Create link preview block element
 */
function createLinkPreviewElement(data: Partial<LinkPreviewBlockData>): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cb-link-preview';
  container.setAttribute('data-url', data.url || '');
  container.contentEditable = 'false';

  if (data.loading) {
    // Loading state
    container.innerHTML = `
      <div class="cb-link-preview-loading">
        <div class="cb-link-preview-spinner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
        </div>
        <span>Loading preview...</span>
      </div>
    `;
  } else if (data.preview) {
    // Preview loaded
    const preview = data.preview;
    const domain = extractDomain(data.url || '');
    const faviconUrl = getFaviconUrl(data.url || '');

    container.innerHTML = `
      <a href="${preview.url}" target="_blank" rel="noopener noreferrer" class="cb-link-preview-card">
        ${preview.image ? `
          <div class="cb-link-preview-image">
            <img src="${preview.image}" alt="${preview.title || 'Preview'}" loading="lazy" />
          </div>
        ` : ''}
        <div class="cb-link-preview-content">
          <div class="cb-link-preview-header">
            ${faviconUrl ? `<img src="${faviconUrl}" alt="" class="cb-link-preview-favicon" />` : ''}
            <span class="cb-link-preview-domain">${domain}</span>
          </div>
          ${preview.title ? `
            <h3 class="cb-link-preview-title">${preview.title}</h3>
          ` : ''}
          ${preview.description ? `
            <p class="cb-link-preview-description">${preview.description}</p>
          ` : ''}
          <div class="cb-link-preview-footer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" x2="21" y1="14" y2="3"/>
            </svg>
            <span>${preview.url}</span>
          </div>
        </div>
      </a>
      <div class="cb-link-preview-actions">
        <button type="button" class="cb-link-preview-action" data-action="edit" title="Edit URL">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button type="button" class="cb-link-preview-action cb-link-preview-action-remove" data-action="remove" title="Remove preview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  } else {
    // Error or no preview available
    container.innerHTML = `
      <div class="cb-link-preview-simple">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <div class="cb-link-preview-simple-content">
          <a href="${data.url}" target="_blank" rel="noopener noreferrer" class="cb-link-preview-simple-url">
            ${data.url}
          </a>
          <span class="cb-link-preview-simple-domain">${extractDomain(data.url || '')}</span>
        </div>
      </div>
    `;
  }

  return container;
}

/**
 * Link Preview Block Definition
 */
export const linkPreviewBlock: BlockDefinition = {
  name: 'linkPreview',
  tag: 'div',
  editable: false,
  allowedChildren: [],
  className: 'cb-link-preview',
  label: 'Link Preview',
  icon: 'link',

  create: (data?: Partial<LinkPreviewBlockData>) => {
    const blockData: Partial<LinkPreviewBlockData> = {
      id: data?.id || generateId(),
      type: 'linkPreview',
      url: data?.url || '',
      loading: true,
    };

    const element = createLinkPreviewElement(blockData);

    // Fetch preview asynchronously
    if (blockData.url) {
      fetchLinkPreview(blockData.url).then(preview => {
        if (preview) {
          blockData.preview = preview;
          blockData.loading = false;
          const updated = createLinkPreviewElement(blockData);
          element.innerHTML = updated.innerHTML;
        } else {
          blockData.loading = false;
          const updated = createLinkPreviewElement(blockData);
          element.innerHTML = updated.innerHTML;
        }
      });
    }

    return element;
  },

  getData: (element: HTMLElement) => {
    return {
      url: element.getAttribute('data-url') || '',
    };
  },

  update: (element: HTMLElement, data: Partial<LinkPreviewBlockData>) => {
    if (data.url) {
      element.setAttribute('data-url', data.url);
      const updated = createLinkPreviewElement({ ...data, loading: true });
      element.innerHTML = updated.innerHTML;

      // Fetch new preview
      fetchLinkPreview(data.url).then(preview => {
        if (preview) {
          const final = createLinkPreviewElement({ ...data, preview, loading: false });
          element.innerHTML = final.innerHTML;
        }
      });
    }
  },
};
