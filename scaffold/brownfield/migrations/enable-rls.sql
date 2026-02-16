-- Migration: Enable Row-Level Security on existing tables
-- Run AFTER add-tenant-id.sql and thorough testing
-- Canonical RLS variable: app.tenant_id (see shared/contracts/constants.ts)

-- Step 1: Create the tenant context function (if not exists)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Step 2: Enable RLS on each table
-- Repeat for every application table:

-- ALTER TABLE {{TABLE_NAME}} ENABLE ROW LEVEL SECURITY;

-- Step 3: Create isolation policy
-- Repeat for every application table:

-- CREATE POLICY tenant_isolation_{{TABLE_NAME}}
--   ON {{TABLE_NAME}}
--   FOR ALL
--   USING (tenant_id = current_tenant_id());

-- Step 4: IMPORTANT - Force RLS for table owner
-- Without this, the table owner bypasses RLS
-- Repeat for every application table:

-- ALTER TABLE {{TABLE_NAME}} FORCE ROW LEVEL SECURITY;

-- Step 5: Test in permissive mode first
-- Before enforcing, run queries and verify:
--   SET app.tenant_id = '00000000-0000-0000-0000-000000000001';
--   SELECT * FROM {{TABLE_NAME}};  -- Should return all rows (default tenant)
--   SET app.tenant_id = '00000000-0000-0000-0000-000000000002';
--   SELECT * FROM {{TABLE_NAME}};  -- Should return empty (no data for this tenant)

-- Step 6: Verify no queries bypass tenant context
-- Check application logs for queries that don't SET app.tenant_id
-- These will fail silently (return empty results) after RLS is enabled
