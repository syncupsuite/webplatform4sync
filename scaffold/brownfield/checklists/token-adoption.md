# Token Adoption Checklist

Incrementally replace hardcoded design values with token-based CSS custom properties.

## Phase 1: Audit

- [ ] Inventory all hardcoded color values (grep for `#`, `rgb(`, `hsl(`)
- [ ] Inventory all hardcoded spacing values (grep for `px`, `rem`, `em` in styles)
- [ ] Inventory all font declarations
- [ ] Map existing values to the nearest token equivalents
- [ ] Identify values with no token equivalent (may need custom tokens)

## Phase 2: Token Foundation

- [ ] Add `src/styles/tokens/core.css` with platform default tokens
- [ ] Import tokens in main CSS file (`@import "./tokens/core.css"`)
- [ ] Verify tokens load and CSS custom properties are available
- [ ] Add dark mode semantic overrides

## Phase 3: Incremental Replacement

Replace values component by component, starting with the most-used:

- [ ] Background colors → `var(--color-background-*)`
- [ ] Text colors → `var(--color-text-*)`
- [ ] Border colors → `var(--color-border-*)`
- [ ] Primary/accent colors → `var(--color-primary)`, `var(--color-accent)`
- [ ] Spacing → `var(--spacing-*)`
- [ ] Font families → `var(--font-family-*)`
- [ ] Font sizes → `var(--font-size-*)`
- [ ] Border radius → `var(--radius-*)`

## Phase 4: Tailwind Integration

### If on Tailwind v3:
- [ ] Update `tailwind.config.js` to reference CSS custom properties
- [ ] Replace hardcoded Tailwind colors with token references
- [ ] See `tailwind-v3-to-v4.md` for eventual migration

### If on Tailwind v4:
- [ ] Add `@theme` block referencing token custom properties
- [ ] Replace utility classes as needed

## Phase 5: Validation

- [ ] Run WCAG contrast check on all token combinations
- [ ] Verify dark mode renders correctly
- [ ] Check no hardcoded values remain in component styles
- [ ] Test with cultural overlay (if applicable)

## Common Pitfalls

- Don't try to replace everything at once — go component by component
- Keep the old value as a comment during transition for easy rollback
- Test dark mode after each batch of replacements
- Some third-party components may need wrapper overrides
