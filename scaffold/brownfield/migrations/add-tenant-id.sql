-- Migration: Add tenant_id to existing tables
-- Run this BEFORE enabling RLS

-- Step 1: Create the tenants infrastructure
-- (Uses the tenant schema from skills/multi-tenant-platform/templates/tenant-schema.sql)

-- Step 2: Create a default tenant for existing data
INSERT INTO tenants (id, tier, name, slug, status, isolation_mode)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  0,
  'Platform Default',
  'default',
  'active',
  'rls'
);

-- Step 3: Add tenant_id to each existing table
-- Repeat this pattern for every application table:

-- ALTER TABLE {{TABLE_NAME}}
--   ADD COLUMN tenant_id UUID REFERENCES tenants(id);
--
-- UPDATE {{TABLE_NAME}}
--   SET tenant_id = '00000000-0000-0000-0000-000000000001';
--
-- ALTER TABLE {{TABLE_NAME}}
--   ALTER COLUMN tenant_id SET NOT NULL;
--
-- CREATE INDEX idx_{{TABLE_NAME}}_tenant
--   ON {{TABLE_NAME}}(tenant_id);

-- Step 4: Verify all tables have tenant_id
-- SELECT table_name
-- FROM information_schema.columns
-- WHERE column_name = 'tenant_id'
--   AND table_schema = '{{SCHEMA_NAME}}';

-- Step 5: Add tenant_id to the closure table for the default tenant
INSERT INTO tenant_relationships (tenant_id, ancestor_id, depth)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 0);
