/**
 * Shared constants used across all skills and scaffold templates.
 *
 * These are the "pipe format" that ensures cross-skill compatibility.
 * Changing a value here requires updating all skills.
 */

// ---------------------------------------------------------------------------
// PostgreSQL Session Variables (for RLS)
// ---------------------------------------------------------------------------

/**
 * The session variable name for the current tenant ID.
 *
 * CRITICAL: Every skill and scaffold template MUST use this exact name.
 * Mismatch between SET and READ causes silent RLS failures (zero rows).
 *
 * Set via:   SELECT set_config('app.tenant_id', $1, true)
 * Read via:  current_setting('app.tenant_id', true)
 */
export const RLS_TENANT_VAR = 'app.tenant_id' as const;

/**
 * Session variable for the current tenant's tier level.
 * Used by tiered RLS policies to scope access.
 */
export const RLS_TIER_VAR = 'app.tenant_tier' as const;

/**
 * Session variable for the current user ID.
 * Used by per-user RLS policies (e.g., auth tables).
 */
export const RLS_USER_VAR = 'app.user_id' as const;

// ---------------------------------------------------------------------------
// Schema Names
// ---------------------------------------------------------------------------

/**
 * Schema for shared authentication tables (Better Auth).
 * Shared across all apps in the Neon project.
 */
export const AUTH_SCHEMA_NAME = 'neon_auth' as const;

/**
 * Schema for multi-tenant platform infrastructure tables.
 * Contains: tenants, tenant_relationships, domain_mappings, tenant_settings, audit_log.
 */
export const PLATFORM_SCHEMA_NAME = 'platform' as const;

// ---------------------------------------------------------------------------
// Domain Mapping
// ---------------------------------------------------------------------------

export type DomainType = 'primary' | 'alias' | 'vanity';

// ---------------------------------------------------------------------------
// Session Durations
// ---------------------------------------------------------------------------

/** Full Better Auth session TTL in seconds (7 days). */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Session refresh threshold in seconds (1 day). */
export const SESSION_REFRESH_SECONDS = 24 * 60 * 60;

/** Preview (email-captured) session TTL in seconds (30 days). */
export const PREVIEW_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Performance Budgets
// ---------------------------------------------------------------------------

export const PERF_BUDGETS = {
  /** Maximum gzipped size for core design tokens CSS. */
  coreTokensKB: 20,
  /** Maximum gzipped size for a tenant overlay CSS. */
  overlayTokensKB: 5,
  /** Maximum time for theme switch in milliseconds. */
  themeSwitchMs: 200,
  /** Maximum chunk size warning threshold in KB. */
  chunkWarningKB: 1000,
} as const;
