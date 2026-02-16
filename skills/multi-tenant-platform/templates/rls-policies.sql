-- =============================================================================
-- RLS Policies for Multi-Tenant Platform
-- =============================================================================
-- Comprehensive Row Level Security policies for the 3-tier tenant model.
--
-- Security model:
--   - Every request sets `app.tenant_id` via SET LOCAL before any queries.
--   - Every request sets `app.tenant_tier` (0, 1, or 2) for tier-aware policies.
--   - If context is not set, all queries return zero rows (fail-closed).
--   - T0 (platform) can access all rows.
--   - T1 (partner) can access its own rows and its T2 children's rows.
--   - T2 (customer) can access only its own rows.
--
-- Prerequisites:
--   - tenant-schema.sql must be applied first.
--   - The application MUST call set_tenant_context() at the start of every
--     request/transaction before executing any queries.
-- =============================================================================


-- =============================================================================
-- Utility Functions
-- =============================================================================

-- Sets the tenant context for the current transaction.
-- MUST be called at the start of every request.
-- Uses SET LOCAL so the context is automatically cleared at transaction end.
CREATE OR REPLACE FUNCTION platform.set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    v_tier SMALLINT;
BEGIN
    SELECT tier INTO STRICT v_tier
    FROM platform.tenants
    WHERE id = p_tenant_id AND status = 'active';

    PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
    PERFORM set_config('app.tenant_tier', v_tier::TEXT, true);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Tenant % not found or not active', p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION platform.set_tenant_context(UUID) FROM PUBLIC;
-- Grant only to the application service role:
-- GRANT EXECUTE ON FUNCTION platform.set_tenant_context(UUID) TO app_service_role;

COMMENT ON FUNCTION platform.set_tenant_context IS
    'Sets app.tenant_id and app.tenant_tier for the current transaction. '
    'Always looks up the tier from the database and rejects inactive tenants. '
    'Uses SET LOCAL so context auto-clears on transaction end. Must be called '
    'before any tenant-scoped queries.';


-- Returns the full ancestor chain for a given tenant (bottom-up).
-- Useful for settings inheritance and access checks.
CREATE OR REPLACE FUNCTION platform.get_tenant_chain(p_tenant_id UUID)
RETURNS TABLE (tenant_id UUID, depth SMALLINT) AS $$
    SELECT tr.ancestor_id AS tenant_id, tr.depth
    FROM platform.tenant_relationships tr
    WHERE tr.descendant_id = p_tenant_id
    ORDER BY tr.depth DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION platform.get_tenant_chain IS
    'Returns all ancestors of a tenant (including itself at depth 0), ordered '
    'from root to leaf. Used for settings inheritance resolution.';


-- Checks if `p_ancestor` is an ancestor of (or equal to) `p_descendant`.
-- Used in RLS policies for hierarchy-based access.
CREATE OR REPLACE FUNCTION platform.is_ancestor_of(
    p_ancestor UUID,
    p_descendant UUID
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM platform.tenant_relationships
        WHERE ancestor_id = p_ancestor
          AND descendant_id = p_descendant
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION platform.is_ancestor_of IS
    'Returns TRUE if p_ancestor is an ancestor of (or equal to) p_descendant. '
    'Uses the closure table for O(1) lookup.';


-- Prevent direct manipulation of the closure table.
-- Only the maintain_tenant_relationships() trigger should insert/update/delete.
-- NOTE: The trigger function must be SECURITY DEFINER to bypass these restrictive policies.
CREATE POLICY prevent_direct_closure_write ON platform.tenant_relationships
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY prevent_direct_closure_update ON platform.tenant_relationships
    FOR UPDATE
    USING (false);

CREATE POLICY prevent_direct_closure_delete ON platform.tenant_relationships
    FOR DELETE
    USING (false);


-- Helper: get current tenant ID from session context.
-- Returns NULL if not set, which causes RLS to filter out all rows (fail-closed).
CREATE OR REPLACE FUNCTION platform.current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper: get current tenant tier from session context.
CREATE OR REPLACE FUNCTION platform.current_tenant_tier()
RETURNS SMALLINT AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_tier', true), '')::SMALLINT;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;


-- =============================================================================
-- Policies: platform.tenants
-- =============================================================================

-- T0 can see all tenants.
CREATE POLICY t0_full_access ON platform.tenants
    FOR ALL
    USING (platform.current_tenant_tier() = 0)
    WITH CHECK (platform.current_tenant_tier() = 0);

-- T1 can see itself and its T2 children.
CREATE POLICY t1_hierarchy_access ON platform.tenants
    FOR SELECT
    USING (
        platform.current_tenant_tier() = 1
        AND platform.is_ancestor_of(platform.current_tenant_id(), id)
    );

-- T2 can see only itself.
CREATE POLICY t2_self_access ON platform.tenants
    FOR SELECT
    USING (
        platform.current_tenant_tier() = 2
        AND id = platform.current_tenant_id()
    );


-- =============================================================================
-- Policies: platform.tenant_relationships
-- =============================================================================

-- T0 can see all relationships.
CREATE POLICY t0_full_access ON platform.tenant_relationships
    FOR ALL
    USING (platform.current_tenant_tier() = 0)
    WITH CHECK (platform.current_tenant_tier() = 0);

-- T1/T2 can see relationships where they are the ancestor or descendant.
CREATE POLICY hierarchy_access ON platform.tenant_relationships
    FOR SELECT
    USING (
        platform.is_ancestor_of(platform.current_tenant_id(), descendant_id)
        OR descendant_id = platform.current_tenant_id()
    );


-- =============================================================================
-- Policies: platform.domain_mappings
-- =============================================================================

-- T0 can manage all domain mappings.
CREATE POLICY t0_full_access ON platform.domain_mappings
    FOR ALL
    USING (platform.current_tenant_tier() = 0)
    WITH CHECK (platform.current_tenant_tier() = 0);

-- T1 can see and manage domains for itself and its T2 children.
CREATE POLICY t1_hierarchy_access ON platform.domain_mappings
    FOR ALL
    USING (
        platform.current_tenant_tier() = 1
        AND platform.is_ancestor_of(platform.current_tenant_id(), tenant_id)
    )
    WITH CHECK (
        platform.current_tenant_tier() = 1
        AND platform.is_ancestor_of(platform.current_tenant_id(), tenant_id)
    );

-- T2 can only view its own domain mappings (not create/modify -- T1 manages).
CREATE POLICY t2_self_access ON platform.domain_mappings
    FOR SELECT
    USING (
        platform.current_tenant_tier() = 2
        AND tenant_id = platform.current_tenant_id()
    );


-- =============================================================================
-- Policies: platform.tenant_settings
-- =============================================================================

-- T0 can manage all settings.
CREATE POLICY t0_full_access ON platform.tenant_settings
    FOR ALL
    USING (platform.current_tenant_tier() = 0)
    WITH CHECK (platform.current_tenant_tier() = 0);

-- T1 can manage settings for itself and its T2 children.
CREATE POLICY t1_hierarchy_access ON platform.tenant_settings
    FOR ALL
    USING (
        platform.current_tenant_tier() = 1
        AND platform.is_ancestor_of(platform.current_tenant_id(), tenant_id)
    )
    WITH CHECK (
        platform.current_tenant_tier() = 1
        AND platform.is_ancestor_of(platform.current_tenant_id(), tenant_id)
    );

-- T2 can read all its settings, but can only modify non-inherited ones.
CREATE POLICY t2_read_access ON platform.tenant_settings
    FOR SELECT
    USING (
        platform.current_tenant_tier() = 2
        AND tenant_id = platform.current_tenant_id()
    );

CREATE POLICY t2_write_access ON platform.tenant_settings
    FOR UPDATE
    USING (
        platform.current_tenant_tier() = 2
        AND tenant_id = platform.current_tenant_id()
        AND inherited = false
    )
    WITH CHECK (
        platform.current_tenant_tier() = 2
        AND tenant_id = platform.current_tenant_id()
        AND inherited = false
    );

CREATE POLICY t2_insert_access ON platform.tenant_settings
    FOR INSERT
    WITH CHECK (
        platform.current_tenant_tier() = 2
        AND tenant_id = platform.current_tenant_id()
        AND inherited = false
    );


-- =============================================================================
-- Policies: platform.audit_log
-- =============================================================================

-- Audit logs are append-only. No UPDATE or DELETE policies.

-- T0 can read all audit logs.
CREATE POLICY t0_read_access ON platform.audit_log
    FOR SELECT
    USING (platform.current_tenant_tier() = 0);

-- T1 can read audit logs for itself and its T2 children.
CREATE POLICY t1_hierarchy_read ON platform.audit_log
    FOR SELECT
    USING (
        platform.current_tenant_tier() = 1
        AND platform.is_ancestor_of(platform.current_tenant_id(), tenant_id)
    );

-- T2 can read only its own audit logs.
CREATE POLICY t2_self_read ON platform.audit_log
    FOR SELECT
    USING (
        platform.current_tenant_tier() = 2
        AND tenant_id = platform.current_tenant_id()
    );

-- All tiers can insert audit entries (for their own tenant context).
CREATE POLICY all_insert ON platform.audit_log
    FOR INSERT
    WITH CHECK (tenant_id = platform.current_tenant_id());


-- =============================================================================
-- Example: Applying RLS to an Application Table
-- =============================================================================
-- This shows how to add tenant isolation to any application-level table.
-- Copy and adapt this pattern for every table in the application schema.
--
--   CREATE TABLE app.documents (
--       id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--       tenant_id   UUID NOT NULL REFERENCES platform.tenants(id),
--       title       TEXT NOT NULL,
--       content     TEXT,
--       created_by  UUID NOT NULL,
--       created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
--       updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
--   );
--
--   -- Always index tenant_id for RLS performance.
--   CREATE INDEX idx_documents_tenant ON app.documents(tenant_id);
--
--   -- Enable RLS and force it even for table owners.
--   ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE app.documents FORCE ROW LEVEL SECURITY;
--
--   -- Base tenant isolation: users can only see their own tenant's data.
--   CREATE POLICY tenant_isolation ON app.documents
--       FOR ALL
--       USING (tenant_id = platform.current_tenant_id())
--       WITH CHECK (tenant_id = platform.current_tenant_id());
--
--   -- T0 override: platform admins can see everything.
--   CREATE POLICY t0_admin_access ON app.documents
--       FOR ALL
--       USING (platform.current_tenant_tier() = 0)
--       WITH CHECK (platform.current_tenant_tier() = 0);
--
--   -- T1 hierarchy access: partners can see their T2 children's data.
--   CREATE POLICY t1_hierarchy_access ON app.documents
--       FOR SELECT
--       USING (
--           platform.current_tenant_tier() = 1
--           AND platform.is_ancestor_of(platform.current_tenant_id(), tenant_id)
--       );
-- =============================================================================
