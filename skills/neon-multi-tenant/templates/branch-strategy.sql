-- =============================================================================
-- Neon Branch Strategy: SQL + Documentation
-- =============================================================================
-- This file documents the Neon branch hierarchy, schema creation patterns,
-- shared auth setup, and migration workflows for the SyncUpSuite platform.
--
-- Branch Hierarchy:
--
--   production (default branch)
--    |-- neon_auth schema    (shared Better Auth tables)
--    |-- public schema       (extensions, system tables)
--    |
--    +-- brandsyncup-prod
--    |    |-- brandsyncup schema
--    |    +-- brandsyncup-dev
--    |
--    +-- legalsyncup-production
--         |-- legalsyncup schema
--         +-- legalsyncup-development
--
-- =============================================================================


-- =============================================================================
-- STEP 1: Production Branch Setup (run on the default/production branch)
-- =============================================================================

-- Enable required extensions in the public schema.
-- These propagate to child branches at creation time.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- Create the shared auth schema.
CREATE SCHEMA IF NOT EXISTS neon_auth;


-- =============================================================================
-- STEP 2: Better Auth Tables in neon_auth
-- =============================================================================
-- These tables are managed by Better Auth but documented here for reference.
-- Better Auth creates them via its migration system. Do NOT manually alter
-- these tables without coordinating across all apps.

-- Core user identity. One row per human across all apps.
CREATE TABLE IF NOT EXISTS neon_auth.users (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name       TEXT,
    email      TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    image      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Active sessions. JWT-based, 7-day expiry.
CREATE TABLE IF NOT EXISTS neon_auth.sessions (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id    TEXT NOT NULL REFERENCES neon_auth.users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON neon_auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON neon_auth.sessions(token);

-- OAuth and credential accounts linked to users.
CREATE TABLE IF NOT EXISTS neon_auth.accounts (
    id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id               TEXT NOT NULL REFERENCES neon_auth.users(id) ON DELETE CASCADE,
    account_id            TEXT NOT NULL,
    provider_id           TEXT NOT NULL,
    access_token          TEXT,
    refresh_token         TEXT,
    access_token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope                 TEXT,
    id_token              TEXT,
    password              TEXT,  -- bcrypt hash for credential accounts
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON neon_auth.accounts(user_id);

-- Email/phone verification tokens.
CREATE TABLE IF NOT EXISTS neon_auth.verifications (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    identifier TEXT NOT NULL,   -- email or phone
    value      TEXT NOT NULL,   -- verification token/code
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON neon_auth.verifications(identifier);

-- Organization support (Better Auth organization plugin).
CREATE TABLE IF NOT EXISTS neon_auth.organizations (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    logo       TEXT,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization membership with roles.
CREATE TABLE IF NOT EXISTS neon_auth.members (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id         TEXT NOT NULL REFERENCES neon_auth.users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES neon_auth.organizations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_members_user_id ON neon_auth.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON neon_auth.members(organization_id);


-- =============================================================================
-- STEP 3: RLS Policies on Auth Tables
-- =============================================================================
-- These ensure users can only access their own auth data, even if
-- application-level checks fail.

ALTER TABLE neon_auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE neon_auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neon_auth.accounts ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile.
CREATE POLICY users_self_read ON neon_auth.users
    FOR SELECT
    USING (id = current_setting('app.user_id', true));

-- Sessions are visible only to the owning user.
CREATE POLICY sessions_self_read ON neon_auth.sessions
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));

-- Accounts are visible only to the owning user.
CREATE POLICY accounts_self_read ON neon_auth.accounts
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));

-- The application service role bypasses RLS for auth operations.
-- Better Auth connects with this role to manage sessions.
-- IMPORTANT: The service role must be granted in Neon console, not here.
-- This is documented for reference:
--   ALTER ROLE neon_service_role BYPASSRLS;


-- =============================================================================
-- STEP 4: App-Specific Schema (run on app branch after creation)
-- =============================================================================

-- Example: BrandSyncUp schema (run on brandsyncup-prod branch)
CREATE SCHEMA IF NOT EXISTS brandsyncup;

-- All app tables include tenant_id for RLS.
CREATE TABLE IF NOT EXISTS brandsyncup.organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    settings    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgs_tenant ON brandsyncup.organizations(tenant_id);

ALTER TABLE brandsyncup.organizations ENABLE ROW LEVEL SECURITY;

-- T2 isolation: customers see only their own organization data.
CREATE POLICY tenant_isolation ON brandsyncup.organizations
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Example: LegalSyncUp schema (run on legalsyncup-production branch)
CREATE SCHEMA IF NOT EXISTS legalsyncup;

CREATE TABLE IF NOT EXISTS legalsyncup.matters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matters_tenant ON legalsyncup.matters(tenant_id);

ALTER TABLE legalsyncup.matters ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON legalsyncup.matters
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);


-- =============================================================================
-- STEP 5: Tenant Context Setup (run at the start of each request)
-- =============================================================================

-- Set tenant context for RLS policies.
-- This must be called at the beginning of every database session/transaction.
-- In Drizzle, this is done via the tenant-scoped client (see drizzle-tenant.ts).

-- Example: setting tenant context for a request
SET LOCAL app.tenant_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
SET LOCAL app.user_id = 'user_abc123';

-- Verify the context is set
SELECT current_setting('app.tenant_id');
SELECT current_setting('app.user_id');


-- =============================================================================
-- MIGRATION PATTERNS
-- =============================================================================
--
-- Pattern 1: Schema change on production branch (shared auth)
--
--   1. Write migration SQL or use `npx drizzle-kit generate`
--   2. Apply to production (default) branch:
--        doppler run -- npx drizzle-kit migrate
--   3. Reset dev branches to inherit changes:
--        neon branches reset <dev-branch-id> --parent
--   4. Verify in each app.
--
-- Pattern 2: App-specific schema change
--
--   1. Develop on the dev branch:
--        doppler run -- npx drizzle-kit push  (dev branch connection)
--   2. Test thoroughly on dev branch.
--   3. Generate migration files:
--        doppler run -- npx drizzle-kit generate
--   4. Apply to app-prod branch:
--        doppler run -- npx drizzle-kit migrate  (prod branch connection)
--
-- Pattern 3: New T1 partner branch
--
--   1. Create branch from production:
--        neon branches create --name partner-acme-prod --parent production
--   2. Create app schema on new branch:
--        Run STEP 4 SQL above (adapted for the partner)
--   3. Create dev branch for the partner:
--        neon branches create --name partner-acme-dev --parent partner-acme-prod
--   4. Store connection strings in Doppler:
--        doppler secrets set NEON_PARTNER_ACME_PROD_URL "postgres://..."
--        doppler secrets set NEON_PARTNER_ACME_DEV_URL "postgres://..."
--
-- =============================================================================


-- =============================================================================
-- NEON API EXAMPLES (TypeScript, using @neondatabase/api)
-- =============================================================================
--
-- // Install: npm install @neondatabase/api
--
-- import { createApiClient } from '@neondatabase/api';
--
-- const neon = createApiClient({ apiKey: process.env.NEON_API_KEY });
-- const projectId = 'polished-truth-90679079';
--
-- // --- List all branches ---
-- const { data: branches } = await neon.listProjectBranches(projectId);
-- console.log(branches.branches.map(b => `${b.name} (${b.id})`));
--
-- // --- Create a new T1 partner branch ---
-- const { data: newBranch } = await neon.createProjectBranch(projectId, {
--   branch: {
--     name: 'partner-acme-prod',
--     parent_id: 'br-production-id',  // production branch ID
--   },
--   endpoints: [{
--     type: 'read_write',
--     autoscaling_limit_min_cu: 0.25,
--     autoscaling_limit_max_cu: 2,
--   }],
-- });
-- console.log(`Branch created: ${newBranch.branch.id}`);
-- console.log(`Endpoint: ${newBranch.endpoints[0].host}`);
--
-- // --- Create a dev branch from the partner branch ---
-- const { data: devBranch } = await neon.createProjectBranch(projectId, {
--   branch: {
--     name: 'partner-acme-dev',
--     parent_id: newBranch.branch.id,
--   },
--   endpoints: [{
--     type: 'read_write',
--     autoscaling_limit_min_cu: 0.25,
--     autoscaling_limit_max_cu: 1,
--   }],
-- });
--
-- // --- Reset a dev branch to match its parent ---
-- await neon.restoreProjectBranch(projectId, devBranch.branch.id, {
--   source_branch_id: newBranch.branch.id,
-- });
--
-- // --- Delete a branch (e.g., after partner offboarding) ---
-- await neon.deleteProjectBranch(projectId, devBranch.branch.id);
--
-- // --- Get connection URI for a branch endpoint ---
-- const { data: endpoints } = await neon.listProjectBranchEndpoints(
--   projectId,
--   newBranch.branch.id
-- );
-- const host = endpoints.endpoints[0].host;
-- const connString = `postgres://neondb_owner:${password}@${host}/neondb?sslmode=require`;
--
-- =============================================================================
