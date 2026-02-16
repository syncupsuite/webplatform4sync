/**
 * Tenant Validation Utilities
 *
 * Validates tenant configuration and RLS policy compliance.
 * Used during scaffold generation and CI/CD checks.
 */

// --- Types ---

interface Tenant {
  id: string;
  tier: 0 | 1 | 2;
  parentId: string | null;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  isolationMode: 'db' | 'schema' | 'rls';
}

interface TenantValidationResult {
  valid: boolean;
  errors: TenantValidationError[];
}

interface TenantValidationError {
  tenantId: string;
  message: string;
  rule: string;
}

// --- Hierarchy Validation ---

/**
 * Validate tenant hierarchy follows governance rules.
 */
export function validateHierarchy(tenants: Tenant[]): TenantValidationResult {
  const errors: TenantValidationError[] = [];
  const byId = new Map(tenants.map((t) => [t.id, t]));

  for (const tenant of tenants) {
    // T0 must have no parent
    if (tenant.tier === 0 && tenant.parentId !== null) {
      errors.push({
        tenantId: tenant.id,
        message: 'Tier 0 tenant must not have a parent',
        rule: 'hierarchy.t0-no-parent',
      });
    }

    // T1 and T2 must have a parent
    if ((tenant.tier === 1 || tenant.tier === 2) && tenant.parentId === null) {
      errors.push({
        tenantId: tenant.id,
        message: `Tier ${tenant.tier} tenant must have a parent`,
        rule: 'hierarchy.requires-parent',
      });
    }

    // Parent must exist
    if (tenant.parentId && !byId.has(tenant.parentId)) {
      errors.push({
        tenantId: tenant.id,
        message: `Parent tenant ${tenant.parentId} not found`,
        rule: 'hierarchy.parent-exists',
      });
    }

    // Parent tier must be less than child tier
    if (tenant.parentId) {
      const parent = byId.get(tenant.parentId);
      if (parent && parent.tier >= tenant.tier) {
        errors.push({
          tenantId: tenant.id,
          message: `Parent tier (${parent.tier}) must be less than child tier (${tenant.tier})`,
          rule: 'hierarchy.tier-ordering',
        });
      }
    }

    // Slug must be valid
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(tenant.slug) && tenant.slug.length > 1) {
      errors.push({
        tenantId: tenant.id,
        message: `Invalid slug: ${tenant.slug} (must be lowercase, hyphens, no leading/trailing hyphen)`,
        rule: 'naming.slug',
      });
    }
  }

  // Check for cycles
  for (const tenant of tenants) {
    const visited = new Set<string>();
    let current: Tenant | undefined = tenant;
    while (current?.parentId) {
      if (visited.has(current.id)) {
        errors.push({
          tenantId: tenant.id,
          message: 'Circular parent reference detected',
          rule: 'hierarchy.no-cycles',
        });
        break;
      }
      visited.add(current.id);
      current = byId.get(current.parentId);
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- RLS Policy Validation ---

/**
 * SQL queries to verify RLS is properly configured on a table.
 * Returns SQL strings to execute against the database.
 */
export function generateRLSCheckQueries(tableName: string, schemaName: string): string[] {
  return [
    // Check RLS is enabled
    `SELECT relrowsecurity, relforcerowsecurity
     FROM pg_class
     WHERE relname = '${tableName}'
       AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '${schemaName}');`,

    // Check policies exist
    `SELECT polname, polcmd, polpermissive
     FROM pg_policy
     WHERE polrelid = '${schemaName}.${tableName}'::regclass;`,

    // Check tenant_id column exists
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = '${schemaName}'
       AND table_name = '${tableName}'
       AND column_name = 'tenant_id';`,

    // Check tenant_id has an index
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = '${schemaName}'
       AND tablename = '${tableName}'
       AND indexdef LIKE '%tenant_id%';`,
  ];
}

/**
 * Validate that a table name follows naming conventions.
 */
export function validateTableName(name: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(name);
}
