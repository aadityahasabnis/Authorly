# Block Types Reference

Authorly supports 15 block types for rich content creation.

---

## Text Blocks

### Paragraph
**Tag**: `<p>`  
**Shortcut**: None (default block)  
**Features**:
- Basic text content
- Inline formatting (bold, italic, underline, etc.)
- Links and inline code

**Usage**:
```
Just start typing
```

---

### Headings (H1-H6)
**Tags**: `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`  
**Shortcuts**: 
- `/h1` or `/heading1` → Heading 1
- `/h2` or `/heading2` → Heading 2
- `/h3` or `/heading3` → Heading 3
- `/h4` → Heading 4
- `/h5` → Heading 5
- `/h6` → Heading 6

**Keyboard Shortcuts**:
- `Ctrl/Cmd + 1/2/3` → Convert to H1/H2/H3

**Features**:
- Document structure
- Table of contents generation
- Automatic heading IDs for linking

---

### Quote
**Tag**: `<blockquote>`  
**Shortcut**: `/quote`

**Features**:
- Stylized quotation blocks
- Attribution support
- Nested formatting

---

## List Blocks

### Bullet List
**Tag**: `<ul><li>`  
**Shortcut**: `/bulletlist` or `/ul`

**Features**:
- Unordered lists
- Nested lists (Tab to indent, Shift+Tab to outdent)
- Drag to reorder items

---

### Numbered List
**Tag**: `<ol><li>`  
**Shortcut**: `/numberedlist` or `/ol`

**Features**:
- Ordered lists with automatic numbering
- Nested numbered lists
- Drag to reorder items

---

### Checklist
**Tag**: `<ul><li>` with `<input type="checkbox">`  
**Shortcut**: `/checklist` or `/todo`

**Features**:
- Interactive checkboxes
- Strike-through for completed items
- Persistent state in HTML

---

## Code Blocks

### Code Block
**Tag**: `<pre><code>`  
**Shortcut**: `/code`

**Features**:
- Syntax highlighting (optional)
- Copy button (in renderer)
- Monospace font
- Preserves formatting

**Security**: Uses `textContent` (not `innerHTML`) to prevent XSS

---

### Inline Code
**Tag**: `<code>`  
**Shortcut**: `Ctrl/Cmd + E` or `` ` `` (backtick)

**Features**:
- Inline code snippets
- Monospace font
- Distinct styling

---

## Media Blocks

### Image
**Tag**: `<figure><img><figcaption>`  
**Shortcut**: `/image`

**Features**:
- Cloud upload (Cloudinary, S3)
- Base64 fallback
- Alt text editor
- Caption support
- Image cropping
- Drag and drop
- Responsive images (srcset, sizes)
- Width/height attributes

**Upload Options**:
- Cloudinary (auto-optimization)
- AWS S3 (with backend)
- Custom upload handler
- Base64 (no config needed)

---

### Video
**Tag**: `<figure><iframe>` or `<video>`  
**Shortcut**: `/video`

**Supported Sources**:
- YouTube (embed)
- Vimeo (embed)
- Direct MP4/WebM

**Features**:
- URL validation (prevents XSS)
- Only allows `http:` and `https:` protocols
- Responsive embeds
- Caption support

**Security**: Strict URL protocol validation

---

## Structure Blocks

### Table
**Tag**: `<table><thead><tbody><tr><td>`  
**Shortcut**: `/table`

**Features**:
- Create tables with rows and columns
- Add/delete rows (above/below)
- Add/delete columns (left/right)
- Tab to navigate cells
- Cell formatting

**Operations**:
- Add row: Click + button
- Add column: Click + button
- Delete row/column: Right-click menu
- Navigate: Tab (next), Shift+Tab (previous)

**Validation**: All operations validate row/column indices

---

### Divider
**Tag**: `<hr>`  
**Shortcut**: `/divider` or `/hr`

**Features**:
- Visual section separator
- Customizable styling

---

## Enhanced Blocks

### Callout
**Tag**: `<aside>`  
**Shortcut**: `/callout`

**Types**:
- Info (blue)
- Warning (yellow)
- Error (red)
- Success (green)

**Features**:
- Icon indicator
- Colored background
- Custom message

---

### Accordion
**Tag**: `<details><summary>`  
**Shortcut**: `/accordion`

**Features**:
- Collapsible content
- Custom summary text
- Native HTML (no JavaScript)
- Accessible

---

### Date
**Tag**: `<time>`  
**Shortcut**: `/date`

**Features**:
- Date picker
- Formats: MM/DD/YYYY
- Semantic `datetime` attribute

---

### Link Preview
**Tag**: `<a>` with metadata  
**Shortcut**: `/linkpreview`

**Features**:
- URL preview card
- OpenGraph metadata fetching
- Title, description, image
- Clickable preview

---

### Excalidraw
**Tag**: `<figure>` with SVG/PNG  
**Shortcut**: `/excalidraw` or `/drawing`

**Features**:
- Embedded drawing canvas
- Hand-drawn style
- Diagrams and sketches
- Export as SVG/PNG

**Requires**: `@excalidraw/excalidraw` peer dependency

---

## Block Operations

### Common Features

**All blocks support**:
- Drag and drop to reorder
- Block menu (type `/`)
- Delete with backspace (empty blocks)
- Arrow keys to navigate
- Unique block IDs

**Inline Formatting** (text blocks):
- Bold (`Ctrl/Cmd + B`)
- Italic (`Ctrl/Cmd + I`)
- Underline (`Ctrl/Cmd + U`)
- Strikethrough
- Inline code
- Links
- Text color
- Highlight color

---

## Block Registry

Blocks are registered in `src/blocks/index.ts` and can be extended with custom blocks using the `blockRegistry` API.

**Example: Custom Block**
```typescript
import { blockRegistry } from 'authorly-editor';

blockRegistry.register({
  name: 'custom',
  tag: 'div',
  label: 'Custom Block',
  icon: 'box',
  create: (data) => {
    const el = document.createElement('div');
    el.className = 'custom-block';
    return el;
  },
  // ... other methods
});
```

---

## HTML Output

All blocks produce **clean, semantic HTML**:
- No editor classes (`cb-*`)
- No data attributes (optional)
- Standards-compliant markup
- SEO-friendly structure

**Example Output**:
```html
<h1>My Article</h1>
<p>A paragraph with <strong>bold</strong> text.</p>
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>
<figure>
  <img 
    src="https://cdn.example.com/image.jpg" 
    alt="Description"
    width="1200"
    height="800"
    sizes="(max-width: 768px) 100vw, 1200px"
  />
  <figcaption>Image caption</figcaption>
</figure>
```

---

## Security

All blocks implement security best practices:
- **Code blocks**: Use `textContent` (not `innerHTML`)
- **Video blocks**: Validate URL protocols
- **Image blocks**: File type validation
- **Table blocks**: Index validation
- **List blocks**: Preserve structure integrity

No XSS vulnerabilities in any block implementation.
