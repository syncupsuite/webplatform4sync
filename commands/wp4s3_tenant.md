# wp4s3_tenant

> Step 3 of 9 — Set up 3-tier tenant model
> Previous: `wp4s2_scaffold` | Next: `wp4s4_database`

## What This Does

Establishes the 3-tier multi-tenant architecture (Platform/Partner/Customer) in the project. Sets up tenant schema, hierarchy rules, governance policies, and RLS foundations. Even single-tenant projects use this model with dormant tiers — a hardcoded `tenant_id` at T2 with T0 and T1 collapsed.

## Instructions

### 1. Read Discovery State

Load `.p4s/status.json`. Check the `discover` step findings for existing tenancy state:
- Does `tenant_id` exist on tables?
- Is RLS enabled?
- Is there a tenant context?

### 2. Load the Multi-Tenant Platform Skill

Read `skills/multi-tenant-platform/skill.md` for the full architecture specification. This is the authoritative source for:
- The 3-tier model (T0 Platform, T1 Partner, T2 Customer)
- Governance rules (visibility, delegation, immutability)
- Data isolation modes (RLS, schema-per-tenant, DB-per-tenant)
- Security model (RBAC + ABAC hybrid)
- Audit requirements

### 3. Determine Tenant Complexity

Ask the user:

> **How will tenancy work in your project?**
> 1. **Simple** — Single tenant, dormant T0/T1 (most new projects start here)
> 2. **Partner model** — Platform + Partners + Customers (full 3-tier)
> 3. **White-label** — Partners get branded instances with their own domains

### 4. Generate Tenant Infrastructure

#### For All Modes

Generate or verify the following exist:

- **Tenant schema** — `tenants` table with `id`, `tier`, `parent_id`, `name`, `slug`, `status`, `isolation_mode`, `metadata`, timestamps. Use `templates/tenant-schema.sql` from the skill.
- **Closure table** — `tenant_relationships` for ancestry queries (ancestor, descendant, depth).
- **Domain mappings** — `domain_mappings` table for multi-domain resolution.
- **Tenant context** — `src/lib/tenant/context.ts` with `resolveTenantFromDomain()`, `setTenantContext()`, `getTenantChain()`.
- **React context** — `src/contexts/TenantContext.tsx` for frontend tenant state.

#### For Simple Mode

- Create a default T0 platform tenant (UUID `00000000-0000-0000-0000-000000000001`)
- Set up the closure table self-reference
- Add `tenant_id` column to all domain tables (referencing `tenants.id`)
- Hardcode the default tenant in the Worker entry

#### For Partner / White-Label Mode

- Full tenant hierarchy with T0, T1, T2 seed data
- Domain mapping configuration
- Tenant resolution middleware in the Worker
- RLS policies using `current_tenant_id()` function (from `templates/rls-policies.sql`)

### 5. Set Up Governance

Apply the non-negotiable rules from the skill:

1. Every entity table has `tenant_id` — no exceptions
2. Defense-in-depth: application filtering + RLS + connection context
3. Audit entry interface on all mutations
4. Tenant hierarchy is immutable after creation (no reparenting without migration)

### 6. Generate RLS Policies

For each domain table:
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `ALTER TABLE ... FORCE ROW LEVEL SECURITY`
- Create `tenant_isolation_<table>` policy: `USING (tenant_id = current_tenant_id())`
- Create `current_tenant_id()` SQL function

Use templates from `skills/multi-tenant-platform/templates/rls-policies.sql`.

### 7. Update Status

Update `.p4s/status.json`:

```json
{
  "tenant": {
    "status": "completed",
    "completedAt": "<ISO 8601>",
    "mode": "simple|partner|whitelabel",
    "tiers": ["T0", "T1", "T2"],
    "rlsEnabled": true,
    "tablesWithTenantId": ["items", "documents", "..."]
  }
}
```

## Reference

- `skills/multi-tenant-platform/skill.md` — full architecture specification
- `skills/multi-tenant-platform/references/governance-rules.md` — governance details
- `skills/multi-tenant-platform/references/isolation-modes.md` — isolation comparison
- `skills/multi-tenant-platform/templates/tenant-schema.sql` — schema template
- `skills/multi-tenant-platform/templates/rls-policies.sql` — RLS policy template
- `skills/multi-tenant-platform/templates/auth-middleware.ts` — Worker middleware
- `shared/contracts/tenant.ts` — TypeScript tenant types
- `shared/validation/tenant-validator.ts` — hierarchy and RLS validation

## Completion

The user has a fully configured tenant model with schema, RLS policies, tenant context, and governance rules. All domain tables have `tenant_id` and RLS enabled.

Update `.p4s/status.json` step `tenant` status to `completed`.
