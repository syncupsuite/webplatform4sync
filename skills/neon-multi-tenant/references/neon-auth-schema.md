# Shared neon_auth Schema Reference

## Overview

The `neon_auth` schema is a shared PostgreSQL schema on the production (default) Neon branch that stores all authentication data for the SyncUpSuite platform. It is managed by Better Auth and shared across multiple applications (BrandSyncUp, LegalSyncUp).

This schema lives on the production branch and is inherited by all child branches at creation time. Applications connect to the production branch for auth operations (login, session validation, user management) and to their app-specific branches for domain data.

---

## Table Structure

### neon_auth.user

The core identity table. One row per human across all applications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NOT NULL | `gen_random_uuid()::text` | Primary key, UUID as text |
| `name` | TEXT | NULL | | Display name |
| `email` | TEXT | NOT NULL | | Email address, unique |
| `email_verified` | BOOLEAN | NOT NULL | `false` | Email verification status |
| `image` | TEXT | NULL | | Avatar URL |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp |

**Constraints**: `PRIMARY KEY (id)`, `UNIQUE (email)`

**Notes**:
- Better Auth uses TEXT for IDs (not UUID type) for cross-database compatibility.
- The `email` uniqueness constraint means a user with the same email across BrandSyncUp and LegalSyncUp is the **same user** with the **same ID**. This is by design for cross-app SSO.

### neon_auth.session

Active user sessions. JWT-based with 7-day default expiry.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NOT NULL | `gen_random_uuid()::text` | Primary key |
| `user_id` | TEXT | NOT NULL | | FK to users.id |
| `token` | TEXT | NOT NULL | | Session token (unique) |
| `expires_at` | TIMESTAMPTZ | NOT NULL | | Expiration timestamp |
| `ip_address` | TEXT | NULL | | Client IP at session creation |
| `user_agent` | TEXT | NULL | | Client User-Agent at session creation |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp |

**Constraints**: `PRIMARY KEY (id)`, `UNIQUE (token)`, `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

**Indexes**: `idx_sessions_user_id`, `idx_sessions_token`

**Notes**:
- Sessions are shared across apps. A session created by logging into BrandSyncUp is valid for LegalSyncUp if the apps share the same Better Auth secret.
- Session expiry is 7 days by default, configurable in Better Auth config.
- The `token` is what gets stored in the `httpOnly` cookie (`better-auth.session_token`).

### neon_auth.account

OAuth providers and credential accounts linked to users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NOT NULL | `gen_random_uuid()::text` | Primary key |
| `user_id` | TEXT | NOT NULL | | FK to users.id |
| `account_id` | TEXT | NOT NULL | | Provider-specific account ID |
| `provider_id` | TEXT | NOT NULL | | Provider identifier (e.g., `github`, `google`, `credential`) |
| `access_token` | TEXT | NULL | | OAuth access token |
| `refresh_token` | TEXT | NULL | | OAuth refresh token |
| `access_token_expires_at` | TIMESTAMPTZ | NULL | | Access token expiry |
| `refresh_token_expires_at` | TIMESTAMPTZ | NULL | | Refresh token expiry |
| `scope` | TEXT | NULL | | OAuth scope granted |
| `id_token` | TEXT | NULL | | OIDC ID token |
| `password` | TEXT | NULL | | Bcrypt hash (for `credential` provider) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp |

**Constraints**: `PRIMARY KEY (id)`, `UNIQUE (provider_id, account_id)`, `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

**Indexes**: `idx_accounts_user_id`

**Notes**:
- A user can have multiple accounts (e.g., one `credential` + one `github` + one `google`).
- The `password` field is only populated for `credential` provider accounts and contains a bcrypt hash.
- OAuth tokens are stored for providers that need them for API access (e.g., GitHub API).

### neon_auth.verification

Email and phone verification tokens.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NOT NULL | `gen_random_uuid()::text` | Primary key |
| `identifier` | TEXT | NOT NULL | | Email or phone number |
| `value` | TEXT | NOT NULL | | Verification token/code |
| `expires_at` | TIMESTAMPTZ | NOT NULL | | Token expiry |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp |

**Constraints**: `PRIMARY KEY (id)`

**Indexes**: `idx_verifications_identifier`

**Notes**:
- Tokens are short-lived (typically 10 minutes).
- Better Auth cleans up expired tokens automatically.

### neon_auth.organization

Organization/team support via Better Auth's organization plugin.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NOT NULL | `gen_random_uuid()::text` | Primary key |
| `name` | TEXT | NOT NULL | | Organization name |
| `slug` | TEXT | NOT NULL | | URL-safe slug (unique) |
| `logo` | TEXT | NULL | | Logo URL |
| `metadata` | JSONB | NULL | | Extensible metadata |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp |

**Constraints**: `PRIMARY KEY (id)`, `UNIQUE (slug)`

### neon_auth.member

Organization membership with role assignments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NOT NULL | `gen_random_uuid()::text` | Primary key |
| `user_id` | TEXT | NOT NULL | | FK to users.id |
| `organization_id` | TEXT | NOT NULL | | FK to organizations.id |
| `role` | TEXT | NOT NULL | `'member'` | Role within the organization |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp |

**Constraints**: `PRIMARY KEY (id)`, `UNIQUE (user_id, organization_id)`, `FOREIGN KEY (user_id)`, `FOREIGN KEY (organization_id)`

**Indexes**: `idx_members_user_id`, `idx_members_org_id`

**Notes**:
- Default roles: `owner`, `admin`, `member`.
- A user can belong to multiple organizations with different roles.
- The `organization_id` in `neon_auth` maps to the concept of a "tenant" in the application layer. The application's `tenant_id` typically corresponds to an `organization_id` from this table.

---

## Cross-App Authentication Flow

### How Shared Auth Works

```
User logs into BrandSyncUp
  |
  +-> Better Auth validates credentials against neon_auth.account
  |     (production branch connection)
  |
  +-> Session created in neon_auth.session
  |     (production branch connection)
  |
  +-> Session token set in httpOnly cookie
  |     (domain: .syncup.com or app-specific domain)
  |
  +-> User navigates to LegalSyncUp
  |
  +-> LegalSyncUp validates session token against neon_auth.session
  |     (same production branch connection)
  |
  +-> Session is valid -> user is authenticated in LegalSyncUp
```

### Connection Architecture

```
BrandSyncUp Worker
  |
  +-- Auth operations --> production branch (neon_auth schema)
  +-- Domain queries  --> brandsyncup-prod branch (brandsyncup schema)
                          via Hyperdrive

LegalSyncUp Worker
  |
  +-- Auth operations --> production branch (neon_auth schema)
  +-- Domain queries  --> legalsyncup-production branch (legalsyncup schema)
                          via Hyperdrive
```

Each app maintains two logical connections:
1. **Auth connection**: To the production branch for session validation and user lookup.
2. **Data connection**: To the app's own branch for domain data, routed through Hyperdrive.

In practice, the auth connection may also go through a dedicated Hyperdrive config or use the Neon serverless driver directly, depending on latency requirements.

### Session Token Format

Better Auth uses opaque session tokens (not JWTs by default). The token is a random string stored in the `sessions` table and set as an `httpOnly` cookie.

For Cloudflare Workers (which cannot use cookies in the traditional sense for API calls), Better Auth supports JWT-based sessions:

```typescript
// Better Auth config for Workers
export const auth = betterAuth({
  database: neonAdapter(connectionString),
  session: {
    strategy: 'jwt',        // Use JWT instead of database sessions
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});
```

With JWT sessions, the token is self-contained and does not require a database lookup on every request. However, this means session revocation is not immediate (tokens remain valid until expiry).

---

## Schema Migration Coordination

### The Coordination Problem

Changes to `neon_auth` affect all applications. A migration that adds a column to `users` or changes a constraint on `sessions` must be compatible with every app that reads from these tables.

### Migration Protocol

1. **Propose**: File an issue or PR describing the schema change and its impact on all apps.

2. **Review**: All app teams (BrandSyncUp, LegalSyncUp) review the migration for compatibility.

3. **Test**: Apply the migration to a test branch (fork of production) and verify all apps work.

4. **Schedule**: Choose a maintenance window. Auth migrations should happen during low-traffic periods.

5. **Apply**: Run the migration on the production (default) branch.
   ```bash
   # Connect to production branch
   doppler run --config prod -- npx drizzle-kit migrate
   ```

6. **Verify**: Run auth flow tests for each app against the updated schema.

7. **Propagate**: Reset or migrate child branches as needed.
   ```bash
   # Reset dev branches to inherit the new schema
   neon branches reset br-broad-heart-aglkic7z --parent
   neon branches reset br-polished-sun-ag8a15yi --parent
   ```

### Safe Migration Patterns

| Pattern | Safe? | Notes |
|---------|-------|-------|
| Add nullable column | Yes | Existing queries continue to work |
| Add column with default | Yes | Backfill happens automatically |
| Add index | Yes | Non-blocking in PostgreSQL (use `CONCURRENTLY`) |
| Rename column | No | Breaks all apps simultaneously |
| Drop column | No | Breaks apps that SELECT that column |
| Change column type | Depends | Widening (TEXT -> TEXT) is safe; narrowing is not |
| Add NOT NULL constraint | No | Fails if existing rows have NULLs |

### Recommended Approach: Expand-Contract

For breaking changes, use the expand-contract pattern:

1. **Expand**: Add the new column/table alongside the old one. Deploy all apps to use the new column.
2. **Migrate data**: Copy data from old to new column.
3. **Contract**: Once all apps are updated, remove the old column.

This ensures zero-downtime migrations across multiple applications.

---

## RLS Policies on Auth Tables

### Current Policies

```sql
-- Users can read their own profile
CREATE POLICY users_self_read ON neon_auth.user
    FOR SELECT
    USING (id = current_setting('app.user_id', true));

-- Sessions visible only to owning user
CREATE POLICY sessions_self_read ON neon_auth.session
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));

-- Accounts visible only to owning user
CREATE POLICY accounts_self_read ON neon_auth.account
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));
```

### Service Role Bypass

Better Auth's internal operations (creating sessions, validating tokens) need to bypass RLS. The service role used by Better Auth has `BYPASSRLS` privilege:

```sql
-- Configured in Neon console, not in application code
ALTER ROLE neon_service_role BYPASSRLS;
```

Application code connecting via Hyperdrive uses a role that respects RLS. Only the Better Auth middleware uses the service role.

### Organization-Level Policies

For the `organizations` and `members` tables, policies allow users to see organizations they belong to:

```sql
-- Users can see organizations they are members of
CREATE POLICY members_org_read ON neon_auth.organization
    FOR SELECT
    USING (
      id IN (
        SELECT organization_id FROM neon_auth.member
        WHERE user_id = current_setting('app.user_id', true)
      )
    );

-- Users can see their own memberships
CREATE POLICY members_self_read ON neon_auth.member
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));
```

---

## Drizzle Schema Definition for neon_auth

For apps that need to reference auth tables in JOINs or type-safe queries:

```typescript
import { pgSchema, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const neonAuth = pgSchema('neon_auth');

export const authUser = neonAuth.table('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = neonAuth.table('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUser.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authAccount = neonAuth.table('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUser.id),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = neonAuth.table('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = neonAuth.table('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const members = neonAuth.table('members', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Usage in App Queries

```typescript
import { eq } from 'drizzle-orm';
import { users as authUsers } from './neon-auth-schema';
import { documents } from './app-schema';

// JOIN app data with auth user for display
const docsWithAuthors = await db
  .select({
    docId: documents.id,
    docTitle: documents.title,
    authorName: authUsers.name,
    authorEmail: authUsers.email,
  })
  .from(documents)
  .leftJoin(authUsers, eq(documents.createdBy, authUsers.id));
```

**Important**: These Drizzle definitions are for **read-only reference**. Never use them for `INSERT`, `UPDATE`, or `DELETE` operations. All auth mutations must go through Better Auth's API.
