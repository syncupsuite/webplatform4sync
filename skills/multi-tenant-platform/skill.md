# Multi-Tenant Platform Skill

## When to Use

Invoke this skill when the task involves any of the following:

- **Architecture design** for multi-tenant SaaS platforms
- **Tenant hierarchy** modeling (platform, partner/reseller, customer)
- **Data isolation** strategy (RLS, schema-per-tenant, DB-per-tenant)
- **White-label / co-branded** platforms with theming autonomy
- **Security architecture** for tenant-scoped access control and audit
- **New project scaffolding** that needs tenant-aware foundations

Even single-tenant or "simple" projects use this model with dormant tiers -- a hardcoded `tenant_id` at T2 with T0 and T1 collapsed. This ensures every project can grow into multi-tenancy without a rewrite.

---

## The 3-Tier Model

```
T0  Platform Operator
 |
T1  Partner / Reseller (one or many)
 |
T2  Customer / End-User Org (many per T1)
```

| Tier | Role | Examples |
|------|------|----------|
| **T0** | Platform operator. Owns infrastructure, defines global policies, manages T1 onboarding. | SyncUpSuite, the platform operator |
| **T1** | Partner or reseller. Operates a branded instance, manages their own T2 customers. | A consulting firm reselling the platform |
| **T2** | Customer organization. End-users belong here. All application data lives at this tier. | A law firm, a brand team, a small business |

### Governance Rules

- T0 can see and manage everything (god mode, audit-logged).
- T1 can see its own data and all its T2 children. Never sibling T1s.
- T2 can see only its own data. Never its parent T1, never sibling T2s.
- Delegation flows downward only: T0 delegates to T1, T1 delegates to T2.
- A tenant's `parent_id` is immutable after creation (reparenting requires migration).

See `references/governance-rules.md` for the full governance specification.

---

## Non-Negotiable Rules

These rules apply to every project that uses this skill, regardless of complexity:

1. **Every entity has `tenant_id`.** No exceptions. Even lookup tables get a `tenant_id` column (or are explicitly marked as global/platform-owned with `tenant_id = T0_ID`).

2. **Defense-in-depth isolation.** Never rely on a single layer. Combine: application-level filtering + PostgreSQL RLS + connection-level context (`SET app.tenant_id`). If one layer fails, the others catch it.

3. **Semantic tokens only.** UI components never reference raw colors or hardcoded values. All theming goes through semantic design tokens (`--color-surface-primary`, not `--blue-500`).

4. **Protected tokens.** Certain tokens (accessibility contrast ratios, minimum font sizes, spacing rhythm) are platform-controlled and cannot be overridden by T1 or T2 themes.

5. **WCAG AA minimum.** All tenant themes must pass WCAG AA contrast checks. The platform enforces this at token generation time, not at runtime.

6. **Audit everything.** Every data mutation, every auth event, every tenant context switch is written to an append-only audit log with `actor_id`, `tenant_id`, `action`, `timestamp`, and `metadata`.

7. **Version all changes.** Tenant settings, themes, and configuration changes are versioned. Rollback is always possible.

---

## Workflow

When designing or implementing a multi-tenant feature:

### 1. Gather Requirements

- How many tiers are active? (All three, or dormant T0/T1?)
- What isolation mode per tier? (See below)
- What data crosses tenant boundaries? (Shared catalogs, marketplace, etc.)
- What branding autonomy does each tier have?
- Are there data residency requirements?

### 2. Generate Architecture Document

Produce a structured architecture doc covering:
- Tenant hierarchy diagram
- Data isolation strategy per tier
- Auth and authorization model
- Token/theming architecture
- Migration and onboarding flows

### 3. Generate Diagrams (Mermaid)

All architecture docs include Mermaid diagrams for:
- Tenant hierarchy (entity relationship)
- Request flow (sequence diagram showing tenant resolution)
- Data isolation boundaries (deployment diagram)
- Token inheritance chain

### 4. Implement

Use the templates in this skill as starting points:
- `templates/tenant-schema.sql` -- PostgreSQL schema
- `templates/rls-policies.sql` -- Row Level Security
- `templates/auth-middleware.ts` -- Cloudflare Workers middleware

---

## Data Isolation Modes

| Mode | Mechanism | Best For | Trade-offs |
|------|-----------|----------|------------|
| **Shared Schema + RLS** | Single schema, `tenant_id` column, PostgreSQL RLS policies | T2 customers (high volume, low isolation need) | Lowest cost, highest density; noisy-neighbor risk |
| **Schema per Tenant** | Separate PostgreSQL schema per tenant, same database | Mid-tier isolation needs | Moderate isolation; schema migration complexity |
| **DB per Tenant** | Separate Neon branch or database per tenant | T1 partners (strong isolation, regulatory) | Strongest isolation; higher operational cost |

### Default Strategy: DB-per-T1, RLS-per-T2

```
T0 Platform DB (management plane)
 |
 +-- T1-alpha DB (Neon branch)
 |    +-- T2 customers (RLS within this DB)
 |
 +-- T1-beta DB (Neon branch)
      +-- T2 customers (RLS within this DB)
```

Each T1 partner gets their own Neon database branch. Within that branch, T2 customers share the schema and are isolated via RLS. This gives T1 partners strong isolation (separate connection strings, independent scaling, easy data export) while keeping T2 management lightweight.

See `references/isolation-modes.md` for detailed comparison and migration paths.

---

## Security Model

### Authentication

- **Protocol**: OIDC via Better Auth
- **Session**: JWT-based, 7-day expiry, stored in httpOnly cookie
- **Multi-tenant**: Session token includes `tenant_id` claim; user-tenant mapping validated on every request

### Authorization: RBAC + ABAC Hybrid

```
Permission = Role(user, tenant) + Attributes(resource, context)
```

- **RBAC** handles coarse-grained access: `platform_admin`, `partner_admin`, `org_admin`, `member`, `viewer`
- **ABAC** handles fine-grained rules: resource ownership, time-based access, data classification level
- Roles are scoped to a tenant. A user can have different roles in different tenants.
- Permission checks always include tenant context. No "global" permissions except for T0 platform admins.

### Audit Requirements

Every auditable event includes:

```typescript
interface AuditEntry {
  id: string;
  timestamp: string;       // ISO 8601
  actor_id: string;        // Who performed the action
  tenant_id: string;       // Which tenant context
  action: string;          // e.g., "user.create", "tenant.settings.update"
  resource_type: string;   // e.g., "user", "document", "tenant_settings"
  resource_id: string;     // ID of the affected resource
  metadata: Record<string, unknown>;  // Action-specific details
  ip_address: string;
  user_agent: string;
}
```

Audit logs are append-only, partitioned by tenant, and retained for a minimum of 7 years for compliance.

---

## Theming Performance Targets

| Metric | Target |
|--------|--------|
| Core token payload (critical CSS variables) | < 20 KB gzipped |
| Theme switch latency (T2 theme applied) | < 200 ms |
| First Contentful Paint with tenant theme | < 1.8 s |
| Token inheritance resolution | < 50 ms |

### Token Loading Strategy

Tokens load in four phases to optimize perceived performance:

1. **Immediate** (inline in HTML `<head>`): Platform base tokens + tenant's critical overrides (brand colors, typography scale). Blocks render but is < 5 KB.

2. **Fast** (preloaded CSS, loaded before FCP): Full semantic token set for the resolved tenant. Loaded via `<link rel="preload">`.

3. **Lazy** (loaded after FCP): Component-specific token extensions, dark mode variants, density options. Loaded on demand.

4. **Background** (loaded after idle): Analytics tokens, A/B test variants, seasonal overrides. Loaded via `requestIdleCallback`.

---

## Standard Stack

All projects using this skill target:

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Build | Vite 7 |
| Edge Runtime | Cloudflare Workers |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Secrets | Doppler |
| Design Tokens | Style Dictionary (or custom pipeline) |

---

## Related Skills

- `theme-inspired-tokens` -- Design token generation and cultural compliance
- `graduated-auth` -- Progressive authentication complexity
- `neon-multi-tenant` -- Neon-specific branch isolation patterns
