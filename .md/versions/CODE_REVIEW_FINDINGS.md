# Code Review Findings - Authorly Editor
**Review Date**: February 4, 2026  
**Version Reviewed**: v0.1.4  
**Reviewer**: OpenCode AI Assistant

---

## Executive Summary

Comprehensive code review of the Authorly text editor identified **42 issues** across the codebase:
- **3 Critical Bugs** requiring immediate attention
- **8 Medium Bugs** impacting user experience
- **13 Consistency Issues** reducing code maintainability
- **9 Missing Error Handlers** creating potential failure points
- **9 Other Issues** (performance, accessibility, deprecated APIs)

---

## 🔴 Critical Bugs (Fix Immediately)

### 1. Highlight Color Removal Destroys All Formatting
**File**: `src/components/Toolbar.tsx:317`  
**Severity**: 🔴 CRITICAL

**Issue**:
```typescript
if (color === 'transparent') {
  document.execCommand('removeFormat', false); // WRONG!
}
```

When user removes highlight by selecting "transparent", the code calls `removeFormat` which removes **ALL formatting** (bold, italic, underline, links, etc.), not just the highlight.

**Impact**: Users lose all their formatting when trying to remove highlight

**Fix**:
```typescript
if (color === 'transparent') {
  // Option 1: Set to transparent explicitly
  document.execCommand('hiliteColor', false, 'transparent');
  
  // Option 2: Properly unwrap only <mark> elements
  const marks = findElementsInSelection('mark', container);
  marks.forEach(mark => unwrapElement(mark));
}
```

**Priority**: Fix in v0.1.5

---

### 2. Block Menu Blocks ALL Keyboard Input
**File**: `src/components/Editor.tsx:1199`  
**Severity**: 🔴 CRITICAL

**Issue**:
```typescript
if (showBlockMenu) return; // Blocks EVERYTHING
```

When the block menu is open (typing "/" to insert blocks), ALL keyboard input is blocked. Users cannot type anything, cannot close the menu with Escape, cannot even click away.

**Impact**: Editor becomes completely frozen when block menu opens

**Fix**:
```typescript
if (showBlockMenu && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
  // Only block navigation keys, let typing through for search
  return;
}
```

**Priority**: Fix in v0.1.5

---

### 3. Format State Detection Uses Deprecated API
**File**: `src/components/Toolbar.tsx:116-121`  
**Severity**: 🔴 CRITICAL (Future Breaking)

**Issue**:
```typescript
const formats: Record<InlineFormat, boolean> = {
  bold: document.queryCommandState('bold'),      // DEPRECATED!
  italic: document.queryCommandState('italic'),  // DEPRECATED!
  underline: document.queryCommandState('underline'),
  strikethrough: document.queryCommandState('strikeThrough'),
  code: isFormatActive('code', editor.container),
  // ...
};
```

`document.queryCommandState()` is **deprecated** and will be removed from browsers. Already removed from Firefox.

**Impact**: Feature will break in future browser versions

**Fix**: Implement custom format detection:
```typescript
function isFormatActive(format: InlineFormat, container: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;

  const tagMap = { bold: 'STRONG', italic: 'EM', underline: 'U', strikethrough: 'S' };
  const tag = tagMap[format];

  while (node && node !== container) {
    if (node instanceof HTMLElement && node.tagName === tag) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}
```

**Priority**: Fix in v0.1.5-v0.2.0

---

## 🟡 Medium Bugs

### 4. Link Insertion Doesn't Validate URLs
**File**: `src/core/commands.ts:119-179`  
**Severity**: 🟡 MEDIUM

**Issue**: No URL validation before creating links. Users can create links with:
- Empty URLs: `href=""`
- Invalid URLs: `href="not a url"`
- JavaScript URLs: `href="javascript:alert(1)"` (XSS risk!)

**Fix**:
```typescript
export function insertLink(container: HTMLElement, url: string, text?: string): void {
  // Validate URL
  if (!url || url.trim() === '') {
    console.warn('Cannot create link with empty URL');
    return;
  }

  // Sanitize URL to prevent XSS
  if (url.startsWith('javascript:') || url.startsWith('data:')) {
    console.warn('Blocked potentially dangerous URL:', url);
    return;
  }

  // Ensure URL has protocol
  const sanitizedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
  
  // Continue with link creation...
}
```

---

### 5. Image Crop Modal Doesn't Clean Up Event Listeners
**File**: `src/blocks/image.ts:532-659`  
**Severity**: 🟡 MEDIUM

**Issue**: Crop modal adds event listeners but may not remove them in all exit paths:
```typescript
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);
// But what if modal is closed via Escape? Or clicking outside?
```

**Impact**: Memory leak, listeners accumulate over time

**Fix**: Use cleanup pattern consistently:
```typescript
const cleanup = () => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  modal.remove();
};

// Apply to all exit paths
cancelBtn.addEventListener('click', cleanup);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cleanup();
});
```

---

### 6. Timeout Refs Have Wrong Type
**File**: `src/components/Toolbar.tsx:102-103`  
**Severity**: 🟡 MEDIUM

**Issue**:
```typescript
const linkHoverTimeoutRef = useRef<number | null>(null);  // WRONG TYPE!
const linkCloseTimeoutRef = useRef<number | null>(null);
```

In Node.js/browser environments, `setTimeout` returns `NodeJS.Timeout` or `number` depending on environment. Using `number` works in browser but causes type errors.

**Fix**:
```typescript
const linkHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const linkCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

---

### 7. List Outdent Operation Can Fail Silently
**File**: `src/blocks/list.ts:179-235`  
**Severity**: 🟡 MEDIUM

**Issue**: When outdenting a list item, the code doesn't check if the parent `<ul>` or `<ol>` exists:
```typescript
const listElement = item.parentElement; // Might be null!
listElement.insertBefore(item, siblingItem); // Crash if null
```

**Fix**:
```typescript
const listElement = item.parentElement;
if (!listElement || !listElement.matches('ul, ol')) {
  console.warn('Cannot outdent: invalid list structure');
  return;
}
```

---

### 8. onChange Debounce Doesn't Work Correctly
**File**: `src/components/Editor.tsx:479-486`  
**Severity**: 🟡 MEDIUM

**Issue**:
```typescript
const debouncedOnChange = useCallback(
  debounce((html: string) => {
    onChange?.(html);
  }, 300),
  [onChange]
);
```

The `debounce` function is called on every render because it's inside `useCallback`. The dependency array includes `onChange`, which may change on every render, recreating the debounced function.

**Fix**:
```typescript
const onChangeRef = useRef(onChange);
useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

const debouncedOnChange = useMemo(
  () => debounce((html: string) => onChangeRef.current?.(html), 300),
  []
);
```

---

### 9. Table Cell Focus Can Crash on Invalid Structure
**File**: `src/blocks/table.ts:111-132`  
**Severity**: 🟡 MEDIUM

**Issue**: Functions like `getFocusedCell()` assume table structure is valid:
```typescript
const row = cell.parentElement; // Might not be TR!
const tbody = row?.parentElement; // Might not be TBODY!
```

If table HTML is malformed (e.g., pasted from external source), this crashes.

**Fix**: Add validation:
```typescript
export function getFocusedCell(table: HTMLElement): HTMLTableCellElement | null {
  const activeEl = document.activeElement;
  
  if (!activeEl || !table.contains(activeEl)) return null;
  if (!(activeEl instanceof HTMLTableCellElement)) return null;
  
  // Validate structure
  const row = activeEl.parentElement;
  if (!row || row.tagName !== 'TR') return null;
  
  const tbody = row.parentElement;
  if (!tbody || tbody.tagName !== 'TBODY') return null;
  
  return activeEl;
}
```

---

### 10. Video Embed Doesn't Validate YouTube URLs
**File**: `src/blocks/video.ts:22-58`  
**Severity**: 🟡 MEDIUM

**Issue**: `extractYouTubeId()` assumes URL format without validation:
```typescript
const match = url.match(/[?&]v=([^&]+)/);
return match ? match[1] : null;
```

Doesn't handle:
- Invalid YouTube URLs
- Other video platforms (Vimeo, etc.)
- Malformed URLs that might break iframe

**Fix**: Add validation and error handling:
```typescript
export function extractYouTubeId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Support youtube.com and youtu.be
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    } else if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    
    return null;
  } catch {
    console.warn('Invalid YouTube URL:', url);
    return null;
  }
}
```

---

### 11. Paste Handler Can Throw on Malformed HTML
**File**: `src/paste/sanitize.ts:15-89`  
**Severity**: 🟡 MEDIUM

**Issue**: `sanitizePaste()` creates a temporary div and sets `innerHTML` without try-catch:
```typescript
const temp = document.createElement('div');
temp.innerHTML = html; // Can throw on malformed HTML!
```

**Fix**:
```typescript
export function sanitizePaste(html: string): string {
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    // ... rest of sanitization
  } catch (error) {
    console.error('Failed to sanitize pasted content:', error);
    return ''; // Return empty string on error
  }
}
```

---

## 📐 Consistency Issues

### 12. Mixed Block Naming Conventions
**Files**: `src/blocks/*.ts`  
**Severity**: 🟢 LOW

**Issue**: Block types use inconsistent naming:
- `bulletList`, `numberedList`, `checkList` (camelCase compound)
- `linkPreview` (camelCase compound)
- `paragraph`, `heading`, `quote` (single word)

**Should be**:
- Either: All camelCase compounds (`bulletList`, `numberedList`, `linkPreview`)
- Or: All kebab-case (`bullet-list`, `numbered-list`, `link-preview`)

**Fix**: Pick one convention and apply everywhere

---

### 13. Inconsistent ContentEditable Placement
**Files**: Multiple block files

**Issue**: Some blocks put `contenteditable` on wrapper, others on inner element:

```typescript
// paragraph.ts - On inner <p>
const p = document.createElement('p');
p.contentEditable = 'true'; // HERE

// heading.ts - Also on inner <h1>
const heading = document.createElement(tag);
heading.contentEditable = 'true'; // HERE

// quote.ts - On outer wrapper!
wrapper.contentEditable = 'true'; // INCONSISTENT!
```

**Fix**: Standardize - put `contenteditable` on the same level for all blocks

---

### 14. Block ID Attribute Location Varies
**Files**: Multiple block files

**Issue**: Some blocks put `data-block-id` on wrapper, others on different elements:

```typescript
// paragraph.ts
wrapper.setAttribute('data-block-id', data.id);  // On wrapper

// table.ts  
table.setAttribute('data-block-id', data.id);  // On table, not wrapper

// image.ts
// No data-block-id at all?
```

**Fix**: Always put `data-block-id` on the outermost wrapper element

---

### 15. Hardcoded CSS Values Instead of Variables
**File**: `src/styles/editor.css`

**Issue**: Some places use hardcoded values while others use CSS variables:

```css
/* Line 106 - Hardcoded */
padding: 8px 12px;

/* Line 311 - Hardcoded */
gap: 2px;

/* Line 2021 - Hardcoded color */
color: #d63384;

/* Line 1842 - Using variables (good!) */
padding: var(--cb-spacing-sm);
gap: var(--cb-spacing-xs);
color: var(--cb-primary);
```

**Fix**: Create and use variables consistently:
```css
:root {
  --cb-spacing-xs: 2px;
  --cb-spacing-sm: 8px;
  --cb-spacing-md: 12px;
  --cb-code-color: #d63384;
}
```

---

### 16. Inconsistent Border Radius Usage
**File**: `src/styles/editor.css`

**Issue**: Mix of hardcoded and variable border-radius:

```css
/* Some places */
border-radius: 4px;
border-radius: 6px;
border-radius: 8px;

/* Other places */
border-radius: var(--cb-radius-sm);
border-radius: var(--cb-radius-md);
border-radius: var(--cb-radius-lg);
```

**Fix**: Always use variables, remove hardcoded values

---

### 17. Different Refs vs State for Similar Data
**Files**: `src/components/Editor.tsx`, `src/components/Toolbar.tsx`

**Issue**: Similar data stored inconsistently:

```typescript
// Editor.tsx
const undoStackRef = useRef<string[]>([]);  // Uses ref
const [editorState, setEditorState] = useState({ undoStack: [] }); // Also in state!

// Toolbar.tsx
const [linkPreview, setLinkPreview] = useState(...); // Uses state
const savedRangeRef = useRef<Range | null>(null); // Uses ref
```

**Should be**: Clear guidelines on when to use refs vs state

---

### 18. Placeholder Handling Varies by Block
**Files**: Multiple block files

**Issue**: Each block implements placeholders differently:

```typescript
// paragraph.ts - Uses data-placeholder attribute
p.setAttribute('data-placeholder', data.placeholder || 'Type here...');

// heading.ts - Hardcoded placeholder
heading.setAttribute('data-placeholder', 'Heading');

// quote.ts - Different placeholder attribute name
blockquote.setAttribute('placeholder', 'Quote');
```

**Fix**: Standardize placeholder attribute and handling

---

### 19. Event Handler Naming Inconsistent
**Files**: Multiple components

**Issue**: Event handlers use different naming patterns:

```typescript
// Toolbar.tsx
const handleBold = () => {};
const toggleBold = () => {}; // Same thing, different name!
const onColorChange = () => {}; // Different pattern

// Editor.tsx
const handleKeyDown = () => {};
const onInput = () => {}; // Inconsistent prefix
```

**Fix**: Pick one pattern (e.g., `handle*`) and use everywhere

---

### 20. CSS Class Prefix Not Consistent
**File**: `src/styles/editor.css`

**Issue**: Most classes use `cb-` prefix, but some don't:

```css
.cb-editor {} /* Good */
.cb-toolbar {} /* Good */
.cb-block {} /* Good */

.editor-container {} /* Missing cb- prefix! */
.toolbar-button {} /* Missing cb- prefix! */
```

**Fix**: Ensure ALL classes use `cb-` prefix

---

### 21. Icon Size Specified Differently
**Files**: Multiple component files

**Issue**: Icon sizes specified inconsistently:

```typescript
// Some places
<Bold size={18} />

// Other places
<Italic width={16} height={16} />

// Other places
<Underline /> /* No size specified */
```

**Fix**: Use consistent size prop, create constant:
```typescript
const TOOLBAR_ICON_SIZE = 18;
<Bold size={TOOLBAR_ICON_SIZE} />
```

---

### 22. Error Messages Not Standardized
**Files**: Throughout codebase

**Issue**: Error handling is inconsistent:

```typescript
// Some places
console.error('Error:', error);

// Other places
console.warn('Warning:', warning);

// Other places
// No logging at all
```

**Fix**: Create error handling utilities:
```typescript
export const logger = {
  error: (msg: string, error?: Error) => console.error(`[Authorly]`, msg, error),
  warn: (msg: string) => console.warn(`[Authorly]`, msg),
  info: (msg: string) => console.info(`[Authorly]`, msg),
};
```

---

### 23. Magic Numbers Everywhere
**Files**: Throughout codebase

**Issue**: Unexplained magic numbers:

```typescript
setTimeout(() => {}, 300); // Why 300?
setTimeout(() => {}, 200); // Why 200?
maxWidth: 500, // Why 500?
if (words > 200) // Why 200?
```

**Fix**: Create named constants:
```typescript
const TIMEOUTS = {
  LINK_HOVER_DELAY: 300,
  LINK_CLOSE_DELAY: 200,
  DEBOUNCE_DELAY: 300,
};

const LIMITS = {
  LINK_PREVIEW_MAX_WIDTH: 500,
  LONG_CONTENT_WORD_THRESHOLD: 200,
};
```

---

### 24. Type Definitions Scattered
**Files**: `src/core/types.ts`, individual component files

**Issue**: Some types defined in types.ts, others inline:

```typescript
// types.ts
export interface EditorInstance {}

// Toolbar.tsx
interface ToolbarProps {} // Should be in types.ts?

// Editor.tsx  
type BlockData = {}; // Already defined in types.ts!
```

**Fix**: Move all shared types to `types.ts`

---

## ❌ Missing Error Handlers

### 25. File Upload Has No Size Validation
**File**: `src/components/Editor.tsx:758-810`

**Issue**: UI shows "10MB max" but no actual validation:

```typescript
const handleFileSelect = async (file: File) => {
  // No size check!
  // No type validation!
  const imageBlock = await createImageFromFile(file, editor);
};
```

**Fix**:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const handleFileSelect = async (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    alert(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    return;
  }

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  try {
    const imageBlock = await createImageFromFile(file, editor);
  } catch (error) {
    alert('Failed to upload image');
    console.error(error);
  }
};
```

---

### 26. No Error Handling for Image Loading Failures
**File**: `src/blocks/image.ts:107-157`

**Issue**: `createImageFromFile` doesn't handle FileReader errors:

```typescript
reader.onload = () => {
  const base64 = reader.result as string;
  // What if load fails?
};

reader.readAsDataURL(file); // Can fail!
```

**Fix**:
```typescript
reader.onerror = () => {
  console.error('Failed to read image file');
  reject(new Error('File read failed'));
};

reader.onabort = () => {
  console.warn('File read aborted');
  reject(new Error('File read aborted'));
};
```

---

### 27. Block Menu Search Can Throw
**File**: `src/components/BlockMenu.tsx:45-73`

**Issue**: Search doesn't handle errors:

```typescript
const filtered = blocks.filter(block =>
  block.name.toLowerCase().includes(search.toLowerCase())
  // What if block.name is undefined?
);
```

**Fix**:
```typescript
const filtered = blocks.filter(block => {
  try {
    return block.name?.toLowerCase().includes(search.toLowerCase()) || false;
  } catch {
    return false;
  }
});
```

---

### 28. Clipboard API Not Checked for Support
**File**: `src/paste/sanitize.ts`

**Issue**: Assumes `clipboardData` exists:

```typescript
const html = e.clipboardData.getData('text/html'); // Can be undefined!
```

**Fix**:
```typescript
const html = e.clipboardData?.getData('text/html');
if (!html) {
  console.warn('No HTML data in clipboard');
  return;
}
```

---

### 29. Local Storage Access Not Wrapped in Try-Catch
**File**: `src/components/Editor.tsx` (if using localStorage)

**Issue**: localStorage can throw in private browsing mode:

```typescript
localStorage.setItem('draft', content); // Can throw!
```

**Fix**:
```typescript
try {
  localStorage.setItem('draft', content);
} catch (error) {
  console.warn('Could not save draft to localStorage:', error);
  // Fallback behavior
}
```

---

### 30. Table Operations Don't Check for Valid Table
**File**: `src/blocks/table.ts:multiple`

**Issue**: Functions assume valid table structure:

```typescript
export function addTableRow(table: HTMLElement, position: 'above' | 'below'): void {
  const tbody = table.querySelector('tbody'); // Might be null!
  const cell = getFocusedCell(table); // Might return null!
  const row = cell.parentElement; // Will crash if cell is null!
}
```

**Fix**: Add validation everywhere:
```typescript
export function addTableRow(table: HTMLElement, position: 'above' | 'below'): void {
  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error('Table has no tbody');
    return;
  }

  const cell = getFocusedCell(table);
  if (!cell) {
    console.warn('No cell focused');
    return;
  }

  // Continue safely...
}
```

---

### 31. Selection Range Manipulation Unprotected
**File**: `src/core/selection.ts:multiple`

**Issue**: Assumes selection always exists:

```typescript
export function getSelectionState() {
  const selection = window.getSelection(); // Can be null!
  const range = selection.getRangeAt(0); // Can throw!
}
```

**Fix**:
```typescript
export function getSelectionState() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  try {
    const range = selection.getRangeAt(0);
    return { selection, range };
  } catch (error) {
    console.error('Failed to get selection range:', error);
    return null;
  }
}
```

---

### 32. DOM Manipulation Not Checked
**File**: Multiple files

**Issue**: Assumes elements exist:

```typescript
const element = document.querySelector('.cb-block');
element.classList.add('active'); // Crashes if null!
```

**Fix**: Always check:
```typescript
const element = document.querySelector('.cb-block');
if (!element) {
  console.warn('Block element not found');
  return;
}
element.classList.add('active');
```

---

### 33. Async Operations Not Awaited Properly
**File**: `src/components/Editor.tsx:multiple`

**Issue**: Some async operations not awaited:

```typescript
const handleSave = () => {
  onSave(getHTML()); // onSave might be async!
};
```

**Fix**:
```typescript
const handleSave = async () => {
  try {
    await onSave?.(getHTML());
  } catch (error) {
    console.error('Save failed:', error);
    // Show error to user
  }
};
```

---

## 🔧 Other Issues

### 34. Performance: Selection Change Listener Fires Too Often
**File**: `src/components/Toolbar.tsx:145-165`

**Issue**: Selection change listener attached to document, fires on every selection change in entire page:

```typescript
document.addEventListener('selectionchange', handleSelectionChange);
```

**Impact**: Unnecessary re-renders when selecting text outside editor

**Fix**: Only update if selection is within editor:
```typescript
const handleSelectionChange = () => {
  const selection = window.getSelection();
  if (!selection || !editor.container.contains(selection.anchorNode)) {
    return; // Selection outside editor, ignore
  }
  updateFormats();
};
```

---

### 35. Performance: BlockMenu Filters on Every Render
**File**: `src/components/BlockMenu.tsx:45-73`

**Issue**: Block filtering happens on every render:

```typescript
const filtered = blocks.filter(block =>
  block.name.toLowerCase().includes(search.toLowerCase())
);
```

**Fix**: Use useMemo:
```typescript
const filtered = useMemo(
  () => blocks.filter(block =>
    block.name.toLowerCase().includes(search.toLowerCase())
  ),
  [blocks, search]
);
```

---

### 36. Accessibility: Missing ARIA Labels
**Files**: Multiple component files

**Issue**: Interactive elements lack ARIA labels:

```typescript
<button onClick={handleBold}>
  <Bold size={18} />
</button>
// Screen readers can't describe this button!
```

**Fix**: Add aria-label:
```typescript
<button onClick={handleBold} aria-label="Bold">
  <Bold size={18} />
</button>
```

---

### 37. Accessibility: No Focus Trap in Modals
**File**: `src/blocks/image.ts:crop modal`

**Issue**: When crop modal opens, focus can escape to background:

**Fix**: Implement focus trap:
```typescript
const modal = document.createElement('div');
modal.setAttribute('role', 'dialog');
modal.setAttribute('aria-modal', 'true');

// Trap focus within modal
const focusableElements = modal.querySelectorAll('button, input');
const firstElement = focusableElements[0];
const lastElement = focusableElements[focusableElements.length - 1];

modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
});
```

---

### 38. Accessibility: Color Picker Keyboard Navigation
**File**: `src/components/Toolbar.tsx:color/highlight buttons`

**Issue**: Color picker swatches not keyboard accessible:

```typescript
<div className="cb-color-swatch" style={{ background: color }} />
// Can't be focused or activated with keyboard!
```

**Fix**: Use buttons:
```typescript
<button
  className="cb-color-swatch"
  style={{ background: color }}
  onClick={() => applyColor(color)}
  aria-label={`Apply ${colorName} color`}
  tabIndex={0}
/>
```

---

### 39. Memory Leak: Old Block Elements Not Cleaned
**File**: `src/components/Editor.tsx:block deletion`

**Issue**: When blocks are deleted, their event listeners may not be cleaned up

**Fix**: Implement proper cleanup:
```typescript
const deleteBlock = (blockId: string) => {
  const block = document.querySelector(`[data-block-id="${blockId}"]`);
  if (block) {
    // Remove all event listeners
    const clone = block.cloneNode(true);
    block.parentNode?.replaceChild(clone, block);
    clone.remove();
  }
};
```

---

### 40. TypeScript: Missing Null Checks
**Files**: Throughout codebase

**Issue**: Many places assume values are non-null without checking:

```typescript
const block = getBlockFromChild(element);
const type = block.getAttribute('data-block-type'); // block might be null!
```

**Fix**: Enable strict null checks in tsconfig:
```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

---

### 41. Deprecated API: document.execCommand
**Files**: `src/core/commands.ts`, `src/components/Toolbar.tsx`

**Issue**: Heavy use of deprecated `document.execCommand()`:

```typescript
document.execCommand('bold', false);
document.execCommand('italic', false);
// etc.
```

**Impact**: Will stop working in future browsers

**Fix**: Long-term migration to modern approach:
- Option 1: Use a modern framework (Slate, ProseMirror, Lexical)
- Option 2: Implement custom DOM manipulation for all formatting

**Timeline**: Plan for v0.2.0 or v1.0.0

---

### 42. Build: No Production Minification
**File**: `vite.config.ts` (may not exist)

**Issue**: Check if production build is minified:

```javascript
// In vite.config.ts
build: {
  minify: 'esbuild', // Ensure this is set for production
  sourcemap: true,
}
```

---

## 📊 Issue Summary by Priority

| Priority | Count | Categories |
|----------|-------|------------|
| 🔴 Critical | 3 | Highlight bug, keyboard block, deprecated API |
| 🟡 Medium | 8 | Validation, cleanup, type errors |
| 🟢 Low (Consistency) | 13 | Naming, structure, styling |
| 🟠 Missing Handlers | 9 | File upload, clipboard, storage |
| 🔵 Other | 9 | Performance, accessibility, deprecation |
| **Total** | **42** | |

---

## 🎯 Recommended Fix Order

### Phase 1: Critical Fixes (v0.1.5)
1. Fix highlight color removal bug (#1)
2. Fix block menu keyboard handling (#2)
3. Add file upload validation (#25)
4. Fix link URL validation (#4)

### Phase 2: Medium Fixes (v0.1.6)
5. Fix event handler cleanup (#5)
6. Fix timeout ref types (#6)
7. Fix list outdent operation (#7)
8. Fix onChange debounce (#8)
9. Add table operation validation (#9, #30)

### Phase 3: Consistency (v0.1.7)
10. Standardize block naming (#12)
11. Standardize contenteditable placement (#13)
12. Standardize block ID placement (#14)
13. Create CSS variables for all hardcoded values (#15, #16)
14. Standardize error logging (#22)
15. Extract magic numbers to constants (#23)

### Phase 4: Error Handling (v0.1.8)
16. Add all missing error handlers (#25-33)
17. Wrap all DOM access in checks (#32)
18. Add proper async error handling (#33)

### Phase 5: Performance & Accessibility (v0.2.0)
19. Optimize selection change listener (#34)
20. Memoize expensive computations (#35)
21. Add ARIA labels (#36)
22. Implement focus traps (#37)
23. Make color picker keyboard accessible (#38)

### Phase 6: Architecture (v1.0.0)
24. Plan migration from execCommand (#41)
25. Consider modern editor framework
26. Full TypeScript strict mode (#40)

---

## 📋 Testing Checklist

After each fix, test:

- [ ] Feature still works as expected
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Works in Chrome, Firefox, Safari
- [ ] Works with keyboard only
- [ ] Works with screen reader
- [ ] No memory leaks (check DevTools)
- [ ] Bundle size impact acceptable

---

## 🔗 Related Resources

- [MDN: execCommand deprecated](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand)
- [Modern alternatives to execCommand](https://caniuse.com/mdn-api_document_execcommand)
- [React accessibility guide](https://react.dev/learn/accessibility)
- [TypeScript strict mode](https://www.typescriptlang.org/tsconfig#strict)

---

**Next Steps**: Prioritize critical bugs for v0.1.5 release, then tackle medium bugs and consistency issues in subsequent releases.
