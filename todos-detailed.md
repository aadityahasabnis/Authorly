# Authorly Editor — Roadmap, Bugs, and Technical Notes

> This document is a **single source of truth** for current bugs, planned improvements, future scope, and architectural decisions for the Authorly rich‑text editor.
> It is written to be **clear for humans** and **precise for AI agents** working on the codebase.

---

## 1. Current Bugs (High Priority)

### 1.1 Toolbar: Accordion Button Missing

* **Issue**: The Accordion block cannot be added from the toolbar.
* **Current behavior**: Accordion can only be inserted using the `/` command popover.
* **Expected behavior**:

  * Accordion should be available **both** in the toolbar and `/` command menu.
  * Toolbar and slash menu must stay feature‑parity consistent.
* **Goal**: Identify why the toolbar registry does not include Accordion and fix the registration logic.

---

### 1.2 Ctrl + A Selection Behavior

* **Issue**: `Ctrl + A` does not follow professional editor selection rules.
* **Expected behavior**:

  1. First `Ctrl + A` → Select **current block content only**.
  2. Second `Ctrl + A` → Select **all blocks in the editor**.
* **Reference**: Notion, Google Docs, Word.

---

### 1.3 Copy–Paste Includes Unwanted Styles

* **Issue**: Copying content captures:

  * Inline styles (colors, padding)
  * UI elements (icons, controls)
* **Problems**:

  * Pasted content is polluted with editor‑specific markup
  * Breaks clean HTML philosophy
* **Expected behavior**:

  * Copy should extract only:

    * Block type
    * Semantic content
  * Paste should:

    * Recreate correct block types
    * Insert at cursor position
    * Preserve surrounding content correctly
* **Goal**: Professional semantic clipboard handling.

---

### 1.4 Undo / Redo (Ctrl + Z / Ctrl + Y)

* **Issue**:

  * Undo jumps to the first block
  * Multiple unrelated changes revert at once
* **Expected behavior**:

  * Linear, predictable undo/redo
  * Cursor position preserved
  * Block‑level and inline‑level history handled correctly
* **Priority**: Very High (core UX)

---

## 2. TODO – Feature Implementations (Short‑Term)

### 2.1 Markdown‑Style Shortcuts

Trigger block creation using typed patterns:

* `- ` → Bullet list
* `1. ` → Numbered list
* `> ` → Quote block

---

### 2.2 Inline Date Block

* Available in:

  * Toolbar
  * `/` command menu
* Default insert: **Today**
* Quick options:

  * Today
  * Tomorrow
  * Yesterday
* Display format:

  * `[Fri, 17 July 2024]`
* UX behavior:

  * Styled similar to inline code
  * Hover → calendar picker
  * Calendar must follow Authorly design system

---

### 2.3 Hashtag Styling (#tags)

* Any `#something` inside any block:

  * Styled in light‑blue theme
  * Inline‑code‑like appearance
  * Less rounded corners
* Purely visual (no routing yet)

---

### 2.4 Image & Video Uploader UI

* **Issue**: UI is inconsistent and unpolished
* **Goal**:

  * Minimal
  * Consistent
  * Professional
  * Same visual language for image & video

---

### 2.5 Table of Contents Offset Support

* Add prop: `offsetTopPx`
* Purpose:

  * Prevent heading scroll hiding under navbar
* Default: small safe offset (e.g., 5px)

---

### 2.6 Export to PDF

* Add "Download PDF" option
* PDF must:

  * Match Authorly styles
  * Be lightweight
* If external libraries are heavy:

  * Build custom lightweight HTML → PDF solution

---

### 2.7 Text Case Transformation Tool

* Single toolbar button
* Popover options:

  1. Lowercase
  2. Uppercase
  3. Capitalize (each word)
* Behavior:

  * Clicking same option again → revert to original
* Icon concept: `Aa` (Case Sensitive)
* Must preserve selection and cursor position

---

### 2.8 Contextual Selection Toolbar

* When content is selected:

  * Show floating toolbar above selection
* Tools (context‑aware):

  * Bold
  * Italic
  * Strikethrough
  * Text color
  * Highlight
  * Link
  * Case tools
  * (Future) AI edit
* UX rules:

  * Cursor must never jump
  * Selection must persist
  * Similar to Word / Notion

---

## 3. Future Scope (Not Immediate)

### 3.1 Interactive Q&A / MCQs

* Editor side:

  * Create questions
  * Define correct answers
  * Add explanations
* Render side:

  * User selects answers
  * Submit to see result
  * Correct → success message
  * Incorrect → show correct answer + explanation

---

### 3.2 Paste Dump / Smart Paste

* Paste large content blobs
* Automatically convert into clean Authorly blocks
* Requires fixing formatting engine first

---

### 3.3 AI Integration

**Phase 1**:

* Full document AI edit
* AI replaces content as structured blocks

**Phase 2**:

* Block‑level / selection‑level AI editing
* Same UX as link or formatting popover

---

### 3.4 Typography Controls

* Change font family (selection only)
* Change font size (increase/decrease)

---

### 3.5 Excalidraw Integration

* Embed Excalidraw canvas
* Export drawing as image block

---

## 4. Architecture Question (Critical)

### Q1: Image Storage & Database Strategy

**Problem Context**:

* Editor content is stored in the database
* Goal: keep DB size minimal and optimized

**Current State**:

* Images render correctly in preview
* Storage strategy not finalized

**Industry‑Standard Approach**:

1. Upload images to external storage (e.g., Cloudinary, S3)
2. Store only the **image URL + metadata** in HTML

**Proposed Direction**:

* Editor handles:

  * Image selection
  * Upload trigger
* Application handles:

  * Upload to Cloudinary (or similar)
  * Returns URL
* Editor stores:

  * `<img src="URL" />`

⚠️ **Important**: No implementation should begin until this strategy is confirmed.

---

## 5. Guiding Principles

* Save **minimal semantic HTML** only
* Avoid editor‑specific noise in DB
* UX comparable to Word / Notion
* Lightweight over feature‑bloated
* Predictable behavior > clever behavior

---

**This document is intentionally detailed to support future AI‑assisted development and long‑term maintainability.**
