/**
 * Token Validation Utilities
 *
 * Validates design token files against the platform standard.
 * Used in CI/CD pipelines and during scaffold generation.
 */

import type { DTCGToken } from '../contracts/tokens';
import { walkTokens, PROTECTED_TOKEN_PATHS, REQUIRED_SEMANTIC_TOKENS } from '../contracts/tokens';

// --- Types ---

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;
  message: string;
  rule: string;
}

interface ValidationWarning {
  path: string;
  message: string;
  rule: string;
}

// --- Schema Validation ---

const REQUIRED_TOKEN_TYPES = ['color', 'dimension', 'fontFamily', 'fontWeight', 'number'];

/**
 * Validate a DTCG token tree for schema compliance.
 */
export function validateSchema(tokens: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required semantic tokens exist
  for (const path of REQUIRED_SEMANTIC_TOKENS) {
    const value = resolvePath(tokens, path);
    if (!value) {
      errors.push({ path, message: `Required semantic token missing: ${path}`, rule: 'schema.required' });
    }
  }

  // Walk token tree and validate structure
  walkTokens(tokens, '', (path, token) => {
    if (typeof token === 'object' && token !== null && '$value' in token) {
      const t = token as DTCGToken;
      if (!t.$type) {
        errors.push({ path, message: 'Token missing $type field', rule: 'schema.type' });
      }
      if (t.$value === undefined || t.$value === null) {
        errors.push({ path, message: 'Token missing $value field', rule: 'schema.value' });
      }
      if (!t.$description) {
        warnings.push({ path, message: 'Token missing $description (recommended)', rule: 'schema.description' });
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

// --- Accessibility Validation ---

/**
 * Check color contrast ratios meet WCAG 2.1 AA (4.5:1 for normal text).
 */
export function validateContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): { passes: boolean; ratio: number; required: number } {
  const fgLum = relativeLuminance(hexToRgb(foreground));
  const bgLum = relativeLuminance(hexToRgb(background));
  const ratio = contrastRatio(fgLum, bgLum);
  const required = level === 'AAA' ? 7 : 4.5;
  return { passes: ratio >= required, ratio: Math.round(ratio * 100) / 100, required };
}

// --- Protected Tokens ---

/**
 * Verify that a tenant override does not modify protected tokens.
 */
export function validateOverride(
  overrideTokens: Record<string, unknown>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  walkTokens(overrideTokens, '', (path) => {
    if (PROTECTED_TOKEN_PATHS.some((p) => path.startsWith(p))) {
      errors.push({
        path,
        message: `Cannot override protected token: ${path}`,
        rule: 'governance.protected',
      });
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

// --- Helpers ---

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
