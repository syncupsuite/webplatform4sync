/**
 * Canonical Cloudflare Worker environment bindings.
 *
 * This is the superset of all bindings used across skills.
 * Individual skills may only need a subset — use Pick<Env, ...> to
 * narrow the type in skill-specific code.
 *
 * Example:
 *   type AuthEnv = Pick<Env, 'NEON_DATABASE_URL' | 'BETTER_AUTH_SECRET' | 'FIREBASE_PROJECT_ID'>;
 */

export interface Env {
  // ---------------------------------------------------------------------------
  // Database
  // ---------------------------------------------------------------------------

  /** Hyperdrive binding for connection-pooled Neon access. Primary for production. */
  DB: Hyperdrive;
  /** Direct Neon connection string. Fallback when Hyperdrive is unavailable. */
  NEON_DATABASE_URL: string;

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  /** Secret for Better Auth session signing. */
  BETTER_AUTH_SECRET: string;
  /** Firebase project ID for ID token verification. */
  FIREBASE_PROJECT_ID: string;

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  /** KV namespace for caching (shared across apps). */
  CACHE: KVNamespace;
  /** KV namespace for lightweight OAuth/preview sessions. */
  OAUTH_SESSION_KV: KVNamespace;
  /** R2 bucket for asset storage. */
  ASSETS: R2Bucket;

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /** Current environment: 'development' | 'staging' | 'production'. */
  ENVIRONMENT: string;
  /** Application URL for CORS and redirects. */
  APP_URL: string;
  /** Comma-separated platform domains for tenant resolution fallback. */
  PLATFORM_DOMAINS: string;
  /** Default tenant ID for single-tenant mode. */
  DEFAULT_TENANT_ID: string;

  /** Allow additional bindings without breaking type checks. */
  [key: string]: unknown;
}

/**
 * Get the database connection string, preferring Hyperdrive.
 * Falls back to NEON_DATABASE_URL for local dev and environments without Hyperdrive.
 */
export function getConnectionString(env: Env): string {
  try {
    if (env.DB) return env.DB.connectionString;
  } catch {
    // Hyperdrive not available (local dev)
  }
  return env.NEON_DATABASE_URL;
}
