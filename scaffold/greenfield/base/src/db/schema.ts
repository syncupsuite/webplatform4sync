import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Schema namespace - each app gets its own PostgreSQL schema
// ---------------------------------------------------------------------------

export const appSchema = pgSchema("{{SCHEMA_NAME}}");

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const tenantTierEnum = appSchema.enum("tenant_tier", [
  "platform",   // Tier 0: platform-level (SyncUpSuite itself)
  "enterprise", // Tier 1: enterprise customer
  "team",       // Tier 2: team within an enterprise
]);

export const tenantStatusEnum = appSchema.enum("tenant_status", [
  "active",
  "suspended",
  "provisioning",
  "archived",
]);

export const isolationModeEnum = appSchema.enum("isolation_mode", [
  "shared",     // Shared schema, RLS-isolated rows
  "dedicated",  // Dedicated schema per tenant (future)
]);

// ---------------------------------------------------------------------------
// Tenants - 3-tier hierarchical multi-tenancy
// ---------------------------------------------------------------------------

export const tenants = appSchema.table(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tier: tenantTierEnum("tier").notNull().default("team"),
    parentId: uuid("parent_id").references((): any => tenants.id, {
      onDelete: "restrict",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    status: tenantStatusEnum("status").notNull().default("active"),
    isolationMode: isolationModeEnum("isolation_mode")
      .notNull()
      .default("shared"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tenants_slug_unique").on(table.slug),
    index("tenants_parent_id_idx").on(table.parentId),
    index("tenants_tier_idx").on(table.tier),
  ]
);

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  parent: one(tenants, {
    fields: [tenants.parentId],
    references: [tenants.id],
    relationName: "tenant_hierarchy",
  }),
  children: many(tenants, { relationName: "tenant_hierarchy" }),
  domainMappings: many(domainMappings),
}));

// ---------------------------------------------------------------------------
// Tenant relationships - closure table for efficient hierarchy queries
// ---------------------------------------------------------------------------

export const tenantRelationships = appSchema.table(
  "tenant_relationships",
  {
    ancestorId: uuid("ancestor_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    descendantId: uuid("descendant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    depth: integer("depth").notNull().default(0),
  },
  (table) => [
    uniqueIndex("tenant_rel_unique").on(table.ancestorId, table.descendantId),
    index("tenant_rel_descendant_idx").on(table.descendantId),
  ]
);

export const tenantRelationshipsRelations = relations(
  tenantRelationships,
  ({ one }) => ({
    ancestor: one(tenants, {
      fields: [tenantRelationships.ancestorId],
      references: [tenants.id],
      relationName: "ancestor",
    }),
    descendant: one(tenants, {
      fields: [tenantRelationships.descendantId],
      references: [tenants.id],
      relationName: "descendant",
    }),
  })
);

// ---------------------------------------------------------------------------
// Domain mappings - custom domains per tenant
// ---------------------------------------------------------------------------

export const domainMappings = appSchema.table(
  "domain_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("domain_mappings_domain_unique").on(table.domain),
    index("domain_mappings_tenant_idx").on(table.tenantId),
  ]
);

export const domainMappingsRelations = relations(domainMappings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [domainMappings.tenantId],
    references: [tenants.id],
  }),
}));

// ---------------------------------------------------------------------------
// Example application table - replace with your domain entities
// ---------------------------------------------------------------------------

export const items = appSchema.table(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("items_tenant_idx").on(table.tenantId),
    index("items_status_idx").on(table.tenantId, table.status),
  ]
);

export const itemsRelations = relations(items, ({ one }) => ({
  tenant: one(tenants, {
    fields: [items.tenantId],
    references: [tenants.id],
  }),
}));
