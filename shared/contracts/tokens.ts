/**
 * Canonical DTCG token types and utilities.
 *
 * Design Tokens Community Group (DTCG) format is the standard for
 * all token definitions in this marketplace. Both Tailwind v3 and v4
 * transformers, the token validator, and scaffold templates use these types.
 *
 * Spec: https://tr.designtokens.org/format/
 */

// ---------------------------------------------------------------------------
// Token Types
// ---------------------------------------------------------------------------

/** A single design token conforming to the DTCG specification. */
export interface DTCGToken {
  $type: string;
  $value: string;
  $description?: string;
}

/** A group of tokens or nested groups. */
export interface DTCGTokenGroup {
  [key: string]: DTCGToken | DTCGTokenGroup;
}

/**
 * Root token tree structure.
 *
 * Expected hierarchy:
 *   primitive.color.<name>.<scale>   — raw color values
 *   primitive.spacing.<name>         — raw spacing values
 *   primitive.typography.<category>  — font families, sizes, weights
 *   primitive.radius.<name>          — border radius values
 *   semantic.light.<purpose>         — light mode semantic mappings
 *   semantic.dark.<purpose>          — dark mode semantic mappings
 */
export interface DTCGRoot {
  primitive?: DTCGTokenGroup;
  semantic?: {
    light?: DTCGTokenGroup;
    dark?: DTCGTokenGroup;
  };
  [key: string]: DTCGTokenGroup | undefined;
}

export interface TransformOptions {
  /** Include dark mode semantic mappings. Default: true */
  darkMode?: boolean;
  /** Dark mode strategy: 'class' uses [data-theme="dark"], 'media' uses prefers-color-scheme. Default: 'class' */
  darkModeStrategy?: 'class' | 'media';
  /** Include source comments with $description. Default: true */
  includeComments?: boolean;
  /** Prefix for CSS custom properties. Default: '' (no prefix) */
  prefix?: string;
}

// ---------------------------------------------------------------------------
// Token Utilities
// ---------------------------------------------------------------------------

/** Type guard: is this node a leaf token (has $value and $type)? */
export function isToken(node: DTCGToken | DTCGTokenGroup): node is DTCGToken {
  return '$value' in node && '$type' in node;
}

/**
 * Recursively flatten a DTCG token group into an array of [path, token] pairs.
 */
export function flattenTokens(
  group: DTCGTokenGroup,
  parentPath: string[] = [],
): Array<[string[], DTCGToken]> {
  const result: Array<[string[], DTCGToken]> = [];

  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith('$')) continue;
    const currentPath = [...parentPath, key];

    if (isToken(value as DTCGToken | DTCGTokenGroup)) {
      result.push([currentPath, value as DTCGToken]);
    } else {
      result.push(
        ...flattenTokens(value as DTCGTokenGroup, currentPath),
      );
    }
  }

  return result;
}

/**
 * Convert a dot-separated token path to a CSS custom property name.
 * "primitive.color.hanada.500" → "--primitive-color-hanada-500"
 */
export function pathToProperty(path: string, prefix: string): string {
  const segments = path.split('.').join('-');
  return prefix ? `--${prefix}-${segments}` : `--${segments}`;
}

/**
 * Resolve DTCG references like {primitive.color.neutral.900} to
 * CSS custom property references like var(--primitive-color-neutral-900).
 */
export function resolveReference(value: string, prefix: string): string {
  return value.replace(/\{([^}]+)\}/g, (_match, path: string) => {
    const prop = pathToProperty(path, prefix);
    return `var(${prop})`;
  });
}

/**
 * Walk a token tree, calling the callback for each leaf token.
 * Used by validators to check schema conformance.
 */
export function walkTokens(
  tokens: Record<string, unknown>,
  parentPath: string,
  callback: (path: string, token: unknown) => void,
): void {
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('$')) continue;
    const path = parentPath ? `${parentPath}.${key}` : key;
    if (typeof value === 'object' && value !== null && '$value' in value) {
      callback(path, value);
    } else if (typeof value === 'object' && value !== null) {
      walkTokens(value as Record<string, unknown>, path, callback);
    }
  }
}

// ---------------------------------------------------------------------------
// Protected Token Paths
// ---------------------------------------------------------------------------

/**
 * Token paths that T1/T2 tenants CANNOT override.
 * These protect accessibility-critical UI patterns.
 */
export const PROTECTED_TOKEN_PATHS = [
  'semantic.light.status.error',
  'semantic.light.status.success',
  'semantic.light.status.warning',
  'semantic.dark.status.error',
  'semantic.dark.status.success',
  'semantic.dark.status.warning',
  'semantic.light.focus.ring',
  'semantic.dark.focus.ring',
  'semantic.light.accessibility',
  'semantic.dark.accessibility',
] as const;

/**
 * Required semantic token paths that every theme must define.
 */
export const REQUIRED_SEMANTIC_TOKENS = [
  'semantic.light.background.canvas',
  'semantic.light.background.surface',
  'semantic.light.text.primary',
  'semantic.light.text.secondary',
  'semantic.light.interactive.primary',
  'semantic.light.border.default',
  'semantic.light.status.error',
  'semantic.light.status.success',
  'semantic.light.status.warning',
] as const;
