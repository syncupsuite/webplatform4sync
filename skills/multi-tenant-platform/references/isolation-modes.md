# Isolation Modes

Detailed comparison of the three data isolation strategies for multi-tenant platforms, plus the recommended hybrid approach and Neon-specific considerations.

---

## Mode 1: Shared Schema + RLS

All tenants share a single database and schema. Isolation is enforced by PostgreSQL Row Level Security policies on every table.

### Implementation

```sql
-- Every table has a tenant_id column.
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES platform.tenants(id),
    title       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Base isolation policy.
CREATE POLICY tenant_isolation ON documents
    FOR ALL
    USING (tenant_id = platform.current_tenant_id())
    WITH CHECK (tenant_id = platform.current_tenant_id());
```

The application sets `app.tenant_id` at the start of every transaction:

```sql
SELECT platform.set_tenant_context('tenant-uuid-here', 2);
```

### Pros

- **Lowest operational cost.** One database, one connection pool, one set of migrations.
- **Highest tenant density.** Thousands of tenants can share a single database.
- **Simple schema migrations.** One migration applies to all tenants simultaneously.
- **Efficient cross-tenant queries.** T0 and T1 can query across tenants without federation.
- **Familiar tooling.** Standard PostgreSQL, no special infrastructure.

### Cons

- **Noisy neighbor risk.** A single tenant's heavy query can degrade performance for all tenants.
- **Weaker isolation guarantee.** A bug in RLS policies could expose cross-tenant data.
- **Shared resource limits.** Connection pool, IOPS, and storage are shared.
- **Compliance challenges.** Data residency requirements are harder to meet when all data is co-located.
- **Backup/restore granularity.** Cannot back up or restore a single tenant independently.

### When to Use

- T2 (customer) tenants within a T1's database.
- High-volume, low-isolation scenarios (hundreds to thousands of small tenants).
- Development and staging environments.
- Projects where all tenants are in the same jurisdiction.

---

## Mode 2: Schema per Tenant

Each tenant gets its own PostgreSQL schema within a shared database. Tables are identical across schemas but physically separated.

### Implementation

```sql
-- Create a schema for each tenant.
CREATE SCHEMA tenant_abc123;

-- Create tables within the tenant's schema.
CREATE TABLE tenant_abc123.documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set search_path to route queries to the correct schema.
SET search_path TO tenant_abc123, platform, public;
```

The application resolves the schema name from the tenant context and sets `search_path` per connection.

### Pros

- **Stronger isolation than RLS.** Physical schema separation means a policy bug cannot leak data across tenants.
- **Per-tenant backup/restore.** Can `pg_dump` a single schema.
- **Independent schema evolution.** Tenants can theoretically have different schema versions (useful for gradual rollouts).
- **No `tenant_id` column needed.** The schema itself provides isolation (though adding `tenant_id` is still recommended for defense-in-depth).

### Cons

- **Schema migration complexity.** Migrations must be applied to every schema. With 500 tenants, that is 500 migration runs.
- **Connection pool bloat.** Each schema needs its own `search_path` setting, complicating connection pooling.
- **Catalog bloat.** PostgreSQL's system catalogs grow linearly with the number of schemas and tables. Performance degrades at scale (1000+ schemas).
- **Tooling friction.** ORMs and migration tools often assume a single schema. Custom tooling is required.
- **Limited density.** Practical limit of a few hundred schemas per database before catalog overhead becomes significant.

### When to Use

- Mid-tier isolation needs where RLS is insufficient but full database separation is overkill.
- Regulated industries where schema-level separation satisfies auditors.
- Scenarios where per-tenant schema evolution is genuinely needed.
- Generally **not recommended** as the default -- the hybrid approach (DB-per-T1, RLS-per-T2) is preferred.

---

## Mode 3: DB per Tenant

Each tenant gets its own database (or Neon branch). Complete physical isolation of compute, storage, and connections.

### Implementation

```
T1-alpha database (Neon branch: br-alpha-abc123)
  +-- platform schema (tenant registry, settings)
  +-- app schema (application tables)
  +-- T2 tenants isolated via RLS within this database

T1-beta database (Neon branch: br-beta-def456)
  +-- platform schema
  +-- app schema
  +-- T2 tenants isolated via RLS
```

The application resolves the database connection string from the tenant's `data_plane_key`:

```typescript
const connectionString = await getConnectionForTenant(tenantId);
const pool = new Pool({ connectionString });
```

### Pros

- **Strongest isolation.** Completely separate databases. No shared resources.
- **Independent scaling.** Each database can be scaled (compute, storage, connections) independently.
- **Data residency compliance.** Each database can be provisioned in a specific geographic region.
- **Clean data export.** Entire database can be exported for a tenant.
- **Independent maintenance windows.** Schema migrations, vacuuming, and backups are per-tenant.
- **No noisy neighbor.** One tenant's workload cannot affect another's.

### Cons

- **Highest operational cost.** Each database incurs compute, storage, and management overhead.
- **Connection management complexity.** The application must route connections to the correct database.
- **Cross-tenant queries require federation.** T0 analytics must query each database separately and aggregate.
- **Migration coordination.** Schema changes must be rolled out to each database (can be parallelized but requires orchestration).
- **Cold start latency.** Neon's serverless compute may need to wake up for infrequently accessed databases.

### When to Use

- T1 (partner/reseller) tenants that need strong isolation guarantees.
- Tenants with data residency requirements in different jurisdictions.
- Enterprise customers with contractual isolation requirements.
- Tenants with significantly different scale profiles (one T1 has 100x the data of another).

---

## Recommended Hybrid: DB-per-T1, RLS-per-T2

This is the default strategy for all projects using this skill.

```
T0 Management Database
 |
 +-- T1-Alpha Database (Neon branch)
 |    +-- platform.tenants: T1-Alpha + its T2 customers
 |    +-- RLS isolates T2 customers within this DB
 |    +-- T2-A1: tenant_id filtering via RLS
 |    +-- T2-A2: tenant_id filtering via RLS
 |
 +-- T1-Beta Database (Neon branch)
      +-- platform.tenants: T1-Beta + its T2 customers
      +-- RLS isolates T2 customers within this DB
      +-- T2-B1: tenant_id filtering via RLS
```

### Why This Works

1. **T1 isolation is physical.** Partners cannot accidentally see each other's data because they are in different databases. This satisfies enterprise compliance requirements.

2. **T2 isolation is efficient.** Within a T1's database, customers share the schema and are isolated via RLS. This keeps costs low and management simple for the common case of many small T2 tenants.

3. **Scaling is natural.** A T1 with heavy usage gets its own compute resources. A T1 with light usage shares Neon's serverless pool.

4. **Regional compliance is built-in.** Each T1 database can be provisioned in the required region.

5. **Defense-in-depth.** Even within a T1 database, RLS provides a second layer of isolation for T2 tenants. The application also filters by `tenant_id` in queries (three layers total).

### Connection Routing

```typescript
async function getPoolForRequest(tenantId: string): Promise<Pool> {
  // 1. Look up tenant to find its T1 ancestor.
  const tenant = await managementDb.query(
    `SELECT t.id, t.tier, t.data_plane_key,
            COALESCE(parent.data_plane_key, t.data_plane_key) AS connection_key
     FROM platform.tenants t
     LEFT JOIN platform.tenants parent ON parent.id = t.parent_id
     WHERE t.id = $1`,
    [tenantId],
  );

  // 2. Get or create a connection pool for this T1's database.
  const connectionKey = tenant.rows[0].connection_key;
  return getOrCreatePool(connectionKey);
}
```

---

## Migration Paths Between Modes

### RLS to Schema-per-Tenant

1. Create a new schema for the tenant.
2. Copy tables from the shared schema, filtering by `tenant_id`.
3. Update the application's connection/routing logic to use `search_path`.
4. Delete the migrated rows from the shared schema.
5. Verify and update RLS policies.

**Effort**: Medium. Requires downtime or careful dual-write logic.

### RLS to DB-per-Tenant

1. Provision a new Neon branch.
2. Apply the schema migrations to the new branch.
3. Copy the tenant's data (filtered by `tenant_id`) to the new database.
4. Update `data_plane_key` on the tenant record.
5. Update connection routing logic.
6. Delete the migrated rows from the source database.

**Effort**: Medium-high. Can be done with minimal downtime using a dual-write approach.

### Schema-per-Tenant to DB-per-Tenant

1. Provision a new Neon branch.
2. `pg_dump` the tenant's schema and restore into the new database.
3. Update `data_plane_key` and connection routing.
4. Drop the schema from the source database.

**Effort**: Low-medium. Schema isolation makes the export/import cleaner.

### DB-per-Tenant to RLS (consolidation)

1. Ensure the target database has the correct schema.
2. Export data from the tenant's database with `tenant_id` column added.
3. Import into the shared database.
4. Verify RLS policies cover the new tenant.
5. Update routing to point to the shared database.
6. Decommission the old database.

**Effort**: Medium. Useful when consolidating low-activity tenants to reduce costs.

---

## Neon-Specific Considerations

Neon's architecture provides unique advantages for multi-tenant isolation.

### Branches as Isolation Boundaries

Neon branches are lightweight, copy-on-write forks of a database. This maps naturally to the T1 isolation model:

- **T1 onboarding**: Create a new Neon branch from the template branch. The branch inherits the schema and any seed data instantly (no data copy needed).
- **T1 decommissioning**: Delete the branch. All data is removed.
- **Development branches**: Each T1 can have dev/staging branches forked from their production branch, enabling safe testing.

```
Template Branch (schema + seed data)
 +-- T1-Alpha Branch (production)
 |    +-- T1-Alpha-Dev Branch (development)
 +-- T1-Beta Branch (production)
      +-- T1-Beta-Staging Branch (staging)
```

### Serverless Compute

Neon's serverless compute model means idle T1 databases do not consume compute resources. This makes DB-per-T1 cost-effective even with many low-activity partners:

- Active T1 databases auto-scale compute based on load.
- Idle T1 databases scale to zero (no compute cost, only storage).
- Cold start latency is typically < 500ms for the first query after idle.

### Connection Pooling

Neon provides built-in connection pooling via its serverless driver (`@neondatabase/serverless`). Each T1 database has its own pooler endpoint:

```
postgres://user:pass@ep-cool-bird-123.us-east-2.aws.neon.tech/neondb  (direct)
postgres://user:pass@ep-cool-bird-123.us-east-2.aws.neon.tech/neondb?pgbouncer=true  (pooled)
```

For Cloudflare Workers (which cannot use persistent TCP connections), use the HTTP-based serverless driver:

```typescript
import { neon } from '@neondatabase/serverless';
const sql = neon(connectionString);
const result = await sql`SELECT * FROM documents WHERE tenant_id = ${tenantId}`;
```

### Storage and Branching Costs

- Branches share storage via copy-on-write. A new T1 branch initially costs zero additional storage.
- Storage costs accrue only for data that differs from the parent branch.
- This makes the DB-per-T1 model significantly cheaper than traditional "separate database" approaches.

### Point-in-Time Restore

Neon supports point-in-time restore (PITR) per branch. This enables:

- Per-T1 disaster recovery without affecting other tenants.
- "Undo" operations at the T1 level (restore to before a bad migration).
- Compliance requirements for data recovery capabilities.

### Limitations

- **Branch count limits**: Neon has limits on the number of branches per project (check current limits in the Neon dashboard). For platforms with hundreds of T1 partners, you may need multiple Neon projects.
- **Cross-branch queries**: Not supported natively. T0 analytics must query each branch independently.
- **Branch creation latency**: Typically < 1 second, but provisioning compute for the first query on a new branch adds cold start time.
