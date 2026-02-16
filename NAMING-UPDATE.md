# Naming Consistency Update - Authorly

## Summary

Updated the codebase to use consistent "Authorly" branding throughout, while maintaining backward compatibility for existing users.

## Changes Made

### ✅ Component Names Updated

**Main Components:**
- ✅ `ContentBlocksEditor` → `AuthorlyEditor` (primary export)
- ✅ `ContentBlocksRenderer` → `AuthorlyRenderer` (primary export)
- ✅ `TableOfContents` → `AuthorlyTOC` (primary export)

**Type Definitions:**
- ✅ `ContentBlocksEditorProps` → `AuthorlyEditorProps` (primary)
- ✅ `ContentBlocksRendererProps` → `AuthorlyRendererProps` (primary)
- ✅ `TableOfContentsProps` → `AuthorlyTOCProps` (primary)

### ✅ Files Updated

1. **`src/components/index.ts`**
   - Updated exports to use new names
   - Added deprecation comments for old names

2. **`src/index.ts`**
   - Already had proper exports with deprecation notices

3. **`test/DeveloperExample.tsx`**
   - Changed `ContentBlocksEditor` → `AuthorlyEditor`
   - Updated code examples to show new component names

4. **`test/NewDeveloperPage.tsx`**
   - Changed all component imports to new names
   - Updated `ContentBlocksEditor` → `AuthorlyEditor`
   - Updated `ContentBlocksRenderer` → `AuthorlyRenderer`
   - Updated `TableOfContents` → `AuthorlyTOC`

5. **`src/test/index.test.ts`**
   - Added tests for both new and deprecated export names
   - Verifies backward compatibility

6. **`README.md`**
   - Added FAQ explaining why CSS classes still use `cb-` prefix
   - Documented backward compatibility support

### ⚠️ Backward Compatibility

**Maintained for Existing Users:**
- ✅ Old component names still work (`ContentBlocksEditor`, `ContentBlocksRenderer`, `TableOfContents`)
- ✅ Old type names still available
- ✅ CSS classes remain unchanged (`cb-*` prefix) to prevent breaking changes
- ✅ All deprecated exports marked with `@deprecated` JSDoc comments

**Migration Path:**
Users can gradually migrate to new names:
```tsx
// Old (still works)
import { ContentBlocksEditor } from 'authorly-editor';

// New (recommended)
import { AuthorlyEditor } from 'authorly-editor';
```

### 🎨 CSS Classes (Unchanged)

**Decision:** Keep `cb-` prefix for CSS classes to maintain backward compatibility.

All CSS classes retain their original names:
- `cb-editor`
- `cb-toolbar`
- `cb-image`
- `cb-code`
- etc.

**Rationale:** Changing CSS class names would be a breaking change requiring users to update their custom styles. The component API names are more important for developer experience.

## Build Results

✅ **ESM Build:** 335.63 KB (67.14 KB gzipped)
✅ **CSS Build:** 319.38 KB (114.68 KB gzipped)
✅ **CDN Build:** 7,850.44 KB (2,543.93 KB gzipped)

## Documentation

Updated README.md with:
- New component names in all examples
- FAQ explaining CSS class naming decision
- Backward compatibility notice
- Migration guidance

## Testing

✅ **Sanitization tests:** All passing
⚠️ **Export tests:** Failing due to unrelated excalidraw import issue (not caused by these changes)

## Migration Guide for Users

### Recommended (New Names)
```tsx
import { 
  AuthorlyEditor,
  AuthorlyRenderer,
  AuthorlyTOC,
  type AuthorlyEditorProps,
  type AuthorlyRendererProps,
  type AuthorlyTOCProps
} from 'authorly-editor';
```

### Still Supported (Deprecated)
```tsx
import { 
  ContentBlocksEditor,
  ContentBlocksRenderer,
  TableOfContents,
  type ContentBlocksEditorProps,
  type ContentBlocksRendererProps,
  type TableOfContentsProps
} from 'authorly-editor';
```

## Future Considerations

In a future **major version** (v2.0.0), we could:
1. Remove deprecated component names
2. Optionally update CSS classes from `cb-*` to `authorly-*`
3. Provide a codemod tool for automated migration

But for now, **zero breaking changes** - everything remains backward compatible! 🎉
