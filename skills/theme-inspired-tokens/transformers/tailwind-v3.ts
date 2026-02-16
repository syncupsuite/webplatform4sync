/**
 * Tailwind v3 Transformer (Brownfield)
 *
 * Converts DTCG-aligned token JSON to Tailwind v3 format:
 *   - tailwind.config.js `theme.extend` object
 *   - CSS custom properties for semantic tokens
 *
 * Use this transformer for existing projects that have not yet migrated
 * to Tailwind v4's CSS-first @theme configuration.
 *
 * Input:  DTCG JSON token tree (primitive + semantic layers)
 * Output: { configExtend: object, css: string }
 */

// ---------------------------------------------------------------------------
// Types and utilities from shared contracts
// ---------------------------------------------------------------------------
// Canonical definitions: see shared/contracts/tokens.ts
//
// When using this transformer standalone, copy types from shared/contracts/tokens.ts.
// In the marketplace repo, import directly:
// ---------------------------------------------------------------------------

import type { DTCGToken, DTCGTokenGroup, DTCGRoot } from '../../../shared/contracts/tokens';
import { isToken, flattenTokens, pathToProperty, resolveReference } from '../../../shared/contracts/tokens';

interface TransformV3Options {
  /** Include dark mode semantic mappings. Default: true */
  darkMode?: boolean;
  /** Dark mode strategy for CSS output: 'class' uses .dark, 'media' uses prefers-color-scheme. Default: 'class' */
  darkModeStrategy?: "class" | "media";
  /** Prefix for CSS custom properties. Default: '' (no prefix) */
  prefix?: string;
  /** Include $description as comments in CSS output. Default: true */
  includeComments?: boolean;
}

interface TransformV3Result {
  /** The theme.extend object for tailwind.config.js */
  configExtend: TailwindExtend;
  /** CSS string with custom properties for semantic tokens */
  css: string;
  /** Migration notes for moving to Tailwind v4 */
  migrationNotes: string[];
}

interface TailwindExtend {
  colors?: Record<string, Record<string, string> | string>;
  spacing?: Record<string, string>;
  fontFamily?: Record<string, string[]>;
  fontSize?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Config extend builder
// ---------------------------------------------------------------------------

/**
 * Build the colors section of theme.extend.
 *
 * In Tailwind v3, colors are defined as nested objects:
 * ```js
 * colors: {
 *   hanada: {
 *     50: '#E8EEF4',
 *     500: '#2E4B6D',
 *   }
 * }
 * ```
 *
 * Semantic colors reference CSS custom properties so they respond to
 * light/dark mode without JavaScript:
 * ```js
 * colors: {
 *   background: {
 *     canvas: 'var(--background-canvas)',
 *   }
 * }
 * ```
 */
function buildColorExtend(
  primitiveColors: DTCGTokenGroup | undefined,
  semanticLight: DTCGTokenGroup | undefined
): Record<string, Record<string, string> | string> {
  const colors: Record<string, Record<string, string> | string> = {};

  // Primitive color scales
  if (primitiveColors) {
    for (const [key, value] of Object.entries(primitiveColors)) {
      if (key.startsWith("$")) continue;
      if (isToken(value as DTCGToken | DTCGTokenGroup)) continue;

      const scale: Record<string, string> = {};
      const group = value as DTCGTokenGroup;
      for (const [step, token] of Object.entries(group)) {
        if (step.startsWith("$")) continue;
        if (isToken(token as DTCGToken | DTCGTokenGroup)) {
          scale[step] = (token as DTCGToken).$value;
        }
      }
      if (Object.keys(scale).length > 0) {
        colors[key] = scale;
      }
    }
  }

  // Semantic color aliases (referencing CSS custom properties)
  if (semanticLight) {
    const tokens = flattenTokens(semanticLight);
    for (const [path, _token] of tokens) {
      if (_token.$type !== "color") continue;
      const category = path[0]; // e.g., "background", "text", "interactive"
      const name = path.slice(1).join("-"); // e.g., "canvas", "primary"

      if (!colors[category] || typeof colors[category] === "string") {
        colors[category] = {};
      }
      (colors[category] as Record<string, string>)[name] =
        `var(--${path.join("-")})`;
    }
  }

  return colors;
}

function buildSpacingExtend(
  spacingGroup: DTCGTokenGroup | undefined
): Record<string, string> {
  if (!spacingGroup) return {};
  const spacing: Record<string, string> = {};
  const tokens = flattenTokens(spacingGroup);

  for (const [path, token] of tokens) {
    if (token.$type !== "dimension") continue;
    spacing[path.join("-")] = token.$value;
  }

  return spacing;
}

function buildFontFamilyExtend(
  typographyGroup: DTCGTokenGroup | undefined
): Record<string, string[]> {
  if (!typographyGroup) return {};
  const families: Record<string, string[]> = {};

  const familyGroup = typographyGroup.family as DTCGTokenGroup | undefined;
  if (!familyGroup) return {};

  for (const [key, value] of Object.entries(familyGroup)) {
    if (key.startsWith("$")) continue;
    if (isToken(value as DTCGToken | DTCGTokenGroup)) {
      const token = value as DTCGToken;
      // Parse the font family string into an array
      // e.g., '"Noto Serif JP", serif' -> ['"Noto Serif JP"', 'serif']
      families[key] = token.$value
        .split(",")
        .map((f) => f.trim());
    }
  }

  return families;
}

function buildFontSizeExtend(
  typographyGroup: DTCGTokenGroup | undefined
): Record<string, string> {
  if (!typographyGroup) return {};
  const sizes: Record<string, string> = {};

  const sizeGroup = typographyGroup.size as DTCGTokenGroup | undefined;
  if (!sizeGroup) return {};

  for (const [key, value] of Object.entries(sizeGroup)) {
    if (key.startsWith("$")) continue;
    if (isToken(value as DTCGToken | DTCGTokenGroup)) {
      sizes[key] = (value as DTCGToken).$value;
    }
  }

  return sizes;
}

function buildRadiusExtend(
  radiusGroup: DTCGTokenGroup | undefined
): Record<string, string> {
  if (!radiusGroup) return {};
  const radii: Record<string, string> = {};
  const tokens = flattenTokens(radiusGroup);

  for (const [path, token] of tokens) {
    radii[path.join("-")] = token.$value;
  }

  return radii;
}

// ---------------------------------------------------------------------------
// CSS builder for semantic tokens
// ---------------------------------------------------------------------------

function buildSemanticCSS(
  semanticLight: DTCGTokenGroup | undefined,
  semanticDark: DTCGTokenGroup | undefined,
  options: TransformV3Options
): string {
  const {
    darkMode = true,
    darkModeStrategy = "class",
    prefix = "",
    includeComments = true,
  } = options;

  const sections: string[] = [];

  // Light mode
  if (semanticLight) {
    const tokens = flattenTokens(semanticLight);
    if (tokens.length > 0) {
      sections.push("/* Light mode semantic tokens (default) */");
      sections.push(":root {");
      for (const [path, token] of tokens) {
        const prop = pathToProperty(path.join("."), prefix);
        const value = token.$value.startsWith("{")
          ? resolveReference(token.$value, prefix)
          : token.$value;
        if (includeComments && token.$description) {
          sections.push(`  /* ${token.$description} */`);
        }
        sections.push(`  ${prop}: ${value};`);
      }
      sections.push("}");
      sections.push("");
    }
  }

  // Dark mode
  if (darkMode && semanticDark) {
    const tokens = flattenTokens(semanticDark);
    if (tokens.length > 0) {
      const selector =
        darkModeStrategy === "media"
          ? "@media (prefers-color-scheme: dark)"
          : ".dark";

      sections.push("/* Dark mode semantic tokens */");

      if (darkModeStrategy === "media") {
        sections.push(`${selector} {`);
        sections.push("  :root {");
        for (const [path, token] of tokens) {
          const prop = pathToProperty(path.join("."), prefix);
          const value = token.$value.startsWith("{")
            ? resolveReference(token.$value, prefix)
            : token.$value;
          if (includeComments && token.$description) {
            sections.push(`    /* ${token.$description} */`);
          }
          sections.push(`    ${prop}: ${value};`);
        }
        sections.push("  }");
        sections.push("}");
      } else {
        sections.push(`${selector} {`);
        for (const [path, token] of tokens) {
          const prop = pathToProperty(path.join("."), prefix);
          const value = token.$value.startsWith("{")
            ? resolveReference(token.$value, prefix)
            : token.$value;
          if (includeComments && token.$description) {
            sections.push(`  /* ${token.$description} */`);
          }
          sections.push(`  ${prop}: ${value};`);
        }
        sections.push("}");
      }
      sections.push("");
    }
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Main transformer
// ---------------------------------------------------------------------------

/**
 * Transform a DTCG token tree into Tailwind v3 format.
 *
 * Returns:
 * - `configExtend`: Object to spread into `tailwind.config.js` > `theme.extend`
 * - `css`: CSS string with semantic custom properties (add to your global CSS)
 * - `migrationNotes`: Array of notes for eventual migration to Tailwind v4
 *
 * ## Usage in tailwind.config.js
 *
 * ```js
 * const { configExtend } = require('./tokens/tailwind-v3-output');
 *
 * module.exports = {
 *   darkMode: 'class',
 *   content: ['./src/** /*.{ts,tsx}'],
 *   theme: {
 *     extend: {
 *       ...configExtend,
 *     },
 *   },
 * };
 * ```
 *
 * ## Usage in global CSS
 *
 * ```css
 * @tailwind base;
 * @tailwind components;
 * @tailwind utilities;
 *
 * /* Paste or @import the generated CSS here * /
 * ```
 */
export function transformToTailwindV3(
  tokens: DTCGRoot,
  options: TransformV3Options = {}
): TransformV3Result {
  const configExtend: TailwindExtend = {};

  // Colors
  const colors = buildColorExtend(
    tokens.primitive?.color as DTCGTokenGroup | undefined,
    tokens.semantic?.light as DTCGTokenGroup | undefined
  );
  if (Object.keys(colors).length > 0) {
    configExtend.colors = colors;
  }

  // Spacing
  const spacing = buildSpacingExtend(
    tokens.primitive?.spacing as DTCGTokenGroup | undefined
  );
  if (Object.keys(spacing).length > 0) {
    configExtend.spacing = spacing;
  }

  // Typography
  const fontFamily = buildFontFamilyExtend(
    tokens.primitive?.typography as DTCGTokenGroup | undefined
  );
  if (Object.keys(fontFamily).length > 0) {
    configExtend.fontFamily = fontFamily;
  }

  const fontSize = buildFontSizeExtend(
    tokens.primitive?.typography as DTCGTokenGroup | undefined
  );
  if (Object.keys(fontSize).length > 0) {
    configExtend.fontSize = fontSize;
  }

  // Border radius
  const borderRadius = buildRadiusExtend(
    tokens.primitive?.radius as DTCGTokenGroup | undefined
  );
  if (Object.keys(borderRadius).length > 0) {
    configExtend.borderRadius = borderRadius;
  }

  // Semantic CSS
  const css = buildSemanticCSS(
    tokens.semantic?.light as DTCGTokenGroup | undefined,
    tokens.semantic?.dark as DTCGTokenGroup | undefined,
    options
  );

  // Migration notes
  const migrationNotes = generateMigrationNotes(configExtend);

  return { configExtend, css, migrationNotes };
}

// ---------------------------------------------------------------------------
// Migration notes
// ---------------------------------------------------------------------------

function generateMigrationNotes(extend: TailwindExtend): string[] {
  const notes: string[] = [
    "=== Tailwind v3 -> v4 Migration Notes ===",
    "",
    "When migrating to Tailwind v4, the following changes apply:",
    "",
    "1. CONFIGURATION FORMAT:",
    "   - Remove tailwind.config.js entirely",
    "   - Move all theme values into CSS @theme { } block",
    "   - Replace `@tailwind base/components/utilities` with `@import \"tailwindcss\"`",
    "",
    "2. COLOR DEFINITIONS:",
    "   - v3: `colors: { hanada: { 500: '#2E4B6D' } }` in config",
    "   - v4: `--color-hanada-500: #2E4B6D;` in @theme block",
    "   - Utility classes remain the same: `bg-hanada-500`, `text-hanada-500`",
    "",
    "3. DARK MODE:",
    "   - v3: `darkMode: 'class'` in config, `.dark` selector in CSS",
    "   - v4: Use `[data-theme=\"dark\"]` selector or `@media (prefers-color-scheme: dark)`",
    "   - Consider migrating to `light-dark()` CSS function for modern browsers",
    "",
    "4. SPACING:",
    "   - v3: `spacing: { '2': '8px' }` in config extend",
    "   - v4: `--spacing-2: 8px;` in @theme block",
    "",
    "5. TYPOGRAPHY:",
    "   - v3: `fontFamily: { heading: ['\"Noto Serif JP\"', 'serif'] }` in config",
    "   - v4: `--font-heading: \"Noto Serif JP\", serif;` in @theme block",
    "",
    "6. BORDER RADIUS:",
    "   - v3: `borderRadius: { md: '8px' }` in config extend",
    "   - v4: `--radius-md: 8px;` in @theme block",
    "",
    "7. CUSTOM PROPERTIES:",
    "   - Semantic CSS custom properties (`:root` and `.dark` blocks) transfer as-is",
    "   - Only change: `.dark` selector becomes `[data-theme=\"dark\"]`",
    "",
    "Use the `transformers/tailwind-v4.ts` transformer to generate the v4 output directly.",
  ];

  if (extend.colors) {
    const colorCount = Object.keys(extend.colors).length;
    notes.push(
      "",
      `This token set defines ${colorCount} color group(s) to migrate.`
    );
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Serialization helper
// ---------------------------------------------------------------------------

/**
 * Serialize the configExtend object to a JavaScript module string
 * suitable for inclusion in tailwind.config.js.
 */
export function serializeConfigExtend(extend: TailwindExtend): string {
  const lines: string[] = [];
  lines.push("// Auto-generated by theme-inspired-tokens/transformers/tailwind-v3.ts");
  lines.push("// Do not edit manually -- regenerate from DTCG tokens.");
  lines.push("//");
  lines.push("// Usage in tailwind.config.js:");
  lines.push("//   const tokens = require('./tokens.extend');");
  lines.push("//   module.exports = {");
  lines.push("//     theme: { extend: { ...tokens } },");
  lines.push("//   };");
  lines.push("");
  lines.push(`module.exports = ${JSON.stringify(extend, null, 2)};`);
  lines.push("");
  return lines.join("\n");
}

export type { DTCGToken, DTCGTokenGroup, DTCGRoot };
export type {
  TransformV3Options,
  TransformV3Result,
  TailwindExtend,
};
