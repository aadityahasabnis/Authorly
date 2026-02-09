# Authorly Architecture

## Overview

Authorly is a **contentEditable-based rich text editor** for React, focused on producing clean, semantic HTML for blogs and publishing.

**Philosophy**: Output-first design. Every feature prioritizes clean HTML output over editor convenience.

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
├─────────────────────────────────────────────────────────┤
│  AuthorlyEditor  │  AuthorlyRenderer  │  AuthorlyTOC   │
└────────┬──────────┴──────────┬─────────┴────────┬───────┘
         │                     │                   │
    ┌────▼────┐          ┌─────▼─────┐      ┌─────▼──────┐
    │ Editor  │          │ Renderer  │      │    TOC     │
    │  Core   │          │   (Read   │      │ Generator  │
    │         │          │    Only)  │      │            │
    └────┬────┘          └───────────┘      └────────────┘
         │
    ┌────▼────────────────────────────────┐
    │        Block System                 │
    ├─────────────────────────────────────┤
    │  • Block Registry                   │
    │  • 15 Block Types                   │
    │  • Block Operations                 │
    │  • Drag & Drop                      │
    └────┬────────────────────────────────┘
         │
    ┌────▼─────────────────────────────────────────┐
    │            Services Layer                    │
    ├──────────────────────────────────────────────┤
    │  Upload   │  Selection  │  Commands  │  etc.│
    └───────────┴─────────────┴────────────┴───────┘
         │
    ┌────▼────────────────────────┐
    │      DOM Manipulation       │
    │    (contentEditable)        │
    └─────────────────────────────┘
```

---

## Component Structure

### 1. **AuthorlyEditor** (Main)
**Location**: `src/components/Editor.tsx` (~3800 lines)

**Responsibilities**:
- Render contentEditable container
- Manage editor state (blocks, selection, history)
- Handle keyboard events
- Coordinate all subsystems

**Key Features**:
- Block creation and deletion
- Undo/redo with cursor restoration
- Drag and drop
- Auto-save
- Paste handling

---

### 2. **AuthorlyRenderer** (Display)
**Location**: `src/components/Renderer.tsx`

**Responsibilities**:
- Display saved HTML content
- No editing capabilities
- Optimized for reading

**Features**:
- Code copy buttons
- Heading IDs for TOC
- Checklist styles
- Dark mode support

---

### 3. **Toolbar**
**Location**: `src/components/Toolbar.tsx`

**Responsibilities**:
- Formatting controls (bold, italic, etc.)
- Color pickers (text, highlight)
- Link management
- Alignment controls

**Features**:
- Format state detection
- Link hover preview cards
- Saved selection restoration

---

### 4. **Block Menu**
**Location**: `src/components/BlockMenu.tsx`

**Responsibilities**:
- Show available block types
- Filter by search
- Insert selected block

**Trigger**: Type `/` in editor

---

## Block System

### Block Registry
**Location**: `src/blocks/index.ts`

**Purpose**: Central registry of all block types

**Structure**:
```typescript
interface BlockDefinition {
  name: string;              // Unique identifier
  tag: string;               // HTML tag
  label: string;             // Display name
  icon: string;              // Lucide icon name
  editable: boolean;         // Is contentEditable?
  allowedChildren: string[]; // Allowed child blocks
  create: (data) => HTMLElement;
  getData: (el) => BlockData;
  update: (el, data) => void;
}
```

### Block Files
Each block type has its own file:
- `src/blocks/paragraph.ts`
- `src/blocks/heading.ts`
- `src/blocks/list.ts`
- `src/blocks/table.ts`
- `src/blocks/image.ts`
- ... and 10 more

**Pattern**:
```typescript
export const paragraphBlock: BlockDefinition = {
  name: 'paragraph',
  tag: 'p',
  create: (data) => {
    const p = document.createElement('p');
    p.contentEditable = 'true';
    p.innerHTML = data.content || '';
    return p;
  },
  getData: (el) => ({
    type: 'paragraph',
    content: el.innerHTML,
  }),
  update: (el, data) => {
    el.innerHTML = data.content;
  },
};
```

---

## Services

### 1. **Upload Service**
**Location**: `src/services/uploadService.ts`

**Purpose**: Centralized image upload handling

**Providers**:
- **Cloudinary**: Direct client-side upload
- **AWS S3**: Presigned URL upload (requires backend)
- **Custom**: User-defined upload function
- **Base64**: Fallback (no config)

**Flow**:
```
User selects image
    ↓
uploadService.upload(file)
    ↓
Provider-specific upload
    ↓
Return UploadResult { url, width, height, publicId }
    ↓
Insert image block with cloud URL
```

---

### 2. **Selection Service**
**Location**: `src/core/selection.ts`

**Purpose**: Manage text selection and cursor

**Key Functions**:
- `getSelectionState()`: Get current selection
- `saveSelection()`: Save before popup opens
- `restoreSelection()`: Restore after popup closes
- `isFormatActive()`: Check if format is applied

---

### 3. **Commands**
**Location**: `src/core/commands.ts`

**Purpose**: Text formatting operations

**Functions**:
- `toggleBold()`, `toggleItalic()`, etc.
- `insertLink()`, `removeLink()`
- `setTextColor()`, `setHighlightColor()`
- `setAlignment()`
- `clearFormatting()`

**Implementation**: Currently uses `document.execCommand()` (deprecated but functional)

---

## State Management

### Editor State
```typescript
{
  blocks: BlockData[],       // Array of block objects
  undoStack: string[],       // HTML snapshots for undo
  redoStack: string[],       // HTML snapshots for redo
  selectedBlockId: string,   // Currently selected block
  focusedBlockId: string,    // Currently focused block
}
```

### History Management
**Location**: `src/components/Editor.tsx`

**Strategy**:
- Save HTML snapshots (not incremental changes)
- Debounced saves (300ms) for typing
- Immediate saves for structural changes
- 50ms throttle to prevent duplicates
- Cursor position saved with each snapshot
- Max 50 undo/redo entries

**Undo/Redo Flow**:
```
User types → debounced save → push to undoStack
User presses Ctrl+Z → pop from undoStack → restore HTML → push to redoStack
```

---

## Data Flow

### Input (Editing)
```
User types
    ↓
contentEditable fires 'input' event
    ↓
handleInput() in Editor.tsx
    ↓
Save to history (debounced)
    ↓
Call onChange(html)
```

### Output (Saving)
```
User presses Ctrl+S (or calls getHTML())
    ↓
editor.getHTML({ stripEditorUI: true })
    ↓
Remove all .cb-* classes
    ↓
Remove data-* attributes
    ↓
Optimize images (q_auto, srcset)
    ↓
Return clean HTML
```

---

## Build System

### Bundler: Vite
**Config**: `vite.config.ts`

**Output Formats**:
- **ESM**: `dist/index.esm.js` (316 KB)
- **CJS**: `dist/index.cjs.js` (224 KB)
- **CSS**: `dist/style.css` (317 KB)
- **Types**: `dist/**/*.d.ts`

**Optimizations**:
- Target: ES2020
- Minify: esbuild
- Source maps: disabled in production
- CSS minified
- Tree-shakeable (`sideEffects: ["*.css"]`)

---

## Styling

### CSS Architecture
**File**: `src/styles/editor.css` (~2700 lines)

**Prefix**: All classes use `cb-` prefix (ContentBlocks legacy)

**Structure**:
```css
/* 1. CSS Variables */
:root {
  --cb-primary: #3b82f6;
  --cb-spacing-sm: 0.5rem;
  /* ... */
}

/* 2. Editor Container */
.cb-editor { ... }

/* 3. Block Styles */
.cb-block { ... }

/* 4. Toolbar */
.cb-toolbar { ... }

/* 5. Block-Specific */
.cb-table { ... }
.cb-image { ... }

/* 6. Dark Mode */
.cb-editor[data-dark-mode="true"] { ... }
```

### Dark Mode
Controlled by `data-dark-mode` attribute on `.cb-editor`

---

## Performance

### Optimizations
- **Debouncing**: onChange, history saves
- **Memoization**: Upload service, heavy computations
- **Refs**: Non-reactive data (history stacks, timeouts)
- **Event Delegation**: Single event listener for all blocks
- **Lazy Loading**: Excalidraw loaded on demand

### Bundle Size
- **Minified**: 934 KB
- **Gzipped**: 255 KB
- **Tree-shakeable**: Yes

---

## Security

### XSS Prevention
- **Code blocks**: Use `textContent` (not `innerHTML`)
- **Video URLs**: Validate protocol (only http/https)
- **Image uploads**: File type validation
- **Links**: URL sanitization (future improvement)

### Content Security
- No `eval()` or `Function()` constructors
- No inline styles in HTML output
- Safe DOM manipulation throughout

---

## Browser Compatibility

**Supported**:
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

**Requirements**:
- `contentEditable` support
- ES2020 JavaScript
- CSS Grid & Flexbox
- `document.execCommand()` (deprecated but still works)

---

## Dependencies

### Runtime (Peer Dependencies)
- `react` (>=17.0.0)
- `react-dom` (>=17.0.0)
- `lucide-react` (icons)
- `@excalidraw/excalidraw` (optional, for drawing)

### Zero Runtime Dependencies
All other code is self-contained.

---

## Extension Points

### 1. Custom Blocks
```typescript
import { blockRegistry } from 'authorly-editor';

blockRegistry.register({
  name: 'myblock',
  // ... implementation
});
```

### 2. Custom Upload
```typescript
<AuthorlyEditor
  imageUploadConfig={{
    provider: 'custom',
    customUpload: async (file) => {
      // Your upload logic
      return { url, width, height };
    },
  }}
/>
```

### 3. Custom Styling
Override CSS variables:
```css
.cb-editor {
  --cb-primary: #ff0000;
  --cb-font-family: 'Custom Font';
}
```

---

## Future Architecture Considerations

### Planned Improvements
1. **Replace execCommand**: Modern Selection API
2. **Add Tests**: Unit and integration tests
3. **Performance**: Virtual scrolling for large documents
4. **Accessibility**: Better ARIA support
5. **Collaboration**: Operational Transform or CRDT

### Migration Path
Current contentEditable approach works but is dated. Future versions may adopt:
- **ProseMirror**: Powerful but complex
- **Slate**: Flexible but requires more code
- **Lexical**: Modern but newer ecosystem

---

## Summary

**Strengths**:
- ✅ Clean HTML output
- ✅ 15 diverse block types
- ✅ Simple mental model
- ✅ Good bundle size
- ✅ Type-safe (TypeScript)

**Trade-offs**:
- ⚠️ Uses deprecated execCommand
- ⚠️ contentEditable quirks
- ⚠️ No collaborative editing
- ⚠️ Limited undo granularity

**Best For**:
- Blog editors
- Documentation sites
- Publishing platforms
- Single-user content creation

**Not Ideal For**:
- Real-time collaboration (Google Docs style)
- Complex nested structures
- Performance-critical apps (1000+ blocks)
