/**
 * Code Block (Pre/Code for multi-line code)
 */

import type { BlockDefinition, CodeData } from '../core/types';
import { generateId } from '../utils/helpers';

// Common programming languages for syntax highlighting
export const LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
  { value: 'dockerfile', label: 'Dockerfile' },
] as const;

export const codeBlock: BlockDefinition = {
  name: 'code',
  tag: 'pre',
  editable: true,
  allowedChildren: ['text'],
  className: 'cb-code-block',
  icon: 'code',
  label: 'Code Block',
  shortcut: 'Ctrl+Shift+C',

  create(data?: CodeData): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cb-code-wrapper';
    wrapper.setAttribute('data-block-id', data?.id || generateId());
    wrapper.setAttribute('data-block-type', 'code');

    // Language selector bar
    const toolbar = document.createElement('div');
    toolbar.className = 'cb-code-toolbar';

    const langSelect = document.createElement('select');
    langSelect.className = 'cb-code-language';
    langSelect.setAttribute('tabindex', '-1');
    
    LANGUAGES.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.value;
      option.textContent = lang.label;
      if (data?.language === lang.value) {
        option.selected = true;
      }
      langSelect.appendChild(option);
    });

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'cb-code-copy';
    copyBtn.setAttribute('tabindex', '-1');
    copyBtn.innerHTML = '<span class="cb-copy-text">Copy</span>';
    copyBtn.onclick = () => {
      const code = wrapper.querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.textContent || '');
        copyBtn.innerHTML = '<span class="cb-copy-text">Copied!</span>';
        setTimeout(() => {
          copyBtn.innerHTML = '<span class="cb-copy-text">Copy</span>';
        }, 2000);
      }
    };

    toolbar.appendChild(langSelect);
    toolbar.appendChild(copyBtn);

    // Code container
    const pre = document.createElement('pre');
    pre.className = 'cb-code-block';

    const code = document.createElement('code');
    code.className = `cb-code language-${data?.language || 'plaintext'}`;
    code.setAttribute('contenteditable', 'true');
    code.setAttribute('spellcheck', 'false');
    code.setAttribute('data-placeholder', 'Write your code here...');
    
    if (data?.content) {
      code.textContent = data.content;
    }

    // Update language class when selector changes
    langSelect.onchange = () => {
      code.className = `cb-code language-${langSelect.value}`;
      wrapper.setAttribute('data-language', langSelect.value);
    };

    pre.appendChild(code);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(pre);

    if (data?.language) {
      wrapper.setAttribute('data-language', data.language);
    }

    // CRITICAL FIX: Ensure code element gets focus when clicking anywhere in code block
    // This ensures proper cursor placement when clicking on wrapper/pre elements
    const ensureCodeFocus = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't interfere if clicking on toolbar elements (language selector, copy button)
      if (target.closest('.cb-code-toolbar')) {
        return;
      }
      
      // If clicking on code element itself, let browser handle it naturally
      if (target === code || target.closest('.cb-code') === code) {
        return; // Do nothing - let contenteditable work normally
      }
      
      // If clicking on wrapper or pre (not the code itself), focus the code element
      if (target === wrapper || target === pre || target.classList.contains('cb-code-block')) {
        // Don't prevent default - just ensure focus
        setTimeout(() => {
          code.focus();
          
          // Place cursor at the end
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            if (code.textContent) {
              range.selectNodeContents(code);
              range.collapse(false); // Collapse to end
            } else {
              range.setStart(code, 0);
              range.setEnd(code, 0);
            }
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }, 0);
      }
    };
    
    wrapper.addEventListener('click', ensureCodeFocus);
    pre.addEventListener('click', ensureCodeFocus);

    return wrapper;
  },

  getData(element: HTMLElement): CodeData {
    const code = element.querySelector('code');
    const langSelect = element.querySelector('.cb-code-language') as HTMLSelectElement;
    
    return {
      id: element.getAttribute('data-block-id') || generateId(),
      type: 'code',
      content: code?.textContent || '',
      language: langSelect?.value || element.getAttribute('data-language') || 'plaintext',
    };
  },

  update(element: HTMLElement, data: Partial<CodeData>): void {
    if (data.content !== undefined) {
      const code = element.querySelector('code');
      if (code) {
        code.textContent = data.content;
      }
    }
    if (data.language) {
      const code = element.querySelector('code');
      const langSelect = element.querySelector('.cb-code-language') as HTMLSelectElement;
      if (code) {
        code.className = `cb-code language-${data.language}`;
      }
      if (langSelect) {
        langSelect.value = data.language;
      }
      element.setAttribute('data-language', data.language);
    }
  },
};

/**
 * Set language for code block
 */
export function setLanguage(codeWrapper: HTMLElement, language: string): void {
  const code = codeWrapper.querySelector('code');
  const langSelect = codeWrapper.querySelector('.cb-code-language') as HTMLSelectElement;
  
  if (code) {
    code.className = `cb-code language-${language}`;
  }
  if (langSelect) {
    langSelect.value = language;
  }
  codeWrapper.setAttribute('data-language', language);
}

/**
 * Get code content
 */
export function getCode(codeWrapper: HTMLElement): string {
  const code = codeWrapper.querySelector('code');
  return code?.textContent || '';
}
