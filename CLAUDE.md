# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

Platform standards, skills, and scaffold templates for all SyncUpSuite projects. This repo defines **the standard** that every project — greenfield or brownfield — aligns to.

**Org**: `syncupsuite`
**Repo**: `syncupsuite/webplatform4sync`

This is also a **Claude Code plugin** (`.claude-plugin/plugin.json`) distributed through its own marketplace. Editing a file here changes what the plugin does for every consuming project.

---

## No Build System

There is nothing to build, lint, or test. No `package.json` at the root, no test runner, no CI that compiles anything. The repo is markdown, JSON manifests, and `.ts`/`.sql` **templates** that are copied into other projects — they are not compiled here and will not typecheck standalone (they contain `{{PLACEHOLDER}}` tokens).

The only automated check is the private-data scrub (see **Release & Scrub Pipeline**). To run it locally before pushing, read the `PATTERNS` array in `.github/workflows/scrub-check.yml` and grep for each entry across `*.md`, `*.ts`, `*.sql`, and `*.json`, excluding `.github/`. A clean tree returns no matches. Also confirm no `*.log` file is tracked. The patterns are deliberately not reproduced here — this file is itself scanned.

Validation is manual: **changes to skills should be validated by applying them against BrandSyncUp or LegalSyncUp**, per `docs/contributing.md`.

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

Version bumps touch four places: `shared/conventions/stack.md`, `scaffold/greenfield/base/package.json`, any skill that names a version, and a migration note if breaking.

---

## Repo Structure

```
skills/                    # Claude Code skills (abstract, universal)
├── multi-tenant-platform/ # 3-tier architecture patterns
├── theme-inspired-tokens/ # Culturally-grounded design tokens
├── graduated-auth/        # Anonymous → OAuth → Full Account
└── neon-multi-tenant/     # Neon-specific multi-tenant patterns

commands/                  # Slash commands — thin stage entry points (.md)
frames/                    # Frame definitions: construction/, shuhari/
scaffold/                  # greenfield/ | brownfield/ | overlay/
shared/                    # contracts/ (canonical TS types), conventions/, validation/
.claude-plugin/            # plugin.json, marketplace.json
docs/                      # Canonical documentation
```

Every skill is standalone: `skill.md` entry point + `templates/` (runnable, parameterized) + `references/` (decisions and trade-offs).

### Design Tokens & Theming

New projects include three levels of theme support:

1. **Default tokens** — Neutral Slate base in `scaffold/greenfield/base/src/styles/tokens/core.css`
2. **Pre-built themes** — 12 culturally-grounded themes via `@syncupsuite/themes@^0.4.0` (installed by default in scaffold)
3. **Custom themes** — Build your own using `/theme-inspired-tokens` skill for complete control

See `scaffold/greenfield/base/THEMING.md` for the full workflow, or use `/theme-inspired-tokens` directly to build a custom cultural theme system.

---

## The Frame System

This is the organizing concept of the command surface and the thing most likely to be missed.

A **frame** is a named mental model layered over the *same* skill surface. Frames change command names, stage groupings, voice, and sequencing. Frames **never** change skill logic, generated templates, validation rules, or stack conventions.

| Frame | Stages | Model |
|-------|--------|-------|
| Construction | `site → pour → frame → wire → finish` | Linear, physical dependencies. Global progression. |
| Shu-Ha-Ri | `shu → ha → ri` | Mastery per concern. **Not** globally linear — a project can be Ha on design and Shu on auth simultaneously. |

### How routing works

1. A frame activates on the first bare-stage command (`/webplatform4sync:site` or `/webplatform4sync:shu`). No configuration.
2. On later runs, the active frame is detected from `.claude/frame` in the consuming project's root.
3. Each `commands/<stage>.md` instructs Claude to **load `frames/<frame>/frame.md` first** — that file is the session prompt (voice, sequencing, gate checks).
4. Subcommand → skill routing lives in `frames/<frame>/frame.json` under `stages.<stage>.commands.<sub>.skill`.
5. Progress state for gate checks is read from `.p4s/status.json` in the consuming project (may not exist; then ask).

### Editing rules

- **`frame.json` and the matching `commands/<stage>.md` menu must stay in sync.** The JSON is the routing manifest; the markdown is the human-facing menu. A subcommand present in one and absent from the other is the most common defect here.
- Both frames must expose equivalent capability. Adding a skill to Construction without a Shu-Ha-Ri home makes the frames diverge — decide the stage deliberately (Shu = follow the standard, Ha = intentional deviation, Ri = the system runs itself).
- Gates are **conversational, never hard blocks**. State the dependency, then proceed if the user confirms.
- `frame.json` routes to three kinds of target: repo-local paths (`skills/…/skill.md`), other Claude Code plugin skills (`cloudflare:workers-best-practices`, `cicd-automation:secrets-management`), and `@syncupsuite/*` skills. **Only the repo-local ones are guaranteed present.** External references degrade if the user has not installed that plugin — do not assume they resolve.

### Standalone commands

`commands/diagnose-tokens.md` and `commands/feedback.md` are frame-independent and read-only-by-default. They must not require a frame to be active.

---

## Critical Patterns

### Neon RLS Tenant Isolation

Neon's serverless HTTP driver executes each query as a separate HTTP request. `set_config('app.tenant_id', ...)` **must** be in the same Drizzle transaction as the data queries — otherwise the config is lost and RLS silently returns zero rows.

**Correct pattern** (in `skills/neon-multi-tenant/templates/drizzle-tenant.ts`):
```typescript
// tenantQuery() wraps set_config + queries in a single transaction
const results = await tenantQuery(db, tenantId, async (tx) => {
  return tx.select().from(items);
});
```

### Session variable names are a cross-skill contract

`shared/contracts/constants.ts` defines `RLS_TENANT_VAR = 'app.tenant_id'`, `RLS_TIER_VAR`, `RLS_USER_VAR`, `AUTH_SCHEMA_NAME = 'neon_auth'`, `PLATFORM_SCHEMA_NAME = 'platform'`. A mismatch between the SQL that `SET`s and the policy that `current_setting()`s is a **silent** failure — zero rows, no error. Changing any value here means updating every skill template and SQL file that names it.

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

The mechanism: **the same Google/GitHub OAuth `clientId` backs both the lightweight OAuth flow and Firebase Auth**, so graduation needs no re-authentication and no account-linking flow. Firebase provides identity; Better Auth provides sessions, RBAC, and tenant-scoped authorization in Neon. See `shared/contracts/auth.ts` for the `AuthLevel` enum and discriminated union types.

Graduation must check provider linkage before merging accounts — merging on email alone is an account-takeover path (fixed in v0.5.0; do not reintroduce).

### Tailwind v4 CSS-first

Tailwind v4 uses `@theme` blocks in CSS (no `tailwind.config.js`). Self-referential `var()` inside `@theme` is the standard registration pattern — not a bug:
```css
@theme {
  --color-primary: var(--color-primary); /* registers :root value as Tailwind token */
}
```

Dark mode uses `[data-theme="dark"]` selector (class strategy), not `@media (prefers-color-scheme)`. Tokens are single-layer `--color-*` vars — there is no `--token-*` prefix layer (removed in v0.5.0).

---

## Scaffold Placeholders

Templates under `scaffold/` are parameterized, never hardcoded to one project. The full placeholder set:

```
{{DOMAIN}}  {{PROJECT_NAME}}  {{REPO_NAME}}  {{SCHEMA_NAME}}  {{TABLE_NAME}}
{{NEON_PROJECT_ID}}  {{NEON_REGION}}  {{HYPERDRIVE_ID}}
{{CF_ACCOUNT_ID}}  {{KV_NAMESPACE_ID}}  {{KV_NAMESPACE_PREVIEW_ID}}
```

Adding a new placeholder means documenting it in `scaffold/greenfield/scaffold.md` too. Never commit a real infrastructure ID in place of one — see below.

---

## Release & Scrub Pipeline

This public repo is generated from a private upstream (`hn-platform4sync`) by `scripts/prepare-public-release.sh`, which does not exist here. `.github/workflows/publish-public.yml` runs on the *private* repo and force-pushes here; `release.yml` fires on a `v*` tag; `scrub-check.yml` guards every push and PR to `main`.

**Hard constraint — CI fails the build if any of these appear in `*.md`, `*.ts`, `*.sql`, `*.json`, or `*.log` outside `.github/`:**

- the internal org name (either casing) or any internal email address at that domain
- real Neon project/branch IDs, Cloudflare account, KV namespace, or Hyperdrive IDs
- any `*.log` file committed anywhere

This matters in practice: the working directory path itself contains the internal org name. **Never paste an absolute working-directory path into a tracked file** — use repo-relative paths in docs, examples, and command output.

Releasing a version bump requires all four, in step:

1. `CHANGELOG.md` — new `## [X.Y.Z] - YYYY-MM-DD` section (the release workflow extracts release notes by matching this exact heading shape)
2. `.claude-plugin/plugin.json` → `version`
3. `.claude-plugin/marketplace.json` → both `metadata.version` and `plugins[0].version`
4. tag `vX.Y.Z` (semver, no prerelease suffix beyond `-[a-zA-Z0-9.]+`)

---

## Plugin Schema Rules

`.claude-plugin/plugin.json` — only flat fields: `name`, `version`, `description`, `commands` (path string), `skills` (path string), `agents`, `hooks`, `mcpServers`, `outputStyles`, `lspServers`. No custom nested objects — they cause "invalid input" errors.

`.claude-plugin/marketplace.json` — plugin `source` must be `"./"` for local plugins, not an `"npm:package-name"` string. `@syncupsuite/themes` is an npm package, not a Claude Code plugin; it does not belong in marketplace.json.

---

## Naming Convention

```
repo name = domain name = Google project ID
```

Example: `brandsyncup-com` → `brandsyncup.com` → GCP project `brandsyncup-com`

Google project IDs: max 30 chars, lowercase, hyphens only.

---

## Cultural Foundations

New themes go in `skills/theme-inspired-tokens/references/theme-registry.md` and need 5–7 seed colors with **traceable cultural origin**, a story, a design philosophy, an era, and metadata. "This blue comes from traditional indigo dyeing" qualifies; "this is a nice blue" does not. All 12 shipped themes are validated against 20 WCAG AA contrast pairs — a new one must be too.

---

## Key Relationships

- **BrandSyncUp** (`brandsyncup.com`): Reference implementation of this standard
- **LegalSyncUp** (`legalsyncup.com`): Loosely coupled partner, shared auth infrastructure
- **@syncupsuite/themes**: npm package with 12 culturally-grounded themes (separate `themes/` repo)
- **SyncUpSuite**: Umbrella org, public marketplace
