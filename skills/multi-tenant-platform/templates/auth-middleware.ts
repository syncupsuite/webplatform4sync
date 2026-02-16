/**
 * Multi-Tenant Auth Middleware for Cloudflare Workers
 *
 * Resolves tenant context from the incoming request, sets PostgreSQL session
 * variables for RLS enforcement, and validates user access to the resolved tenant.
 *
 * Works with both raw Cloudflare Workers fetch handlers and Hono framework.
 *
 * Usage with Hono:
 *   const app = new Hono<{ Bindings: Env; Variables: TenantVariables }>();
 *   app.use('*', tenantMiddleware());
 *
 * Usage with raw Workers:
 *   export default { fetch: withTenantContext(handler, env) };
 */
// Canonical types: see shared/contracts/tenant.ts, shared/contracts/auth.ts
// Canonical Env: see shared/contracts/env.ts

import { Pool, type PoolClient } from '@neondatabase/serverless';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Tenant tiers matching the database schema. */
export type TenantTier = 0 | 1 | 2;

/** Resolved tenant context available throughout the request lifecycle. */
export interface TenantContext {
  /** Tenant UUID from the database. */
  tenantId: string;
  /** Tier level: 0 = Platform, 1 = Partner, 2 = Customer. */
  tier: TenantTier;
  /** Tenant display name. */
  name: string;
  /** URL-safe slug. */
  slug: string;
  /** Current tenant status. */
  status: 'active' | 'suspended' | 'provisioning' | 'decommissioned';
  /** Data isolation mode for this tenant. */
  isolationMode: 'rls' | 'schema' | 'database';
  /** The domain that was used to resolve this tenant. */
  resolvedDomain: string;
}

/** User session with tenant membership. */
export interface AuthenticatedUser {
  /** User UUID. */
  userId: string;
  /** Email address. */
  email: string;
  /** Role within the current tenant. */
  role: string;
  /** Tenant IDs this user has access to. */
  tenantIds: string[];
}

/** Variables injected into the request context by the middleware. */
export interface TenantVariables {
  tenant: TenantContext;
  user: AuthenticatedUser;
  db: PoolClient;
}

/** Cloudflare Worker environment bindings. */
export interface Env {
  NEON_DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  /** Optional: fallback tenant ID for single-tenant deployments. */
  DEFAULT_TENANT_ID?: string;
  /** Optional: comma-separated list of domains that map to the platform (T0). */
  PLATFORM_DOMAINS?: string;
}

// -----------------------------------------------------------------------------
// Tenant Resolution
// -----------------------------------------------------------------------------

/**
 * Resolves a tenant from the request's Host header.
 *
 * Resolution order:
 *   1. Check if the domain matches a known platform domain (T0).
 *   2. Look up the domain in platform.domain_mappings.
 *   3. Fall back to DEFAULT_TENANT_ID if configured (single-tenant mode).
 *   4. Return null if no tenant can be resolved.
 */
async function resolveTenant(
  request: Request,
  db: PoolClient,
  env: Env,
): Promise<TenantContext | null> {
  const host = request.headers.get('Host') ?? '';
  const domain = host.split(':')[0].toLowerCase(); // Strip port if present.

  // 1. Check platform domains.
  const platformDomains = (env.PLATFORM_DOMAINS ?? '').split(',').map(d => d.trim().toLowerCase());
  if (platformDomains.includes(domain)) {
    const result = await db.query<TenantContext>(
      `SELECT id AS "tenantId", tier, name, slug, status, isolation_mode AS "isolationMode"
       FROM platform.tenants WHERE tier = 0 LIMIT 1`,
    );
    if (result.rows[0]) {
      return { ...result.rows[0], resolvedDomain: domain };
    }
  }

  // 2. Look up domain_mappings.
  const domainResult = await db.query<{
    tenantId: string;
    tier: TenantTier;
    name: string;
    slug: string;
    status: string;
    isolationMode: string;
  }>(
    `SELECT t.id AS "tenantId", t.tier, t.name, t.slug, t.status,
            t.isolation_mode AS "isolationMode"
     FROM platform.domain_mappings dm
     JOIN platform.tenants t ON t.id = dm.tenant_id
     WHERE dm.domain = $1
       AND dm.verified_at IS NOT NULL
       AND t.status = 'active'
     LIMIT 1`,
    [domain],
  );

  if (domainResult.rows[0]) {
    return {
      ...domainResult.rows[0],
      resolvedDomain: domain,
    } as TenantContext;
  }

  // 3. Fall back to default tenant (single-tenant / development mode).
  if (env.DEFAULT_TENANT_ID) {
    const fallbackResult = await db.query<TenantContext>(
      `SELECT id AS "tenantId", tier, name, slug, status,
              isolation_mode AS "isolationMode"
       FROM platform.tenants WHERE id = $1`,
      [env.DEFAULT_TENANT_ID],
    );
    if (fallbackResult.rows[0]) {
      return { ...fallbackResult.rows[0], resolvedDomain: domain };
    }
  }

  return null;
}

// -----------------------------------------------------------------------------
// PostgreSQL Tenant Context
// -----------------------------------------------------------------------------

/**
 * Sets PostgreSQL session variables for RLS enforcement.
 * Uses SET LOCAL so the context is scoped to the current transaction.
 */
async function setDatabaseTenantContext(
  db: PoolClient,
  tenant: TenantContext,
): Promise<void> {
  await db.query('BEGIN');
  await db.query(`SELECT platform.set_tenant_context($1, $2)`, [
    tenant.tenantId,
    tenant.tier,
  ]);
}

// -----------------------------------------------------------------------------
// User Validation
// -----------------------------------------------------------------------------

/**
 * Validates that the authenticated user has access to the resolved tenant.
 *
 * This is a placeholder that should be replaced with your Better Auth
 * session validation logic. The key requirement is:
 *   - Extract user from session token (cookie or Authorization header).
 *   - Verify user has a membership in the resolved tenant.
 *   - Return user with their role in this tenant.
 */
async function validateUserAccess(
  request: Request,
  db: PoolClient,
  tenant: TenantContext,
  _env: Env,
): Promise<AuthenticatedUser | null> {
  // Extract session token from cookie or Authorization header.
  const sessionToken =
    extractCookie(request, 'better-auth.session_token') ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!sessionToken) {
    return null;
  }

  // Validate session and check tenant membership.
  // Replace this query with your Better Auth session validation.
  const result = await db.query<{
    userId: string;
    email: string;
    role: string;
    tenantIds: string[];
  }>(
    `SELECT
       s.user_id AS "userId",
       u.email,
       m.role,
       ARRAY_AGG(m2.organization_id) AS "tenantIds"
     FROM neon_auth.session s
     JOIN neon_auth.user u ON u.id = s.user_id
     JOIN neon_auth.member m ON m.user_id = s.user_id
       AND m.organization_id = $2
     JOIN neon_auth.member m2 ON m2.user_id = s.user_id
     WHERE s.token = $1
       AND s.expires_at > NOW()
     GROUP BY s.user_id, u.email, m.role
     LIMIT 1`,
    [sessionToken, tenant.tenantId],
  );

  return result.rows[0] ?? null;
}

/** Extract a cookie value by name from the request. */
function extractCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('Cookie') ?? '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// -----------------------------------------------------------------------------
// Error Responses
// -----------------------------------------------------------------------------

function tenantNotFoundResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'tenant_not_found',
      message: 'Could not resolve a tenant for this domain.',
    }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  );
}

function tenantSuspendedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'tenant_suspended',
      message: 'This tenant account has been suspended.',
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );
}

function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'unauthorized',
      message: 'Authentication required.',
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  );
}

function forbiddenResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'forbidden',
      message: 'You do not have access to this tenant.',
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );
}

// -----------------------------------------------------------------------------
// Hono Middleware
// -----------------------------------------------------------------------------

/**
 * Hono middleware that resolves tenant context and validates user access.
 *
 * Usage:
 *   import { Hono } from 'hono';
 *   const app = new Hono<{ Bindings: Env; Variables: TenantVariables }>();
 *   app.use('*', tenantMiddleware());
 *   app.get('/api/data', (c) => {
 *     const tenant = c.get('tenant');
 *     const user = c.get('user');
 *     const db = c.get('db');
 *     // db already has RLS context set -- queries are tenant-scoped.
 *   });
 *
 * @param options.publicPaths - Paths that skip auth (still resolve tenant).
 */
export function tenantMiddleware(options?: { publicPaths?: string[] }) {
  const publicPaths = new Set(options?.publicPaths ?? []);

  return async (c: any, next: () => Promise<void>) => {
    const env = c.env as Env;
    const pool = new Pool({ connectionString: env.NEON_DATABASE_URL });
    const db = await pool.connect();

    try {
      // Resolve tenant from domain.
      const tenant = await resolveTenant(c.req.raw, db, env);
      if (!tenant) {
        return tenantNotFoundResponse();
      }

      if (tenant.status === 'suspended') {
        return tenantSuspendedResponse();
      }

      // Set database tenant context for RLS.
      await setDatabaseTenantContext(db, tenant);

      c.set('tenant', tenant);
      c.set('db', db);

      // Skip auth for public paths.
      const path = new URL(c.req.url).pathname;
      const isPublic = publicPaths.has(path) || path.startsWith('/api/auth/');

      if (!isPublic) {
        const user = await validateUserAccess(c.req.raw, db, tenant, env);
        if (!user) {
          await db.query('ROLLBACK');
          return unauthorizedResponse();
        }

        if (!user.tenantIds.includes(tenant.tenantId)) {
          await db.query('ROLLBACK');
          return forbiddenResponse();
        }

        c.set('user', user);
      }

      await next();

      // Commit the transaction (RLS context is scoped to this transaction).
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      db.release();
      await pool.end();
    }
  };
}

// -----------------------------------------------------------------------------
// Raw Workers Wrapper
// -----------------------------------------------------------------------------

/**
 * Wraps a raw Cloudflare Workers fetch handler with tenant context.
 *
 * Usage:
 *   async function handler(
 *     request: Request,
 *     env: Env,
 *     ctx: ExecutionContext,
 *     tenant: TenantContext,
 *     user: AuthenticatedUser | null,
 *     db: PoolClient,
 *   ): Promise<Response> {
 *     // db already has RLS context set.
 *     return new Response('OK');
 *   }
 *
 *   export default {
 *     fetch: withTenantContext(handler),
 *   };
 */
export function withTenantContext(
  handler: (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    tenant: TenantContext,
    user: AuthenticatedUser | null,
    db: PoolClient,
  ) => Promise<Response>,
) {
  return async (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> => {
    const pool = new Pool({ connectionString: env.NEON_DATABASE_URL });
    const db = await pool.connect();

    try {
      const tenant = await resolveTenant(request, db, env);
      if (!tenant) {
        return tenantNotFoundResponse();
      }

      if (tenant.status === 'suspended') {
        return tenantSuspendedResponse();
      }

      await setDatabaseTenantContext(db, tenant);

      // Attempt to authenticate (returns null for unauthenticated requests).
      const user = await validateUserAccess(request, db, tenant, env);

      const response = await handler(request, env, ctx, tenant, user, db);

      await db.query('COMMIT');
      return response;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      db.release();
      await pool.end();
    }
  };
}
