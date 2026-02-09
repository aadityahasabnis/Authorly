# Changelog

All notable changes to Authorly will be documented in this file.

## [0.1.9] - 2026-02-10

### Added
- **Component Renaming**: New `Authorly*` prefixed components
  - `AuthorlyEditor` (replaces `ContentBlocksEditor`)
  - `AuthorlyRenderer` (replaces `ContentBlocksRenderer`)
  - `AuthorlyTableOfContents` (replaces `TableOfContents`)
  - Old names still work for backward compatibility

### Fixed
- **TypeScript Compilation**: Fixed 17 TypeScript errors
  - Missing imports in Toolbar.tsx
  - Used-before-declaration errors in Editor.tsx
  - All source files now compile cleanly

- **Undo/Redo System**: Fixed 5 critical bugs
  - No longer saves duplicate history entries
  - Cursor restoration works reliably (double RAF)
  - Handles empty blocks correctly
  - 50ms throttling prevents race conditions
  - Improved offset fallback logic

- **Block Code**: Fixed 5 logical bugs
  - List item deletion preserves nested children
  - List operations use `:scope >` selectors
  - Table operations validate row/column indices
  - Video URL validation prevents XSS attacks
  - All blocks handle edge cases professionally

- **Package Size**: Optimized from 2.5 MB to 934 KB (-62.6%)
  - Disabled source maps in production
  - Added `sideEffects` field for tree-shaking
  - Created .npmignore for clean publishing
  - Explicit exports in package.json

### Changed
- **Build Configuration**: Enhanced vite.config.ts
  - Disabled sourcemaps for production
  - Set target to ES2020
  - Enabled CSS minification
  - Optimized for modern browsers

- **Package Configuration**: Improved package.json
  - Added `sideEffects: ["*.css"]` for tree-shaking
  - Explicit `files` array
  - Proper `exports` field for ESM/CJS
  - Modern dual-format support

### Security
- **Video Block**: Added strict URL validation
  - Only allows `http:` and `https:` protocols
  - Prevents `javascript:`, `data:`, `file:` injections
  - Uses `startsWith` instead of `includes` for domain checks

## Package Stats

- **Unpacked Size**: 934.7 KB (was 2.5 MB)
- **Package Size (gzipped)**: 255.5 KB (was 601.5 KB)
- **Files**: 50
- **Zero Breaking Changes**: Fully backward compatible

---

## [Unreleased]

### Planned
- Fix remaining 9 ESLint warnings (intentional hook dependencies)
- Add automated tests for undo/redo edge cases
- Performance monitoring and CI checks
- Bundle size regression tests

---

## Version Strategy

- **Patch** (0.1.x): Bug fixes, no breaking changes
- **Minor** (0.x.0): New features, no breaking changes
- **Major** (x.0.0): Breaking API changes

---

## Links

- [NPM Package](https://www.npmjs.com/package/authorly-editor)
- [GitHub Repository](https://github.com/aadityahasabnis/Authorly)
- [Issues](https://github.com/aadityahasabnis/Authorly/issues)
