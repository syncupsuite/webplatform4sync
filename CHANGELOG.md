# Changelog

All notable changes to Platform4Sync will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

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
