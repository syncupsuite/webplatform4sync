# CLAUDE.md — hn-platform4sync

## Repository Purpose

Internal platform standards, skills, and scaffold templates for all SyncUpSuite projects. This repo defines **the standard** that every project — greenfield or brownfield — aligns to.

**Org**: `syncupsuite`
**Prefix**: `hn-` = internal (syncupsuite), `p--` = public release
**Public target**: `p--platform4sync` (after validation)

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

| Component | Technology | Version |
|-----------|-----------|---------|
| UI Framework | React | ^19.2 |
| Language | TypeScript | ^5.7 |
| Styling | Tailwind CSS | ^4.0 (CSS-first `@theme`) |
| Build | Vite | ^7.0 |
| Edge Runtime | Cloudflare Workers | wrangler ^4.x |
| Database | Neon PostgreSQL | Serverless driver + Hyperdrive |
| ORM | Drizzle ORM | ^0.38 |
| Auth (Sessions) | Better Auth | ^1.x (`neon_auth` schema) |
| Auth (Identity) | Firebase / Google Identity Platform | europe-west6 |
| Design Tokens | Style Dictionary | W3C DTCG aligned |

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
├── brownfield/            # Migration to standards
└── overlay/               # Token/theme system only

shared/                    # Shared conventions and validation
├── conventions/           # Naming, stack versions, deployment
└── validation/            # Token and tenant validators

docs/                      # Canonical documentation
```

---

## Naming Convention

```
repo name = domain name = Google project ID
```

Example: `brandsyncup-com` → `brandsyncup.com` → GCP project `brandsyncup-com`

Google project IDs: max 30 chars, lowercase, hyphens only. If the domain exceeds 30 chars, use `{product}-{tld}` pattern.

---

## Scaffold Flow

Three paths based on project state:

| Template | When | What You Get |
|----------|------|-------------|
| **greenfield** | New project, new domain | Full 3-tier scaffold from scratch |
| **brownfield** | Existing project | Migration guide + incremental adoption |
| **overlay** | Adding design system only | Token pipeline, no infra changes |

---

## Auth Graduation Model

Auth is not binary. Projects support graduated access:

```
Anonymous → Preview/Inquiry → OAuth (Google/GitHub) → Full Account (Better Auth + Firebase)
```

Firebase provides identity (Google Identity Platform, email delivery, `auth.domain.tld`).
Better Auth provides sessions, RBAC, and tenant-scoped authorization in Neon.

---

## Key Relationships

- **BrandSyncUp** (`brandsyncup.com`): Reference implementation of this standard
- **LegalSyncUp** (`legalsyncup.com`): Loosely coupled partner, shared auth infrastructure
- **SyncUpSuite**: Umbrella org, eventual public marketplace

---

## Working with This Repo

- Skills are standalone — each has a `skill.md` entry point
- Scaffold templates are concrete files, not abstractions
- `shared/conventions/stack.md` is the source of truth for dependency versions
- Changes to skills should be validated against at least one existing project (BrandSyncUp or LegalSyncUp)

---

## Security

- No secrets in this repo — it's templates and patterns only
- Doppler references are placeholders showing _where_ secrets go
- Firebase/Neon/Cloudflare credentials are per-project, never shared here
