// Canonical types: see shared/contracts/tenant.ts (TenantDbContext)
// Canonical RLS variables: see shared/contracts/constants.ts
// Canonical auth tables: see shared/contracts/auth.ts (AUTH_TABLES)

/**
 * Drizzle ORM Multi-Tenant Configuration for Neon PostgreSQL
 *
 * This module provides:
 * 1. Schema definitions with tenant_id on all tables
 * 2. Tenant-scoped query helper (tenantQuery) for safe RLS enforcement
 * 3. Connection setup for Neon serverless driver + Hyperdrive
 * 4. Type-safe tenant context
 *
 * Usage:
 *   const results = await tenantQuery(connString, ctx, (db) =>
 *     db.select().from(documents)
 *   );
 *   // Automatically filtered by tenant_id via RLS
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import {
  pgTable,
  pgSchema,
  text,
  uuid,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// =============================================================================
// 1. Schema Definitions
// =============================================================================

/**
 * Define the app-specific schema.
 * Each app (BrandSyncUp, LegalSyncUp) uses its own PostgreSQL schema.
 * Replace 'brandsyncup' with your app's schema name.
 */
export const appSchema = pgSchema('brandsyncup');

/**
 * Reference to the shared auth schema.
 * Used for reading auth data (users, sessions) -- never write directly.
 */
export const authSchema = pgSchema('neon_auth');

// =============================================================================
// 2. Shared Auth Tables (read-only references)
// =============================================================================

/**
 * Reference to neon_auth.user for JOINs.
 * Do NOT use this for inserts/updates -- auth mutations go through Better Auth.
 */
export const authUser = authSchema.table('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = authSchema.table('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUser.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// =============================================================================
// 3. App-Specific Tables (all include tenant_id)
// =============================================================================

/**
 * Example: Organizations table.
 * Every app table MUST include `tenant_id` for RLS enforcement.
 */
export const organizations = appSchema.table(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    settings: jsonb('settings').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_orgs_tenant').on(table.tenantId),
  ]
);

/**
 * Example: Documents table with tenant isolation.
 */
export const documents = appSchema.table(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: text('title').notNull(),
    content: jsonb('content').default({}),
    status: text('status').notNull().default('draft'),
    createdBy: text('created_by').references(() => authUser.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_docs_tenant').on(table.tenantId),
    index('idx_docs_org').on(table.organizationId),
    index('idx_docs_created_by').on(table.createdBy),
  ]
);

// =============================================================================
// 4. Tenant Context Type
// =============================================================================

export interface TenantDbContext {
  /** The tenant UUID for RLS filtering */
  tenantId: string;
  /** The authenticated user ID (from Better Auth session) */
  userId: string;
}

// =============================================================================
// 5. Connection Factory
// =============================================================================

/**
 * Create a Neon SQL executor.
 *
 * In production (Cloudflare Workers), use the Hyperdrive connection string.
 * In development, use the direct Neon connection string from Doppler.
 *
 * @param connectionString - Neon or Hyperdrive connection string
 */
function createNeonClient(connectionString: string) {
  // Configure for Cloudflare Workers environment
  neonConfig.fetchConnectionCache = true;

  return neon(connectionString);
}

/**
 * Create a base Drizzle client without tenant context.
 * Use this only for migrations, admin operations, or schema inspection.
 */
export function createBaseClient(connectionString: string): NeonHttpDatabase {
  const sql = createNeonClient(connectionString);
  return drizzle(sql);
}

// ---------------------------------------------------------------------------
// REMOVED: createTenantClient()
// ---------------------------------------------------------------------------
// The createTenantClient() function was removed because it is fundamentally
// broken with the Neon HTTP driver. Each db.execute() call is a separate
// HTTP request (separate transaction), so set_config() in one call is NOT
// available in subsequent calls. Use tenantQuery() instead, which wraps
// context setup and query in a single transaction.
// ---------------------------------------------------------------------------

// =============================================================================
// 7. Query Helpers with Tenant Context
// =============================================================================

/**
 * Execute a tenant-scoped query using Neon's HTTP driver.
 *
 * Since each HTTP request is a separate transaction, this bundles
 * the SET commands with the query in a single transaction.
 *
 * @example
 * ```typescript
 * const results = await tenantQuery(
 *   connectionString,
 *   { tenantId: 'uuid', userId: 'user_id' },
 *   async (db) => {
 *     return db.select().from(documents).where(eq(documents.status, 'published'));
 *   }
 * );
 * ```
 */
export async function tenantQuery<T>(
  connectionString: string,
  context: TenantDbContext,
  queryFn: (db: NeonHttpDatabase) => Promise<T>
): Promise<T> {
  const sqlClient = createNeonClient(connectionString);
  const db = drizzle(sqlClient);

  // Execute context setup and query in the same transaction.
  // The Neon HTTP driver executes each `db.execute()` as a separate
  // HTTP request. To ensure RLS context is set for the query,
  // we use a raw SQL transaction wrapper.
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${context.tenantId}, true),
                 set_config('app.user_id', ${context.userId}, true)`
    );
    return queryFn(tx as unknown as NeonHttpDatabase);
  });

  return result;
}

/**
 * Insert helper that automatically sets tenant_id on the values.
 *
 * @example
 * ```typescript
 * await tenantInsert(db, documents, context, {
 *   title: 'My Document',
 *   content: { body: 'Hello' },
 *   organizationId: orgId,
 *   createdBy: context.userId,
 * });
 * // tenant_id is automatically injected
 * ```
 */
export async function tenantInsert<T extends { tenantId: string }>(
  db: NeonHttpDatabase,
  table: any,
  context: TenantDbContext,
  values: Omit<T, 'tenantId' | 'id' | 'createdAt' | 'updatedAt'>
): Promise<T[]> {
  return db
    .insert(table)
    .values({ ...values, tenantId: context.tenantId } as any)
    .returning() as Promise<T[]>;
}

// =============================================================================
// 8. Cloudflare Workers Integration
// =============================================================================

/**
 * Environment bindings for Cloudflare Workers.
 * Hyperdrive provides the pooled connection string.
 */
export interface WorkerEnv {
  HYPERDRIVE: {
    connectionString: string;
  };
  // Direct Neon URL as fallback
  NEON_DATABASE_URL?: string;
}

/**
 * Get the appropriate connection string for the environment.
 *
 * Production uses Hyperdrive for connection pooling.
 * Development falls back to the direct Neon connection string.
 */
export function getConnectionString(env: WorkerEnv): string {
  // Prefer Hyperdrive in production (provides connection pooling)
  if (env.HYPERDRIVE?.connectionString) {
    return env.HYPERDRIVE.connectionString;
  }

  // Fallback to direct Neon connection (development)
  if (env.NEON_DATABASE_URL) {
    return env.NEON_DATABASE_URL;
  }

  throw new Error('No database connection string available. Configure HYPERDRIVE or NEON_DATABASE_URL.');
}

/**
 * Complete example: Cloudflare Worker request handler with tenant-scoped DB.
 *
 * @example
 * ```typescript
 * export default {
 *   async fetch(request: Request, env: WorkerEnv): Promise<Response> {
 *     // 1. Authenticate the request (Better Auth session validation)
 *     const session = await validateSession(request, env);
 *     if (!session) return new Response('Unauthorized', { status: 401 });
 *
 *     // 2. Create tenant-scoped DB client
 *     const connString = getConnectionString(env);
 *     const results = await tenantQuery(
 *       connString,
 *       { tenantId: session.tenantId, userId: session.userId },
 *       async (db) => {
 *         return db.select().from(documents)
 *           .where(eq(documents.status, 'published'))
 *           .orderBy(documents.createdAt);
 *       }
 *     );
 *
 *     // 3. Return results (tenant_id filtering handled by RLS)
 *     return Response.json(results);
 *   },
 * };
 * ```
 */

// =============================================================================
// 9. Schema Export for Drizzle Kit
// =============================================================================

/**
 * Export all schemas for drizzle-kit to generate migrations.
 *
 * In drizzle.config.ts:
 * ```typescript
 * import type { Config } from 'drizzle-kit';
 *
 * export default {
 *   schema: './src/db/schema.ts',
 *   out: './drizzle',
 *   dialect: 'postgresql',
 *   dbCredentials: {
 *     url: process.env.NEON_DATABASE_URL!,
 *   },
 *   schemaFilter: ['brandsyncup'],  // Only manage app schema, not neon_auth
 * } satisfies Config;
 * ```
 *
 * IMPORTANT: Set `schemaFilter` to your app's schema name.
 * Never let drizzle-kit manage the `neon_auth` schema -- that is
 * owned by Better Auth and shared across apps.
 */
export const schema = {
  // App-specific tables (managed by Drizzle)
  organizations,
  documents,

  // Auth tables (read-only references, not managed by Drizzle)
  authUser,
  authSession,
};
