# Overlay Scaffold

Add the design token system to an existing project without changing infrastructure.

## When to Use

- Project already has its own auth, database, and hosting
- You only want the token-based design system
- Adding cultural theming to an existing brand
- Standardizing design values across a project

## What You Get

- `src/styles/tokens/core.css` — Platform default tokens
- `style-dictionary.config.cjs` — Token build pipeline (optional)
- Tailwind integration (v3 or v4 depending on project)
- Dark mode semantic overrides
- Cultural overlay capability

## What You Don't Get

- Multi-tenant infrastructure
- Auth system changes
- Database modifications
- Deployment pipeline changes

## Setup

### 1. Copy Token Files

```bash
# Create your core tokens file (see skills/theme-inspired-tokens for structure)
touch src/styles/tokens/core.css
cp scaffold/overlay/templates/style-dictionary.config.cjs ./  # optional
```

### 2. Import in Main CSS

```css
/* Add to your main CSS file */
@import "./tokens/core.css";
```

### 3. Wire to Tailwind

**Tailwind v4:**
```css
@theme {
  --color-primary: var(--color-primary);
  /* ... map all tokens from core.css */
}
```

**Tailwind v3:**
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
      }
    }
  }
}
```

### 4. Replace Hardcoded Values

Follow `scaffold/brownfield/checklists/token-adoption.md` for incremental replacement.

## Adding Cultural Overlays

1. Generate a cultural theme using the `/theme-inspired-tokens` skill
2. Save as `src/styles/tokens/overlay-{culture}.css`
3. Load dynamically when the overlay is activated
4. Semantic tokens remap to cultural primitives — no component changes needed
