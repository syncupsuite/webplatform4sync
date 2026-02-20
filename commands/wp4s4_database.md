> **@deprecated** — Use a command frame instead.
> Construction: `/webplatform4sync:pour` → `neon`
> Shu-Ha-Ri: `/webplatform4sync:ha` → `neon`
> This command will be removed after one full project cycle with frames in use.

---

# wp4s4_database

> Step 4 of 9 — Configure Neon database with tenant-scoped queries
> Previous: `wp4s3_tenant` | Next: `wp4s5_auth`

## What This Does

Sets up the Neon PostgreSQL branch strategy, configures Drizzle ORM for tenant-scoped queries with automatic `tenant_id` injection, and wires Cloudflare Hyperdrive for connection pooling. This step connects the tenant model (from step 3) to the actual database infrastructure.

## Instructions

### 1. Read Discovery State

Load `.p4s/status.json`. Verify that `tenant` step is completed (or at least that tenant schema exists). Check `discover` findings for existing database state.

### 2. Load the Neon Multi-Tenant Skill

Read `skills/neon-multi-tenant/skill.md` for the full specification. This covers:
- Neon branch architecture and copy-on-write semantics
- Schema organization across branches
- Isolation decision matrix (branch per T1, RLS per T2)
- Drizzle ORM tenant configuration
- Hyperdrive connection pooling

### 3. Design Branch Strategy

Ask the user:

> **What Neon project setup do you need?**
> 1. **New project** — Create a fresh Neon project with standard branch hierarchy
> 2. **Existing project** — Connect to an existing Neon project (provide project ID)
> 3. **Shared project** — Add this app as a new branch in an existing multi-app project (like SyncUpSuite)

Generate the branch hierarchy following the pattern:

```
production (default)
 |-- neon_auth schema (shared Better Auth tables)
 |
 +-- <app>-prod (app production branch)
      |-- <app_schema> (app-specific tables)
      +-- <app>-dev (development branch)
```

### 4. Configure Drizzle ORM

Verify or generate `drizzle.config.ts` with:
- Correct schema path (`./src/db/schema.ts`)
- Schema filter for the app schema name
- Connection URL from environment (Doppler)

Verify or generate `src/db/schema.ts` with:
- `pgSchema("<app_schema>")` namespace
- All tables include `tenant_id` column
- Proper relations defined
- Indexes on `tenant_id` and composite indexes

Generate or verify the tenant-scoped Drizzle client using patterns from `skills/neon-multi-tenant/templates/drizzle-tenant.ts`:
- `tenantQuery()` function that sets `app.tenant_id` context before queries
- Automatic `tenant_id` injection on inserts
- Transaction support with tenant context

### 5. Configure Hyperdrive

For production deployments via Cloudflare Workers:

- Add `DB` Hyperdrive binding to `wrangler.jsonc`
- Document Hyperdrive creation command: `wrangler hyperdrive create <app>-db --connection-string="<neon-url>"`
- Configure connection strategy per environment:
  - Production: Hyperdrive (`env.DB.connectionString`)
  - Development: Neon serverless driver (direct URL)
  - Testing: Dev branch connection string

Use patterns from `skills/neon-multi-tenant/templates/hyperdrive-setup.md`.

### 6. Generate Migration Commands

Add to `package.json` scripts (if not already present):
```json
{
  "db:generate": "doppler run -- npx drizzle-kit generate",
  "db:push": "doppler run -- npx drizzle-kit push",
  "db:migrate": "doppler run -- npx drizzle-kit migrate",
  "db:studio": "doppler run -- npx drizzle-kit studio"
}
```

### 7. Set Up Shared Auth Schema Access

If the project uses shared auth (Better Auth in `neon_auth`):
- Document that auth writes go through the production branch connection
- Document the schema migration coordination protocol for `neon_auth` changes
- Set auth tables as read-only from app branches

### 8. Update Status

Update `.p4s/status.json`:

```json
{
  "database": {
    "status": "completed",
    "completedAt": "<ISO 8601>",
    "neonProject": "<project-id>",
    "branches": {
      "production": "<branch-id>",
      "appProd": "<branch-id>",
      "appDev": "<branch-id>"
    },
    "schema": "<app_schema>",
    "hyperdrive": true,
    "drizzleConfigured": true,
    "tenantScopedQueries": true
  }
}
```

## Reference

- `skills/neon-multi-tenant/skill.md` — full Neon multi-tenant specification
- `skills/neon-multi-tenant/templates/branch-strategy.sql` — branch hierarchy and schema setup
- `skills/neon-multi-tenant/templates/drizzle-tenant.ts` — tenant-scoped Drizzle client
- `skills/neon-multi-tenant/templates/hyperdrive-setup.md` — Hyperdrive configuration
- `skills/neon-multi-tenant/references/neon-auth-schema.md` — shared auth schema docs
- `shared/contracts/env.ts` — environment type definitions (Hyperdrive binding)
- `shared/conventions/stack.md` — Drizzle ORM and Neon driver versions

## Completion

The user has a working Neon database with branch hierarchy, Drizzle ORM configured for tenant-scoped queries, and Hyperdrive ready for production deployment. All queries execute within tenant context.

Update `.p4s/status.json` step `database` status to `completed`.
