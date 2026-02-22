# Theme-Inspired Tokens

A Claude Code skill for generating culturally-grounded design token systems where every color, font, and spacing decision traces back to a cultural or aesthetic narrative.

**Principle**: "This blue is Hanada blue from Japanese indigo dyeing" -- not "I liked this hex code."

---

## Quick Start (pre-built)

`@syncupsuite/themes` provides pre-built implementations of this pattern. If you want production-ready cultural themes without building from scratch, install the package:

```bash
npm install @syncupsuite/themes   # v0.2.2 — OKLCH color math, security-audited, zero runtime deps
```

> **Package quality**: v0.1.1 has been through a comprehensive review — P0 CSS generation bugs fixed, P1 security hardening (CSS injection prevention), PERF_BUDGETS enforced, and 7 Architecture Decision Records (ADR-001 through ADR-007) governing all major design decisions. See `syncupsuite/themes/docs/adr/` for full detail.

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

- `references/token-schema.md` -- Full DTCG-aligned schema specification
- `references/theme-registry.md` -- Curated cultural foundations
- `references/typography-mapping.md` -- Hue-to-font mapping guide
- `transformers/tailwind-v4.ts` -- Tailwind v4 CSS-first transformer
- `transformers/tailwind-v3.ts` -- Tailwind v3 config transformer
