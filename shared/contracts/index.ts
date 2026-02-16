/**
 * Shared contracts — the canonical types and constants for hn-platform4sync.
 *
 * All skills and scaffold templates reference these definitions to ensure
 * cross-skill compatibility. Each skill remains standalone but conforms
 * to the same vocabulary.
 *
 * Usage from a skill template:
 *   // Reference the canonical types (copy or import based on your setup)
 *   // See: shared/contracts/tenant.ts for TenantTier, TenantStatus, etc.
 *   // See: shared/contracts/auth.ts for AuthLevel, AuthState, etc.
 *   // See: shared/contracts/tokens.ts for DTCGToken, flattenTokens, etc.
 *   // See: shared/contracts/constants.ts for RLS variable names
 *   // See: shared/contracts/env.ts for canonical Env type
 */

export * from './tenant';
export * from './auth';
export * from './constants';
export * from './tokens';
export * from './env';
