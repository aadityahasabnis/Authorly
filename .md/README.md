# Documentation Index

## Root Files

### [README.md](../README.md)
**Main documentation** - Installation, quick start, API reference, examples.

**Contents**:
- Installation (NPM & GitHub Packages)
- Quick start with `AuthorlyEditor`
- All 15 block types
- Keyboard shortcuts
- API reference for all components
- Image upload configuration
- Dark mode support
- Browser compatibility

**For**: All users (end users, developers, contributors)

---

### [CHANGELOG.md](../CHANGELOG.md)
**Version history** - What changed in each release.

**Contents**:
- Version 0.1.9 changes
- Bug fixes (TypeScript, undo/redo, blocks, package size)
- Component renaming (Authorly* prefix)
- Security improvements
- Package optimization stats

**For**: Users upgrading, contributors, maintainers

---

## Documentation Files (.md/)

### [ARCHITECTURE.md](./ARCHITECTURE.md)
**System design** - How Authorly works internally.

**Contents**:
- Component structure
- Block system architecture
- Services layer (upload, selection, commands)
- State management & history
- Data flow (input/output)
- Build system (Vite)
- CSS architecture
- Performance optimizations
- Security measures
- Extension points

**For**: Contributors, developers understanding the codebase

---

### [BLOCKS.md](./BLOCKS.md)
**Block reference** - All 15 block types documented.

**Contents**:
- Text blocks (paragraph, headings, quote)
- List blocks (bullet, numbered, checklist)
- Code blocks (code, inline code)
- Media blocks (image, video)
- Structure blocks (table, divider)
- Enhanced blocks (callout, accordion, date, link preview, excalidraw)
- Block operations & formatting
- HTML output examples
- Security notes

**For**: End users, content creators, developers

---

### [UPLOAD-TESTING.md](./UPLOAD-TESTING.md)
**Quick testing guide** - How to test image uploads.

**Contents**:
- Option 1: Cloudinary (recommended for testing)
- Option 2: AWS S3
- Option 3: Base64 fallback
- Testing checklist
- Expected HTML output
- Troubleshooting
- Verification steps

**For**: Developers testing upload features, QA

---

### [S3-UPLOAD-GUIDE.md](./S3-UPLOAD-GUIDE.md)
**S3 setup guide** - Complete AWS S3 integration.

**Contents**:
- Requirements
- Quick start (bucket setup, backend API, Authorly config)
- Upload callbacks
- CloudFront CDN support
- Custom API endpoints
- Error handling
- Security best practices
- Testing steps
- S3 vs Cloudinary comparison

**For**: Developers implementing S3 uploads

---

## Todo Files (Excluded)

These files are for internal development tracking:
- `todos.md` - General tasks
- `todos-detailed.md` - Detailed task breakdown
- `bugs-remained.md` - Known issues

**Note**: These are not part of the published package and are git-ignored for end users.

---

## File Organization

```
authorly/
├── README.md                    # Main documentation
├── CHANGELOG.md                 # Version history
├── .md/                         # Detailed docs
│   ├── ARCHITECTURE.md          # System design
│   ├── BLOCKS.md                # Block reference
│   ├── UPLOAD-TESTING.md        # Upload testing
│   └── S3-UPLOAD-GUIDE.md       # S3 integration
└── [todos files]                # Development only
```

---

## Quick Links by Audience

### End Users (Using the Package)
1. Start: [README.md](../README.md#quick-start)
2. Blocks: [BLOCKS.md](./BLOCKS.md)
3. Upload: [UPLOAD-TESTING.md](./UPLOAD-TESTING.md)

### Developers (Integrating)
1. Install: [README.md](../README.md#installation)
2. API: [README.md](../README.md#api-reference)
3. S3 Setup: [S3-UPLOAD-GUIDE.md](./S3-UPLOAD-GUIDE.md)
4. Examples: [README.md](../README.md#examples)

### Contributors (Code)
1. Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Changes: [CHANGELOG.md](../CHANGELOG.md)
3. Blocks: [BLOCKS.md](./BLOCKS.md)

---

## Documentation Standards

### What's Included
- ✅ Verified content (matches current implementation)
- ✅ Practical examples
- ✅ Security notes
- ✅ Troubleshooting
- ✅ Current version info (0.1.9)

### What's Excluded
- ❌ Implementation checklists (done items)
- ❌ Old version docs (v0.1.4, etc.)
- ❌ Duplicate guides
- ❌ Unverified content

### Maintenance
- Update CHANGELOG.md for each release
- Update README.md for API changes
- Update BLOCKS.md for new block types
- Update ARCHITECTURE.md for major refactors
- Keep guides current with latest features

---

## Contributing to Docs

When updating documentation:

1. **README.md**: User-facing features, API changes
2. **CHANGELOG.md**: Every release, all changes
3. **ARCHITECTURE.md**: System design changes
4. **BLOCKS.md**: New blocks, block features
5. **Upload guides**: Cloud provider changes, new features

**Style**:
- Concise, accurate, verified
- Code examples tested
- Screenshots optional
- Security notes where relevant
- No outdated content

---

## Version Info

**Package**: `@aadityahasabnis/authorly@0.1.9`  
**Docs Last Updated**: 2026-02-10  
**Verification**: All content matches current implementation

---

**Questions?** See [README.md](../README.md) or [open an issue](https://github.com/aadityahasabnis/Authorly/issues).
