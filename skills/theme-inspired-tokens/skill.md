# Theme-Inspired Tokens

A Claude Code skill for generating culturally-grounded design token systems where every color, font, and spacing decision traces back to a cultural or aesthetic narrative.

**Principle**: "This blue is Hanada blue from Japanese indigo dyeing" -- not "I liked this hex code."

---

## Quick Start (pre-built)

> **Upgrading from v0.2.0?** Versions before v0.2.2 have broken subpath exports. Run `npm install @syncupsuite/themes@latest` to fix, then run `/webplatform4sync:diagnose-tokens` to audit your integration.

`@syncupsuite/themes` provides pre-built implementations of this pattern. If you want production-ready cultural themes without building from scratch, install the package:

```bash
npm install @syncupsuite/themes@^0.2.2   # OKLCH color math, security-audited, zero runtime deps
```

> **Package quality**: v0.1.1 has been through a comprehensive review — P0 CSS generation bugs fixed, P1 security hardening (CSS injection prevention), PERF_BUDGETS enforced, and 7 Architecture Decision Records (ADR-001 through ADR-007) governing all major design decisions. See `syncupsuite/themes/docs/adr/` for full detail.

### Tailwind Compatibility

Choose the transformer that matches your Tailwind version. Using the wrong one is a silent failure -- utilities register but resolve to nothing.

| Tailwind Version | Transformer | Dark Mode Selector | Config File |
|-----------------|-------------|-------------------|-------------|
| v4 (CSS-first, no config file) | `tailwind-v4` | `[data-theme="dark"]` | None -- uses `@theme` in CSS |
| v3 (`tailwind.config.js`) | `tailwind-v3` | `.dark` | `tailwind.config.js` with `darkMode: 'class'` |
| v3 + `darkMode: 'media'` | `tailwind-v3` | `@media (prefers-color-scheme: dark)` | `tailwind.config.js` with `darkMode: 'media'` |

**How to detect your version**: If you have a `tailwind.config.js` or `tailwind.config.ts` file, you're on v3. If your CSS has `@import "tailwindcss"` and `@theme { }` blocks with no config file, you're on v4.

**CSS usage** -- import directly into your stylesheet:

```css
@import '@syncupsuite/themes/swiss-international/tailwind.css';
/* or */
@import '@syncupsuite/themes/nihon-traditional/tailwind.css';
```

**TypeScript usage** -- access token objects programmatically:

```typescript
import { swissInternational } from '@syncupsuite/themes';
import { buildTokens } from '@syncupsuite/transformers';
```

Available pre-built themes: `swiss-international`, `nihon-traditional`.

> **Skill vs. Package**: The package ships curated implementations. This skill teaches you to build your own -- custom cultural tokens from any tradition, following the same four-layer pattern. Use the package for speed; use this skill when you need a theme that doesn't exist yet.

---

## Build Your Own

If you need a custom cultural design system, follow the workflow below.

---

## Invocation

```
/theme-inspired-tokens
```

**Arguments**:
- `--theme <name>` -- Select a registered cultural foundation (see `references/theme-registry.md`)
- `--output tailwind-v4|tailwind-v3|dtcg` -- Output format (default: `tailwind-v4`)
- `--tier T0|T1|T2` -- Tenant tier context for token inheritance
- `--dark` -- Generate dark mode semantic layer
- `--validate` -- Run accessibility and consistency checks

---

## Four-Layer Architecture

Token generation follows four layers, each building on the previous. No layer may be skipped.

```
Layer 1: Theme Source (story)
    |
    v
Layer 2: Color Expansion (system)
    |
    v
Layer 3: Semantic Mapping (meaning)
    |
    v
Layer 4: Cross-Domain Tokens (completeness)
```

### Layer 1: Theme Source (Story)

Every token system begins with a **cultural foundation** -- a documented aesthetic tradition with verifiable provenance.

**Required inputs**:

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Foundation identifier | `nihon-no-iro-traditional` |
| `story` | 2-3 sentence narrative | "Rooted in the 465 traditional colors catalogued during Japan's Edo period..." |
| `philosophy` | Design worldview | "Wabi-sabi: beauty in imperfection and transience" |
| `era` | Historical or contemporary period | "Edo period (1603-1868), codified Meiji era" |
| `seedColors` | 5-7 colors with provenance | See below |

**Seed color specification**:

```json
{
  "$type": "color",
  "$value": "#2E4B6D",
  "$description": "Hanada (縹) -- deep indigo from the Tade-ai plant used in traditional Japanese dyeing since the 8th century",
  "provenance": {
    "tradition": "Japanese indigo dyeing (ai-zome)",
    "source": "Nihon no Dentou Iro (日本の伝統色)",
    "hex": "#2E4B6D"
  }
}
```

Every seed color MUST have:
- A name in its language of origin (romanized + native script where applicable)
- A specific cultural tradition or artifact it references
- A primary source or reference work

See `references/theme-registry.md` for curated foundations.

### Layer 2: Color Expansion (System)

Each seed color expands into a 9-step OKLCH lightness scale.

> **Why OKLCH** (ADR-001): OKLCH produces perceptually uniform lightness — equal L steps produce equal perceived brightness changes across all hues. HSL does not have this property; blue and purple hues appear darker than yellow at the same HSL lightness value. All `@syncupsuite/themes` packages use OKLCH natively.

**Lightness scale**:

| Step | OKLCH L (approx) | Usage Intent |
|------|------------------|--------------|
| 50 | ~0.95 | Backgrounds, subtle tints |
| 100 | ~0.90 | Hover backgrounds |
| 200 | ~0.82 | Borders, dividers |
| 300 | ~0.72 | Disabled states |
| 400 | ~0.62 | Secondary elements |
| 500 | Seed | Primary usage (seed value) |
| 600 | ~0.44 | Hover states |
| 700 | ~0.36 | Active states |
| 800 | ~0.26 | High-contrast text |
| 900 | ~0.16 | Maximum contrast |

L values are clamped to valid OKLCH range (0.05–0.98). Chroma is scaled proportionally to preserve hue character without over-saturating dark steps.

**Harmony modes** control how additional palette colors are derived from seeds:

| Mode | Description | Hue Rotation |
|------|-------------|--------------|
| Monochromatic | Single hue, varied lightness/saturation | 0 degrees |
| Golden Ratio | **Default**. Phi-based hue spacing | +137.5 degrees per step |
| Complementary | Opposite hue pairs | +180 degrees |
| Triadic | Three evenly-spaced hues | +120 degrees |
| Analogous | Adjacent hues for low-contrast harmony | +30 degrees per step |

Golden Ratio harmony is the default because it produces the most visually diverse yet naturally balanced palette -- the same mathematical relationship found in natural growth patterns.

**Neutral generation**: Neutrals are derived from the primary seed color by reducing saturation to 3-8% while preserving a tint of the original hue. This prevents "dead grays" and maintains cultural coherence.

### Layer 3: Semantic Mapping (Meaning)

Expanded primitives map to semantic tokens that describe **purpose, not appearance**.

**Required semantic categories**:

```
background.canvas       -- Page/app background
background.surface      -- Card/panel background
background.elevated     -- Modal/popover background
background.sunken       -- Inset/recessed areas
background.inverse      -- Inverted context background

text.primary            -- Body text
text.secondary          -- Supporting text
text.muted              -- Placeholder, disabled text
text.inverse            -- Text on inverse background
text.link               -- Hyperlink text
text.link.hover         -- Hyperlink hover state

border.default          -- Standard borders
border.strong           -- Emphasized borders
border.subtle           -- Low-contrast borders
border.focus            -- Focus ring color

interactive.primary     -- Primary action (button, link)
interactive.primary.hover
interactive.primary.active
interactive.secondary   -- Secondary action
interactive.secondary.hover
interactive.secondary.active
interactive.destructive -- Destructive action (delete, remove)
interactive.destructive.hover

status.error            -- Error states (PROTECTED)
status.success          -- Success states (PROTECTED)
status.warning          -- Warning states (PROTECTED)
status.info             -- Informational states

focus.ring              -- Focus indicator (PROTECTED)
```

**Dark mode is semantic inversion, not primitive swapping**:

- `background.canvas` maps to `neutral.900` in dark mode (was `neutral.50` in light)
- `text.primary` maps to `neutral.50` in dark mode (was `neutral.900` in light)
- Semantic token names NEVER change between modes -- only their primitive references change
- Dark mode is a parallel semantic mapping, not a CSS filter or primitive override

### Layer 4: Cross-Domain Tokens (Completeness)

A design system is not just colors. Layer 4 extends the cultural foundation into typography, spacing, and shape.

**Typography** (see `references/typography-mapping.md`):

The primary seed color's hue influences font selection:
- Warm hues (0-60, 300-360) suggest humanist/serif faces
- Cool hues (180-270) suggest geometric/sans-serif faces
- Neutral hues (60-180) are flexible

Token structure:
```
typography.family.heading    -- Heading font stack
typography.family.body       -- Body font stack
typography.family.mono       -- Monospace font stack
typography.size.xs           -- 12px / 0.75rem
typography.size.sm           -- 14px / 0.875rem
typography.size.base         -- 16px / 1rem
typography.size.lg           -- 18px / 1.125rem
typography.size.xl           -- 20px / 1.25rem
typography.size.2xl          -- 24px / 1.5rem
typography.size.3xl          -- 30px / 1.875rem
typography.size.4xl          -- 36px / 2.25rem
typography.weight.normal     -- 400
typography.weight.medium     -- 500
typography.weight.semibold   -- 600
typography.weight.bold       -- 700
typography.lineHeight.tight  -- 1.25
typography.lineHeight.normal -- 1.5
typography.lineHeight.relaxed -- 1.75
```

**Spacing** (8px grid):

```
spacing.0    -- 0px
spacing.1    -- 4px   (0.5 unit)
spacing.2    -- 8px   (1 unit)
spacing.3    -- 12px  (1.5 units)
spacing.4    -- 16px  (2 units)
spacing.5    -- 20px  (2.5 units)
spacing.6    -- 24px  (3 units)
spacing.8    -- 32px  (4 units)
spacing.10   -- 40px  (5 units)
spacing.12   -- 48px  (6 units)
spacing.16   -- 64px  (8 units)
spacing.20   -- 80px  (10 units)
spacing.24   -- 96px  (12 units)
```

**Border radius**:

```
radius.none  -- 0px
radius.sm    -- 4px
radius.md    -- 8px
radius.lg    -- 12px
radius.xl    -- 16px
radius.2xl   -- 24px
radius.full  -- 9999px
```

Radius selection is influenced by the cultural foundation:
- Japanese/Swiss traditions favor sharper radii (none to sm)
- Nordic/Italian traditions favor softer radii (md to lg)
- These are defaults, not constraints

---

## Output Format: DTCG-Aligned JSON

All tokens are output as W3C Design Token Community Group (DTCG) aligned JSON.

See `references/token-schema.md` for the full schema specification.

**Example output** (abbreviated):

```json
{
  "primitive": {
    "color": {
      "hanada": {
        "50": {
          "$type": "color",
          "$value": "#E8EEF4",
          "$description": "Hanada 50 -- lightest tint of traditional Japanese indigo"
        },
        "500": {
          "$type": "color",
          "$value": "#2E4B6D",
          "$description": "Hanada 500 -- base traditional Japanese indigo (ai-zome)"
        },
        "900": {
          "$type": "color",
          "$value": "#0E1A28",
          "$description": "Hanada 900 -- deepest shade of traditional Japanese indigo"
        }
      }
    }
  },
  "semantic": {
    "light": {
      "background": {
        "canvas": {
          "$type": "color",
          "$value": "{primitive.color.neutral.50}",
          "$description": "Page background -- light mode"
        }
      }
    },
    "dark": {
      "background": {
        "canvas": {
          "$type": "color",
          "$value": "{primitive.color.neutral.900}",
          "$description": "Page background -- dark mode"
        }
      }
    }
  }
}
```

---

## Multi-Tenant Integration

Tokens follow the platform's 3-tier inheritance model:

```
T0 (Platform Core)
  Defines: primitives, protected tokens, spacing grid, radius defaults
  Cannot be overridden: error, success, warning, focus, accessibility tokens
    |
    v
T1 (Partner Brand)
  Overrides: seed colors, typography families, harmony mode
  Adds: brand-specific semantic aliases
  Cultural overlay applied here (e.g., Japanese palette for JP market)
    |
    v
Cultural Overlay (optional)
  Adjusts: color temperature, typography flavor, radius style
  Scope: locale-specific refinement within a T1 brand
    |
    v
T2 (Customer Instance)
  Overrides: limited set (primary color, logo, heading font)
  Cannot override: protected tokens, spacing grid, radius system
    |
    v
User Preferences
  Overrides: dark/light mode, reduced motion, high contrast
  Applied via CSS custom property cascade
```

**Token resolution order** (last wins, except protected):

```
T0 defaults < T1 brand < cultural overlay < T2 overrides < user preferences
```

**Protected token paths** (cannot be overridden at T1/T2/user level):

```
status.error.*          -- Must remain distinguishable red
status.success.*        -- Must remain distinguishable green
status.warning.*        -- Must remain distinguishable amber
focus.ring              -- Must meet WCAG 2.1 focus indicator requirements
accessibility.*         -- High contrast, reduced motion, forced colors
```

Protected tokens are enforced by the validation layer. Any token file that attempts to redefine a protected path will fail validation with an explicit error.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| Core token CSS (gzipped) | < 20KB |
| Cultural overlay CSS (gzipped) | < 5KB |
| Theme switch latency | < 200ms |
| Token CSS parse time | < 50ms |

Achieving these targets:
- Primitives are CSS custom properties on `:root` (parsed once)
- Semantic mappings use `light-dark()` where supported, with fallback `[data-theme]` selectors
- Overlays are loaded as separate `<link>` stylesheets with `media` hints
- Theme switch toggles a single `data-theme` attribute -- no re-fetching

---

## Transformer Output

Tokens can be transformed to framework-specific formats:

| Format | File | Target |
|--------|------|--------|
| Tailwind v4 | `transformers/tailwind-v4.ts` | Greenfield projects (CSS-first `@theme`) |
| Tailwind v3 | `transformers/tailwind-v3.ts` | Brownfield migration (`tailwind.config.js`) |
| DTCG JSON | Native output | Framework-agnostic, Style Dictionary compatible |

---

## Integration Validation

These checks are MANDATORY between generating tokens and declaring completion. No token application is complete until every post-apply check passes.

### Pre-Apply Checks

Run these before writing any CSS to the project:

**1. Detect Tailwind version**

Scan the project for version indicators:

| Signal | Version |
|--------|---------|
| `tailwind.config.js` or `tailwind.config.ts` exists | v3 |
| CSS contains `@import "tailwindcss"` + `@theme { }` blocks, no config file | v4 |
| Both config file AND `@theme { }` blocks found | **WARN**: Mixed state — resolve before proceeding |

**2. Detect dark mode strategy**

| Signal | Strategy |
|--------|----------|
| `darkMode: 'class'` in config (v3) | `.dark` selector |
| `darkMode: 'media'` in config (v3) | `@media (prefers-color-scheme: dark)` |
| `[data-theme]` selectors in CSS (v4) | `[data-theme="dark"]` attribute |
| `prefers-color-scheme` in CSS (v4) | Media query |
| None detected | **WARN**: Cannot detect strategy — ask user before proceeding |

**3. Confirm transformer-strategy match**

Cross-reference detected Tailwind version with the transformer being applied:

| Detected Version | Expected Transformer | Dark Mode Selector |
|-----------------|---------------------|-------------------|
| v4 | `tailwind-v4` | `[data-theme="dark"]` |
| v3 + `darkMode: 'class'` | `tailwind-v3` | `.dark` |
| v3 + `darkMode: 'media'` | `tailwind-v3` | `@media (prefers-color-scheme: dark)` |

If the detected strategy does not match the transformer being used, **FAIL** with:
> Mismatch: detected Tailwind {version} with `{detected_strategy}`, but applying `{transformer}` transformer which outputs `{transformer_selector}`. Use the `{correct_transformer}` transformer instead, or migrate your project. See the Tailwind Compatibility table above.

**4. Check for naming conflicts**

Scan the project's existing CSS for custom properties that collide with token names being introduced (e.g., an existing `--color-primary` that would be overwritten by the token set). For each collision:
- Name the conflicting property and the file where it appears
- Show the existing value vs. the token value
- Ask whether to proceed (overwrite) or rename the token

### Post-Apply Checks

Run these after CSS is written, before declaring completion:

**1. `:root` completeness**

This is the **#1 failure mode** — `:root {}` blocks missing or incomplete cause `@theme` vars to circularly reference undefined custom properties. Tailwind utilities register but resolve to nothing, with zero console errors.

Confirm a `:root { }` block exists in the applied CSS containing ALL semantic custom properties from the token set. Check every required semantic token from Layer 3:

```
background.canvas, background.surface, background.elevated, background.sunken, background.inverse
text.primary, text.secondary, text.muted, text.inverse, text.link, text.link.hover
border.default, border.strong, border.subtle, border.focus
interactive.primary, interactive.primary.hover, interactive.primary.active
interactive.secondary, interactive.secondary.hover, interactive.secondary.active
interactive.destructive, interactive.destructive.hover
status.error, status.success, status.warning, status.info
focus.ring
```

For each missing var: `[FAIL] Missing --{token-name} in :root block. Add: --{token-name}: {expected-value};`

**2. Dark mode block completeness**

Confirm a dark mode block exists (either `[data-theme="dark"] { }` or `.dark { }`, matching the detected strategy) with 1:1 matching keys to `:root`. Every custom property in `:root` must have a corresponding entry in the dark block.

For each missing dark entry: `[FAIL] Missing --{token-name} in dark mode block. Light value is {light-value}; add dark counterpart: --{token-name}: {dark-value};`

**3. `var()` circular reference check**

Scan `@theme { }` blocks for entries where a custom property references itself or references an undefined property:

- Self-referencing: `--color-primary: var(--color-primary)` — **FAIL**
- Undefined reference: `--color-primary: var(--token-that-does-not-exist)` — **FAIL**
- Valid reference: `--color-primary: var(--sui-color-primary)` where `--sui-color-primary` is defined in `:root` — PASS

For each failure: `[FAIL] Circular/undefined var() in @theme: --{property} references {referenced-var} which {is itself | is not defined in :root}. Fix: replace with the resolved value from :root.`

**4. Contrast ratio validation**

Run `validateContrast()` (from `shared/validation/token-validator.ts`) on all semantic text+background pairs:

| Foreground | Background | Minimum Ratio | Standard |
|-----------|-----------|---------------|----------|
| `text.primary` | `background.canvas` | 4.5:1 | WCAG AA normal text |
| `text.secondary` | `background.canvas` | 4.5:1 | WCAG AA normal text |
| `text.muted` | `background.surface` | 4.5:1 | WCAG AA normal text |
| `interactive.primary` | `background.canvas` | 3:1 | WCAG AA large text / interactive |

Run these checks for BOTH light and dark mode token sets.

For each failure: `[FAIL] Contrast: {foreground-token} on {background-token} ({mode} mode) = {actual-ratio}:1, needs {required-ratio}:1. Adjust {foreground-token} to at least {suggested-value} for compliance.`

**5. Dark mode toggle reminder**

If the detected strategy is `[data-theme]`, remind the user:
> Wire `data-theme={theme}` on your root `<html>` or `<body>` element. Without this attribute, dark mode CSS will never activate. Example: `<html data-theme="light">` and toggle to `data-theme="dark"` via your theme switcher.

### Completion Gate

The skill does NOT declare completion until:
- All 4 pre-apply checks pass (or warnings are acknowledged)
- All 5 post-apply checks pass
- Any FAIL is resolved with the specific fix provided

Output format is actionable — every failure names the token, shows the problem, and provides the exact fix.

---

## Validation Checklist

Before tokens are accepted, the following checks MUST pass:

1. **Schema validation**: All tokens have `$type`, `$value`, `$description`
2. **Semantic completeness**: Every required semantic token is mapped
3. **Accessibility (WCAG AA)**: `text.primary` on `background.canvas` >= 4.5:1 contrast ratio *(schema-validated at build time; automated contrast computation planned — see ADR-005)*
4. **Accessibility (WCAG AA)**: `text.secondary` on `background.canvas` >= 4.5:1 contrast ratio *(see ADR-005)*
5. **Accessibility (WCAG AA)**: `interactive.primary` on `background.canvas` >= 3:1 contrast ratio *(see ADR-005)*
6. **Dark mode parity**: Every light semantic token has a dark counterpart
7. **Cultural provenance**: Every seed color has a non-empty `provenance` object
8. **Protected tokens**: No T1/T2 override of protected paths
9. **Performance**: Generated CSS is within budget

---

## Related References

- `references/contributing.md` -- Step-by-step guide for creating and submitting a new theme
- `references/token-schema.md` -- Full DTCG-aligned schema specification
- `references/theme-registry.md` -- Curated cultural foundations
- `references/typography-mapping.md` -- Hue-to-font mapping guide
- `transformers/tailwind-v4.ts` -- Tailwind v4 CSS-first transformer
- `transformers/tailwind-v3.ts` -- Tailwind v3 config transformer

---

## Diagnose Existing Installation

A read-only diagnostic for projects that have already applied `@syncupsuite/themes` or generated tokens via this skill. Identifies the root cause of silent failures — broken `:root` blocks, wrong transformer, missing dark mode, contrast violations — without modifying any files.

**Invocation**: `/webplatform4sync:diagnose-tokens` or `diagnose` command from Construction (`finish`) or Shu-Ha-Ri (`ha`) frames.

### Diagnostic Flow

Run all 9 checks in order. Output `[PASS]`, `[FAIL]`, or `[WARN]` for each.

**1. Package version**

Check if `@syncupsuite/themes` is installed and its version.

- `[PASS]` — installed, version >= 0.2.2
- `[FAIL]` — not installed → `Run: npm install @syncupsuite/themes@^0.2.2`
- `[FAIL]` — installed but < 0.2.2 → `Versions before 0.2.2 have broken subpath exports. Run: npm install @syncupsuite/themes@latest`

**2. Find CSS entry point**

Scan `src/` for files that import `@syncupsuite/themes` or contain `@theme { }` blocks.

- `[PASS]` — found entry point(s), list file paths
- `[WARN]` — multiple entry points found → list all, flag potential duplication
- `[FAIL]` — no entry point found → `No CSS file imports @syncupsuite/themes. Add an import to your main stylesheet: @import '@syncupsuite/themes/{theme-name}/tailwind.css';`

**3. `:root` completeness**

Confirm a `:root { }` block exists in the CSS entry point(s) with all expected semantic custom properties.

- `[PASS]` — all semantic vars present
- `[FAIL]` — missing vars → list each: `Missing --{token-name} in :root. Expected value: {value}`

Expected vars (from Layer 3 semantic mapping):
```
--color-bg-canvas, --color-bg-surface, --color-bg-elevated, --color-bg-sunken, --color-bg-inverse
--color-text-primary, --color-text-secondary, --color-text-muted, --color-text-inverse, --color-text-link, --color-text-link-hover
--color-border-default, --color-border-strong, --color-border-subtle, --color-border-focus
--color-interactive-primary, --color-interactive-primary-hover, --color-interactive-primary-active
--color-interactive-secondary, --color-interactive-secondary-hover, --color-interactive-secondary-active
--color-interactive-destructive, --color-interactive-destructive-hover
--color-status-error, --color-status-success, --color-status-warning, --color-status-info
--color-focus-ring
```

**4. Dark mode block**

Confirm a dark mode block exists with 1:1 matching keys to `:root`.

- `[PASS]` — dark block found with all matching keys
- `[FAIL]` — no dark block → `No dark mode block found. Expected: [data-theme="dark"] { } or .dark { } with all semantic vars.`
- `[FAIL]` — dark block exists but missing keys → list each missing key

**5. Circular `var()` references**

Scan `@theme { }` blocks for self-referencing or undefined var references.

- `[PASS]` — no circular or undefined references
- `[FAIL]` — per finding: `--{property} references var(--{ref}) which {is itself | is not defined}. Replace with the resolved value.`

**6. Dark mode strategy alignment**

Check that the CSS dark mode selector matches the application shell.

- Scan for React context providers, `data-theme` togglers, or `.dark` class togglers in `src/`
- Compare against the CSS selector used (`[data-theme="dark"]` vs `.dark` vs `prefers-color-scheme`)
- `[PASS]` — CSS selector matches app shell implementation
- `[WARN]` — cannot detect app shell strategy → `Verify your theme switcher sets {expected-attribute} on <html> or <body>.`
- `[FAIL]` — mismatch → `CSS uses {css-selector} but app shell toggles {app-method}. These must match for dark mode to activate.`

**7. Semantic token pairing**

Verify every light-mode semantic token has a dark-mode counterpart.

- `[PASS]` — 1:1 light/dark mapping
- `[FAIL]` — unpaired tokens → list each: `--{token} exists in light mode but has no dark counterpart.`

**8. Contrast ratios**

Run contrast ratio checks on all semantic text+background pairs in both light and dark modes:

| Pair | Minimum |
|------|---------|
| `text.primary` on `background.canvas` | 4.5:1 (AA normal) |
| `text.secondary` on `background.canvas` | 4.5:1 (AA normal) |
| `text.muted` on `background.surface` | 4.5:1 (AA normal) |
| `interactive.primary` on `background.canvas` | 3:1 (AA large/interactive) |

- `[PASS]` — all pairs meet minimums
- `[FAIL]` — per pair: `{foreground} on {background} ({mode}) = {ratio}:1, needs {minimum}:1.`

**9. Typography**

Confirm font families are either system fonts or loaded via `@font-face` or Google Fonts import.

- `[PASS]` — all declared font families are system fonts or have a corresponding `@font-face` / `@import` for loading
- `[WARN]` — font family declared but no loading mechanism found → `Font "{family}" is referenced but not loaded. Add a @font-face declaration or Google Fonts @import, or switch to a system font stack.`

### Output Format

```
Token Diagnostic Report — {project-name}
========================================

1. Package version .................. [PASS] @syncupsuite/themes@0.2.2
2. CSS entry point ................. [PASS] src/styles/globals.css
3. :root completeness .............. [FAIL] 3 missing vars (see below)
4. Dark mode block ................. [PASS] [data-theme="dark"]
5. Circular var() references ....... [PASS]
6. Dark mode strategy alignment .... [WARN] Cannot detect app shell
7. Semantic token pairing .......... [PASS]
8. Contrast ratios ................. [FAIL] 1 pair below AA (see below)
9. Typography ...................... [PASS]

─── Failures ───

3. :root completeness
   [FAIL] Missing --color-bg-elevated in :root. Expected value: oklch(0.98 0.005 240)
   [FAIL] Missing --color-bg-sunken in :root. Expected value: oklch(0.92 0.008 240)
   [FAIL] Missing --color-border-focus in :root. Expected value: oklch(0.55 0.15 240)

8. Contrast ratios
   [FAIL] text.muted on background.surface (dark mode) = 3.2:1, needs 4.5:1.
          Lighten text.muted to at least oklch(0.72 0.01 240) for compliance.

─── Warnings ───

6. Dark mode strategy alignment
   [WARN] Cannot detect theme switcher in src/. Verify your app sets
          data-theme="dark" on <html> or <body> for dark mode to activate.
```

This diagnostic is **read-only** — it reports problems and provides fixes but does not modify any files.
