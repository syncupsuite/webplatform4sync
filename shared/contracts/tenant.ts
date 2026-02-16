/**
 * Canonical tenant types and constants.
 *
 * All skills and scaffold templates MUST use these definitions to ensure
 * cross-skill compatibility. Each skill may extend these types with
 * skill-specific fields, but the base vocabulary is defined here.
 */

// ---------------------------------------------------------------------------
// Tenant Tiers
// ---------------------------------------------------------------------------

/**
 * Numeric tier levels used in PostgreSQL and RLS policies.
 * Integer representation is canonical — string labels are display-only.
 */
export type TenantTier = 0 | 1 | 2;

/** Display labels for each tier. */
export const TIER_LABELS: Record<TenantTier, string> = {
  0: 'Platform',
  1: 'Partner',
  2: 'Customer',
} as const;

// ---------------------------------------------------------------------------
// Tenant Status
// ---------------------------------------------------------------------------

/**
 * Canonical tenant lifecycle statuses.
 *
 *   provisioning → active → suspended → decommissioned
 */
export type TenantStatus =
  | 'active'
  | 'suspended'
  | 'provisioning'
  | 'decommissioned';

// ---------------------------------------------------------------------------
// Isolation Modes
// ---------------------------------------------------------------------------

/**
 * Data isolation strategy for a tenant.
 *
 *   rls      — Shared schema, Row Level Security (default for T2)
 *   schema   — Separate PostgreSQL schema per tenant
 *   database — Separate Neon branch/database per tenant (default for T1)
 */
export type IsolationMode = 'rls' | 'schema' | 'database';

// ---------------------------------------------------------------------------
// Tenant Context (resolved per-request)
// ---------------------------------------------------------------------------

/**
 * Minimal tenant identity resolved from the incoming request.
 * Skills may extend this with additional fields.
 */
export interface TenantIdentity {
  tenantId: string;
  tier: TenantTier;
  slug: string;
  status: TenantStatus;
  isolationMode: IsolationMode;
}

/**
 * Full tenant context including display fields and resolution metadata.
 * Used by the multi-tenant-platform middleware after domain resolution.
 */
export interface ResolvedTenant extends TenantIdentity {
  name: string;
  parentId: string | null;
  resolvedDomain: string;
  metadata: Record<string, unknown>;
}

/**
 * Database-scoped tenant context for RLS.
 * Used by neon-multi-tenant when setting session variables.
 */
export interface TenantDbContext {
  tenantId: string;
  userId: string;
}
