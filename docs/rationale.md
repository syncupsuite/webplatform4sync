# Architecture Rationale & Component Reference

This document records **why** each architectural decision was made and **what** each component does. It serves as institutional memory for contributors and as the audit trail for the review-and-harden cycle that shaped the current codebase.

---

## Design Principles

### 1. Standalone but Aligned

Skills are meant to stand alone. Any skill can be copied into a project without importing the others. But when multiple skills are used together in the same project, they must produce compatible artifacts.

The mechanism for this is **shared contracts** (`shared/contracts/`). Contracts define the vocabulary — type shapes, constant names, table names — that skills agree on. Think of it like Unix pipes: each tool is independent, but they agree on text streams as the interchange format.

This is not a dependency graph. Skills do not `import` from contracts at runtime. Contracts are a reference specification. Skill templates may copy the types inline, re-derive them, or import them depending on the consuming project's setup.

### 2. 3-Tier from Day One

Every project has T0 (Platform), T1 (Partner), T2 (Customer) tenant architecture from the start. For a simple single-tenant app, T0 and T1 are dormant: the `tenant_id` column exists, a single row in `tenants` represents the sole customer, and RLS policies are in place but effectively pass-through.

**Why not add multi-tenancy later?** Because retrofitting RLS onto an existing schema requires touching every query, every migration, and every test. Adding `tenant_id` columns and policies later is the second most expensive kind of migration (after auth). The cost of having dormant tiers is near-zero: one extra column, one extra `WHERE` clause. The cost of adding them later is weeks of work and a high risk of data leaks during the transition.

### 3. Graduated Auth

Authentication is not binary. The spectrum is:

```
ANONYMOUS → PREVIEW → OAUTH → FULL
```

Each level maps to a distinct security posture:

| Level | Identity Known? | Session? | Tenant Scope? | Use Case |
|-------|----------------|----------|---------------|----------|
| ANONYMOUS | No | No | No | Public pages, marketing |
| PREVIEW | Email only | KV-backed | No | Inquiry forms, trials |
| OAUTH | Yes (OAuth) | KV-backed | No | Personalized but lightweight |
| FULL | Yes (Better Auth) | DB-backed | Yes | Full RBAC, billing, data |

**Why not just use Better Auth for everything?** Because Better Auth requires a database session, which means a Neon round-trip on every request. For public pages and preview flows, that latency and cost is unnecessary. KV-backed sessions (PREVIEW/OAUTH) provide sub-millisecond reads at the edge.

**Why share the same OAuth clientId across OAUTH and FULL levels?** So that graduation is seamless. When a user goes from OAUTH to FULL, they don't see another consent screen — the identity is already verified. Better Auth links the existing OAuth identity to a full account.

### 4. Tokens Over Hardcodes

Every visual decision traces through the design token pipeline:

```
Platform Core Tokens (T0)
  └─ Brand Tokens (T1)
     └─ Cultural Overlay (optional)
        └─ Tenant Overrides (T2, if permitted)
           └─ User Preferences (light/dark/contrast)
```

Protected tokens (status colors, focus rings, accessibility indicators) cannot be overridden by any tier. This is enforced at the validator level, not just by convention.

**Why DTCG format?** It is the W3C standard in progress. Style Dictionary, Figma Tokens, and the broader tooling ecosystem are converging on it. Building on DTCG now avoids a format migration later.

### 5. Edge-First

Cloudflare Workers are the deployment target. This constrains the architecture in productive ways: no filesystem, no long-running processes, no Node.js APIs. Every template and pattern in this repo is Workers-compatible.

Hyperdrive provides connection pooling so Workers don't pay the TCP+TLS cost on every invocation. The `getConnectionString()` helper in `shared/contracts/env.ts` abstracts this: Hyperdrive in production, direct Neon URL in development.

### 6. Defense-in-Depth

Tenant isolation is enforced at three layers:

1. **Infrastructure**: Neon branches per T1 partner (separate compute, separate data)
2. **Database**: RLS policies with `app.tenant_id` session variable (per-query enforcement)
3. **Application**: Middleware that resolves tenant from the authenticated session, never from client headers

No single layer is trusted in isolation. A compromised middleware cannot bypass RLS. A misconfigured RLS policy cannot cross branch boundaries.

---

## Shared Contracts Reference

### `shared/contracts/tenant.ts`

Defines the vocabulary for tenant identity.

| Export | Kind | Purpose |
|--------|------|---------|
| `TenantTier` | Type (`0 \| 1 \| 2`) | Numeric tier used in PostgreSQL `smallint` columns and RLS policies. Integer representation is canonical — string labels are display-only. |
| `TIER_LABELS` | Const | Human-readable labels: `{0: 'Platform', 1: 'Partner', 2: 'Customer'}` |
| `TenantStatus` | Type | Lifecycle: `'provisioning' → 'active' → 'suspended' → 'decommissioned'` |
| `IsolationMode` | Type | `'rls' \| 'schema' \| 'database'` — determines how tenant data is isolated |
| `TenantIdentity` | Interface | Minimal per-request tenant identity (tenantId, tier, slug, status, isolationMode) |
| `ResolvedTenant` | Interface | Full context after domain resolution (extends TenantIdentity with name, parentId, resolvedDomain, metadata) |
| `TenantDbContext` | Interface | Database-scoped context for RLS: `{tenantId, userId}` |

**Design decision**: `TenantTier` is numeric, not a string enum. PostgreSQL stores it as `smallint`. RLS policies compare integers. String enums would require casts in every SQL expression.

**Design decision**: `TenantStatus` uses `'decommissioned'` not `'deleted'`. Tenants are never truly deleted — audit logs, billing records, and regulatory holds may reference them. Decommissioning is the terminal state.

### `shared/contracts/auth.ts`

Defines the graduated authentication spectrum.

| Export | Kind | Purpose |
|--------|------|---------|
| `AuthLevel` | Enum | ANONYMOUS, PREVIEW, OAUTH, FULL |
| `AUTH_LEVEL_ORDER` | Const | Numeric ordering for `>=` comparisons |
| `AnonymousAuth` | Interface | Discriminant: `{level: AuthLevel.ANONYMOUS}` |
| `PreviewAuth` | Interface | Adds `email`, `previewSessionId` |
| `OAuthAuth` | Interface | Adds `provider`, `providerId`, `email`, `emailVerified`, `name?`, `picture?` |
| `FullAuth` | Interface | Adds `userId`, `sessionId`, `email`, `roles`, `tenantId`, `tenantRole?` |
| `AuthState` | Union | Discriminated union of all four auth types |
| `AUTH_TABLES` | Const | Singular table names matching Better Auth convention: `user`, `session`, `account`, `verification`, `organization`, `member` |
| `AUTH_SCHEMA` | Const | `'neon_auth'` |
| `SESSION_COOKIE` | Const | Default cookie config: `httpOnly: true, secure: true, sameSite: 'Lax'` |
| `generateSessionId()` | Function | 32 bytes of `crypto.getRandomValues`, hex-encoded |

**Design decision**: `OAuthAuth` includes `emailVerified: boolean`. This was added during the security hardening pass. Without it, an attacker could register with an unverified email at a provider and link to an existing account. The `emailVerified` field gates account linking.

**Design decision**: `AUTH_TABLES` uses singular names (`user`, not `users`). Better Auth's internal queries use singular table names. Our Drizzle schema definitions, SQL examples, and reference documentation all match.

### `shared/contracts/constants.ts`

The most critical file. These constants are the "pipe format" — if any skill uses a different value, RLS fails silently (zero rows returned, no error).

| Export | Kind | Value | Purpose |
|--------|------|-------|---------|
| `RLS_TENANT_VAR` | Const | `'app.tenant_id'` | PostgreSQL session variable for current tenant. Set via `set_config()`, read via `current_setting()`. |
| `RLS_TIER_VAR` | Const | `'app.tenant_tier'` | Tier level for tiered RLS policies. |
| `RLS_USER_VAR` | Const | `'app.user_id'` | User ID for per-user RLS policies on auth tables. |
| `AUTH_SCHEMA_NAME` | Const | `'neon_auth'` | Schema for Better Auth tables. |
| `PLATFORM_SCHEMA_NAME` | Const | `'platform'` | Schema for multi-tenant infrastructure tables. |
| `DomainType` | Type | `'primary' \| 'alias' \| 'vanity'` | Domain classification for tenant resolution. |
| `PERF_BUDGETS` | Const | `{coreTokensKB: 20, ...}` | Performance budgets for token payloads and theme switching. |

**Why this file matters most**: The original review found that skills used `app.current_tenant_id`, `app.tenant_id`, and `current_user_id` interchangeably. The PostgreSQL `set_config` / `current_setting` pair requires exact string matches. One skill setting `app.tenant_id` and another reading `app.current_tenant_id` produces zero rows with no error. This is the single most dangerous cross-skill inconsistency.

### `shared/contracts/tokens.ts`

Token types and utilities shared between validators and transformers.

| Export | Kind | Purpose |
|--------|------|---------|
| `DTCGToken` | Interface | Single token: `{$type, $value, $description?}` |
| `DTCGTokenGroup` | Interface | Recursive group of tokens or sub-groups |
| `DTCGRoot` | Interface | Top-level structure with `primitive` and `semantic.light/dark` |
| `TransformOptions` | Interface | Options for CSS generation: `darkMode`, `darkModeStrategy`, `includeComments`, `prefix` |
| `isToken()` | Function | Type guard: `$value in node && $type in node` |
| `flattenTokens()` | Function | Recursively flatten a group into `[path[], DTCGToken]` pairs |
| `pathToProperty()` | Function | `"primitive.color.hanada.500"` → `"--primitive-color-hanada-500"` |
| `resolveReference()` | Function | `"{primitive.color.neutral.900}"` → `"var(--primitive-color-neutral-900)"` |
| `walkTokens()` | Function | Tree walker with callback for each leaf token |
| `PROTECTED_TOKEN_PATHS` | Const | Paths T1/T2 cannot override (status colors, focus ring, accessibility) |
| `REQUIRED_SEMANTIC_TOKENS` | Const | Paths every theme must define (background, text, interactive, border, status) |

**Design decision**: Utilities like `flattenTokens` and `resolveReference` live here rather than in the theme skill because both the Tailwind v3 transformer, the Tailwind v4 transformer, and the token validator need them. This is the only place in the codebase where the 2+ consumer rule justified extraction.

### `shared/contracts/env.ts`

Canonical Worker environment bindings.

| Export | Kind | Purpose |
|--------|------|---------|
| `Env` | Interface | Superset of all Worker bindings: `DB` (Hyperdrive), `NEON_DATABASE_URL`, `BETTER_AUTH_SECRET`, `FIREBASE_PROJECT_ID`, `CACHE` (KV), `OAUTH_SESSION_KV` (KV), `ASSETS` (R2), `ENVIRONMENT`, `APP_URL`, `PLATFORM_DOMAINS`, `DEFAULT_TENANT_ID` |
| `getConnectionString()` | Function | Returns `env.DB.connectionString` if Hyperdrive is available, else `env.NEON_DATABASE_URL` |

**Design decision**: `Env` is a superset. Individual skills narrow it via `Pick<Env, 'NEON_DATABASE_URL' | 'BETTER_AUTH_SECRET'>`. This avoids each skill inventing its own `Env` interface while allowing per-skill subsetting.

---

## Skills Reference

### multi-tenant-platform

**Entry**: `skills/multi-tenant-platform/skill.md`

**Purpose**: Defines the 3-tier tenant model, governance rules, RLS policies, and tenant middleware patterns.

**Key templates**:
- `tenant-schema.sql` — DDL for `platform.tenants`, `tenant_relationships` (closure table), `domain_mappings`, `tenant_settings`, `audit_log`
- `rls-policies.sql` — RLS policies for all platform tables with tiered access (T0 full, T1 hierarchy, T2 self-only)
- `auth-middleware.ts` — Express/Worker middleware that resolves tenant from domain and sets RLS context

**Key function**: `set_tenant_context(p_tenant_id UUID)` — a `SECURITY DEFINER` function that looks up the tenant's tier from the database and sets both `app.tenant_id` and `app.tenant_tier` via `SET LOCAL`. Takes one parameter (tenant ID only); tier is always resolved from the database, never trusted from the caller.

### graduated-auth

**Entry**: `skills/graduated-auth/skill.md`

**Purpose**: Implements the ANONYMOUS → PREVIEW → OAUTH → FULL authentication spectrum.

**Key templates**:
- `firebase-bridge.ts` — Verifies Firebase ID tokens, creates Better Auth users, bridges identity providers. Requires `email_verified: true` before account linking.
- `oauth-graduation.ts` — Handles OAuth callback, CSRF state validation, cookie management. State parameter is required (not optional).
- `worker-auth-mw.ts` — Worker middleware that resolves auth level from request. Tenant ID comes from authenticated session only, never from request headers.

**Key function**: `graduateUser(currentAuth, targetLevel, env)` — upgrades a user from one auth level to the next. Each transition has specific requirements (e.g., OAUTH→FULL requires email verification).

### neon-multi-tenant

**Entry**: `skills/neon-multi-tenant/skill.md`

**Purpose**: Neon-specific patterns for branch-based isolation, Hyperdrive pooling, and Drizzle ORM configuration.

**Key templates**:
- `branch-strategy.sql` — DDL for the Neon branch hierarchy, including auth tables with `FORCE ROW LEVEL SECURITY`
- `drizzle-tenant.ts` — Tenant-scoped query helper. Single API: `tenantQuery(connectionString, context, callback)`
- `hyperdrive-setup.md` — Configuration guide for Cloudflare Hyperdrive

**Key function**: `tenantQuery(connectionString, {tenantId, userId}, callback)` — creates a Neon HTTP connection, sets RLS session variables, executes the callback within that context, returns results. No connection pooling issues because each invocation is a single HTTP request to Neon's serverless endpoint.

**Deleted function**: `createTenantClient()` was removed because it attempted to create a persistent Drizzle client with connection pooling, but Neon's HTTP driver is stateless — there is no persistent connection to pool. The function was dead code that would fail at runtime.

### theme-inspired-tokens

**Entry**: `skills/theme-inspired-tokens/skill.md`

**Purpose**: Generate culturally-grounded design token systems from brand inspiration, producing DTCG-compliant token files and CSS output.

**Key transformers**:
- `tailwind-v4.ts` — Generates Tailwind 4 CSS with `@theme` integration. Imports types from contracts.
- `tailwind-v3.ts` — Generates Tailwind 3 config. Imports types from contracts.

**Key concept**: Cultural overlays. A Japanese brand might use restrained color palettes with specific ma (negative space) conventions. These are encoded as token overrides that inherit from the platform core and can be applied per-T1 tenant.

---

## Scaffold Reference

### greenfield

**Purpose**: Generate a complete new project from scratch with all 3 tiers configured.

**Key files**:
- `base/src/lib/tenant/context.ts` — Tenant resolution using `app.tenant_id` (aligned to `RLS_TENANT_VAR`)
- `base/src/db/schema.ts` — Drizzle schema with `smallint` tier column, aligned status/isolation enums
- `base/src/server/index.ts` — Hono-based Worker entry point

### brownfield

**Purpose**: Migrate an existing project to the platform standard incrementally.

**Key files**:
- `migrations/add-tenant-id.sql` — Adds `tenant_id` to existing tables, creates platform schema, inserts default tenant into `platform.tenant_relationships` closure table

### overlay

**Purpose**: Add the design token system to a project without changing its infrastructure.

---

## Shared Validation

### token-validator.ts

Validates DTCG token files against the contracts:
- All required semantic tokens present (`REQUIRED_SEMANTIC_TOKENS`)
- Protected paths not overridden by T1/T2 tenants (`PROTECTED_TOKEN_PATHS`)
- Token structure conforms to DTCG spec (has `$type` and `$value`)
- Token references resolve to existing paths

### tenant-validator.ts

Validates tenant configuration:
- Tier is `0 | 1 | 2` (numeric)
- Status is one of `TenantStatus` values
- Isolation mode is one of `IsolationMode` values
- Slug matches `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`
- Input sanitization prevents SQL injection in dynamic queries

---

## Review History

### Initial Review (Session 1)

Five parallel agents built the initial 55 files. A comprehensive review found:

**Cross-skill inconsistencies** (11 issues):
- RLS variable names diverged (`app.current_tenant_id` vs `app.tenant_id`)
- Table names diverged (plural vs singular)
- Tier representation diverged (string enum vs numeric)
- Status values diverged (`'deleted'` vs `'decommissioned'`, `'dedicated'` vs `'database'`)
- Token path formats diverged between validators and skill references

**Security vulnerabilities** (13 issues):
- Account takeover via unverified email linking (CRITICAL)
- CSRF state validation was optional
- Tenant ID accepted from `x-tenant-id` header (bypassable)
- `set_tenant_context()` trusted caller-supplied tier (bypassable)
- Missing `FORCE ROW LEVEL SECURITY` on auth tables
- Pool connection leaks in error paths
- Error messages exposed stack traces in non-production environments

### Hardening Pass

All issues addressed in two commits:
1. Security hardening + shared contracts (`6ed34a8`)
2. Verification round fixes (`720d4f1`)

**Key changes**:
- Created `shared/contracts/` (6 files) as the canonical reference
- Made `emailVerified` required in OAuth flow
- Made CSRF state parameters required (not optional)
- Removed `x-tenant-id` header acceptance
- Changed `set_tenant_context()` to single-parameter (tier always from DB)
- Added `FORCE ROW LEVEL SECURITY` on all tables
- Fixed connection pool cleanup in error paths
- Aligned all table names to singular
- Aligned all tier representations to numeric
- Aligned all status/isolation values to contract definitions

### Verification Review

A second comprehensive review caught:
- `set_tenant_context()` was being called with 2 arguments in TypeScript after the SQL function was changed to accept 1 (signature mismatch from the fix itself)
- Several reference documents still had stale plural table names
- `architecture-standard.md` had old token path format

All caught and fixed in the verification commit.

---

## Known Trade-offs

### Type Duplication Across Skills

Skills that need `TenantTier` or `AuthLevel` may inline the type rather than importing from contracts. This is intentional: a skill copied into a project without the contracts directory must still work. The contracts serve as the specification, not as a runtime dependency.

### Env Type Fragmentation

Each skill needs a different subset of Worker bindings. The superset `Env` interface in `env.ts` contains bindings that no single skill uses entirely. Skills use `Pick<Env, ...>` to narrow. This creates mild type duplication but avoids forcing every project to declare every binding.

### Two Auth Middlewares

`multi-tenant-platform/templates/auth-middleware.ts` handles tenant resolution and RLS context setting. `graduated-auth/templates/worker-auth-mw.ts` handles auth level detection and progression. These serve different purposes but overlap at the "is this user authenticated?" boundary. A real project would compose them into a single middleware chain.

### Scaffold Token CSS vs DTCG

Scaffold templates use simplified CSS custom property names for quick starts (`--color-primary`). The full DTCG pipeline produces longer paths (`--semantic-light-interactive-primary`). Projects adopting the full token system will replace the scaffold defaults. This is by design: scaffolds should work immediately, not require a token build step to render.
