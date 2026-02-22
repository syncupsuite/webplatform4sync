// Canonical types: see shared/contracts/tenant.ts
// Canonical RLS variables: see shared/contracts/constants.ts

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { sql as rawSql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tenant context types
// ---------------------------------------------------------------------------

export interface TenantContext {
  /** UUID of the resolved tenant */
  id: string;
  /** Display name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Numeric tier: 0 = Platform, 1 = Partner, 2 = Customer */
  tier: 0 | 1 | 2;
  /** Parent tenant ID (null for platform tier) */
  parentId: string | null;
  /** Current status */
  status: "active" | "suspended" | "provisioning" | "decommissioned";
  /** Row isolation strategy */
  isolationMode: "rls" | "schema" | "database";
  /** Arbitrary metadata */
  metadata: Record<string, unknown>;
}

/**
 * Full chain from the current tenant up to the platform root.
 * Index 0 is the current tenant, last element is the platform tenant.
 */
export type TenantChain = TenantContext[];

// ---------------------------------------------------------------------------
// Tenant resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a tenant from the incoming request Host header.
 *
 * Resolution order:
 * 1. Exact match in domain_mappings table
 * 2. Subdomain extraction (e.g., acme.{{DOMAIN}} -> slug "acme")
 * 3. Default / platform tenant fallback
 *
 * Returns null if no tenant can be resolved.
 */
export async function resolveTenantFromDomain(
  host: string,
  env: { DB: Hyperdrive }
): Promise<TenantContext | null> {
  const sql = neon(env.DB.connectionString);

  // Strip port for local development
  const domain = host.split(":")[0]!;

  // 1. Check domain_mappings
  const [mapped] = await sql`
    SELECT t.id, t.name, t.slug, t.tier, t.parent_id, t.status, t.isolation_mode, t.metadata
    FROM "platform".domain_mappings dm
    JOIN "platform".tenants t ON t.id = dm.tenant_id
    WHERE dm.domain = ${domain}
      AND dm.verified_at IS NOT NULL
      AND t.status = 'active'
    LIMIT 1
  `;

  if (mapped) {
    return rowToTenantContext(mapped);
  }

  // 2. Subdomain extraction
  const baseDomain = "{{DOMAIN}}";
  if (domain.endsWith(`.${baseDomain}`)) {
    const slug = domain.replace(`.${baseDomain}`, "");
    if (!SLUG_RE.test(slug)) {
      return null;
    }
    const [bySlug] = await sql`
      SELECT id, name, slug, tier, parent_id, status, isolation_mode, metadata
      FROM "platform".tenants
      WHERE slug = ${slug}
        AND status = 'active'
      LIMIT 1
    `;
    if (bySlug) {
      return rowToTenantContext(bySlug);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// PostgreSQL RLS context — transactional wrapper
// ---------------------------------------------------------------------------

/** UUID v4 format validation. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valid tenant slug: lowercase alphanumeric with hyphens, 1–63 chars. */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Re-export Drizzle database type for route handlers.
 */
export type { NeonHttpDatabase };

/**
 * Execute a tenant-scoped database query with RLS enforcement.
 *
 * Wraps `set_config('app.tenant_id', ...)` and the query in a single
 * Drizzle transaction, ensuring RLS context is set for ALL queries in
 * the callback.
 *
 * WARNING: Do NOT call set_config() as a standalone query and then
 * issue separate queries. The Neon HTTP driver executes each call as
 * a separate HTTP request on a potentially different connection.
 * set_config() in one call is NOT available in subsequent calls.
 * This function exists to enforce the correct transactional pattern.
 * See: skills/neon-multi-tenant/templates/drizzle-tenant.ts
 *
 * Example RLS policy:
 *   CREATE POLICY tenant_isolation ON {{SCHEMA_NAME}}.items
 *     USING (tenant_id = current_setting('app.tenant_id')::uuid);
 *
 * @example
 * ```typescript
 * const items = await tenantQuery(env.DB.connectionString, tenant.id, async (db) => {
 *   return db.select().from(schema.items);
 *   // RLS automatically filters by tenant_id
 * });
 * ```
 */
export async function tenantQuery<T>(
  connectionString: string,
  tenantId: string,
  queryFn: (db: NeonHttpDatabase) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error("Invalid tenant ID format");
  }

  const sqlFn = neon(connectionString);
  const db = drizzle(sqlFn);

  return db.transaction(async (tx) => {
    await tx.execute(
      rawSql`SELECT set_config('app.tenant_id', ${tenantId}, true)`
    );
    return queryFn(tx as unknown as NeonHttpDatabase);
  });
}

// ---------------------------------------------------------------------------
// Hierarchy traversal
// ---------------------------------------------------------------------------

/**
 * Returns the full tenant chain from the given tenant up to the
 * platform root, using the closure table for efficient lookup.
 *
 * Useful for permission inheritance: a platform admin can manage
 * all enterprises; an enterprise admin can manage all their teams.
 *
 * This is a read-only lookup (no RLS dependency) — safe to call
 * outside a tenantQuery() transaction.
 */
export async function getTenantChain(
  connectionString: string,
  tenantId: string
): Promise<TenantChain> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error("Invalid tenant ID format");
  }

  const sql = neon(connectionString);
  const rows = await sql`
    SELECT t.id, t.name, t.slug, t.tier, t.parent_id, t.status, t.isolation_mode, t.metadata
    FROM "platform".tenant_relationships tr
    JOIN "platform".tenants t ON t.id = tr.ancestor_id
    WHERE tr.descendant_id = ${tenantId}
    ORDER BY tr.depth ASC
  `;

  return rows.map(rowToTenantContext);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const VALID_TIERS = new Set([0, 1, 2]);
const VALID_STATUSES = new Set(["active", "suspended", "provisioning", "decommissioned"]);
const VALID_ISOLATION_MODES = new Set(["rls", "schema", "database"]);

function rowToTenantContext(row: Record<string, unknown>): TenantContext {
  const id = row["id"];
  const name = row["name"];
  const slug = row["slug"];
  const tier = row["tier"];
  const status = row["status"];
  const isolationMode = row["isolation_mode"];

  if (typeof id !== "string" || !UUID_RE.test(id)) {
    throw new Error(`Invalid tenant row: id must be a UUID, got ${typeof id}`);
  }
  if (typeof name !== "string" || !name) {
    throw new Error(`Invalid tenant row: name must be a non-empty string`);
  }
  if (typeof slug !== "string" || !slug) {
    throw new Error(`Invalid tenant row: slug must be a non-empty string`);
  }
  if (!VALID_TIERS.has(tier as number)) {
    throw new Error(`Invalid tenant row: tier must be 0, 1, or 2, got ${tier}`);
  }
  if (!VALID_STATUSES.has(status as string)) {
    throw new Error(`Invalid tenant row: unexpected status "${status}"`);
  }
  if (!VALID_ISOLATION_MODES.has(isolationMode as string)) {
    throw new Error(`Invalid tenant row: unexpected isolation_mode "${isolationMode}"`);
  }

  return {
    id,
    name,
    slug,
    tier: tier as TenantContext["tier"],
    parentId: (row["parent_id"] as string) ?? null,
    status: status as TenantContext["status"],
    isolationMode: isolationMode as TenantContext["isolationMode"],
    metadata: (row["metadata"] as Record<string, unknown>) ?? {},
  };
}
