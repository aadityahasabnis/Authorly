/**
 * Quote Block (Blockquote)
 */

import type { BlockDefinition, QuoteData } from '../core/types';
import { generateId } from '../utils/helpers';

export const quoteBlock: BlockDefinition = {
  name: 'quote',
  tag: 'blockquote',
  editable: true,
  allowedChildren: ['text', 'inline'],
  className: 'cb-quote',
  icon: 'quote',
  label: 'Quote',
  shortcut: 'Ctrl+Shift+.',

  create(data?: QuoteData): HTMLElement {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'cb-quote';
    blockquote.setAttribute('data-block-id', data?.id || generateId());
    blockquote.setAttribute('data-block-type', 'quote');

    // Main content
    const content = document.createElement('p');
    content.className = 'cb-quote-content';
    content.setAttribute('contenteditable', 'true');
    if (data?.content) {
      content.innerHTML = data.content;
    } else {
      content.setAttribute('data-placeholder', 'Type a quote...');
    }
    blockquote.appendChild(content);

    // Citation (optional)
    if (data?.citation) {
      const cite = document.createElement('cite');
      cite.className = 'cb-quote-citation';
      cite.setAttribute('contenteditable', 'true');
      cite.textContent = data.citation;
      blockquote.appendChild(cite);
    }

    return blockquote;
  },

  getData(element: HTMLElement): QuoteData {
    const content = element.querySelector('.cb-quote-content');
    const citation = element.querySelector('.cb-quote-citation');
    
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'quote',
      content: content?.innerHTML || element.innerHTML,
      citation: citation?.textContent || undefined,
    };
  },

  update(element: HTMLElement, data: Partial<QuoteData>): void {
    if (data.content !== undefined) {
      const content = element.querySelector('.cb-quote-content');
      if (content) {
        content.innerHTML = data.content;
      }
    }
    if (data.citation !== undefined) {
      let citation = element.querySelector('.cb-quote-citation');
      if (data.citation) {
        if (!citation) {
          citation = document.createElement('cite');
          citation.className = 'cb-quote-citation';
          citation.setAttribute('contenteditable', 'true');
          element.appendChild(citation);
        }
        citation.textContent = data.citation;
      } else if (citation) {
        citation.remove();
      }
    }
  },
};

/**
 * Add citation to quote
 */
export function addCitation(blockquote: HTMLElement, text: string): void {
  let citation = blockquote.querySelector('.cb-quote-citation');
  if (!citation) {
    citation = document.createElement('cite');
    citation.className = 'cb-quote-citation';
    citation.setAttribute('contenteditable', 'true');
    blockquote.appendChild(citation);
  }
  citation.textContent = text;
}

/**
 * Remove citation from quote
 */
export function removeCitation(blockquote: HTMLElement): void {
  const citation = blockquote.querySelector('.cb-quote-citation');
  if (citation) {
    citation.remove();
  }
}
