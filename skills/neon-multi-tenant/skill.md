# Neon Multi-Tenant Skill

## When to Use

Invoke this skill when the task involves any of the following:

- **Neon branch strategy** for multi-tenant or multi-app isolation
- **Schema organization** across shared databases (e.g., shared auth + per-app schemas)
- **Drizzle ORM configuration** with tenant-scoped queries and automatic `tenant_id` injection
- **Cloudflare Hyperdrive** connection pooling for Neon in Workers
- **Migration coordination** across Neon branches
- **Choosing isolation level**: branches vs schemas vs RLS for different tenant tiers

This skill is Neon PostgreSQL-specific. For general multi-tenant architecture patterns, see `multi-tenant-platform`. For auth-specific patterns, see `graduated-auth`.

---

## Core Concept: Neon Branches as Isolation Primitives

Neon's branch architecture maps naturally to multi-tenant isolation. A branch is a copy-on-write fork of the database at a point in time. Branches share storage for unchanged data, making them cost-effective for isolation.

```
production (default branch)
 |-- neon_auth schema (shared Better Auth tables)
 |-- platform schema (T0 management plane)
 |
 +-- app-alpha-prod (branch)
 |    |-- app_alpha schema (T1 partner data)
 |    |-- neon_auth schema (inherited, read-only reference)
 |    |
 |    +-- app-alpha-dev (branch of app-alpha-prod)
 |         |-- development copy for safe iteration
 |
 +-- app-beta-prod (branch)
      |-- app_beta schema (T1 partner data)
      |-- neon_auth schema (inherited, read-only reference)
      |
      +-- app-beta-dev (branch of app-beta-prod)
           |-- development copy for safe iteration
```

Key properties:
- **Copy-on-write**: Branches are near-instant to create and share unchanged pages with the parent.
- **Independent compute**: Each branch can have its own compute endpoint, enabling per-tenant scaling.
- **Schema inheritance**: A child branch inherits the parent's schema at creation time. Auth tables in `neon_auth` are present on all branches.
- **Instant reset**: Dev branches can be reset to their parent's state without a full restore.

---

## SyncUpSuite Branch Layout

The SyncUp monorepo uses a single Neon project (`your-neon-project`, ID: `your-neon-project-id`) with the following branch hierarchy:

```
production (default)
 |-- neon_auth schema (Better Auth: users, sessions, accounts, verifications)
 |
 +-- brandsyncup-prod (br-xxx-xxx-xxxxxxxx)
 |    |-- brandsyncup schema (brand collaboration data)
 |    +-- brandsyncup-dev (br-xxx-xxx-xxxxxxxx)
 |
 +-- legalsyncup-production (br-xxx-xxx-xxxxxxxx)
      |-- legalsyncup schema (legal compliance data)
      +-- legalsyncup-development (br-xxx-xxx-xxxxxxxx)
```

- **Shared auth**: All apps authenticate against `neon_auth` on the production branch. Session tokens are portable across apps.
- **Isolated data**: Each app's domain tables live in app-specific schemas on app-specific branches.
- **Dev branches**: Feature development and schema iteration happen on dev branches that can be reset from their parent.

---

## Schema Organization

### The Three Schema Tiers

| Schema | Scope | Owner | Branch |
|--------|-------|-------|--------|
| `neon_auth` | Cross-app authentication | Better Auth | production (default) |
| `public` | Neon system tables, extensions | PostgreSQL | all branches |
| `<app_name>` | Application-specific domain data | Application team | app branch |

### Rules

1. **Never put app data in `neon_auth`.** That schema is owned by Better Auth and shared across all apps. Adding app-specific columns to auth tables creates coupling.

2. **Always use explicit schema names.** Never rely on `search_path` for multi-schema databases. In Drizzle, specify `schema` on every table definition.

3. **Extensions go in `public`.** PostgreSQL extensions (`uuid-ossp`, `pgcrypto`, etc.) should be created in the `public` schema on the production branch so they propagate to all child branches.

4. **Every app table has `tenant_id`.** Even within an app-specific schema on an app-specific branch, tables must include `tenant_id` for RLS. This is defense-in-depth: the branch provides infrastructure isolation, and `tenant_id` + RLS provides row-level isolation within that branch.

---

## Isolation Decision Matrix

Use this matrix to decide which isolation mechanism to apply at each tier of the 3-tier model:

| Tier | Isolation Mechanism | When to Use | Neon Implementation |
|------|---------------------|-------------|---------------------|
| **T0** (Platform) | Separate Neon project | Always -- the management plane must be fully isolated | Dedicated Neon project with its own connection string |
| **T1** (Partner) | Neon branch per partner | Partners with regulatory requirements, data residency needs, or SLA guarantees | `neon branches create --parent production` per partner |
| **T1** (Partner, lightweight) | Schema per partner within shared branch | Partners that share infrastructure and trust the platform for isolation | `CREATE SCHEMA partner_name` within a shared branch |
| **T2** (Customer) | RLS within branch/schema | Always -- customers within a partner's branch are isolated via `tenant_id` + RLS policies | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies |

### Decision Flow

```
Is this a platform-level concern (billing, partner management)?
  YES -> T0 separate project
  NO  -> Does this partner need strong isolation (regulatory, SLA, data residency)?
           YES -> T1 dedicated Neon branch
           NO  -> T1 shared branch with schema isolation
                  -> T2 always uses RLS within the branch
```

### Hybrid Example: SyncUpSuite

SyncUpSuite currently operates with a simplified model:
- **T0**: Platform management is in the production (default) branch.
- **T1**: Each app (BrandSyncUp, LegalSyncUp) is a T1 partner with its own branch.
- **T2**: Within each app, customer organizations are isolated via `tenant_id` + RLS.

As the platform grows, a T1 partner (e.g., an enterprise customer running their own BrandSyncUp instance) could be given their own Neon branch forked from `brandsyncup-prod`.

---

## Drizzle ORM Tenant Configuration

### Tenant-Scoped Client

Every database query must execute within a tenant context. The pattern is:

1. Create a base Drizzle client connected to the correct branch.
2. Wrap it in a tenant-scoped factory that injects `tenant_id` into all queries.
3. Use Drizzle's `$onQuery` or middleware hooks for automatic injection.

See `templates/drizzle-tenant.ts` for the full implementation.

### Key Patterns

```typescript
// Executing a tenant-scoped query (context + query in one transaction)
const docs = await tenantQuery(connectionString, { tenantId, userId }, async (db) => {
  return db.select().from(documents); // RLS enforces tenant_id filter
});

// Inserts with automatic tenant_id injection
await db.insert(documents).values({ title: 'New Doc' }); // tenant_id injected
```

### Connection Strategy

| Environment | Connection Method | Configuration |
|-------------|-------------------|---------------|
| **Production** (Workers) | Hyperdrive | `env.HYPERDRIVE.connectionString` |
| **Development** (local) | Neon serverless driver | Direct connection string from Doppler |
| **Testing** | Neon serverless driver | Dev branch connection string |
| **Drizzle Studio** | Direct TCP | `?sslmode=require` on dev branch URL |

---

## Hyperdrive Connection Pooling

Cloudflare Hyperdrive provides connection pooling at the edge, reducing cold-start connection overhead for Neon. This matters for Workers because:

- Each Worker invocation would otherwise create a new TCP + TLS connection to Neon.
- Neon's serverless driver uses WebSocket, but Hyperdrive uses persistent TCP connections from Cloudflare's network.
- Hyperdrive caches query results at the edge (configurable).

### Performance Impact

| Metric | Without Hyperdrive | With Hyperdrive |
|--------|-------------------|-----------------|
| Connection setup | 50-150ms (TLS + auth) | ~0ms (pooled) |
| First query latency | 80-200ms | 10-30ms |
| Sustained query latency | 20-50ms | 10-30ms |

**Cost note**: Neon's free tier supports this branch-based isolation model for development and early production. As tenant count grows, costs scale through connection pooling (Hyperdrive) and storage, not through per-tenant database provisioning. Adding a T2 tenant is a row in the database and an RLS policy, not a new Neon branch.

See `templates/hyperdrive-setup.md` for configuration details.

---

## Migration Patterns

### Schema Changes Across Branches

Neon branches are point-in-time forks. Schema changes on a parent do NOT automatically propagate to existing child branches. This requires a deliberate migration strategy:

1. **Apply to parent first.** Run Drizzle migrations on the production (or app-prod) branch.
2. **Reset dev branches.** After parent migration, reset dev branches to inherit the new schema: `neon branches reset <dev-branch-id> --parent`.
3. **Or migrate dev independently.** For in-progress features, apply the same migration to the dev branch directly.

### Shared Auth Schema Migrations

Changes to `neon_auth` tables affect all apps. The coordination protocol:

1. Draft the migration in a feature branch.
2. Review with all app teams (BrandSyncUp + LegalSyncUp).
3. Apply to production (default) branch during a maintenance window.
4. Reset or migrate all app branches.
5. Verify auth flows in all apps.

### Drizzle Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push schema directly (dev only, no migration files)
npx drizzle-kit push

# Apply migrations (production)
npx drizzle-kit migrate

# Open Drizzle Studio for visual inspection
npx drizzle-kit studio
```

---

## Neon API for Branch Management

Branch lifecycle operations use the `@neondatabase/api` client:

```typescript
import { createApiClient } from '@neondatabase/api';

const neon = createApiClient({ apiKey: process.env.NEON_API_KEY });

// Create a new branch for a T1 partner
const branch = await neon.createProjectBranch(projectId, {
  branch: {
    name: `partner-${partnerId}-prod`,
    parent_id: productionBranchId,
  },
  endpoints: [{ type: 'read_write' }],
});

// Reset a dev branch to match its parent
await neon.restoreProjectBranch(projectId, devBranchId, {
  source_branch_id: parentBranchId,
});
```

See `templates/branch-strategy.sql` for full examples.

---

## Non-Negotiable Rules

1. **Every query runs in tenant context.** No database query executes without an explicit `tenant_id` binding, whether via Drizzle middleware, RLS `SET` variable, or explicit `WHERE` clause.

2. **Auth tables are read-only from app branches.** Apps read from `neon_auth` but never write directly. All auth mutations go through Better Auth's API on the production branch connection.

3. **Dev branches are ephemeral.** Never store data on dev branches that cannot be recreated. Dev branches can be reset at any time.

4. **Connection strings are secrets.** Never hardcode Neon connection strings. Use Doppler for injection and Hyperdrive bindings in production.

5. **Migrations are forward-only.** Never run `DROP` or destructive DDL without a rollback plan. Prefer additive migrations (add column, add table) over destructive ones.

6. **Branch names are deterministic.** Use the pattern `<app>-<environment>` (e.g., `brandsyncup-prod`, `legalsyncup-development`). For T1 partner branches, use `<app>-partner-<id>-<env>`.

---

## Templates

| File | Purpose |
|------|---------|
| `templates/branch-strategy.sql` | Branch hierarchy, schema setup, Better Auth tables, Neon API examples |
| `templates/drizzle-tenant.ts` | Tenant-scoped Drizzle client factory with automatic `tenant_id` injection |
| `templates/hyperdrive-setup.md` | Cloudflare Hyperdrive configuration and usage |

## References

| File | Purpose |
|------|---------|
| `references/neon-auth-schema.md` | Detailed `neon_auth` schema documentation and cross-app auth flows |

## Related Skills

- `multi-tenant-platform` -- General multi-tenant architecture, 3-tier model, governance rules
- `graduated-auth` -- Progressive authentication complexity with Better Auth
- `theme-inspired-tokens` -- Design token generation for multi-tenant theming
