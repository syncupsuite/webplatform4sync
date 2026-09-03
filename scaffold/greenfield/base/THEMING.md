# Design Tokens & Theming Guide

This project ships with a complete design token system and access to 12 pre-built, culturally-grounded themes.

## Quick Start (Pre-built Themes)

### 1. Choose Your Theme

The `@syncupsuite/themes` package provides 12 production-ready themes, each validated against WCAG AA contrast standards:

- **swiss-international** — Precise, professional, grid-based
- **nihon-traditional** — Japanese Edo period inspired
- **nordic-modern** — Scandinavian clean and minimal
- **tang-imperial** — Chinese classical elegance
- **shuimo-modern** — Contemporary ink wash aesthetic
- **nihon-minimal** — Japanese modern simplicity
- **renaissance** — Historical Italian luxury
- **art-deco** — 1920s geometric glamour
- **wiener-werkstaette** — Vienna modernist craft
- **milanese-design** — Contemporary Italian fashion
- **de-stijl** — Dutch constructivism
- **swiss-modernist** — Mid-century Swiss design

### 2. Import Your Theme

In `src/styles/app.css`, after the Tailwind imports, add your chosen theme:

```css
@import "tailwindcss";
/* Add your theme here: */
@import '@syncupsuite/themes/swiss-international/tailwind.css';
```

Available import paths:
```css
@import '@syncupsuite/themes/nihon-traditional/tailwind.css';
@import '@syncupsuite/themes/nordic-modern/tailwind.css';
/* ... and so on for all 12 themes */
```

### 3. Remove or Comment Out the Manual @theme Block

If you're using a pre-built theme, you can remove the manual `@theme { ... }` block in `app.css`. The theme package provides its own registration.

**Before:**
```css
@import "tailwindcss";
@import '@syncupsuite/themes/swiss-international/tailwind.css';

@theme {
  --color-primary: var(--color-primary);
  /* ... 30+ manual entries (NOT NEEDED if using a theme) */
}
```

**After:**
```css
@import "tailwindcss";
@import '@syncupsuite/themes/swiss-international/tailwind.css';

/* @theme block removed — the theme package handles token registration */
```

---

## Using Default Tokens (Neutral Base)

If you prefer to use the default Slate-based neutral palette without switching themes, keep the `@theme { ... }` block in `app.css` as-is. The `src/styles/tokens/core.css` file defines all the tokens.

**When to use defaults:**
- Internal tools or admin panels (function over branding)
- Prototypes (speed over polish)
- Accessibility testing (neutral colors isolate contrast issues)

---

## Building a Custom Theme

If none of the 12 pre-built themes fit your brand, use the `/theme-inspired-tokens` Claude Code skill to build a custom cultural theme.

**Why custom?** Every SyncUpSuite theme traces back to a cultural or aesthetic narrative. "This blue is Hanada blue from Japanese indigo dyeing" — not "I liked this hex code." This approach ensures thoughtful, coherent design systems grounded in real traditions.

### Custom Theme Workflow

1. **Define your cultural foundation** — Choose a tradition, era, or aesthetic (e.g., "Nordic folk textiles," "Art Deco architecture," "Japanese wabi-sabi")
2. **Gather seed colors** — Select 5–7 colors from your foundation with documented provenance
3. **Run the skill** — Use `/theme-inspired-tokens --theme <name>` to build the full system
4. **Validate** — The skill runs WCAG AA contrast checks across 20 pairs
5. **Deploy** — Export as Tailwind v4 CSS and import into your project

See `shared/contracts/tokens.ts` for the canonical token schema that all themes (pre-built and custom) must follow.

---

## Theming Architecture

### Four-Layer Token System

All themes follow this structure:

```
Layer 1: Theme Source (story)
    ↓
Layer 2: Color Expansion (system)
    ↓
Layer 3: Semantic Mapping (meaning)
    ↓
Layer 4: Cross-Domain Tokens (completeness)
```

**Layer 1 (Story):** Cultural foundation with documented provenance
**Layer 2 (System):** Full color scale expansion (50–900)
**Layer 3 (Semantic):** Meaning-based mappings (primary, accent, error, etc.)
**Layer 4 (Cross-Domain):** Typography, spacing, radius, shadows, transitions

This ensures themes are complete, coherent, and maintainable.

---

## Dark Mode

### Activation

Dark mode uses the `[data-theme="dark"]` selector on the `<html>` element. Set it in code or with a toggle component.

### Option 1: Auto (Respect System Preference)

Add this script to your `src/lib/theme/auto.ts`:

```typescript
export function initAutoTheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
```

Call it on app mount to respect the user's OS preference.

### Option 2: Manual Toggle

Create a theme toggle component:

```typescript
export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(false);

  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button onClick={toggle} aria-label="Toggle dark mode">
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
```

### Token Naming Convention

All themes follow DTCG (Design Tokens Community Group) naming:

```
--color-<domain>-<name>-<scale>
--color-primary           (semantic)
--color-primary-hover     (interaction state)
--color-neutral-600       (scale)
```

When adding new tokens to `core.css`, follow this pattern. All tokens must be:
- Prefixed with `--color-`, `--font-`, `--radius-`, `--spacing-`, or similar
- Documented with a comment explaining their semantic role
- Registered in the `@theme` block (if not using a pre-built theme)

---

## Documentation & Resources

- **Token schema** → `shared/contracts/tokens.ts`
- **Theme registry** → `skills/theme-inspired-tokens/references/theme-registry.md`
- **Tailwind v4 CSS-first docs** → [Tailwind CSS v4 @theme](https://tailwindcss.com/docs/v4/theming)
- **Design system skill** → Use `/theme-inspired-tokens` to build custom themes
- **CLAUDE.md** → `CLAUDE.md` in the repo root documents the complete design philosophy

---

## Troubleshooting

### Utilities Not Working (e.g., `bg-primary` has no effect)

**Cause:** Token not registered in `@theme` block or theme not imported.

**Fix:**
1. Check `core.css` has the token (e.g., `--color-primary: #2563eb`)
2. Check `app.css` `@theme` block includes it (e.g., `--color-primary: var(--color-primary)`)
3. If using a pre-built theme, make sure the `@import` line is present

### Colors Don't Match Documentation

**Cause:** Pre-built theme and default tokens define different values.

**Fix:** Use ONE consistently:
- **For pre-built theme:** Remove manual `@theme { ... }` block (the theme package provides registration)
- **For defaults:** Comment out the theme import and keep the manual `@theme` block

### Dark Mode Not Toggling

**Cause:** `[data-theme="dark"]` selector not set on `<html>`, or CSS dark mode rules use wrong selector.

**Fix:**
1. Verify script sets attribute: `document.documentElement.setAttribute('data-theme', 'dark')`
2. Verify `core.css` has `[data-theme="dark"] { ... }` section with dark overrides
3. Check browser DevTools: inspect `<html>` element to see if attribute is present

---

## Version & Maintenance

- **@syncupsuite/themes** → v0.4.0+ (currently installed)
- **Token schema** → locked in `shared/contracts/tokens.ts`
- **Tailwind** → v4.1+ (CSS-first configuration)

When updating `@syncupsuite/themes`, verify that token names still match the `@theme` registrations in `app.css`. WCAG contrast is validated on each release.
