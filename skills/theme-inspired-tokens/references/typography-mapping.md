# Typography Mapping Reference

How the primary seed color's hue influences typography selection, and how to build a complete typographic token set.

---

## Hue-to-Font Mapping

The primary seed color's hue (H value in HSL) carries cultural and aesthetic associations that should be reflected in typography choices. This is not a rigid rule but a starting point that maintains narrative coherence: if the color story is Japanese indigo, the typography should not feel like Swiss modernism (unless that tension is intentional).

### Hue Ranges and Aesthetic Associations

| Hue Range (degrees) | Temperature | Aesthetic Tendency | Typography Direction |
|---------------------|-------------|-------------------|---------------------|
| 0-30 | Warm (red) | Passionate, dramatic, classical | Humanist serif, high contrast |
| 30-60 | Warm (orange/gold) | Earthy, artisanal, organic | Slab serif, rounded sans |
| 60-120 | Neutral-warm (yellow/green) | Natural, balanced, approachable | Humanist sans, geometric sans |
| 120-180 | Cool-neutral (green/teal) | Grounded, sustainable, trustworthy | Grotesque sans, transitional serif |
| 180-240 | Cool (blue) | Professional, precise, technological | Geometric sans, neo-grotesque |
| 240-300 | Cool (indigo/violet) | Luxurious, creative, spiritual | Modern serif, didone |
| 300-360 | Warm (magenta/pink) | Expressive, bold, contemporary | Display sans, humanist serif |

### Recommended Font Stacks by Aesthetic Category

#### Humanist Serif (Warm hues, classical narratives)

Best for: Japanese traditional, Italian Renaissance, Tang Dynasty

```
Heading: "Cormorant Garamond", "EB Garamond", "Crimson Pro", Georgia, serif
Body:    "Source Serif 4", "Literata", "Merriweather", Georgia, serif
```

For Japanese content, pair with:
```
Heading: "Noto Serif JP", "Shippori Mincho", serif
Body:    "Noto Serif JP", serif
```

For Chinese content:
```
Heading: "Noto Serif SC", "LXGW WenKai", serif
Body:    "Noto Serif SC", serif
```

#### Geometric Sans (Cool hues, modernist narratives)

Best for: Swiss International Style, Japanese Contemporary Minimalist

```
Heading: "Inter", "DM Sans", "Outfit", system-ui, sans-serif
Body:    "Inter", "DM Sans", system-ui, sans-serif
```

Alternatively for a more distinctly geometric feel:
```
Heading: "Geist", "Plus Jakarta Sans", "Urbanist", sans-serif
Body:    "Geist", "Inter", sans-serif
```

#### Humanist Sans (Neutral hues, organic narratives)

Best for: Scandinavian Modern, nature-inspired themes

```
Heading: "Source Sans 3", "Nunito", "Cabin", system-ui, sans-serif
Body:    "Source Sans 3", "Nunito", system-ui, sans-serif
```

#### Neo-Grotesque (Cool blue hues, professional narratives)

Best for: Technology, finance, information-dense applications

```
Heading: "IBM Plex Sans", "Roboto", "Helvetica Neue", sans-serif
Body:    "IBM Plex Sans", "Roboto", sans-serif
```

#### Modern Serif / Didone (Cool violet hues, luxury narratives)

Best for: Fashion, luxury goods, editorial

```
Heading: "Playfair Display", "Libre Bodoni", "Cormorant", serif
Body:    "Spectral", "Lora", "Source Serif 4", serif
```

#### Slab Serif (Warm gold/earth hues, artisanal narratives)

Best for: Craft brands, heritage, food/beverage

```
Heading: "Zilla Slab", "Roboto Slab", "Bitter", serif
Body:    "Source Serif 4", Georgia, serif
```

#### Monospace (All themes)

Monospace is culturally neutral and should prioritize legibility:

```
Mono: "JetBrains Mono", "Fira Code", "Source Code Pro", "SF Mono", monospace
```

---

## Font Stack by Registered Theme

Quick reference for each theme in the registry:

| Theme ID | Heading | Body | Rationale |
|----------|---------|------|-----------|
| `nihon-no-iro-traditional` | "Noto Serif JP", serif | "Noto Serif JP", serif | Serif echoes brush calligraphy |
| `japan-contemporary-minimal` | "Inter", system-ui, sans-serif | "Inter", system-ui, sans-serif | Geometric sans matches MUJI objectivity |
| `tang-dynasty-imperial` | "Noto Serif SC", serif | "Noto Serif SC", serif | Serif honors calligraphic tradition |
| `china-modern-ink-wash` | "Noto Sans SC", sans-serif | "Noto Sans SC", sans-serif | Sans-serif for contemporary restraint |
| `swiss-international-style` | "Inter", "Helvetica Neue", sans-serif | "Inter", "Helvetica Neue", sans-serif | Neo-grotesque IS the Swiss style |
| `nordic-scandinavian-modern` | "Source Sans 3", system-ui, sans-serif | "Source Sans 3", system-ui, sans-serif | Humanist sans for warmth |
| `italian-renaissance-fresco` | "Cormorant Garamond", Georgia, serif | "Source Serif 4", Georgia, serif | Humanist serif from Italian origins |

---

## Weight Scale

The type weight scale uses four values that cover all UI needs. Avoid weight proliferation -- more weights means larger font downloads.

| Token | Weight | Usage |
|-------|--------|-------|
| `typography.weight.normal` | 400 | Body text, descriptions, secondary content |
| `typography.weight.medium` | 500 | Labels, navigation, subtle emphasis |
| `typography.weight.semibold` | 600 | Subheadings, card titles, emphasis |
| `typography.weight.bold` | 700 | Page headings, strong calls to action |

**Guideline**: Download only the weights you use. For most applications, 400 and 600 (or 400 and 700) suffice.

---

## Size Scale

Font sizes follow a modular scale based on the 16px root. The scale uses a ratio close to the major second (1.125) for body text and a larger ratio for headings, producing sizes that feel proportional without being mechanical.

| Token | Size | Rem | Usage |
|-------|------|-----|-------|
| `typography.size.xs` | 12px | 0.75rem | Captions, labels, badges |
| `typography.size.sm` | 14px | 0.875rem | Secondary body text, table cells |
| `typography.size.base` | 16px | 1rem | Primary body text |
| `typography.size.lg` | 18px | 1.125rem | Lead paragraphs, large body |
| `typography.size.xl` | 20px | 1.25rem | Section subheadings (h4-h5) |
| `typography.size.2xl` | 24px | 1.5rem | Subheadings (h3) |
| `typography.size.3xl` | 30px | 1.875rem | Section headings (h2) |
| `typography.size.4xl` | 36px | 2.25rem | Page headings (h1) |

---

## Line Height Relationships

Line height varies with text purpose. Tighter line heights for headings (where text is large and lines are few), relaxed for body text (where readability over long passages matters).

| Token | Value | Usage |
|-------|-------|-------|
| `typography.lineHeight.tight` | 1.25 | Headings, display text, short labels |
| `typography.lineHeight.normal` | 1.5 | Body text, paragraphs, descriptions |
| `typography.lineHeight.relaxed` | 1.75 | Small text, dense content where extra leading aids readability |

**Pairing guidance**:
- Headings (`3xl`, `4xl`): use `tight` (1.25)
- Subheadings (`xl`, `2xl`): use `tight` (1.25) or `normal` (1.5)
- Body (`base`, `lg`): use `normal` (1.5)
- Small / dense (`xs`, `sm`): use `normal` (1.5) or `relaxed` (1.75)

---

## Web Font Loading Strategy

Font loading directly impacts Core Web Vitals (FCP, LCP, CLS). Follow these rules:

### 1. Use `font-display: swap`

All `@font-face` declarations must include `font-display: swap`. This shows fallback text immediately, then swaps to the web font once loaded. Acceptable layout shift is a trade-off for eliminating invisible text.

```css
@font-face {
  font-family: "Inter";
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/inter-400.woff2") format("woff2");
}
```

### 2. Preload Critical Weights

Preload only the weights used above the fold (typically body normal and heading semibold/bold). Preloading all weights defeats the purpose.

```html
<link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-600.woff2" as="font" type="font/woff2" crossorigin>
```

**Rule**: Preload a maximum of 2-3 font files. Each preload is a high-priority network request.

### 3. Use WOFF2 Only

WOFF2 has 95%+ browser support and offers 30% better compression than WOFF. There is no reason to serve WOFF, TTF, or EOT in 2024+.

### 4. Self-Host When Possible

Self-hosting fonts (rather than loading from Google Fonts CDN) provides:
- Elimination of the DNS lookup + connection to fonts.googleapis.com
- Full cache control
- Privacy compliance (no third-party requests, relevant for GDPR)

For Cloudflare Workers projects, serve fonts from the same origin or an R2 bucket with appropriate `Cache-Control` headers.

### 5. Subset for CJK Fonts

CJK (Chinese, Japanese, Korean) fonts are significantly larger than Latin fonts. Use Unicode-range subsetting to load only the character sets needed:

```css
/* Latin subset */
@font-face {
  font-family: "Noto Serif JP";
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
  src: url("/fonts/noto-serif-jp-400-latin.woff2") format("woff2");
}

/* Japanese subset */
@font-face {
  font-family: "Noto Serif JP";
  font-weight: 400;
  font-display: swap;
  unicode-range: U+3000-9FFF, U+F900-FAFF, U+FF00-FFEF;
  src: url("/fonts/noto-serif-jp-400-jp.woff2") format("woff2");
}
```

Google Fonts does this automatically when using their CSS API, but self-hosted fonts require manual subsetting with tools like `pyftsubset` or `glyphanger`.

### 6. Fallback Font Metrics Matching

To minimize CLS during font swap, match the fallback font's metrics to the web font:

```css
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  ascent-override: 90.49%;
  descent-override: 22.56%;
  line-gap-override: 0%;
  size-adjust: 107.06%;
}
```

Tools like [Fontaine](https://github.com/unjs/fontaine) or [@next/font](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) generate these overrides automatically. For Vite projects, use the `fontaine` Vite plugin.

---

## Token Output Example

The typography layer in the DTCG JSON:

```json
{
  "primitive": {
    "typography": {
      "family": {
        "heading": {
          "$type": "fontFamily",
          "$value": "\"Noto Serif JP\", serif",
          "$description": "Heading font -- Noto Serif JP, chosen for nihon-no-iro-traditional theme to echo brush calligraphy"
        },
        "body": {
          "$type": "fontFamily",
          "$value": "\"Noto Serif JP\", serif",
          "$description": "Body font -- Noto Serif JP for reading continuity with headings"
        },
        "mono": {
          "$type": "fontFamily",
          "$value": "\"JetBrains Mono\", monospace",
          "$description": "Monospace font for code and data"
        }
      },
      "size": {
        "xs":   { "$type": "dimension", "$value": "0.75rem",  "$description": "12px -- captions, badges" },
        "sm":   { "$type": "dimension", "$value": "0.875rem", "$description": "14px -- secondary text" },
        "base": { "$type": "dimension", "$value": "1rem",     "$description": "16px -- primary body" },
        "lg":   { "$type": "dimension", "$value": "1.125rem", "$description": "18px -- lead text" },
        "xl":   { "$type": "dimension", "$value": "1.25rem",  "$description": "20px -- subheadings" },
        "2xl":  { "$type": "dimension", "$value": "1.5rem",   "$description": "24px -- section subheadings" },
        "3xl":  { "$type": "dimension", "$value": "1.875rem", "$description": "30px -- section headings" },
        "4xl":  { "$type": "dimension", "$value": "2.25rem",  "$description": "36px -- page headings" }
      },
      "weight": {
        "normal":   { "$type": "fontWeight", "$value": 400, "$description": "Normal weight -- body text" },
        "medium":   { "$type": "fontWeight", "$value": 500, "$description": "Medium weight -- labels, nav" },
        "semibold": { "$type": "fontWeight", "$value": 600, "$description": "Semibold -- subheadings, emphasis" },
        "bold":     { "$type": "fontWeight", "$value": 700, "$description": "Bold -- page headings, CTAs" }
      },
      "lineHeight": {
        "tight":   { "$type": "number", "$value": 1.25, "$description": "Tight leading for headings" },
        "normal":  { "$type": "number", "$value": 1.5,  "$description": "Normal leading for body text" },
        "relaxed": { "$type": "number", "$value": 1.75, "$description": "Relaxed leading for dense small text" }
      }
    }
  }
}
```
