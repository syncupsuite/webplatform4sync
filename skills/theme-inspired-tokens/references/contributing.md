# Contributing a Theme to @syncupsuite/themes

A step-by-step guide for creating and submitting a culturally-grounded theme. Every color in this system traces back to a real tradition -- not a mood board.

---

## Before You Start

**What this guide covers**: Creating a new theme from scratch, starting with cultural research and ending with a pull request to `syncupsuite/themes`.

**What you need**:

- Node.js 18+ and pnpm 9.15+
- A clone of `syncupsuite/themes`
- A cultural tradition, aesthetic movement, or regional design heritage you want to express as a design system
- Time to research -- the research is the work, the code is the easy part

**Existing themes**: `swiss-international`, `nihon-traditional`. See `references/theme-registry.md` for 7 curated foundations ready for implementation.

---

## The Pipeline at a Glance

```
1. Research your cultural source
2. Define 5-7 seed colors with provenance
3. Write the foundation JSON file
4. Run the generator
5. Fix any validation failures
6. Review the output visually
7. Submit a pull request
```

Adding a new theme is a **single-file operation**. Drop a JSON file in `packages/foundations/data/`, run `pnpm generate`, and the pipeline builds everything: token tree, CSS custom properties, Tailwind integration, barrel exports. No other files need manual editing (ADR-007).

---

## Step 1: Research Your Cultural Source

This is the most important step. A theme is not a color palette -- it's a documented aesthetic tradition with verifiable provenance.

### What counts as a valid source

| Valid | Not valid |
|-------|-----------|
| A documented art movement (Bauhaus, Ukiyo-e) | "I like these colors" |
| A regional craft tradition (ai-zome indigo dyeing) | A screenshot from Dribbble |
| A historical color system (Traditional Chinese court colors) | A competitor's brand palette |
| Natural materials from a specific place (Tuscan earth pigments) | A generated palette from coolors.co |
| A codified design tradition (Swiss International Style) | A film or TV show's color grading |

### What makes provenance "historically verifiable"

A seed color's provenance must answer three questions:

1. **What is it called in its tradition?** Use the name from the source culture (romanized + native script where applicable). "Hanada (縹)" not "nice blue".

2. **Where does it come from?** Name the specific material, craft, artifact, or codification. "Indigo from the Tade-ai plant used in ai-zome dyeing since the 8th century" -- not "Japanese blue".

3. **What's the reference?** Cite a published work, museum collection, historical document, or scholarly source. Prefer primary sources and established references over blog posts.

### Research tips

- **Museum collections** are excellent primary sources. The Metropolitan Museum, V&A, and national museums of the source culture often publish color analyses of historical artifacts.
- **Traditional craft guilds and foundations** maintain color standards for living traditions (Japanese Traditional Crafts Association, Pantone's cultural color studies).
- **Academic monographs** on design movements (e.g., Richard Hollis on Swiss design, Nihon no Dentou Iro compendium for Japanese traditional colors).
- **Avoid translating between color systems**. If the tradition used mineral pigments, research the actual pigment. If it used natural dyes, research the dye plant. The hex value is an approximation of the real material -- acknowledge this in the description.

---

## Step 2: Define Seed Colors

You need **5-7 seed colors**. Each one expands into a 9-step OKLCH lightness scale (50-900), so 5 seeds produce 45+ primitive color tokens.

### Seed color JSON format

```json
{
  "hex": "#2E4B6D",
  "name": "Hanada (縹)",
  "tradition": "Japanese indigo dyeing (ai-zome). One of the oldest dye traditions in Japan, using Persicaria tinctoria leaves.",
  "source": "The Colors of Japan (Nihon no Iro), Kyoto Traditional Arts Foundation"
}
```

### Required fields

| Field | Description | Example |
|-------|-------------|---------|
| `hex` | Hex color value (6-digit, with `#`) | `#4A7C8A` |
| `name` | Name in tradition's language (romanized + native script) | `Fjord` or `Hanada (縹)` |
| `tradition` | 1-2 sentences: what material/craft/artifact, where, when | `Norwegian fjord water -- the cold teal of deep glacial inlets.` |
| `source` | Published reference work, museum, or scholarly citation | `Scandinavian Design, Charlotte & Peter Fiell` |

### Seed selection principles

1. **Include a near-black and a near-white**. The palette needs endpoints for text and backgrounds. These should still be culturally sourced (e.g., `Schwarz` in Swiss, `Sumi` ink in Japanese, `Birch` in Nordic).

2. **Include one high-chroma accent**. The palette needs at least one color with enough saturation to serve as `interactive.primary`. Without it, buttons and links will look muddy.

3. **Maintain tonal range**. The 5-7 seeds should not cluster in one lightness band. Spread them from dark to light.

4. **Consider semantic needs**. The generator auto-assigns status colors (error=red, success=green, warning=amber) but maps `interactive.primary` from your first seed. If your first seed is very dark (L < 0.2), the engine automatically picks the most chromatic seed for dark-mode interactives.

---

## Step 3: Write the Foundation JSON

Create a file at `packages/foundations/data/{theme-slug}.json`. The slug becomes the directory name, export name, and CSS import path.

**Naming**: Use kebab-case, descriptive, culture-first. Examples: `nihon-traditional`, `swiss-international`, `nordic-modern`, `tang-imperial`.

### Full foundation file structure

```json
{
  "$name": "nordic-scandinavian-modern",
  "$description": "Scandinavian Modern (Nordisk Modernism) -- warmth, natural materials, and democratic design from the Nordic countries",
  "$extensions": {
    "syncupsuite.foundation": {
      "story": "Emerged in the 1930s-1960s across Denmark, Sweden, Finland, and Norway as a democratic response to industrial modernism. Where Bauhaus was machine-pure, Scandinavian design insists on warmth: natural materials, soft light, and humane proportions.",
      "philosophy": "Hygge (Danish): coziness and togetherness. Lagom (Swedish): just the right amount.",
      "era": "1930s-1960s, with continuous Nordic evolution to present",
      "harmonyMode": "analogous",
      "radiusTendency": "moderate",
      "typographyCategory": "humanist-serif"
    }
  },
  "seedColors": [
    { "hex": "#E8DCC8", "name": "Bjork (Birch)", "tradition": "...", "source": "..." },
    { "hex": "#4A7C8A", "name": "Fjord", "tradition": "...", "source": "..." }
  ]
}
```

### Foundation metadata fields

| Field | Required | Description |
|-------|----------|-------------|
| `$name` | Yes | Foundation slug (kebab-case) |
| `$description` | Yes | One-line description with cultural context |
| `$extensions.syncupsuite.foundation.story` | Yes | 2-3 sentences: the historical narrative |
| `$extensions.syncupsuite.foundation.philosophy` | Yes | The design worldview in the tradition's own terms |
| `$extensions.syncupsuite.foundation.era` | Yes | Historical period or movement timeframe |
| `$extensions.syncupsuite.foundation.harmonyMode` | Yes | Color expansion mode (see below) |
| `$extensions.syncupsuite.foundation.radiusTendency` | Yes | Border radius style (see below) |
| `$extensions.syncupsuite.foundation.typographyCategory` | Yes | Font selection influence (see below) |
| `seedColors` | Yes | Array of 5-7 seed color objects |

### Harmony modes

| Mode | Description | Best for |
|------|-------------|----------|
| `golden-ratio` | Phi-based hue spacing (+137.5 degrees). **Default.** | Most themes -- visually diverse yet balanced |
| `monochromatic` | Single hue, varied lightness/saturation | Minimalist traditions (ink wash, Swiss) |
| `complementary` | Opposite hue pairs (+180 degrees) | High-contrast traditions (Renaissance, Tang) |
| `triadic` | Three evenly-spaced hues (+120 degrees) | Bold, vibrant traditions |
| `analogous` | Adjacent hues (+30 degrees per step) | Warm, cohesive traditions (Nordic, Art Nouveau) |

### Radius tendencies

| Value | Effect | Cultural examples |
|-------|--------|-------------------|
| `none` | All sharp corners (0px except `full`) | Swiss grid, MUJI minimalism |
| `subtle` | 2-4px | Japanese traditional (tatami geometry) |
| `moderate` | 4-12px | Nordic (Aalto curves), Renaissance (arches) |
| `rounded` | 8-24px | Art Deco, playful traditions |

### Typography categories

| Value | Maps to | Cultural examples |
|-------|---------|-------------------|
| `humanist-serif` | Warm serifs (Garamond, Libre Baskerville) | Renaissance, Nordic, warm traditions |
| `neo-grotesque` | Clean sans (Helvetica, Inter) | Swiss, modernist, corporate |
| `geometric-sans` | Geometric shapes (Futura, Poppins) | Bauhaus, Art Deco |
| `slab-serif` | Strong serifs (Rockwell, Roboto Slab) | Industrial, Victorian |
| `calligraphic` | Script influence (system default with serif fallback) | East Asian, Arabic, Indic |

If unsure, omit -- the engine auto-detects based on the primary seed's hue angle.

---

## Step 4: Run the Generator

From the repository root:

```bash
cd themes/
pnpm install           # If first time
pnpm generate          # Build all themes including yours
```

The generator (`scripts/generate-themes.ts`) runs these steps per foundation file:

1. **Validate** the foundation JSON structure
2. **Build** the token tree (primitives, neutrals, harmony accents, semantics, typography, spacing, radius)
3. **Validate** the token tree (schema, completeness, contrast)
4. **Transform** to CSS and Tailwind v4 output
5. **Enforce** performance budgets (gzipped CSS < 20KB, < 250 properties)
6. **Write** output files to `packages/themes/src/{theme-slug}/`
7. **Regenerate** barrel files (index.ts, data.ts)

### Generator output

For a theme named `nordic-modern`, the generator creates:

```
packages/themes/src/nordic-modern/
  tokens.json     # Complete DTCG token tree
  tokens.css      # CSS custom properties (:root + [data-theme="dark"])
  tailwind.css    # Tailwind v4 @theme integration
  meta.json       # Theme metadata + validation results
  _css.ts         # Embedded CSS strings for programmatic access
  index.ts        # TypeScript export (auto-generated)
```

---

## Step 5: Fix Validation Failures

The generator runs three validation checks. All must pass for the theme to be accepted.

### Schema validation

Every token must have `$type`, `$value`, and `$description`. If this fails, there's a bug in the engine -- file an issue.

### Completeness validation

All required semantic tokens must be present (backgrounds, text, interactive, border, status, focus). If this fails, the semantic mapping in `engine.ts` has a gap. File an issue.

### Contrast validation

WCAG AA contrast ratios are checked for these pairs in both light and dark modes:

| Foreground | Background | Minimum ratio |
|-----------|-----------|---------------|
| `text.primary` | `background.canvas` | 4.5:1 (AA normal text) |
| `text.secondary` | `background.canvas` | 4.5:1 (AA normal text) |
| `text.muted` | `background.surface` | 4.5:1 (AA normal text) |
| `interactive.primary` | `background.canvas` | 3:1 (AA large text / interactive) |

**Contrast failures are the most common issue.** They mean your seed colors, when expanded through the lightness scale, produce foreground/background pairs that don't meet accessibility minimums.

**How to fix contrast failures**:

1. **Check which mode fails** (light, dark, or both). The generator output tells you exactly which pair failed and the actual ratio.

2. **Adjust the seed color's lightness**. A seed that's too close to mid-gray (L ~0.5) produces a scale where the light and dark ends lack contrast. Push the seed slightly darker or lighter.

3. **Don't change the hex to an arbitrary value** -- find the closest value that maintains cultural fidelity while passing contrast. Example: if Fjord blue at `#4A7C8A` produces a 400-step that fails as interactive.primary in dark mode, you might shift to `#457589` (slightly darker, same hue family, still fjord water).

4. **Re-run `pnpm generate`** after each adjustment. Iterate until all pairs pass.

**Performance budget failures** are rare but mean the theme produces too much CSS. This usually happens with excessive seed colors -- stick to 5-7.

---

## Step 6: Review the Output Visually

Validation passing is necessary but not sufficient. Open the generated CSS and review:

1. **Does `:root` contain all semantic properties?** This is the #1 integration failure. Open `tokens.css` and confirm a `:root { }` block with all `--color-*` custom properties defined.

2. **Does the dark mode block mirror `:root`?** A `[data-theme="dark"] { }` block should have 1:1 matching keys.

3. **Does `tailwind.css` reference the correct vars?** The `@theme { }` block should reference `var(--...)` properties that exist in `:root`, not circular self-references.

4. **Do the colors feel right?** Apply the CSS to a test page. Does it feel like the culture it represents? If Fjord blue looks Caribbean, something went wrong.

### Quick visual test

Create a test HTML file:

```html
<!DOCTYPE html>
<html data-theme="light">
<head>
  <link rel="stylesheet" href="packages/themes/src/{slug}/tokens.css">
  <style>
    body { background: var(--color-bg-canvas); color: var(--color-text-primary); font-family: system-ui; padding: 2rem; }
    .surface { background: var(--color-bg-surface); padding: 1rem; border: 1px solid var(--color-border-default); border-radius: 8px; }
    .button { background: var(--color-interactive-primary); color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; }
    .button:hover { background: var(--color-interactive-primary-hover); }
    .muted { color: var(--color-text-muted); }
    .secondary { color: var(--color-text-secondary); }
  </style>
</head>
<body>
  <h1>Theme Test: {Theme Name}</h1>
  <p>Primary text on canvas background.</p>
  <p class="secondary">Secondary text on canvas.</p>
  <p class="muted">Muted text on canvas.</p>
  <div class="surface">
    <p>Text on surface background.</p>
    <button class="button">Primary action</button>
  </div>
  <br>
  <button onclick="document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'">Toggle dark mode</button>
</body>
</html>
```

Toggle between light and dark. Both should look intentional, not broken.

---

## Step 7: Submit a Pull Request

### Before submitting

Run the full validation suite:

```bash
cd themes/
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint
pnpm typecheck    # Type-check
```

All must pass. The CI pipeline will reject PRs with failures.

### PR content

Your pull request should contain exactly **one new file**: `packages/foundations/data/{theme-slug}.json`. All other generated files are created by `pnpm generate` and committed alongside.

**PR title**: `feat(themes): add {theme-name} theme`

**PR body must include**:

1. **Cultural context** -- 2-3 sentences on the tradition, why this theme matters, and who it serves.

2. **Seed color provenance table** -- for each seed color: name, hex, tradition, source reference.

3. **Contrast validation results** -- paste the generator's contrast output showing all pairs pass.

4. **Visual preview** -- screenshots of the test page (or any page) in both light and dark mode.

5. **Checklist**:
   - [ ] All seed colors have verifiable provenance with cited sources
   - [ ] `pnpm generate` passes with zero errors
   - [ ] Contrast validation passes for all pairs in both light and dark modes
   - [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` all pass
   - [ ] Visual review: light mode looks intentional
   - [ ] Visual review: dark mode looks intentional
   - [ ] Foundation JSON has `$name`, `$description`, `$extensions`, and `seedColors`
   - [ ] Theme slug matches `$name` field

### Review criteria

Reviewers will evaluate:

| Criterion | Weight | What reviewers check |
|-----------|--------|---------------------|
| **Provenance quality** | High | Are sources real, cited, and verifiable? Would a design historian recognize these references? |
| **Cultural authenticity** | High | Does the palette genuinely reflect the named tradition? Is it respectful and informed? |
| **Contrast compliance** | Required | All WCAG AA pairs must pass. Non-negotiable. |
| **Seed diversity** | Medium | Are seeds well-distributed across lightness? Is there a usable dark, light, and accent? |
| **Narrative coherence** | Medium | Does the story/philosophy/era form a coherent picture? |
| **Performance** | Required | Within budget. |

PRs will be rejected for:

- Unverifiable provenance ("I think this is a traditional color")
- Appropriative framing (claiming cultural ownership without understanding or connection)
- Contrast failures
- Missing dark mode parity
- Seeds that cluster in one lightness range

---

## Worked Example: Nordic Modern

This walkthrough creates a Nordic Scandinavian Modern theme from scratch.

### Research phase

**Source tradition**: Scandinavian Modern design movement (1930s-1960s) across Denmark, Sweden, Finland, Norway. Key figures: Alvar Aalto (Finnish architect, bent birch), Arne Jacobsen (Danish, Egg/Swan chairs), Marimekko (Finnish textile), Bruno Mathsson (Swedish furniture).

**Core references**:
- *Scandinavian Design*, Charlotte & Peter Fiell (Taschen)
- *Nordic Light: Modern Scandinavian Architecture*, Henry Plummer
- Designmuseum Danmark (Copenhagen) collection
- Nationalmuseum Stockholm's Nordic design archive

**Design philosophy**: Hygge (coziness), Lagom (balance), democratic access. Warmth through natural materials, soft light, humane proportions.

### Seed color selection

| # | Name | Hex | Tradition | Source |
|---|------|-----|-----------|--------|
| 1 | Bjork (Birch) | `#E8DCC8` | Birch wood -- the defining material of Scandinavian furniture. Light, warm, alive. | Finnish birch forests (Artek, Iittala) |
| 2 | Fjord | `#4A7C8A` | Norwegian fjord water -- cold teal of deep glacial inlets under overcast skies. | *Nordic Light*, Henry Plummer |
| 3 | Lingon (Lingonberry) | `#A63D40` | Deep berry red from Nordic cuisine and folk textiles. Warm but not aggressive. | Swedish folk art, Dalarna museums |
| 4 | Mos (Moss) | `#6B7D5E` | Forest moss green -- muted green of Scandinavian boreal forests. | Norwegian boreal ecology |
| 5 | Sno (Snow) | `#F5F2ED` | Nordic snow white -- not blue-white but warm snow at golden hour. | Nordic interior design canon |
| 6 | Gran (Spruce) | `#2C3E3A` | Dark spruce -- near-black green of Norwegian spruce forests in winter. | *Scandinavian Design*, Fiell |
| 7 | Ull (Wool) | `#B8AFA4` | Undyed wool gray -- natural gray-brown of Norwegian sheep's wool. | Traditional textile, Nordic Museum Stockholm |

**Checklist**:
- Near-black: Gran `#2C3E3A` (dark spruce)
- Near-white: Sno `#F5F2ED` (warm snow)
- High-chroma accent: Lingon `#A63D40` (lingonberry red) and Fjord `#4A7C8A` (fjord teal)
- Tonal spread: from L~0.28 (Gran) to L~0.95 (Sno)

### Foundation JSON

File: `packages/foundations/data/nordic-modern.json`

```json
{
  "$name": "nordic-scandinavian-modern",
  "$description": "Scandinavian Modern (Nordisk Modernism) -- warmth, natural materials, and democratic design from the Nordic countries",
  "$extensions": {
    "syncupsuite.foundation": {
      "story": "Emerged in the 1930s-1960s across Denmark, Sweden, Finland, and Norway as a democratic response to industrial modernism. Where Bauhaus was machine-pure, Scandinavian design insists on warmth: natural materials, soft light, and humane proportions. Alvar Aalto's bent birch, Arne Jacobsen's organic chairs, and Marimekko's joyful patterns all share a belief that good design belongs to everyone, not just museums.",
      "philosophy": "Hygge (Danish): coziness and togetherness. Lagom (Swedish): just the right amount. Design should feel like a warm room in a cold climate.",
      "era": "1930s-1960s, with continuous Nordic evolution to present",
      "harmonyMode": "analogous",
      "radiusTendency": "moderate",
      "typographyCategory": "humanist-serif"
    }
  },
  "seedColors": [
    {
      "hex": "#E8DCC8",
      "name": "Bjork (Birch)",
      "tradition": "Birch wood -- the defining material of Scandinavian furniture. Light, warm, and alive. From Finnish birch forests that supply Artek and Iittala.",
      "source": "Scandinavian Design, Charlotte & Peter Fiell"
    },
    {
      "hex": "#4A7C8A",
      "name": "Fjord",
      "tradition": "Norwegian fjord water -- the cold teal of deep glacial inlets under overcast skies. Not tropical; this blue has weight and depth.",
      "source": "Nordic Light: Modern Scandinavian Architecture, Henry Plummer"
    },
    {
      "hex": "#A63D40",
      "name": "Lingon (Lingonberry)",
      "tradition": "Lingonberry red -- the deep berry red found across Nordic cuisine and folk textiles. Warm but not aggressive.",
      "source": "Swedish folk art collections, Dalarna Museum"
    },
    {
      "hex": "#6B7D5E",
      "name": "Mos (Moss)",
      "tradition": "Forest moss green -- the muted green of Scandinavian boreal forests. Grounded and organic, never synthetic.",
      "source": "Norwegian boreal ecology, Nordic landscape tradition"
    },
    {
      "hex": "#F5F2ED",
      "name": "Sno (Snow)",
      "tradition": "Nordic snow white -- not blue-white but the warm white of snow at golden hour. The dominant 'color' of Nordic interiors.",
      "source": "Nordic interior design canon, Designmuseum Danmark"
    },
    {
      "hex": "#2C3E3A",
      "name": "Gran (Spruce)",
      "tradition": "Dark spruce -- the near-black green of Norwegian spruce forests in winter. Used for deep backgrounds and contrast.",
      "source": "Scandinavian Design, Charlotte & Peter Fiell"
    },
    {
      "hex": "#B8AFA4",
      "name": "Ull (Wool)",
      "tradition": "Undyed wool gray -- the natural gray-brown of Norwegian sheep's wool before dyeing. Warm neutral.",
      "source": "Traditional Nordic textiles, Nordic Museum Stockholm"
    }
  ]
}
```

### Running the generator

```bash
cd themes/
pnpm generate
```

Expected output (abbreviated):

```
Generating: nordic-modern
  tokens.json: 12847 bytes
  tokens.css: 4218 bytes raw, 1245B gzipped (budget: 20480B)
  tailwind.css: 3892 bytes
  properties: 142 (budget: 250)
  schema: PASS
  contrast: PASS (8 pairs, 0 failures)
  completeness: PASS
```

If contrast fails, adjust the failing seed's hex value and re-run. See Step 5 for debugging.

### Fixing a hypothetical contrast failure

Suppose the generator reports:

```
Contrast failures (1):
  text.muted on background.surface (dark mode) = 3.8:1 (need 4.5:1)
```

This means the muted text color derived from the neutral scale doesn't have enough contrast against the dark surface. Since neutrals are tinted by the primary seed (Bjork, a warm beige), the dark-mode neutrals may be too warm and close in lightness.

Fix: shift Bjork slightly -- from `#E8DCC8` to `#E5D9C3` (marginally more saturated, same family). Re-run. If it still fails, consider whether Gran (the darkest seed) is dark enough -- shifting it from `#2C3E3A` to `#253632` gives the neutral scale a wider dynamic range.

### After validation passes

```bash
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

Then open a PR with the foundation JSON, generated output files, and the checklist from Step 7.

---

## FAQ

**Can I contribute a theme from my own culture?**
Yes -- that's the ideal. The best themes come from people who have lived experience with the tradition, not just academic knowledge.

**What if my tradition doesn't have 5 distinct colors?**
Some traditions (Chinese ink wash, for example) are deliberately monochromatic. Use `harmonyMode: "monochromatic"` and lean into shades of a single hue. You still need a near-white and near-black for backgrounds and text, plus one accent for interactive elements.

**Can I update an existing theme?**
Yes. Edit the foundation JSON, re-run `pnpm generate`, and submit a PR explaining the change. Provenance improvements (better sources, corrected historical context) are always welcome.

**My seed color is slightly different from published references. Is that OK?**
Hex values are always approximations of physical materials. That's fine. What matters is that the named tradition is real and the hex is a reasonable digital representation. Document your conversion method if possible (e.g., "Measured from Munsell chart 5B 4/6, converted via ColorMine").

**How do I register a theme in the skill's theme registry?**
Add an entry to `skills/theme-inspired-tokens/references/theme-registry.md` in the `webplatform4sync` repo. This is a separate PR from the theme implementation.

**What about Tailwind v3 support?**
The generator currently outputs Tailwind v4 CSS. Tailwind v3 support uses a separate transformer (`transformers/tailwind-v3.ts`). If you need v3 output for your project, file an issue -- it's not part of the standard contribution flow.
