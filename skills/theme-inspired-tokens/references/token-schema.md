# Token Schema Reference

DTCG-aligned (W3C Design Token Community Group) token schema for theme-inspired-tokens.

---

## Token Structure

Every token is a JSON object with required and optional fields.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `$type` | string | The token type (see Token Types below) |
| `$value` | string \| number | The resolved value or a reference |
| `$description` | string | Human-readable description including cultural provenance for seed colors |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `$extensions` | object | Vendor-specific metadata |
| `provenance` | object | Cultural source information (required for seed colors) |

### Example

```json
{
  "$type": "color",
  "$value": "#2E4B6D",
  "$description": "Hanada (縹) -- deep indigo from traditional Japanese ai-zome dyeing"
}
```

---

## Token Types

| `$type` Value | `$value` Format | Example |
|---------------|-----------------|---------|
| `color` | Hex string (`#RRGGBB` or `#RRGGBBAA`) | `"#2E4B6D"` |
| `dimension` | Number with unit | `"16px"`, `"1.5rem"` |
| `fontFamily` | Quoted font stack | `"\"Inter\", sans-serif"` |
| `fontWeight` | Number or keyword | `400`, `"bold"` |
| `number` | Raw number | `1.5` |
| `duration` | Time with unit | `"200ms"` |
| `cubicBezier` | Array of 4 numbers | `[0.4, 0, 0.2, 1]` |

---

## Token Categories

Tokens are organized into three categories, each at a specific depth in the JSON tree.

### 1. Primitive Tokens (Raw Values)

Direct, literal values with no references. These are the atoms of the system.

**Path**: `primitive.<domain>.<name>.<scale>`

```json
{
  "primitive": {
    "color": {
      "hanada": {
        "50":  { "$type": "color", "$value": "#E8EEF4", "$description": "Hanada 50 -- lightest tint" },
        "500": { "$type": "color", "$value": "#2E4B6D", "$description": "Hanada 500 -- base" },
        "900": { "$type": "color", "$value": "#0E1A28", "$description": "Hanada 900 -- deepest shade" }
      },
      "neutral": {
        "50":  { "$type": "color", "$value": "#F5F6F7", "$description": "Neutral 50 -- warm gray tinted from primary" },
        "900": { "$type": "color", "$value": "#121517", "$description": "Neutral 900 -- near-black with hue tint" }
      }
    },
    "spacing": {
      "2": { "$type": "dimension", "$value": "8px", "$description": "Base spacing unit" }
    },
    "typography": {
      "family": {
        "heading": { "$type": "fontFamily", "$value": "\"Noto Serif JP\", serif", "$description": "Heading font" }
      },
      "size": {
        "base": { "$type": "dimension", "$value": "1rem", "$description": "Base font size (16px)" }
      },
      "weight": {
        "normal": { "$type": "fontWeight", "$value": 400, "$description": "Normal weight" }
      },
      "lineHeight": {
        "normal": { "$type": "number", "$value": 1.5, "$description": "Normal line height" }
      }
    },
    "radius": {
      "md": { "$type": "dimension", "$value": "8px", "$description": "Medium border radius" }
    }
  }
}
```

### 2. Semantic Tokens (Purpose Aliases)

Reference primitive tokens by purpose, not appearance. Semantic tokens MUST use the reference syntax (see below) or literal values. They are split into `light` and `dark` sub-trees.

**Path**: `semantic.<mode>.<purpose>.<variant>`

```json
{
  "semantic": {
    "light": {
      "background": {
        "canvas": {
          "$type": "color",
          "$value": "{primitive.color.neutral.50}",
          "$description": "Page background -- light mode"
        }
      },
      "text": {
        "primary": {
          "$type": "color",
          "$value": "{primitive.color.neutral.900}",
          "$description": "Primary body text -- light mode"
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
      },
      "text": {
        "primary": {
          "$type": "color",
          "$value": "{primitive.color.neutral.50}",
          "$description": "Primary body text -- dark mode"
        }
      }
    }
  }
}
```

### 3. Component Tokens (UI-Specific)

Bind semantic tokens to specific UI components. These are optional and typically generated per-project.

**Path**: `component.<component>.<element>.<state>`

```json
{
  "component": {
    "button": {
      "primary": {
        "background": {
          "$type": "color",
          "$value": "{semantic.light.interactive.primary}",
          "$description": "Primary button background"
        },
        "background-hover": {
          "$type": "color",
          "$value": "{semantic.light.interactive.primary.hover}",
          "$description": "Primary button background on hover"
        },
        "text": {
          "$type": "color",
          "$value": "#FFFFFF",
          "$description": "Primary button text (always white for contrast)"
        },
        "border-radius": {
          "$type": "dimension",
          "$value": "{primitive.radius.md}",
          "$description": "Primary button corner radius"
        }
      }
    },
    "input": {
      "border": {
        "$type": "color",
        "$value": "{semantic.light.border.default}",
        "$description": "Input field border color"
      },
      "border-focus": {
        "$type": "color",
        "$value": "{semantic.light.border.focus}",
        "$description": "Input field border color when focused"
      }
    }
  }
}
```

---

## Naming Conventions

### General Rules

- Use **kebab-case** for all token names: `background-canvas`, not `backgroundCanvas`
- Use dots as path separators in the JSON tree (keys at each nesting level)
- Numeric scale steps use plain numbers: `50`, `100`, `500`, `900`
- State variants append to the name: `primary`, `primary-hover`, `primary-active`

### Color Naming

Seed colors use their cultural name (romanized):
- `hanada` (Japanese indigo)
- `shu` (Chinese vermillion)
- `rosso-corsa` (Italian racing red)

NOT generic names like `blue`, `red`, `primary-blue`.

### Reserved Names

These names have fixed meanings and must not be repurposed:

| Name | Fixed Meaning |
|------|--------------|
| `neutral` | Desaturated scale derived from primary hue |
| `error` | Error/danger states |
| `success` | Success/positive states |
| `warning` | Warning/caution states |
| `info` | Informational states |

---

## Reference Syntax

Tokens can reference other tokens using curly-brace path syntax:

```
{primitive.color.hanada.500}
```

**Rules**:
1. References use the full dot-separated path from the token root
2. References MUST resolve to a token with a concrete `$value` (no circular references)
3. References are resolved at build time by the transformer
4. In CSS output, references become `var(--primitive-color-hanada-500)`
5. Multi-level references are allowed: a semantic token can reference a primitive, and a component token can reference a semantic

### Resolution Chain

```
component.button.primary.background
  -> {semantic.light.interactive.primary}
    -> {primitive.color.hanada.500}
      -> #2E4B6D
```

---

## Validation Rules

All tokens MUST pass these validation checks before acceptance.

### 1. Schema Validation

- Every token object has `$type`, `$value`, and `$description`
- `$type` is one of the recognized token types
- `$value` matches the expected format for its `$type`
- No unknown top-level keys (only `$type`, `$value`, `$description`, `$extensions`, `provenance`)

### 2. Semantic Completeness

Every required semantic path (listed in `skill.md` Layer 3) must be present in both `semantic.light` and `semantic.dark` sub-trees.

Missing paths cause a validation error, not a warning.

### 3. Accessibility (WCAG AA)

Contrast ratio requirements:

| Token Pair | Minimum Ratio | Standard |
|------------|--------------|----------|
| `text.primary` on `background.canvas` | 4.5:1 | WCAG AA normal text |
| `text.secondary` on `background.canvas` | 4.5:1 | WCAG AA normal text |
| `text.muted` on `background.canvas` | 3:1 | WCAG AA large text / UI |
| `interactive.primary` on `background.canvas` | 3:1 | WCAG AA UI components |
| `text.primary` on `background.surface` | 4.5:1 | WCAG AA normal text |
| `text.inverse` on `background.inverse` | 4.5:1 | WCAG AA normal text |
| `focus.ring` against adjacent colors | 3:1 | WCAG 2.1 Focus Appearance |

Contrast checks apply to BOTH light and dark semantic modes.

### 4. Consistency Validation

- Every primitive color scale has all 9 steps (50, 100, 200, 300, 400, 500, 600, 700, 800, 900)
- Lightness values are monotonically decreasing from step 50 to step 900
- Neutral scale exists and is derived from the primary seed hue
- Spacing scale follows the 8px grid (values are multiples of 4px)

### 5. Cultural Provenance

- Every seed color (the 500-step of a named color scale) has a `provenance` object
- `provenance.tradition` is a non-empty string
- `provenance.source` references a verifiable cultural source
- `$description` includes the name in its language of origin

### 6. Protected Token Integrity

- `status.error`, `status.success`, `status.warning` resolve to visually distinct hues
- `focus.ring` meets WCAG 2.1 focus indicator requirements
- These tokens exist at T0 and cannot be overridden at T1/T2 levels

---

## Complete Token Tree Structure

```
root/
├── primitive/
│   ├── color/
│   │   ├── <seed-name>/          # e.g., hanada, sakura, shu
│   │   │   ├── 50
│   │   │   ├── 100
│   │   │   ├── 200
│   │   │   ├── 300
│   │   │   ├── 400
│   │   │   ├── 500               # Base seed value
│   │   │   ├── 600
│   │   │   ├── 700
│   │   │   ├── 800
│   │   │   └── 900
│   │   └── neutral/              # Derived from primary hue
│   │       ├── 50 ... 900
│   ├── spacing/
│   │   ├── 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
│   ├── typography/
│   │   ├── family/
│   │   │   ├── heading
│   │   │   ├── body
│   │   │   └── mono
│   │   ├── size/
│   │   │   ├── xs, sm, base, lg, xl, 2xl, 3xl, 4xl
│   │   ├── weight/
│   │   │   ├── normal, medium, semibold, bold
│   │   └── lineHeight/
│   │       ├── tight, normal, relaxed
│   └── radius/
│       ├── none, sm, md, lg, xl, 2xl, full
│
├── semantic/
│   ├── light/
│   │   ├── background/
│   │   │   ├── canvas, surface, elevated, sunken, inverse
│   │   ├── text/
│   │   │   ├── primary, secondary, muted, inverse, link, link-hover
│   │   ├── border/
│   │   │   ├── default, strong, subtle, focus
│   │   ├── interactive/
│   │   │   ├── primary, primary-hover, primary-active
│   │   │   ├── secondary, secondary-hover, secondary-active
│   │   │   ├── destructive, destructive-hover
│   │   ├── status/
│   │   │   ├── error, success, warning, info
│   │   └── focus/
│   │       └── ring
│   └── dark/
│       └── (mirrors light structure)
│
└── component/                     # Optional, per-project
    ├── button/
    ├── input/
    ├── card/
    └── ...
```
