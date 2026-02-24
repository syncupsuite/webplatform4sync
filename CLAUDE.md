# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

Platform standards, skills, and scaffold templates for all SyncUpSuite projects. This repo defines **the standard** that every project — greenfield or brownfield — aligns to.

**Org**: `syncupsuite`
**Repo**: `syncupsuite/webplatform4sync`

---

## Architecture Standard

Every project built from this platform follows the **3-tier multi-tenant architecture**:

```
Tier 0 (Platform)  → Owns control plane, global defaults, design tokens
Tier 1 (Partner)   → Branded instance, manages sub-tenants, owns domains
Tier 2 (Customer)  → Consumes platform, inherits branding, scoped access
```

Simple projects use the same architecture with dormant tiers (hardcoded `tenant_id`). The machinery exists from day one — it activates when needed without retrofitting.

---

## Standard Stack

Source of truth: `shared/conventions/stack.md` — always check there for locked versions.

| Component | Technology | Version |
|-----------|-----------|---------|
| UI Framework | React | ^19.2 |
| Language | TypeScript | ^5.9 (strict mode) |
| Styling | Tailwind CSS | ^4.1 (CSS-first `@theme`) |
| Build | Vite | ^7.0 |
| Edge Runtime | Cloudflare Workers | wrangler ^4.x |
| Database | Neon PostgreSQL | Serverless driver + Hyperdrive |
| ORM | Drizzle ORM | ^0.45 |
| Auth (Sessions) | Better Auth | ^1.4 (`neon_auth` schema) |
| Auth (Identity) | Firebase / Google Identity Platform | europe-west6 |
| Design Tokens | @syncupsuite/themes | ^0.4.0 (12 themes, Semantic Color API) |
| Routing | React Router | ^7.13 (unified `react-router` package) |
| Analytics | PostHog | posthog-js ^1.x + reverse proxy |

---

## Repo Structure

```
skills/                    # Claude Code skills (abstract, universal)
├── multi-tenant-platform/ # 3-tier architecture patterns
├── theme-inspired-tokens/ # Culturally-grounded design tokens
├── graduated-auth/        # Anonymous → OAuth → Full Account
└── neon-multi-tenant/     # Neon-specific multi-tenant patterns

scaffold/                  # Project scaffolding templates
├── greenfield/            # New project from scratch
│   └── base/              # Canonical project template (src/, styles/, db/, server/)
├── brownfield/            # Migration to standards
└── overlay/               # Token/theme system only

shared/                    # Shared conventions, contracts, and validation
├── contracts/             # Canonical types and constants (auth.ts, tenant.ts, tokens.ts, constants.ts, env.ts)
├── conventions/           # stack.md (versions), naming.md, deployment.md, analytics.md
└── validation/            # Token and tenant validators

commands/                  # Claude Code command files (.md)
frames/                    # Command frames (construction, shuhari)
.claude-plugin/            # Plugin manifest (plugin.json, marketplace.json)
docs/                      # Canonical documentation
```

---

## Critical Patterns

### Neon RLS Tenant Isolation

Neon's serverless HTTP driver executes each query as a separate HTTP request. `set_config('app.tenant_id', ...)` **must** be in the same Drizzle transaction as the data queries — otherwise the config is lost.

**Correct pattern** (in `skills/neon-multi-tenant/templates/drizzle-tenant.ts`):
```typescript
// tenantQuery() wraps set_config + queries in a single transaction
const results = await tenantQuery(db, tenantId, async (tx) => {
  return tx.select().from(items);
});
```

### Schema Split

The greenfield scaffold uses two Drizzle schemas:
- `platformSchema` (`platform`) — tenant infrastructure: tenants, domain_mappings, tenant_relationships
- `appSchema` (`{{SCHEMA_NAME}}`) — application-domain tables

Both must be in `drizzle.config.ts` `schemaFilter`.

### Auth Graduation

Auth is not binary — projects support graduated access:

```
Anonymous → Preview/Inquiry → OAuth (Google/GitHub) → Full Account (Better Auth + Firebase)
```

Firebase provides identity. Better Auth provides sessions, RBAC, and tenant-scoped authorization in Neon. See `shared/contracts/auth.ts` for the `AuthLevel` enum and discriminated union types.

### Tailwind v4 CSS-first

Tailwind v4 uses `@theme` blocks in CSS (no `tailwind.config.js`). Self-referential `var()` inside `@theme` is the standard registration pattern — not a bug:
```css
@theme {
  --color-primary: var(--color-primary); /* registers :root value as Tailwind token */
}
```

Dark mode uses `[data-theme="dark"]` selector (class strategy), not `@media (prefers-color-scheme)`.

---

## Plugin Schema Rules

When editing `.claude-plugin/plugin.json`:
- Only flat fields: `name`, `version`, `description`, `commands` (path string), `skills` (path string), `agents`, `hooks`, `mcpServers`, `outputStyles`, `lspServers`
- No custom nested objects — causes "invalid input" errors

When editing `.claude-plugin/marketplace.json`:
- Plugin `source` must be `"./"` for local plugins — not `"npm:package-name"` string format
- `@syncupsuite/themes` is an npm package, not a Claude Code plugin — don't list it in marketplace.json

---

## Naming Convention

```
repo name = domain name = Google project ID
```

Example: `brandsyncup-com` → `brandsyncup.com` → GCP project `brandsyncup-com`

Google project IDs: max 30 chars, lowercase, hyphens only.

---

## Working with This Repo

- No build commands — this repo is templates and patterns only
- Skills are standalone — each has a `skill.md` entry point
- Scaffold templates are concrete files with `{{PLACEHOLDER}}` tokens
- `shared/conventions/stack.md` is the source of truth for dependency versions
- Changes to skills should be validated against BrandSyncUp or LegalSyncUp
- No secrets — Doppler references are placeholders showing _where_ secrets go

---

## Key Relationships

- **BrandSyncUp** (`brandsyncup.com`): Reference implementation of this standard
- **LegalSyncUp** (`legalsyncup.com`): Loosely coupled partner, shared auth infrastructure
- **@syncupsuite/themes**: npm package with 12 culturally-grounded themes (separate `themes/` repo)
- **SyncUpSuite**: Umbrella org, public marketplace
