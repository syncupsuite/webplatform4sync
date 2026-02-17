# Changelog

All notable changes to Platform4Sync will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

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
