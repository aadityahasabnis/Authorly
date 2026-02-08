/**
 * Utility Functions for Content Blocks Editor
 */

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `cb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const debounced = function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
  
  debounced.cancel = function () {
    clearTimeout(timeoutId);
  };
  
  return debounced as ((...args: Parameters<T>) => void) & { cancel: () => void };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if element is a block element
 */
export function isBlockElement(element: Element): boolean {
  return element.hasAttribute('data-block-id');
}

/**
 * Get the block element from a child element
 */
export function getBlockFromChild(element: Node | null): HTMLElement | null {
  if (!element) return null;
  
  let current: Node | null = element;
  while (current) {
    if (current instanceof HTMLElement && current.hasAttribute('data-block-id')) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

/**
 * Get all text content from an element
 */
export function getTextContent(element: HTMLElement): string {
  return element.textContent || '';
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}

/**
 * Count characters in text
 */
export function countCharacters(text: string, includeSpaces = true): number {
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

/**
 * Check if selection is collapsed (cursor with no selection)
 */
export function isSelectionCollapsed(): boolean {
  const selection = window.getSelection();
  return selection ? selection.isCollapsed : true;
}

/**
 * Get current selection range
 */
export function getSelectionRange(): Range | null {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.getRangeAt(0);
  }
  return null;
}

/**
 * Set selection range
 */
export function setSelectionRange(range: Range): void {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Save current selection
 */
export function saveSelection(): Range | null {
  return getSelectionRange()?.cloneRange() || null;
}

/**
 * Restore selection from saved range
 */
export function restoreSelection(range: Range | null): void {
  if (range) {
    setSelectionRange(range);
  }
}

/**
 * Place cursor at end of element
 */
export function placeCursorAtEnd(element: HTMLElement): void {
  const range = document.createRange();
  const selection = window.getSelection();
  
  range.selectNodeContents(element);
  range.collapse(false);
  
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Place cursor at start of element
 */
export function placeCursorAtStart(element: HTMLElement): void {
  const range = document.createRange();
  const selection = window.getSelection();
  
  range.selectNodeContents(element);
  range.collapse(true);
  
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Check if element is empty (only whitespace)
 */
export function isElementEmpty(element: HTMLElement): boolean {
  const text = element.textContent || '';
  return text.trim().length === 0 && !element.querySelector('img, video, iframe');
}

/**
 * Strip HTML tags and get clean text
 */
export function stripHtml(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

/**
 * Generate URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

/**
 * Generate unique heading ID with collision prevention
 */
const headingIdCounts: Map<string, number> = new Map();

export function generateHeadingId(text: string): string {
  const baseSlug = slugify(stripHtml(text));
  
  if (!baseSlug) {
    // If slug is empty, use a default
    return 'heading';
  }
  
  // Check if we've used this slug before
  const count = headingIdCounts.get(baseSlug) || 0;
  headingIdCounts.set(baseSlug, count + 1);
  
  // If this is the first occurrence, use the base slug
  // Otherwise, append a number
  return count === 0 ? baseSlug : `${baseSlug}-${count}`;
}

/**
 * Reset heading ID counter (useful when loading new content)
 */
export function resetHeadingIds(): void {
  headingIdCounts.clear();
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Parse HTML string to element
 */
export function parseHtml(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Serialize element to HTML string
 */
export function serializeElement(element: HTMLElement): string {
  return element.outerHTML;
}

/**
 * Get element index among siblings
 */
export function getElementIndex(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return -1;
  return Array.from(parent.children).indexOf(element);
}

/**
 * Insert element after reference element
 */
export function insertAfter(newElement: HTMLElement, referenceElement: HTMLElement): void {
  const parent = referenceElement.parentElement;
  if (parent) {
    parent.insertBefore(newElement, referenceElement.nextSibling);
  }
}

/**
 * Insert element before reference element
 */
export function insertBefore(newElement: HTMLElement, referenceElement: HTMLElement): void {
  const parent = referenceElement.parentElement;
  if (parent) {
    parent.insertBefore(newElement, referenceElement);
  }
}

/**
 * Swap two elements
 */
export function swapElements(el1: HTMLElement, el2: HTMLElement): void {
  const parent1 = el1.parentNode;
  const sibling1 = el1.nextSibling === el2 ? el1 : el1.nextSibling;
  
  el2.parentNode?.insertBefore(el1, el2);
  parent1?.insertBefore(el2, sibling1);
}

/**
 * Check if key combo matches
 */
export function matchesKeyCombo(event: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop();
  
  const modifiers = {
    ctrl: parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  };
  
  const ctrlOrCmd = event.ctrlKey || event.metaKey;
  
  return (
    event.key.toLowerCase() === key &&
    ctrlOrCmd === modifiers.ctrl &&
    event.shiftKey === modifiers.shift &&
    event.altKey === modifiers.alt
  );
}

/**
 * Create element with attributes
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
  }
  
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    }
  }
  
  return element;
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if device is touch enabled
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get computed style value
 */
export function getComputedStyleValue(
  element: HTMLElement,
  property: string
): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * RequestAnimationFrame wrapper
 */
export function nextFrame(callback: () => void): number {
  return requestAnimationFrame(callback);
}

/**
 * Cancel animation frame
 */
export function cancelFrame(id: number): void {
  cancelAnimationFrame(id);
}

/**
 * Local storage helpers
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable
    }
  },
};

/**
 * Simple event emitter
 */
export class EventEmitter<T extends Record<string, unknown>> {
  private listeners: Map<keyof T, Set<(data: unknown) => void>> = new Map();

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (data: unknown) => void);
    
    return () => this.off(event, callback);
  }

  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    this.listeners.get(event)?.delete(callback as (data: unknown) => void);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
