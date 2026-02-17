# wp4s6_tokens

> Step 6 of 9 — Set up culturally-grounded design token system
> Previous: `wp4s5_auth` | Next: `wp4s7_deploy`

## What This Does

Establishes the design token pipeline: W3C DTCG-aligned token definitions, Style Dictionary build, Tailwind CSS 4 integration, and multi-tenant token inheritance. Tokens are culturally grounded — every color traces to a documented cultural or aesthetic tradition.

## Instructions

### 1. Read Discovery State

Load `.p4s/status.json`. Check the `discover` findings for existing token/styling state. Determine if Tailwind is v3 or v4.

### 2. Load the Theme-Inspired Tokens Skill

Read `skills/theme-inspired-tokens/skill.md` for the full specification. This covers:
- Four-layer token architecture (Theme Source -> Color Expansion -> Semantic Mapping -> Cross-Domain)
- DTCG-aligned JSON output format
- Multi-tenant token inheritance (T0 -> T1 -> cultural overlay -> T2 -> user prefs)
- Protected token paths (status colors, focus ring, accessibility)
- Performance budget (core CSS < 20KB gzipped)
- Validation checklist

### 3. Determine Token Approach

Ask the user:

> **What token setup do you need?**
> 1. **Platform defaults** — Use the standard slate-based neutral token set (start here for most projects)
> 2. **Cultural foundation** — Choose a documented cultural theme (Japanese, Swiss, Nordic, etc.)
> 3. **Custom brand** — Define your own seed colors with brand provenance

### 4. Set Up Core Tokens

#### Platform Defaults

Copy `scaffold/greenfield/base/src/styles/tokens/core.css` into the project. This provides:
- Neutral scale (slate-based, 50-900)
- Semantic colors (primary, accent, background, surface, text, border, status)
- Spacing (8px grid)
- Typography (Inter + JetBrains Mono)
- Border radius, shadows, transitions
- Dark mode via `@media (prefers-color-scheme: dark)`

#### Cultural Foundation

Use the skill to generate a culturally-grounded token set:
1. Select a foundation from `skills/theme-inspired-tokens/references/theme-registry.md`
2. Define 5-7 seed colors with provenance (name, tradition, source)
3. Expand seeds into 9-step lightness scales (Layer 2)
4. Map to semantic tokens (Layer 3)
5. Generate cross-domain tokens (Layer 4: typography, spacing, radius)

#### Custom Brand

Follow the same 4-layer process but with the user's brand colors as seeds. Each seed still needs a provenance story (brand origin, design rationale).

### 5. Configure Tailwind Integration

#### Tailwind v4 (CSS-first — default for greenfield)

Generate or verify `src/styles/app.css`:

```css
@import "tailwindcss";
@import "./tokens/core.css";

@theme {
  --color-primary: var(--color-primary);
  --color-accent: var(--color-accent);
  /* ... map all semantic tokens to Tailwind names */
}
```

#### Tailwind v3 (brownfield)

Generate `tailwind.config.js` entries that reference CSS custom properties. Follow `scaffold/brownfield/checklists/tailwind-v3-to-v4.md` for migration path.

### 6. Set Up Style Dictionary (Optional)

If the project uses JSON token sources (DTCG format), configure Style Dictionary:
- Use `scaffold/overlay/templates/style-dictionary.config.cjs`
- Source: `src/styles/tokens/**/*.json`
- Output: `src/styles/tokens/design-tokens.css` (CSS custom properties)
- Output: `src/styles/tokens/tokens.ts` (TypeScript constants)

### 7. Configure Multi-Tenant Token Inheritance

If the project has active T1/T2 tiers (from step 3):

- T0 defines platform defaults and protected tokens
- T1 can override: seed colors, typography families, harmony mode
- Cultural overlay: locale-specific refinement within T1 brand
- T2 can override: limited set (primary color, logo, heading font)
- User preferences: dark/light mode, reduced motion, high contrast

Protected token paths (enforced by validation, cannot be overridden):
- `status.error.*`, `status.success.*`, `status.warning.*`
- `focus.ring`
- `accessibility.*`

### 8. Run Token Validation

Use `shared/validation/token-validator.ts` to verify:
- All required semantic tokens present (`validateSchema`)
- WCAG AA contrast ratios met (`validateContrast`)
- No protected token overrides (`validateOverride`)

### 9. Update Status

Update `.p4s/status.json`:

```json
{
  "tokens": {
    "status": "completed",
    "completedAt": "<ISO 8601>",
    "approach": "defaults|cultural|custom",
    "foundation": "platform-defaults",
    "tailwindVersion": "4",
    "styleDictionary": false,
    "darkMode": true,
    "protectedTokens": true,
    "wcagAA": true
  }
}
```

## Reference

- `skills/theme-inspired-tokens/skill.md` — full token specification
- `skills/theme-inspired-tokens/references/theme-registry.md` — curated cultural foundations
- `skills/theme-inspired-tokens/references/token-schema.md` — DTCG schema spec
- `skills/theme-inspired-tokens/references/typography-mapping.md` — hue-to-font mapping
- `skills/theme-inspired-tokens/transformers/tailwind-v4.ts` — Tailwind v4 transformer
- `skills/theme-inspired-tokens/transformers/tailwind-v3.ts` — Tailwind v3 transformer
- `scaffold/greenfield/base/src/styles/tokens/core.css` — platform default tokens
- `scaffold/greenfield/base/src/styles/app.css` — Tailwind 4 integration template
- `scaffold/overlay/templates/style-dictionary.config.cjs` — Style Dictionary config
- `scaffold/brownfield/checklists/token-adoption.md` — incremental token adoption
- `shared/contracts/tokens.ts` — token type contracts
- `shared/validation/token-validator.ts` — token validation (schema, contrast, override)

## Completion

The user has a design token pipeline with culturally-grounded colors, semantic mapping, Tailwind integration, dark mode support, and accessibility validation. Multi-tenant token inheritance is configured if applicable.

Update `.p4s/status.json` step `tokens` status to `completed`.
