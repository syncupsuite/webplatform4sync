/**
 * Tailwind v4 Transformer
 *
 * Converts DTCG-aligned token JSON to Tailwind v4 CSS-first format.
 * Tailwind v4 uses @theme directives in CSS instead of tailwind.config.js.
 *
 * Input:  DTCG JSON token tree (primitive + semantic layers)
 * Output: CSS file with @import "tailwindcss", @theme block, and custom properties
 */

// ---------------------------------------------------------------------------
// Types and utilities from shared contracts
// ---------------------------------------------------------------------------
// Canonical definitions: see shared/contracts/tokens.ts
//
// When using this transformer standalone (outside the marketplace repo),
// copy these types from shared/contracts/tokens.ts:
//   DTCGToken, DTCGTokenGroup, DTCGRoot, TransformOptions,
//   isToken, flattenTokens, pathToProperty, resolveReference
//
// In the marketplace repo, import directly:
//   import { DTCGToken, DTCGTokenGroup, DTCGRoot, TransformOptions,
//            isToken, flattenTokens, pathToProperty, resolveReference
//          } from '../../shared/contracts/tokens';
// ---------------------------------------------------------------------------

import type { DTCGToken, DTCGTokenGroup, DTCGRoot, TransformOptions } from '../../../shared/contracts/tokens';
import { isToken, flattenTokens, pathToProperty, resolveReference } from '../../../shared/contracts/tokens';

/**
 * Format a CSS custom property declaration with optional comment.
 */
function formatProperty(
  path: string[],
  token: DTCGToken,
  prefix: string,
  includeComments: boolean
): string {
  const prop = pathToProperty(path.join("."), prefix);
  const value = token.$value.startsWith("{")
    ? resolveReference(token.$value, prefix)
    : token.$value;

  const lines: string[] = [];
  if (includeComments && token.$description) {
    lines.push(`  /* ${token.$description} */`);
  }
  lines.push(`  ${prop}: ${value};`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Color token extraction for @theme
// ---------------------------------------------------------------------------

/**
 * Extract color scale entries suitable for the Tailwind @theme block.
 * Converts primitive color tokens to Tailwind's color naming convention.
 *
 * Example: primitive.color.hanada.500 -> --color-hanada-500
 */
function extractThemeColors(
  primitiveColors: DTCGTokenGroup
): Array<{ name: string; value: string; comment?: string }> {
  const entries: Array<{ name: string; value: string; comment?: string }> = [];
  const tokens = flattenTokens(primitiveColors);

  for (const [path, token] of tokens) {
    if (token.$type !== "color") continue;
    const name = `--color-${path.join("-")}`;
    const value = token.$value.startsWith("{")
      ? `var(--${path.join("-")})`
      : token.$value;
    entries.push({ name, value, comment: token.$description });
  }

  return entries;
}

/**
 * Extract spacing tokens for the @theme block.
 */
function extractThemeSpacing(
  spacingGroup: DTCGTokenGroup
): Array<{ name: string; value: string; comment?: string }> {
  const entries: Array<{ name: string; value: string; comment?: string }> = [];
  const tokens = flattenTokens(spacingGroup);

  for (const [path, token] of tokens) {
    if (token.$type !== "dimension") continue;
    const name = `--spacing-${path.join("-")}`;
    entries.push({ name, value: token.$value, comment: token.$description });
  }

  return entries;
}

/**
 * Extract typography tokens for the @theme block.
 */
function extractThemeTypography(
  typographyGroup: DTCGTokenGroup
): {
  families: Array<{ name: string; value: string; comment?: string }>;
  sizes: Array<{ name: string; value: string; comment?: string }>;
} {
  const families: Array<{ name: string; value: string; comment?: string }> = [];
  const sizes: Array<{ name: string; value: string; comment?: string }> = [];
  const tokens = flattenTokens(typographyGroup);

  for (const [path, token] of tokens) {
    if (path[0] === "family") {
      const name = `--font-${path.slice(1).join("-")}`;
      families.push({ name, value: token.$value, comment: token.$description });
    } else if (path[0] === "size") {
      const name = `--text-${path.slice(1).join("-")}`;
      sizes.push({ name, value: token.$value, comment: token.$description });
    }
  }

  return { families, sizes };
}

/**
 * Extract border radius tokens for the @theme block.
 */
function extractThemeRadius(
  radiusGroup: DTCGTokenGroup
): Array<{ name: string; value: string; comment?: string }> {
  const entries: Array<{ name: string; value: string; comment?: string }> = [];
  const tokens = flattenTokens(radiusGroup);

  for (const [path, token] of tokens) {
    const name = `--radius-${path.join("-")}`;
    entries.push({ name, value: token.$value, comment: token.$description });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main transformer
// ---------------------------------------------------------------------------

/**
 * Transform a DTCG token tree into Tailwind v4 CSS.
 *
 * The output follows this structure:
 *
 * ```css
 * @import "tailwindcss";
 *
 * @theme {
 *   --color-hanada-50: #E8EEF4;
 *   --color-hanada-500: #2E4B6D;
 *   ...
 *   --spacing-2: 8px;
 *   ...
 *   --font-heading: "Noto Serif JP", serif;
 *   ...
 *   --radius-md: 8px;
 *   ...
 * }
 *
 * :root {
 *   --background-canvas: var(--color-neutral-50);
 *   --text-primary: var(--color-neutral-900);
 *   ...
 * }
 *
 * [data-theme="dark"] {
 *   --background-canvas: var(--color-neutral-900);
 *   --text-primary: var(--color-neutral-50);
 *   ...
 * }
 * ```
 */
export function transformToTailwindV4(
  tokens: DTCGRoot,
  options: TransformOptions = {}
): string {
  const {
    darkMode = true,
    darkModeStrategy = "class",
    includeComments = true,
    prefix = "",
  } = options;

  const sections: string[] = [];

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------
  sections.push(`@import "tailwindcss";`);
  sections.push("");

  // -------------------------------------------------------------------------
  // @theme block -- primitive design tokens
  // -------------------------------------------------------------------------
  const themeEntries: string[] = [];

  // Colors
  if (tokens.primitive?.color) {
    themeEntries.push("  /* --- Colors --- */");
    const colors = extractThemeColors(
      tokens.primitive.color as DTCGTokenGroup
    );
    for (const entry of colors) {
      if (includeComments && entry.comment) {
        themeEntries.push(`  /* ${entry.comment} */`);
      }
      themeEntries.push(`  ${entry.name}: ${entry.value};`);
    }
    themeEntries.push("");
  }

  // Spacing
  if (tokens.primitive?.spacing) {
    themeEntries.push("  /* --- Spacing (8px grid) --- */");
    const spacing = extractThemeSpacing(
      tokens.primitive.spacing as DTCGTokenGroup
    );
    for (const entry of spacing) {
      if (includeComments && entry.comment) {
        themeEntries.push(`  /* ${entry.comment} */`);
      }
      themeEntries.push(`  ${entry.name}: ${entry.value};`);
    }
    themeEntries.push("");
  }

  // Typography
  if (tokens.primitive?.typography) {
    const { families, sizes } = extractThemeTypography(
      tokens.primitive.typography as DTCGTokenGroup
    );

    if (families.length > 0) {
      themeEntries.push("  /* --- Font Families --- */");
      for (const entry of families) {
        if (includeComments && entry.comment) {
          themeEntries.push(`  /* ${entry.comment} */`);
        }
        themeEntries.push(`  ${entry.name}: ${entry.value};`);
      }
      themeEntries.push("");
    }

    if (sizes.length > 0) {
      themeEntries.push("  /* --- Font Sizes --- */");
      for (const entry of sizes) {
        if (includeComments && entry.comment) {
          themeEntries.push(`  /* ${entry.comment} */`);
        }
        themeEntries.push(`  ${entry.name}: ${entry.value};`);
      }
      themeEntries.push("");
    }
  }

  // Border radius
  if (tokens.primitive?.radius) {
    themeEntries.push("  /* --- Border Radius --- */");
    const radii = extractThemeRadius(
      tokens.primitive.radius as DTCGTokenGroup
    );
    for (const entry of radii) {
      if (includeComments && entry.comment) {
        themeEntries.push(`  /* ${entry.comment} */`);
      }
      themeEntries.push(`  ${entry.name}: ${entry.value};`);
    }
    themeEntries.push("");
  }

  if (themeEntries.length > 0) {
    sections.push("@theme {");
    sections.push(themeEntries.join("\n"));
    sections.push("}");
    sections.push("");
  }

  // -------------------------------------------------------------------------
  // :root -- light mode semantic tokens
  // -------------------------------------------------------------------------
  if (tokens.semantic?.light) {
    const lightTokens = flattenTokens(tokens.semantic.light);
    if (lightTokens.length > 0) {
      sections.push("/* Light mode semantic tokens (default) */");
      sections.push(":root {");
      for (const [path, token] of lightTokens) {
        sections.push(formatProperty(path, token, prefix, includeComments));
      }
      sections.push("}");
      sections.push("");
    }
  }

  // -------------------------------------------------------------------------
  // Dark mode semantic tokens
  // -------------------------------------------------------------------------
  if (darkMode && tokens.semantic?.dark) {
    const darkTokens = flattenTokens(tokens.semantic.dark);
    if (darkTokens.length > 0) {
      const selector =
        darkModeStrategy === "media"
          ? "@media (prefers-color-scheme: dark)"
          : '[data-theme="dark"]';

      sections.push("/* Dark mode semantic tokens */");

      if (darkModeStrategy === "media") {
        sections.push(`${selector} {`);
        sections.push("  :root {");
        for (const [path, token] of darkTokens) {
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
        for (const [path, token] of darkTokens) {
          sections.push(formatProperty(path, token, prefix, includeComments));
        }
        sections.push("}");
      }
      sections.push("");
    }
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Example usage (for reference -- not executed at import time)
// ---------------------------------------------------------------------------

/*
Example input and output:

const tokens: DTCGRoot = {
  primitive: {
    color: {
      hanada: {
        "50":  { $type: "color", $value: "#E8EEF4", $description: "Hanada 50" },
        "100": { $type: "color", $value: "#C5D4E4", $description: "Hanada 100" },
        "200": { $type: "color", $value: "#9DB6D0", $description: "Hanada 200" },
        "300": { $type: "color", $value: "#7498BC", $description: "Hanada 300" },
        "400": { $type: "color", $value: "#517FA4", $description: "Hanada 400" },
        "500": { $type: "color", $value: "#2E4B6D", $description: "Hanada 500 -- base" },
        "600": { $type: "color", $value: "#264060", $description: "Hanada 600" },
        "700": { $type: "color", $value: "#1C3350", $description: "Hanada 700" },
        "800": { $type: "color", $value: "#132640", $description: "Hanada 800" },
        "900": { $type: "color", $value: "#0E1A28", $description: "Hanada 900" }
      },
      neutral: {
        "50":  { $type: "color", $value: "#F5F6F7", $description: "Neutral 50 -- warm tint from Hanada" },
        "900": { $type: "color", $value: "#121517", $description: "Neutral 900" }
      }
    },
    spacing: {
      "0":  { $type: "dimension", $value: "0px", $description: "No spacing" },
      "1":  { $type: "dimension", $value: "4px", $description: "Half unit" },
      "2":  { $type: "dimension", $value: "8px", $description: "Base unit" },
      "4":  { $type: "dimension", $value: "16px", $description: "Double unit" }
    },
    typography: {
      family: {
        heading: { $type: "fontFamily", $value: '"Noto Serif JP", serif', $description: "Heading font" },
        body:    { $type: "fontFamily", $value: '"Inter", sans-serif', $description: "Body font" },
        mono:    { $type: "fontFamily", $value: '"JetBrains Mono", monospace', $description: "Monospace font" }
      },
      size: {
        sm:   { $type: "dimension", $value: "0.875rem", $description: "Small text" },
        base: { $type: "dimension", $value: "1rem", $description: "Base text" },
        lg:   { $type: "dimension", $value: "1.125rem", $description: "Large text" }
      }
    },
    radius: {
      none: { $type: "dimension", $value: "0px", $description: "No radius" },
      sm:   { $type: "dimension", $value: "4px", $description: "Small radius" },
      md:   { $type: "dimension", $value: "8px", $description: "Medium radius" }
    }
  },
  semantic: {
    light: {
      background: {
        canvas:  { $type: "color", $value: "{primitive.color.neutral.50}", $description: "Page background" },
        surface: { $type: "color", $value: "#FFFFFF", $description: "Card background" }
      },
      text: {
        primary: { $type: "color", $value: "{primitive.color.neutral.900}", $description: "Body text" }
      }
    },
    dark: {
      background: {
        canvas:  { $type: "color", $value: "{primitive.color.neutral.900}", $description: "Page background -- dark" },
        surface: { $type: "color", $value: "#1E2124", $description: "Card background -- dark" }
      },
      text: {
        primary: { $type: "color", $value: "{primitive.color.neutral.50}", $description: "Body text -- dark" }
      }
    }
  }
};

// Output:

@import "tailwindcss";

@theme {
  // --- Colors ---
  // Hanada 50
  --color-hanada-50: #E8EEF4;
  ...
  // --- Spacing (8px grid) ---
  --spacing-0: 0px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;

  // --- Font Families ---
  --font-heading: "Noto Serif JP", serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  // --- Font Sizes ---
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;

  // --- Border Radius ---
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 8px;
}

// Light mode semantic tokens (default)
:root {
  // Page background
  --background-canvas: var(--primitive-color-neutral-50);
  --background-surface: #FFFFFF;
  // Body text
  --text-primary: var(--primitive-color-neutral-900);
}

// Dark mode semantic tokens
[data-theme="dark"] {
  // Page background -- dark
  --background-canvas: var(--primitive-color-neutral-900);
  --background-surface: #1E2124;
  // Body text -- dark
  --text-primary: var(--primitive-color-neutral-50);
}
*/

export type { DTCGToken, DTCGTokenGroup, DTCGRoot, TransformOptions };
