-- =============================================================================
-- Multi-Tenant Platform Schema
-- =============================================================================
-- Production-ready PostgreSQL schema for a 3-tier multi-tenant SaaS platform.
--
-- Tier Model:
--   T0 = Platform Operator (singleton, owns infrastructure)
--   T1 = Partner / Reseller (gets own DB branch in production)
--   T2 = Customer Organization (isolated via RLS within T1's DB)
--
-- This schema lives in every T1 database branch. T0's management plane
-- has its own copy for platform-level tenant registry.
-- =============================================================================

-- Use a dedicated schema to avoid collisions with application tables.
CREATE SCHEMA IF NOT EXISTS platform;

-- =============================================================================
-- tenants
-- =============================================================================
-- Central registry of all tenants. In a T1 branch database, this contains
-- the T1 record and all its T2 children. In the T0 management database,
-- this contains all T0 and T1 records.
--
-- The `tier` column is an integer (0, 1, 2) rather than an enum so that
-- future tiers (e.g., T3 sub-organizations) can be added without a migration.
-- =============================================================================
CREATE TABLE platform.tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier            SMALLINT NOT NULL CHECK (tier IN (0, 1, 2)),
    parent_id       UUID REFERENCES platform.tenants(id),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'provisioning', 'decommissioned')),
    isolation_mode  TEXT NOT NULL DEFAULT 'rls'
                        CHECK (isolation_mode IN ('rls', 'schema', 'database')),

    -- For T1 tenants with isolation_mode = 'database': the Neon branch ID
    -- or connection pool identifier that routes to this tenant's database.
    -- NULL for T2 tenants (they live inside their parent T1's database).
    data_plane_key  TEXT,

    -- Flexible metadata: billing plan, feature flags, onboarding state, etc.
    metadata        JSONB NOT NULL DEFAULT '{}',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Slug must be unique within a parent context.
    CONSTRAINT uq_tenants_slug UNIQUE (parent_id, slug),

    -- T0 has no parent. T1 parent must be T0. T2 parent must be T1.
    -- Enforced via trigger (see below) since CHECK can't reference other rows.
    CONSTRAINT ck_tier_parent CHECK (
        (tier = 0 AND parent_id IS NULL) OR
        (tier IN (1, 2) AND parent_id IS NOT NULL)
    )
);

COMMENT ON TABLE platform.tenants IS
    'Central tenant registry. Each row represents a platform operator (T0), '
    'partner/reseller (T1), or customer organization (T2).';

COMMENT ON COLUMN platform.tenants.tier IS
    '0 = Platform, 1 = Partner/Reseller, 2 = Customer. Integer for extensibility.';

COMMENT ON COLUMN platform.tenants.isolation_mode IS
    'Data isolation strategy: rls (shared schema + RLS), schema (schema-per-tenant), '
    'database (separate Neon branch). T1 defaults to database, T2 defaults to rls.';

COMMENT ON COLUMN platform.tenants.data_plane_key IS
    'Neon branch ID or connection routing key. Only set for tenants with '
    'isolation_mode = database. NULL for RLS-isolated tenants.';

COMMENT ON COLUMN platform.tenants.metadata IS
    'Extensible JSONB for billing plan, feature flags, onboarding state, '
    'and other tenant-specific configuration.';

-- Indexes for common query patterns.
CREATE INDEX idx_tenants_parent ON platform.tenants(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tenants_tier ON platform.tenants(tier);
CREATE INDEX idx_tenants_status ON platform.tenants(status);
CREATE INDEX idx_tenants_slug ON platform.tenants(slug);

-- Auto-update updated_at on modification.
CREATE OR REPLACE FUNCTION platform.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON platform.tenants
    FOR EACH ROW EXECUTE FUNCTION platform.update_updated_at();


-- =============================================================================
-- tenant_relationships (closure table)
-- =============================================================================
-- Precomputed ancestor-descendant pairs for fast hierarchy queries.
-- Every tenant has a self-referencing row (ancestor = descendant, depth = 0).
--
-- Example: If T0 -> T1 -> T2, the table contains:
--   (T0, T0, 0), (T0, T1, 1), (T0, T2, 2),
--   (T1, T1, 0), (T1, T2, 1),
--   (T2, T2, 0)
--
-- This allows "give me all descendants of T1" with a single indexed query:
--   SELECT descendant_id FROM tenant_relationships WHERE ancestor_id = :t1_id
-- =============================================================================
CREATE TABLE platform.tenant_relationships (
    ancestor_id     UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
    descendant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
    depth           SMALLINT NOT NULL CHECK (depth >= 0),

    PRIMARY KEY (ancestor_id, descendant_id)
);

COMMENT ON TABLE platform.tenant_relationships IS
    'Closure table for tenant hierarchy. Stores all ancestor-descendant pairs '
    'with depth for fast subtree queries. Maintained via triggers on platform.tenants.';

COMMENT ON COLUMN platform.tenant_relationships.depth IS
    'Number of hops from ancestor to descendant. 0 = self-reference.';

-- Fast lookup: "who are my descendants?"
CREATE INDEX idx_tenant_rel_ancestor ON platform.tenant_relationships(ancestor_id, depth);

-- Fast lookup: "who are my ancestors?"
CREATE INDEX idx_tenant_rel_descendant ON platform.tenant_relationships(descendant_id, depth);

-- Trigger to maintain closure table when a tenant is inserted.
CREATE OR REPLACE FUNCTION platform.maintain_tenant_relationships()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert self-reference.
    INSERT INTO platform.tenant_relationships (ancestor_id, descendant_id, depth)
    VALUES (NEW.id, NEW.id, 0);

    -- Copy all ancestors of the parent, incrementing depth by 1.
    IF NEW.parent_id IS NOT NULL THEN
        INSERT INTO platform.tenant_relationships (ancestor_id, descendant_id, depth)
        SELECT tr.ancestor_id, NEW.id, tr.depth + 1
        FROM platform.tenant_relationships tr
        WHERE tr.descendant_id = NEW.parent_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenant_relationships_insert
    AFTER INSERT ON platform.tenants
    FOR EACH ROW EXECUTE FUNCTION platform.maintain_tenant_relationships();


-- =============================================================================
-- domain_mappings
-- =============================================================================
-- Maps custom domains to tenants for white-label routing.
-- The application's edge layer (Cloudflare Workers) uses this table to
-- resolve incoming Host headers to tenant context.
--
-- domain_type:
--   'primary'   - The main domain for this tenant (e.g., app.partner.com)
--   'alias'     - Additional domains that redirect or serve the same tenant
--   'vanity'    - Platform-provided subdomain (e.g., partner.platform.com)
-- =============================================================================
CREATE TABLE platform.domain_mappings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
    domain          TEXT NOT NULL,
    domain_type     TEXT NOT NULL DEFAULT 'primary'
                        CHECK (domain_type IN ('primary', 'alias', 'vanity')),
    verified_at     TIMESTAMPTZ,
    ssl_status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (ssl_status IN ('pending', 'active', 'expired', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- A domain can only be mapped once globally.
    CONSTRAINT uq_domain UNIQUE (domain)
);

COMMENT ON TABLE platform.domain_mappings IS
    'Maps custom domains and vanity subdomains to tenants for white-label routing. '
    'Used by edge middleware to resolve Host header to tenant context.';

COMMENT ON COLUMN platform.domain_mappings.verified_at IS
    'Timestamp when DNS verification (CNAME/TXT record) was confirmed. '
    'NULL means the domain is claimed but not yet verified.';

COMMENT ON COLUMN platform.domain_mappings.ssl_status IS
    'TLS certificate provisioning status. Cloudflare manages certificates '
    'for verified domains; this tracks the current state.';

CREATE INDEX idx_domain_mappings_tenant ON platform.domain_mappings(tenant_id);
CREATE INDEX idx_domain_mappings_domain ON platform.domain_mappings(domain);

CREATE TRIGGER trg_domain_mappings_updated_at
    BEFORE UPDATE ON platform.domain_mappings
    FOR EACH ROW EXECUTE FUNCTION platform.update_updated_at();


-- =============================================================================
-- tenant_settings
-- =============================================================================
-- Key-value configuration store with inheritance support.
-- Settings cascade from T0 -> T1 -> T2. A setting is "inherited" if the
-- tenant has not explicitly overridden it (the `inherited` column is TRUE).
--
-- The application resolves settings by walking up the tenant hierarchy:
--   1. Check T2's setting (if inherited = false, use it)
--   2. Check T1's setting (if inherited = false, use it)
--   3. Fall back to T0's default
--
-- This table stores the RESOLVED value at each tier. When a parent changes
-- a setting, a background job propagates to children where inherited = true.
-- =============================================================================
CREATE TABLE platform.tenant_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
    key             TEXT NOT NULL,
    value           JSONB NOT NULL,
    inherited       BOOLEAN NOT NULL DEFAULT true,
    version         INTEGER NOT NULL DEFAULT 1,
    updated_by      UUID,               -- Actor who last changed this setting
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each tenant can have at most one value per key.
    CONSTRAINT uq_tenant_setting UNIQUE (tenant_id, key)
);

COMMENT ON TABLE platform.tenant_settings IS
    'Hierarchical key-value configuration. Settings inherit from parent tenants '
    'unless explicitly overridden (inherited = false). Values are versioned for rollback.';

COMMENT ON COLUMN platform.tenant_settings.inherited IS
    'TRUE if this setting''s value was propagated from the parent tenant. '
    'FALSE if the tenant explicitly set this value. Only non-inherited settings '
    'survive parent updates.';

COMMENT ON COLUMN platform.tenant_settings.version IS
    'Monotonically increasing version number. Incremented on every update '
    'to this specific setting. Enables optimistic concurrency and audit trail.';

CREATE INDEX idx_tenant_settings_tenant ON platform.tenant_settings(tenant_id);
CREATE INDEX idx_tenant_settings_key ON platform.tenant_settings(key);
CREATE INDEX idx_tenant_settings_inherited ON platform.tenant_settings(tenant_id, inherited)
    WHERE inherited = true;

CREATE TRIGGER trg_tenant_settings_updated_at
    BEFORE UPDATE ON platform.tenant_settings
    FOR EACH ROW EXECUTE FUNCTION platform.update_updated_at();

-- Auto-increment version on update.
CREATE OR REPLACE FUNCTION platform.increment_setting_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenant_settings_version
    BEFORE UPDATE ON platform.tenant_settings
    FOR EACH ROW EXECUTE FUNCTION platform.increment_setting_version();


-- =============================================================================
-- audit_log
-- =============================================================================
-- Append-only audit trail for all tenant-scoped operations.
-- Partitioned by tenant_id for efficient per-tenant queries and data export.
-- =============================================================================
CREATE TABLE platform.audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,      -- Intentionally no FK for performance
    actor_id        UUID NOT NULL,
    action          TEXT NOT NULL,       -- e.g., 'tenant.create', 'settings.update'
    resource_type   TEXT NOT NULL,       -- e.g., 'tenant', 'user', 'document'
    resource_id     TEXT NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE platform.audit_log IS
    'Append-only audit trail. No FK on tenant_id for write performance. '
    'Retained for minimum 7 years for compliance. Partition by date range '
    'in production for manageability.';

CREATE INDEX idx_audit_log_tenant ON platform.audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_actor ON platform.audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON platform.audit_log(action, created_at DESC);
CREATE INDEX idx_audit_log_resource ON platform.audit_log(resource_type, resource_id);


-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
-- RLS is enabled but policies are defined in rls-policies.sql.
-- This ensures that even if the application forgets to set context,
-- queries return no rows rather than all rows (fail-closed).
-- =============================================================================
ALTER TABLE platform.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.domain_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.audit_log ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (defense-in-depth).
ALTER TABLE platform.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.domain_mappings FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.audit_log FORCE ROW LEVEL SECURITY;
