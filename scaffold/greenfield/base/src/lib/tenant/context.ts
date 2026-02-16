// Canonical types: see shared/contracts/tenant.ts
// Canonical RLS variables: see shared/contracts/constants.ts

import type { NeonQueryFunction } from "@neondatabase/serverless";

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
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(env.DB.connectionString);

  // Strip port for local development
  const domain = host.split(":")[0]!;

  // 1. Check domain_mappings
  const [mapped] = await sql`
    SELECT t.id, t.name, t.slug, t.tier, t.parent_id, t.status, t.isolation_mode, t.metadata
    FROM "{{SCHEMA_NAME}}".domain_mappings dm
    JOIN "{{SCHEMA_NAME}}".tenants t ON t.id = dm.tenant_id
    WHERE dm.domain = ${domain}
      AND dm.verified = true
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
    const [bySlug] = await sql`
      SELECT id, name, slug, tier, parent_id, status, isolation_mode, metadata
      FROM "{{SCHEMA_NAME}}".tenants
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
// PostgreSQL RLS context
// ---------------------------------------------------------------------------

/**
 * Sets the current tenant ID in the PostgreSQL session so that
 * Row Level Security policies can enforce isolation.
 *
 * Call this at the start of every request after tenant resolution.
 *
 * Example RLS policy:
 *   CREATE POLICY tenant_isolation ON {{SCHEMA_NAME}}.items
 *     USING (tenant_id = current_setting('app.tenant_id')::uuid);
 */
export async function setTenantContext(
  sql: NeonQueryFunction<false, false>,
  tenantId: string
): Promise<void> {
  await sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
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
 */
export async function getTenantChain(
  sql: NeonQueryFunction<false, false>,
  tenantId: string
): Promise<TenantChain> {
  const rows = await sql`
    SELECT t.id, t.name, t.slug, t.tier, t.parent_id, t.status, t.isolation_mode, t.metadata
    FROM "{{SCHEMA_NAME}}".tenant_relationships tr
    JOIN "{{SCHEMA_NAME}}".tenants t ON t.id = tr.ancestor_id
    WHERE tr.descendant_id = ${tenantId}
    ORDER BY tr.depth ASC
  `;

  return rows.map(rowToTenantContext);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function rowToTenantContext(row: Record<string, unknown>): TenantContext {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    slug: row["slug"] as string,
    tier: row["tier"] as TenantContext["tier"],
    parentId: (row["parent_id"] as string) ?? null,
    status: row["status"] as TenantContext["status"],
    isolationMode: row["isolation_mode"] as TenantContext["isolationMode"],
    metadata: (row["metadata"] as Record<string, unknown>) ?? {},
  };
}
