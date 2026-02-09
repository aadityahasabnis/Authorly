<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/pen-line.svg" width="64" height="64" alt="Authorly" />
</p>

<h1 align="center">Authorly — Rich Text Editor for Blogs & Publishing</h1>

<p align="center">
  <strong>A rich text editor for authors, blogs, and documentation</strong><br>
  Clean, publish-ready HTML output. Zero bloat.
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#components">Components</a> •
  <a href="#api-reference">API</a> •
  <a href="#examples">Examples</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-17%2B-61dafb?style=flat-square&logo=react" alt="React 17+" />
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <a href="https://bundlephobia.com/package/authorly-editor"><img src="https://img.shields.io/bundlephobia/min/authorly-editor?style=flat-square&label=size" alt="Bundle Size" /></a>
  <a href="https://bundlephobia.com/package/authorly-editor"><img src="https://img.shields.io/bundlephobia/minzip/authorly-editor?style=flat-square&label=gzipped" alt="Gzipped Size" /></a>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## Why Authorly?

| Feature | Authorly | Other Editors |
|---------|----------|---------------|
| **Output** | Pure semantic HTML | JSON AST / Custom format |
| **Dependencies** | React + Lucide icons | Heavy frameworks |
| **Bundle size** | 256KB gzipped | 600KB+ |
| **Learning curve** | Minutes | Hours/Days |
| **Database storage** | Just HTML string | Complex serialization |

```html
<!-- What you get: Clean, portable HTML ready to publish -->
<h1>My Article</h1>
<p>A paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
<ul>
  <li>Simple</li>
  <li>Clean</li>
  <li>Works everywhere</li>
</ul>
```

---

## Features

- **Clean HTML Output** - Pure semantic HTML, no proprietary formats
- **15+ Block Types** - Paragraphs, headings, lists, code, tables, images, videos, callouts, accordions, and more
- **Cloud Image Uploads** - Built-in support for Cloudinary, AWS S3, and custom handlers
- **Professional Undo/Redo** - Reliable history management with cursor restoration
- **Dark Mode** - Beautiful dark theme out of the box
- **TypeScript Ready** - Full type definitions included
- **Lightweight** - Only 256KB gzipped (ESM + CSS)
- **Keyboard Shortcuts** - Efficient editing with familiar shortcuts
- **Table of Contents** - Auto-generate navigation from headings
- **Accessibility** - WCAG compliant with ARIA labels
- **Security Hardened** - XSS protection and input validation
- **Zero Runtime Dependencies** - Only React as peer dependency

---

## Installation

### From NPM (Recommended)

```bash
npm install authorly-editor
```

```bash
yarn add authorly-editor
```

```bash
pnpm add authorly-editor
```

### From GitHub Packages

```bash
npm install @aadityahasabnis/authorly
```

**Import styles in your app:**

```tsx
import 'authorly-editor/styles.css';
```

---

## Quick Start

```tsx
import { AuthorlyEditor } from 'authorly-editor';
import 'authorly-editor/styles.css';

function App() {
  const [content, setContent] = useState('<p>Hello World!</p>');

  return (
    <AuthorlyEditor
      initialContent={content}
      onChange={setContent}
    />
  );
}
```

That's it. No configuration needed.

> **Backward Compatibility:** The old `ContentBlocksEditor` name still works for existing users.

---

## Components

### 1. AuthorlyEditor

The main editor component for creating and editing content.

```tsx
import { AuthorlyEditor } from 'authorly-editor';
import 'authorly-editor/styles.css';

<AuthorlyEditor
  initialContent="<p>Start writing...</p>"
  onChange={(html) => console.log(html)}
  onSave={(html) => saveToDatabase(html)}
  darkMode={false}
  showToolbar={true}
  placeholder="Type '/' for commands..."
/>
```

### 2. AuthorlyRenderer

Display saved HTML content with beautiful styling. No editor overhead.

```tsx
import { AuthorlyRenderer } from 'authorly-editor';
import 'authorly-editor/styles.css';

<AuthorlyRenderer
  html={savedContent}
  darkMode={false}
  enableCodeCopy={true}
/>
```

### 3. AuthorlyTableOfContents

Auto-generate navigation from your content headings.

```tsx
import { AuthorlyTableOfContents, AuthorlyRenderer } from 'authorly-editor';

<div style={{ display: 'flex' }}>
  <aside style={{ width: 200 }}>
    <AuthorlyTableOfContents html={content} title="Contents" />
  </aside>
  <main>
    <AuthorlyRenderer html={content} enableHeadingIds={true} />
  </main>
</div>
```

> **Note:** Old component names (`ContentBlocksEditor`, `ContentBlocksRenderer`, `TableOfContents`) are still supported for backward compatibility.

---

## Block Types

| Block | Description | HTML Output |
|-------|-------------|-------------|
| **Paragraph** | Basic text | `<p>` |
| **Heading 1-6** | Section headings | `<h1>` - `<h6>` |
| **Bullet List** | Unordered list | `<ul><li>` |
| **Numbered List** | Ordered list | `<ol><li>` |
| **Checklist** | Todo items | `<ul><li><input type="checkbox">` |
| **Quote** | Blockquote | `<blockquote>` |
| **Code** | Code block | `<pre><code>` |
| **Image** | Image with caption | `<figure><img><figcaption>` |
| **Video** | YouTube/Vimeo/MP4 | `<figure><iframe>` |
| **Table** | Data table | `<table>` |
| **Divider** | Horizontal rule | `<hr>` |
| **Callout** | Info/Warning/Error | `<aside>` |
| **Accordion** | Collapsible section | `<details><summary>` |
| **Date** | Date picker | `<time>` |
| **Link Preview** | URL preview card | `<a>` |
| **Excalidraw** | Drawing canvas | `<figure>` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Ctrl/Cmd + S` | Save (triggers `onSave`) |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + 1/2/3` | Heading 1/2/3 |
| `/` | Open block menu |
| `Enter` | New block / New list item |
| `Backspace` | Delete empty block / Merge |
| `Tab` | Indent list / Navigate table |
| `↑ / ↓` | Navigate between blocks |

---

## API Reference

### AuthorlyEditor Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialContent` | `string` | `''` | Initial HTML content |
| `onChange` | `(html: string) => void` | - | Called on content change |
| `onSave` | `(html: string) => void` | - | Called on Ctrl+S |
| `onFocus` | `() => void` | - | Called when editor gains focus |
| `onBlur` | `() => void` | - | Called when editor loses focus |
| `onReady` | `(editor: EditorInstance) => void` | - | Called when editor is ready |
| `darkMode` | `boolean` | `false` | Enable dark theme |
| `showToolbar` | `boolean` | `true` | Show formatting toolbar |
| `toolbarPosition` | `'top' \| 'bottom'` | `'top'` | Toolbar position |
| `placeholder` | `string` | `'Type "/" for commands...'` | Placeholder text |
| `readOnly` | `boolean` | `false` | Disable editing |
| `autoFocus` | `boolean` | `false` | Focus on mount |
| `spellCheck` | `boolean` | `true` | Enable spell check |
| `className` | `string` | `''` | Custom class name |
| `style` | `CSSProperties` | - | Custom styles |
| `imageUploadConfig` | `UploadConfig` | - | Cloud upload configuration (Cloudinary, S3, custom) |
| `onUploadStart` | `(file: File) => void` | - | Called when upload starts |
| `onUploadSuccess` | `(result: UploadResult) => void` | - | Called when upload succeeds |
| `onUploadError` | `(error: Error) => void` | - | Called when upload fails |
| `onUploadProgress` | `(progress: UploadProgress) => void` | - | Called during upload progress |

### EditorRef Methods

Access editor methods using a ref:

```tsx
import { useRef } from 'react';
import { AuthorlyEditor, EditorRef } from 'authorly-editor';

function MyEditor() {
  const editorRef = useRef<EditorRef>(null);

  return (
    <>
      <AuthorlyEditor ref={editorRef} />
      <button onClick={() => console.log(editorRef.current?.getHTML())}>
        Get HTML
      </button>
    </>
  );
}
```

| Method | Description |
|--------|-------------|
| `getHTML()` | Returns the current HTML content |
| `setHTML(html: string)` | Sets the editor content |
| `getText()` | Returns plain text content |
| `focus()` | Focuses the editor |
| `blur()` | Blurs the editor |
| `insertBlock(type, data?)` | Inserts a new block |
| `getEditor()` | Returns the full editor instance |

### AuthorlyRenderer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `html` | `string` | `''` | HTML content to render |
| `darkMode` | `boolean` | `false` | Enable dark theme |
| `enableCodeCopy` | `boolean` | `true` | Add copy button to code blocks |
| `enableHeadingIds` | `boolean` | `true` | Add IDs to headings |
| `enableChecklistStyles` | `boolean` | `true` | Strikethrough checked items |
| `className` | `string` | `''` | Custom class name |
| `style` | `CSSProperties` | - | Custom styles |

### AuthorlyTableOfContents Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `html` | `string` | `''` | HTML to extract headings from |
| `darkMode` | `boolean` | `false` | Enable dark theme |
| `title` | `string` | `'Table of Contents'` | Title text |
| `minLevel` | `number` | `1` | Min heading level (1-6) |
| `maxLevel` | `number` | `6` | Max heading level (1-6) |
| `onNavigate` | `(id, item) => void` | - | Custom navigation handler |
| `smoothScroll` | `boolean` | `true` | Smooth scroll to heading |
| `collapsible` | `boolean` | `false` | Make TOC collapsible |

---

## Examples

### Blog Editor with Preview

```tsx
import { useState, useRef } from 'react';
import { 
  AuthorlyEditor, 
  AuthorlyRenderer,
  EditorRef 
} from 'authorly-editor';
import 'authorly-editor/styles.css';

function BlogEditor() {
  const editorRef = useRef<EditorRef>(null);
  const [content, setContent] = useState('<p>Write your post...</p>');
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async (html: string) => {
    await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: html }),
    });
  };

  return (
    <div>
      <button onClick={() => setShowPreview(!showPreview)}>
        {showPreview ? 'Edit' : 'Preview'}
      </button>

      {showPreview ? (
        <AuthorlyRenderer html={content} />
      ) : (
        <AuthorlyEditor
          ref={editorRef}
          initialContent={content}
          onChange={setContent}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
```

### Documentation Page with TOC

```tsx
import { 
  AuthorlyRenderer, 
  AuthorlyTableOfContents 
} from 'authorly-editor';
import 'authorly-editor/styles.css';

function DocsPage({ content }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
      <aside style={{ position: 'sticky', top: '1rem', height: 'fit-content' }}>
        <AuthorlyTableOfContents 
          html={content} 
          title="On this page"
          maxLevel={3}
        />
      </aside>
      <main>
        <AuthorlyRenderer 
          html={content}
          enableHeadingIds={true}
          enableCodeCopy={true}
        />
      </main>
    </div>
  );
}
```

### Image Uploads with Cloudinary

```tsx
import { AuthorlyEditor, createCloudinaryConfig } from 'authorly-editor';

function Editor() {
  const [content, setContent] = useState('');

  // Configure Cloudinary upload
  const uploadConfig = createCloudinaryConfig({
    cloudName: 'your-cloud-name',
    uploadPreset: 'your-upload-preset',
    folder: 'blog-images',
    maxSizeMB: 5,
  });

  return (
    <AuthorlyEditor
      initialContent={content}
      onChange={setContent}
      imageUploadConfig={uploadConfig}
      onUploadSuccess={(result) => {
        console.log('Image uploaded:', result.url);
      }}
    />
  );
}
```

See [Image Upload Guide](https://authorly-editor.vercel.app/docs/guides/image-uploads) for more examples including S3 and custom backends.

### Dark Mode Support

```tsx
import { useState } from 'react';
import { AuthorlyEditor } from 'authorly-editor';

function ThemedEditor() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div style={{ 
      background: darkMode ? '#0f172a' : '#ffffff',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <button onClick={() => setDarkMode(!darkMode)}>
        Toggle Theme
      </button>
      <AuthorlyEditor darkMode={darkMode} />
    </div>
  );
}
```

---

## Customization

### CSS Variables

Override these CSS variables to customize the editor appearance:

```css
.cb-editor {
  /* Colors */
  --cb-primary: #3b82f6;
  --cb-primary-hover: #2563eb;
  --cb-bg: #ffffff;
  --cb-bg-secondary: #f9fafb;
  --cb-bg-tertiary: #f3f4f6;
  --cb-text: #111827;
  --cb-text-secondary: #6b7280;
  --cb-border: #e5e7eb;
  --cb-border-focus: #3b82f6;

  /* Spacing */
  --cb-spacing-xs: 0.25rem;
  --cb-spacing-sm: 0.5rem;
  --cb-spacing-md: 1rem;
  --cb-spacing-lg: 1.5rem;

  /* Border radius */
  --cb-radius-sm: 0.25rem;
  --cb-radius-md: 0.375rem;
  --cb-radius-lg: 0.5rem;

  /* Typography */
  --cb-font-family: system-ui, -apple-system, sans-serif;
  --cb-font-mono: 'SF Mono', Monaco, Consolas, monospace;
}
```

### Custom Blocks

Register your own block types:

```tsx
import { blockRegistry, BlockDefinition } from 'authorly-editor';

const myCustomBlock: BlockDefinition = {
  name: 'custom',
  tag: 'div',
  editable: true,
  allowedChildren: ['text', 'inline'],
  label: 'Custom Block',
  icon: 'box',
  create: (data) => {
    const el = document.createElement('div');
    el.className = 'my-custom-block';
    el.contentEditable = 'true';
    el.innerHTML = data?.content || '';
    return el;
  },
  getData: (el) => ({ content: el.innerHTML }),
  update: (el, data) => { el.innerHTML = data.content; },
};

blockRegistry.register(myCustomBlock);
```

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 14+ |
| Edge | 90+ |

---

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  EditorRef,
  EditorInstance,
  BlockType,
  BlockData,
  AuthorlyEditorProps,
  AuthorlyRendererProps,
  AuthorlyTableOfContentsProps,
  TocItem,
  // Legacy names still available:
  ContentBlocksEditorProps,
  ContentBlocksRendererProps,
  TableOfContentsProps,
} from 'authorly-editor';
```

---

## FAQ

<details>
<summary><strong>How do I save content to a database?</strong></summary>

The editor outputs plain HTML strings. Save it directly:

```tsx
const handleSave = async (html: string) => {
  await db.posts.create({ content: html });
};

<AuthorlyEditor onSave={handleSave} />
```
</details>

<details>
<summary><strong>How do I display saved content?</strong></summary>

Use the `AuthorlyRenderer` component:

```tsx
const post = await db.posts.findOne(id);

<AuthorlyRenderer html={post.content} />
```
</details>

<details>
<summary><strong>Can I use it without React?</strong></summary>

Currently, Authorly is React-only. The output HTML can be used anywhere, but the editor component requires React 17+.
</details>

<details>
<summary><strong>Does it support collaborative editing?</strong></summary>

Not built-in. For real-time collaboration, you'd need to integrate with a service like Yjs or Liveblocks on top of this editor.
</details>

<details>
<summary><strong>How do I handle image uploads?</strong></summary>

Authorly includes built-in support for cloud uploads! Configure Cloudinary, S3, or custom handlers:

```tsx
import { AuthorlyEditor, createCloudinaryConfig } from 'authorly-editor';

const uploadConfig = createCloudinaryConfig({
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
});

<AuthorlyEditor imageUploadConfig={uploadConfig} />
```

See the [Image Upload Guide](https://authorly-editor.vercel.app/docs/guides/image-uploads) for Cloudinary, S3, and custom upload examples.
</details>

---

## Contributing

Contributions are welcome! Please read our contributing guidelines first.

```bash
# Clone the repo
git clone https://github.com/your-username/authorly.git

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build
npm run build
```

---

## License
MIT © Aaditya Hasabnis


---

<p align="center">
  <strong>Authorly</strong> — Made for writers who want their words to shine, not fight with formatting.
</p>
