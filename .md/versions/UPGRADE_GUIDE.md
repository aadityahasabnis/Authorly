# Upgrade Guide for Developers

**Version**: v0.1.4  
**Date**: February 4, 2026

---

## For End Users (Consuming the Package)

### Quick Upgrade

```bash
# If using NPM package
npm install authorly-editor@latest

# If using GitHub package  
npm install @aadityahasabnis/authorly@latest

# Or specify exact version
npm install authorly-editor@0.1.4
```

### ✅ No Code Changes Required!

This release is **100% backward compatible**. Simply update the package version and you're done.

**What you get automatically**:
- ✅ Working link creation (was broken before)
- ✅ Link hover preview cards
- ✅ Better toolbar consistency

**Test after upgrade**:
1. Create a link (select text, click link button, enter URL)
2. Hover over any link to see preview card
3. Try Edit and Remove buttons in preview

---

## For Contributors/Developers

### Development Setup

If you're working on the Authorly codebase:

```bash
# Clone the repository
git clone https://github.com/aadityahasabnis/Authorly.git
cd Authorly/authorly

# Install dependencies
npm install

# Run development server
npm run dev

# Build library
npm run build

# Run tests
npm test
```

### TypeScript Configuration Notes

**Current State**:
- Build uses `skipLibCheck: true` to ignore node_modules type errors
- vite.config.ts shows TypeScript warnings but builds successfully
- All source code (`src/`) type-checks correctly

**Optional: Fix vite.config.ts Type Errors**:

If you want to eliminate the TypeScript warnings in vite.config.ts, install @types/node:

```bash
npm install --save-dev @types/node
```

Then update `tsconfig.node.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["node", "vite/client"]
  },
  "include": ["vite.config.ts"]
}
```

**Why this is optional**: The warnings don't affect the build output or functionality. They only appear during development.

### What Changed in This Release

**Files Modified**:
1. `src/components/Toolbar.tsx` - Link functionality fixes, preview card
2. `src/styles/editor.css` - Link preview styling
3. `tsconfig.json` - Added esModuleInterop, allowSyntheticDefaultImports
4. `tsconfig.node.json` - Created (new file)
5. `vite.config.ts` - Added minify: 'esbuild'
6. `versions/` - Added changelog and code review docs

**No Breaking Changes**:
- All APIs remain unchanged
- Component props unchanged
- CSS class names unchanged
- Build output format unchanged

### Testing Checklist

Before committing changes:

- [ ] `npm run build` succeeds
- [ ] `npm test` passes (if tests exist)
- [ ] Link creation works
- [ ] Link preview shows on hover
- [ ] All formatting buttons work
- [ ] No console errors in test app

### Build Output

Expected build output:
```
dist/
├── style.css       (~41 kB, ~6.5 kB gzipped)
├── index.esm.js    (~209 kB, ~45 kB gzipped)
├── index.cjs.js    (~163 kB, ~40 kB gzipped)
├── index.d.ts      (TypeScript definitions)
└── *.map           (source maps)
```

### Known Issues in Development

See `versions/CODE_REVIEW_FINDINGS.md` for full list.

**Won't affect your usage**:
- TypeScript warnings in vite.config.ts (build still works)
- Deprecated `document.execCommand` warnings (planning migration)

**May affect development**:
- Highlight color removal bug (fixes coming in v0.1.5)
- Block menu keyboard handling (fixes coming in v0.1.5)

---

## For Package Maintainers

### Publishing Workflow

```bash
# 1. Update version in package.json
npm version patch  # or minor, or major

# 2. Build the package
npm run build

# 3. Publish to NPM
npm run publish:npm

# 4. Publish to GitHub Packages
npm run publish:github

# 5. Tag the release
git tag v0.1.4
git push origin v0.1.4
```

### Version Strategy

- **Patch** (0.1.x): Bug fixes, no breaking changes
- **Minor** (0.x.0): New features, no breaking changes  
- **Major** (x.0.0): Breaking API changes

### Release Checklist

Before releasing:

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run full build: `npm run build`
- [ ] Test in demo app
- [ ] Commit all changes
- [ ] Create git tag
- [ ] Push to GitHub
- [ ] Publish to npm
- [ ] Create GitHub release with notes

---

## Troubleshooting

### "Module not found" errors after upgrade

**Solution**: Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Link button still not working after upgrade

**Solution**: Check you're using the latest build:
```bash
# In your app
npm ls authorly-editor
# Should show v0.1.4

# If not, force update
npm install authorly-editor@0.1.4 --force
```

### TypeScript errors in my project after upgrade

**Solution**: The package exports proper TypeScript definitions. If you see errors:
```bash
# Regenerate your tsconfig
npx tsc --init

# Or update your tsconfig.json to include:
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

### Styles not applying

**Solution**: Ensure you're importing the CSS:
```typescript
import 'authorly-editor/styles';
// Or
import 'authorly-editor/dist/style.css';
```

### Build fails with "Cannot find module 'path'"

This is expected during TypeScript checking of vite.config.ts. The build still succeeds because:
1. `skipLibCheck: true` is enabled
2. Vite resolves the modules at runtime
3. Source code (`src/`) has no such errors

To eliminate the warnings (optional):
```bash
npm install --save-dev @types/node
```

---

## Migration from v0.1.3

### Breaking Changes

**None!** This is a patch release with only bug fixes and improvements.

### API Changes

**None!** All component props and APIs remain identical.

### Required Code Changes

**None!** Just update the package version.

### CSS Changes

New CSS classes added (you can customize these):
```css
.cb-link-preview
.cb-link-preview-content
.cb-link-preview-url
.cb-link-preview-divider
.cb-link-preview-actions
.cb-link-preview-btn
.cb-link-preview-btn-danger
```

To customize:
```css
/* In your app's CSS */
.cb-link-preview {
  max-width: 600px; /* Override default 500px */
}
```

---

## Support

### Getting Help

- **Documentation**: https://github.com/aadityahasabnis/Authorly
- **Issues**: https://github.com/aadityahasabnis/Authorly/issues
- **Changelog**: See `versions/v0.1.4-CHANGELOG.md`
- **Code Review**: See `versions/CODE_REVIEW_FINDINGS.md`

### Reporting Bugs

When reporting bugs, include:
1. Authorly version (`npm ls authorly-editor`)
2. React version
3. Browser and version
4. Steps to reproduce
5. Expected vs actual behavior
6. Console errors (if any)

### Contributing

See `versions/CODE_REVIEW_FINDINGS.md` for list of issues that need fixing.

Pull requests welcome!

---

## Summary

### For Most Users

```bash
npm install authorly-editor@latest
```

That's it! No code changes needed.

### For Contributors

```bash
npm install  # Get latest dependencies
npm run build  # Verify build works
npm test  # Run tests
```

Read `versions/CODE_REVIEW_FINDINGS.md` for issues to fix.

---

**Questions?** Open an issue on GitHub!
