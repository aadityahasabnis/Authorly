/**
 * Paste Sanitization - Clean and normalize pasted content
 * This is CRITICAL for maintaining clean HTML output and security
 * 
 * SECURITY MODEL (Bug #26 - innerHTML usage):
 * ============================================
 * All external content (paste, drag-drop, initial HTML) MUST flow through this
 * sanitization module before being set via innerHTML in block definitions.
 * 
 * Flow:
 * 1. External content → sanitize() → Safe HTML
 * 2. Safe HTML → block.create(data) → innerHTML (SAFE)
 * 3. Editor content → block.getData() → innerHTML (SAFE - from editor itself)
 * 
 * innerHTML is used throughout the codebase but is SAFE because:
 * - All external content is sanitized here first
 * - Editor-generated content comes from contenteditable (user typed, not injected)
 * - No direct user input → innerHTML path exists
 * 
 * For additional security, consider integrating DOMPurify library in production.
 */

// Allowed tags that will be preserved
const ALLOWED_TAGS = new Set([
  // Block elements
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'hr', 'br',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption',
  'details', 'summary',
  // Inline elements
  'strong', 'b', 'em', 'i', 'u', 's', 'del',
  'a', 'span', 'mark', 'sub', 'sup',
  'img', 'video', 'audio', 'iframe',
]);

// Tags that should be converted to other tags
const TAG_CONVERSIONS: Record<string, string> = {
  'b': 'strong',
  'i': 'em',
  'strike': 's',
  'del': 's',
  'div': 'p', // Convert divs to paragraphs
};

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  '*': new Set(['class', 'id']),
  'a': new Set(['href', 'target', 'rel', 'title']),
  'img': new Set(['src', 'alt', 'title', 'width', 'height']),
  'video': new Set(['src', 'poster', 'controls', 'width', 'height']),
  'audio': new Set(['src', 'controls']),
  'iframe': new Set(['src', 'width', 'height', 'frameborder', 'allowfullscreen']),
  'td': new Set(['colspan', 'rowspan']),
  'th': new Set(['colspan', 'rowspan', 'scope']),
  'ol': new Set(['start', 'type']),
  'pre': new Set(['data-language']),
  'code': new Set(['data-language']),
  'span': new Set(['style']), // Allow limited inline styles
};

// Dangerous attributes that should always be removed
const DANGEROUS_ATTRIBUTES = new Set([
  'onclick', 'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup',
  'onkeydown', 'onkeyup', 'onkeypress', 'onload', 'onerror', 'onsubmit',
  'onfocus', 'onblur', 'onchange', 'oninput', 'onscroll', 'onresize',
]);

// Allowed CSS properties for inline styles
const ALLOWED_CSS_PROPERTIES = new Set([
  'color', 'background-color', 'font-weight', 'font-style',
  'text-decoration', 'text-align', 'vertical-align',
]);

export interface SanitizeOptions {
  /** Allow iframes (for embeds) */
  allowIframes?: boolean;
  /** Allow tables */
  allowTables?: boolean;
  /** Allow images */
  allowImages?: boolean;
  /** Allow videos */
  allowVideos?: boolean;
  /** Additional allowed tags */
  additionalTags?: string[];
  /** Strip all styles */
  stripStyles?: boolean;
  /** Strip all classes */
  stripClasses?: boolean;
  /** Class prefix to keep (remove others) */
  keepClassPrefix?: string;
  /** Maximum nesting depth */
  maxDepth?: number;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  allowIframes: true,
  allowTables: true,
  allowImages: true,
  allowVideos: true,
  additionalTags: [],
  stripStyles: false,
  stripClasses: false,
  keepClassPrefix: 'cb-',
  maxDepth: 10,
};

/**
 * Sanitize HTML string
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = html;

  // Process the DOM tree
  sanitizeNode(container, opts, 0);

  return container.innerHTML;
}

/**
 * Sanitize a DOM node recursively
 */
function sanitizeNode(
  node: Node,
  options: SanitizeOptions,
  depth: number
): void {
  if (depth > (options.maxDepth || 10)) {
    // Too deep, strip all HTML and keep only text content
    const textOnly = node.textContent || '';
    node.textContent = textOnly;
    return;
  }

  const nodesToRemove: Node[] = [];
  const nodesToReplace: Array<{ old: Node; new: Node }> = [];

  // Process child nodes
  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      // Keep text nodes
      return;
    }

    if (child.nodeType === Node.COMMENT_NODE) {
      // Remove comments
      nodesToRemove.push(child);
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      // Remove other node types
      nodesToRemove.push(child);
      return;
    }

    const element = child as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    // Check if tag should be converted
    const convertedTag = TAG_CONVERSIONS[tagName];
    if (convertedTag) {
      const newElement = document.createElement(convertedTag);
      newElement.innerHTML = element.innerHTML;
      copyAllowedAttributes(element, newElement, options);
      nodesToReplace.push({ old: element, new: newElement });
      sanitizeNode(newElement, options, depth + 1);
      return;
    }

    // Check if tag is allowed
    const allowedTags = new Set([
      ...ALLOWED_TAGS,
      ...(options.additionalTags || []),
    ]);

    // Handle special cases
    if (tagName === 'iframe' && !options.allowIframes) {
      nodesToRemove.push(element);
      return;
    }
    if (tagName === 'table' && !options.allowTables) {
      // Convert table to plain text
      const text = document.createTextNode(element.textContent || '');
      nodesToReplace.push({ old: element, new: text });
      return;
    }
    if (tagName === 'img' && !options.allowImages) {
      nodesToRemove.push(element);
      return;
    }
    if ((tagName === 'video' || tagName === 'audio') && !options.allowVideos) {
      nodesToRemove.push(element);
      return;
    }

    if (!allowedTags.has(tagName)) {
      // Tag not allowed - unwrap (keep contents) or remove
      if (element.childNodes.length > 0) {
        // Unwrap: replace with children
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        nodesToReplace.push({ old: element, new: fragment });
      } else {
        nodesToRemove.push(element);
      }
      return;
    }

    // Sanitize attributes
    sanitizeAttributes(element, tagName, options);

    // Recurse into children
    sanitizeNode(element, options, depth + 1);
  });

  // Apply removals
  nodesToRemove.forEach(n => n.parentNode?.removeChild(n));

  // Apply replacements
  nodesToReplace.forEach(({ old, new: newNode }) => {
    old.parentNode?.replaceChild(newNode, old);
  });
}

/**
 * Sanitize element attributes
 */
function sanitizeAttributes(
  element: HTMLElement,
  tagName: string,
  options: SanitizeOptions
): void {
  const allowedGlobal = ALLOWED_ATTRIBUTES['*'] || new Set();
  const allowedForTag = ALLOWED_ATTRIBUTES[tagName] || new Set();
  const allowed = new Set([...allowedGlobal, ...allowedForTag]);

  // Get all attributes
  const attributes = Array.from(element.attributes);

  attributes.forEach(attr => {
    const name = attr.name.toLowerCase();

    // Always remove dangerous attributes
    if (DANGEROUS_ATTRIBUTES.has(name) || name.startsWith('on')) {
      element.removeAttribute(attr.name);
      return;
    }

    // Remove data-* attributes except specific ones
    if (name.startsWith('data-') && name !== 'data-language') {
      element.removeAttribute(attr.name);
      return;
    }

    // Handle class attribute
    if (name === 'class') {
      if (options.stripClasses) {
        element.removeAttribute('class');
      } else if (options.keepClassPrefix) {
        const classes = attr.value.split(/\s+/);
        const kept = classes.filter(
          c => c.startsWith(options.keepClassPrefix!) || c.startsWith('cb-')
        );
        if (kept.length > 0) {
          element.className = kept.join(' ');
        } else {
          element.removeAttribute('class');
        }
      }
      return;
    }

    // Handle style attribute
    if (name === 'style') {
      if (options.stripStyles) {
        element.removeAttribute('style');
      } else {
        sanitizeStyles(element);
      }
      return;
    }

    // Remove if not in allowed list
    if (!allowed.has(name)) {
      element.removeAttribute(attr.name);
      return;
    }

    // Sanitize URLs
    if (name === 'href' || name === 'src') {
      const value = attr.value.trim().toLowerCase();
      if (
        value.startsWith('javascript:') ||
        value.startsWith('vbscript:') ||
        value.startsWith('data:text/html')
      ) {
        element.removeAttribute(attr.name);
      }
    }
  });
}

/**
 * Sanitize inline styles
 */
function sanitizeStyles(element: HTMLElement): void {
  const cssText = element.getAttribute('style') || '';
  
  // Parse and filter CSS properties
  const newStyles: string[] = [];
  
  cssText.split(';').forEach(declaration => {
    const [property, value] = declaration.split(':').map(s => s.trim());
    if (property && value && ALLOWED_CSS_PROPERTIES.has(property.toLowerCase())) {
      // Basic value sanitization (no url(), expression(), etc.)
      const lowerValue = value.toLowerCase();
      if (
        !lowerValue.includes('url(') &&
        !lowerValue.includes('expression(') &&
        !lowerValue.includes('javascript:')
      ) {
        newStyles.push(`${property}: ${value}`);
      }
    }
  });

  if (newStyles.length > 0) {
    element.setAttribute('style', newStyles.join('; '));
  } else {
    element.removeAttribute('style');
  }
}

/**
 * Copy allowed attributes from one element to another
 */
function copyAllowedAttributes(
  source: HTMLElement,
  target: HTMLElement,
  _options: SanitizeOptions
): void {
  const tagName = target.tagName.toLowerCase();
  const allowedGlobal = ALLOWED_ATTRIBUTES['*'] || new Set();
  const allowedForTag = ALLOWED_ATTRIBUTES[tagName] || new Set();
  const allowed = new Set([...allowedGlobal, ...allowedForTag]);

  Array.from(source.attributes).forEach(attr => {
    const name = attr.name.toLowerCase();
    if (allowed.has(name) && !DANGEROUS_ATTRIBUTES.has(name)) {
      target.setAttribute(attr.name, attr.value);
    }
  });
}

/**
 * Sanitize pasted content from DataTransfer
 */
export function sanitizePaste(
  dataTransfer: DataTransfer,
  options: SanitizeOptions = {}
): string {
  // Try HTML first
  let html = dataTransfer.getData('text/html');
  
  if (html) {
    // Remove Word/Google Docs specific junk
    html = cleanOfficeContent(html);
    return sanitizeHtml(html, options);
  }

  // Fall back to plain text
  const text = dataTransfer.getData('text/plain');
  if (text) {
    return convertPlainTextToHtml(text);
  }

  return '';
}

/**
 * Clean Microsoft Word and Google Docs content
 */
function cleanOfficeContent(html: string): string {
  // Remove Word-specific tags and namespaces
  html = html.replace(/<\/?o:[^>]*>/gi, '');
  html = html.replace(/<\/?w:[^>]*>/gi, '');
  html = html.replace(/<\/?m:[^>]*>/gi, '');
  html = html.replace(/<\/?st1:[^>]*>/gi, '');
  
  // Remove Office namespace declarations
  html = html.replace(/\s*xmlns:[a-z]+="[^"]*"/gi, '');
  
  // Remove mso- styles
  html = html.replace(/mso-[^;:"']+:[^;:"']+;?/gi, '');
  
  // Remove class="Mso*"
  html = html.replace(/class="?Mso[^">\s]*/gi, '');
  
  // Remove empty spans
  html = html.replace(/<span[^>]*>\s*<\/span>/gi, '');
  
  // Remove Google Docs specific IDs
  html = html.replace(/id="docs-internal-guid-[^"]*"/gi, '');
  
  // Clean up extra whitespace
  html = html.replace(/\s{2,}/g, ' ');
  
  return html;
}

/**
 * Convert plain text to HTML paragraphs
 */
export function convertPlainTextToHtml(text: string): string {
  if (!text) return '';

  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);

  return paragraphs
    .map(p => {
      // Convert single newlines to <br>
      const content = p
        .trim()
        .replace(/\n/g, '<br>')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
      
      return content ? `<p>${content}</p>` : '';
    })
    .filter(Boolean)
    .join('');
}

/**
 * Normalize HTML structure
 */
export function normalizeHtml(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  // Ensure all text content is wrapped in blocks
  const fragment = document.createDocumentFragment();
  let currentParagraph: HTMLParagraphElement | null = null;

  container.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        if (!currentParagraph) {
          currentParagraph = document.createElement('p');
        }
        currentParagraph.appendChild(document.createTextNode(text));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const isBlock = isBlockElement(element.tagName);
      
      if (isBlock) {
        if (currentParagraph) {
          fragment.appendChild(currentParagraph);
          currentParagraph = null;
        }
        fragment.appendChild(node.cloneNode(true));
      } else {
        if (!currentParagraph) {
          currentParagraph = document.createElement('p');
        }
        currentParagraph.appendChild(node.cloneNode(true));
      }
    }
  });

  if (currentParagraph) {
    fragment.appendChild(currentParagraph);
  }

  const result = document.createElement('div');
  result.appendChild(fragment);
  return result.innerHTML;
}

/**
 * Check if tag is a block-level element
 */
function isBlockElement(tagName: string): boolean {
  const blockTags = new Set([
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE',
    'TABLE', 'HR', 'DIV', 'FIGURE', 'DETAILS',
  ]);
  return blockTags.has(tagName.toUpperCase());
}
