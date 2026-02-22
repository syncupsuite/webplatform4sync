# Changelog

All notable changes to Platform4Sync will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-02-22

### Security Hardening

- **RLS tenant isolation fix** — replaced broken `setTenantContext()` with transactional `tenantQuery()` wrapper. Neon HTTP driver executes each query as a separate HTTP request, so `set_config()` must be in the same Drizzle transaction as the data queries.
- **Auth graduation account takeover fix** — `graduateFromOAuth` now checks provider linkage before merging accounts, preventing email-based account takeover.
- **`verifyBetterAuthSession` implementation** — replaced stub with working session verification.
- **CORS hardening** — omit CORS headers entirely for disallowed origins; localhost only allowed when `ENVIRONMENT === "development"`.
- **Security headers** — added `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Content-Security-Policy` to all responses.
- **Rate limiting** — KV-based rate limiting on `/api/auth/` endpoints (20 req/min per IP).
- **CSRF protection** — Origin-check middleware for custom API routes.
- **Session fixation prevention** — `onSessionCreated` callback in graduation bridge for post-creation session regeneration.

### Schema & Data Model

- **Schema split** — separated `platformSchema` (tenant infrastructure: tenants, domain_mappings, tenant_relationships) from `appSchema` (application tables). Platform tables live in the `platform` schema, app tables in `{{SCHEMA_NAME}}`.
- **Domain verification** — changed `verified: boolean` to `verifiedAt: timestamp` on `domain_mappings` for audit trail.
- **Runtime validation** — `rowToTenantContext` now validates tier, status, and isolation_mode values at runtime with descriptive errors.
- **Slug format validation** — DNS-safe slug regex check before database lookup.

### Quality Improvements

- **Named constants** — session durations extracted to `shared/contracts/constants.ts` (SESSION_TTL_SECONDS, SESSION_REFRESH_SECONDS, PREVIEW_SESSION_TTL_SECONDS), replacing inline magic numbers across auth, graduation, and middleware files.
- **PostHog SSR guard** — `posthog.ts` now returns early when `typeof window === "undefined"`, preventing server-side crashes.
- **Dark mode alignment** — scaffold CSS uses `[data-theme="dark"]` selector matching the contracts' default `'class'` strategy.
- **Request ID** — `X-Request-ID` header on every response via `crypto.randomUUID()` for log correlation.
- **`--token-` prefix removed** — eliminated phantom two-layer CSS variable convention from 4 docs. Scaffold correctly uses single-layer `--color-*` vars with Tailwind v4.
- **Drizzle config** — added `"platform"` to `schemaFilter` array.
- **tsconfig cleanup** — removed dead `declaration` and `declarationMap` options (no-ops under `noEmit`).
- **Documentation fixes** — corrected stale TypeScript/Tailwind versions in architecture docs, fixed `isolation-modes.md` argument count, added missing scaffold placeholder docs, added `shared/contracts/` to CLAUDE.md repo structure.

### Changed

- **Plugin metadata** bumped to v0.5.0 in `plugin.json` and `marketplace.json`.
- **Scrubbed sync** from `hn-platform4sync` — all scaffold, skill, shared, and doc changes propagated to public marketplace.

## [0.4.2] - 2026-02-21

### Added

- **Theme contribution guide** (`skills/theme-inspired-tokens/references/contributing.md`) — step-by-step guide for creating and submitting culturally-grounded themes to `@syncupsuite/themes`:
  - Research requirements: what counts as verifiable provenance, primary source expectations
  - Seed color selection principles: near-black/white endpoints, accent requirements, tonal spread
  - Foundation JSON specification: all metadata fields, harmony modes, radius tendencies, typography categories
  - Pipeline walkthrough: single-file operation, `pnpm generate`, validation loop
  - Review criteria: provenance quality, cultural authenticity, contrast compliance, narrative coherence
  - Worked example: Nordic Modern theme from research through PR submission
- Added `references/contributing.md` to skill's Related References section

## [0.4.1] - 2026-02-21

### Token Integration Reliability

- **Integration validation gates** (`skills/theme-inspired-tokens/skill.md`) — mandatory pre-apply and post-apply checks between generating tokens and declaring completion:
  - Pre-apply: Tailwind version detection, dark mode strategy detection, transformer-strategy mismatch detection, CSS naming conflict scan
  - Post-apply: `:root` completeness (the #1 silent failure mode), dark mode block 1:1 parity, `var()` circular reference detection, WCAG AA contrast ratio validation on all semantic text+background pairs, dark mode toggle wiring reminder
  - Completion gate: skill does not declare done until all checks pass
- **`diagnose-tokens` subcommand** — read-only 9-step diagnostic for existing installations: package version, CSS entry point, `:root` completeness, dark mode block, circular `var()` references, strategy alignment, semantic pairing, contrast ratios, typography loading. Outputs `[PASS]`/`[FAIL]`/`[WARN]` per check with specific fix instructions
- **Frame integration** — added `diagnose` command to Construction frame (`finish` stage) and Shu-Ha-Ri frame (`ha` stage)
- *(0.4.0+gt-ti003)* Pinned `@syncupsuite/themes` install to `@^0.2.2`, added Tailwind compatibility matrix with transformer/selector mapping table, added upgrade notice for pre-0.2.2 versions

## [0.4.0] - 2026-02-20

### Added

- **Command frames** — two installable mental models over the same skill surface. The frame changes command names, stage groupings, instructional voice, and sequencing rules. The underlying skills do not change.
- **Construction frame** (`site → pour → frame → wire → finish`) — physical build sequence with hard stage dependencies. Five commands cover all skills:
  - `site` — project setup: `init`, `envrc`, `tune`, `clear`, `scaffold`
  - `pour` — foundation: `platform`, `neon`, `arch`
  - `frame` — structure: `auth`, `worker`, `agent`, `mcp`, `do`, `api`
  - `wire` — connections: `ci`, `deploy`, `secrets`, `ts`, `test`
  - `finish` — craft and ship: `tokens`, `theme`, `ui`, `a11y`, `sr`, `watch`, `metrics`, `slo`, `trace`, `perf`, `ship`
- **Shu-Ha-Ri frame** (`shu → ha → ri`) — mastery progression per concern. Stages apply independently — a project can be in Shu on auth and Ri on delivery simultaneously. Three commands:
  - `shu` — follow: `init`, `envrc`, `tune`, `clean`, `scaffold`
  - `ha` — break: `platform`, `neon`, `auth`, `worker`, `agent`, `mcp`, `do`, `api`, `tokens`, `theme`
  - `ri` — transcend: `flow`, `ship`, `secrets`, `watch`, `metrics`, `slo`, `trace`, `perf`, `a11y`, `sr`, `publish`
- `frames/README.md` — frame concept, activation instructions
- `frames/construction/frame.json` — Construction manifest (command → skill routing, gate conditions)
- `frames/construction/frame.md` — Construction activation prompt: voice per stage, sequencing rules, gate checks, status display format
- `frames/construction/onboard.md` — Construction first-run wizard
- `frames/shuhari/frame.json` — Shu-Ha-Ri manifest with per-concern mastery model
- `frames/shuhari/frame.md` — Shu-Ha-Ri activation prompt: voice per stage, non-linear progression model, Ri quality test
- `frames/shuhari/onboard.md` — Shu-Ha-Ri first-run wizard (mastery assessment, not binary completion scan)

### Changed

- **README** reoriented around frame selection as the first decision — includes full command reference tables for both frames
- **`.claude-plugin/plugin.json`** updated to v0.4.0 with `frames` registry and unified `commands` list
- **`.claude-plugin/marketplace.json`** updated to v0.4.0 with frame-aware description

### Deprecated

- `wp4s1_discover` through `wp4s9_status` — all 9 numbered commands now open with a deprecation notice and exact forwarding instructions to the equivalent frame commands. Content preserved. Removal scheduled after one full project cycle with frames in use.

  | Deprecated | Construction equivalent | Shu-Ha-Ri equivalent |
  |-----------|------------------------|---------------------|
  | `wp4s1_discover` | `site` → `init` / `scaffold` | `shu` → `init` / `scaffold` |
  | `wp4s2_scaffold` | `site` → `scaffold` | `shu` → `scaffold` |
  | `wp4s3_tenant` | `pour` → `platform` | `ha` → `platform` |
  | `wp4s4_database` | `pour` → `neon` | `ha` → `neon` |
  | `wp4s5_auth` | `frame` → `auth` | `ha` → `auth` |
  | `wp4s6_tokens` | `finish` → `tokens` / `theme` | `ha` → `tokens` / `theme` |
  | `wp4s7_deploy` | `wire` → `ci` + `finish` → `ship` | `ri` → `flow` / `ship` |
  | `wp4s8_validate` | `finish` → `a11y` / `watch` | `ri` → `a11y` / `watch` |
  | `wp4s9_status` | bare stage command | bare `shu` command |

---

## [0.3.0] - 2026-02-20

### Added

- Construction frame initial implementation (promoted to 0.4.0 in same session when Shu-Ha-Ri shipped)

> Note: 0.3.0 was an intermediate state during the same development session. Both frames shipped together as 0.4.0. This entry is recorded for commit history accuracy.

---

## [0.2.0] - 2026-02-17

### Changed

- **Restructured from 4 plugins to 1 sequenced workflow** — replaced disconnected skill plugins (`multi-tenant-platform`, `graduated-auth`, `neon-multi-tenant`, `theme-inspired-tokens`) with a single `webplatform4sync` plugin exposing 9 numbered commands
- Updated `.claude-plugin/marketplace.json` to register 1 plugin instead of 4

### Added

- **9 sequenced commands** (`wp4s1_discover` through `wp4s9_status`) that guide users through Platform4Sync standard stack adoption in order:
  1. `wp4s1_discover` — Scan project against the standard, write `.p4s/status.json`
  2. `wp4s2_scaffold` — Generate project structure (greenfield/brownfield/overlay)
  3. `wp4s3_tenant` — Set up 3-tier tenant model with RLS
  4. `wp4s4_database` — Neon branch strategy, Drizzle ORM, Hyperdrive
  5. `wp4s5_auth` — Firebase identity, Better Auth sessions, graduated auth
  6. `wp4s6_tokens` — Culturally-grounded design tokens, W3C DTCG, Tailwind 4
  7. `wp4s7_deploy` — Cloudflare Worker deployment, Doppler, DNS, health checks
  8. `wp4s8_validate` — Tenant, token, RLS, and contract validation
  9. `wp4s9_status` — Adoption checklist with next-step recommendation
- **Persistent state** via `.p4s/status.json` — every command reads and updates this file to track progress across sessions
- `.claude-plugin/plugin.json` — single plugin manifest with 9 command references

### Removed

- `skills/multi-tenant-platform/plugin.json` — no longer standalone plugins
- `skills/graduated-auth/plugin.json` — no longer standalone plugins
- `skills/neon-multi-tenant/plugin.json` — no longer standalone plugins
- `skills/theme-inspired-tokens/plugin.json` — no longer standalone plugins

### Unchanged

- All `skills/*/skill.md` files remain as reference material loaded by commands
- All `skills/*/references/` and `skills/*/templates/` remain unchanged
- `shared/` directory (conventions, contracts, validation) unchanged
- `scaffold/` directory (greenfield, brownfield, overlay) unchanged

## [0.1.0] - 2026-02-16

### Added

- **Multi-Tenant Platform** skill — 3-tier architecture (Platform/Partner/Customer) with RLS patterns, tenant hierarchy modeling, and white-label support
- **Graduated Auth** skill — Progressive authentication from anonymous to full account (Anonymous → Preview → OAuth → Full Account) with Better Auth + Firebase
- **Neon Multi-Tenant** skill — Neon PostgreSQL branch isolation, Hyperdrive connection pooling, Drizzle ORM tenant-scoped queries, and shared auth schema patterns
- **Theme-Inspired Tokens** skill — Culturally-grounded design token generation with W3C DTCG alignment, Style Dictionary pipeline, and Tailwind CSS v4 integration
- **Scaffold templates** — Greenfield (new project), brownfield (migration), and overlay (token system only)
- **Shared contracts** — TypeScript type definitions for cross-skill compatibility (`auth.ts`, `tenant.ts`, `tokens.ts`, `env.ts`, `constants.ts`)
- **Validators** — Tenant configuration and token structure validators
- **Conventions** — Naming, stack versions, and deployment standards
- Claude Code plugin marketplace configuration (`.claude-plugin/marketplace.json`)
- Private data scrub verification CI workflow
- Semantic versioning release workflow
