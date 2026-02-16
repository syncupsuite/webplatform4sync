# Tailwind v3 → v4 Migration Checklist

## Key Changes in v4

1. **CSS-first configuration**: `@theme` directive in CSS replaces `tailwind.config.js`
2. **No more `@apply` in config**: Use CSS custom properties instead
3. **Built-in Vite plugin**: `@tailwindcss/vite` replaces PostCSS plugin
4. **Automatic content detection**: No more `content` array in config
5. **New color system**: P3 color support, simplified palette

## Migration Steps

### Phase 1: Preparation (Still on v3)

- [ ] Ensure all custom values use CSS custom properties (see token-adoption.md)
- [ ] Inventory `tailwind.config.js` customizations
- [ ] List all `@apply` usage in CSS files
- [ ] Check for deprecated utilities

### Phase 2: Upgrade Dependencies

```bash
npm install tailwindcss@^4.0 @tailwindcss/vite
npm uninstall autoprefixer postcss  # No longer needed for Tailwind
```

- [ ] Install Tailwind v4 and Vite plugin
- [ ] Remove PostCSS Tailwind plugin from `postcss.config.js` (if no other PostCSS plugins, delete the file)
- [ ] Add `@tailwindcss/vite` to `vite.config.ts` plugins

### Phase 3: Migrate Configuration

Replace `tailwind.config.js` with `@theme` in CSS:

```css
/* Before (v3): tailwind.config.js */
/* module.exports = { theme: { extend: { colors: { primary: 'var(--color-primary)' } } } } */

/* After (v4): in your main CSS */
@import "tailwindcss";

@theme {
  --color-primary: var(--token-color-primary);
  --color-accent: var(--token-color-accent);
  --color-background-canvas: var(--token-color-background-canvas);
  --color-background-surface: var(--token-color-background-surface);
  --color-text-primary: var(--token-color-text-primary);
  --color-text-secondary: var(--token-color-text-secondary);
  --spacing-xs: var(--token-spacing-xs);
  --spacing-sm: var(--token-spacing-sm);
  --spacing-md: var(--token-spacing-md);
  --spacing-lg: var(--token-spacing-lg);
}
```

- [ ] Create `@theme` block with all custom values
- [ ] Remove `tailwind.config.js` (or keep as fallback during transition)
- [ ] Update CSS imports to use `@import "tailwindcss"`

### Phase 4: Update Utilities

- [ ] Replace deprecated utility classes
- [ ] Check responsive breakpoints (unchanged syntax, new internals)
- [ ] Verify dark mode (`dark:` prefix still works)
- [ ] Test all custom component styles

### Phase 5: Validation

- [ ] Full visual regression test
- [ ] Check bundle size (should decrease)
- [ ] Verify no v3-only features are used
- [ ] Delete `tailwind.config.js` if fully migrated
