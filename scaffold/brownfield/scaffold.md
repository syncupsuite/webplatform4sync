# Brownfield Scaffold

Migrate an existing project to the SyncUpSuite platform standard.

## When to Use

- Existing React/TypeScript project that needs multi-tenant support
- Project moving from Tailwind v3 to v4
- Adding Better Auth + Firebase to an existing auth system
- Adopting the design token pipeline on an existing codebase
- Aligning an existing Cloudflare Workers project to the standard

## Assessment Questions

Before migrating, answer:

1. **Current stack**: What framework, build tool, and styling approach?
2. **Current auth**: What authentication system is in place?
3. **Current database**: PostgreSQL? Other? What ORM?
4. **Current hosting**: Where is it deployed?
5. **Tenant awareness**: Does the app have any multi-tenant concepts today?
6. **Design system**: Hardcoded values or token-based?

## Migration Order

Always migrate in this order to minimize breakage:

### Phase 1: Foundation (Non-Breaking)

1. **Add tenant schema** — Create tenants table, add `tenant_id` to existing tables
   - See `migrations/add-tenant-id.sql`
   - Backfill existing data with a default tenant
   - Do NOT enable RLS yet

2. **Add design tokens** — Extract hardcoded values to CSS custom properties
   - See `checklists/token-adoption.md`
   - Replace values incrementally, component by component

### Phase 2: Auth Alignment

3. **Integrate Better Auth** — Add Better Auth alongside existing auth
   - Run both systems in parallel during transition
   - Migrate sessions to `neon_auth` schema
   - Wire graduated auth middleware

4. **Firebase Identity** (if needed) — Set up `auth.domain.tld`
   - Firebase project creation
   - DNS verification
   - OAuth provider configuration

### Phase 3: Isolation

5. **Enable RLS** — Turn on row-level security
   - See `migrations/enable-rls.sql`
   - Test extensively before enabling in production
   - Ensure all queries pass tenant context

6. **Tenant context middleware** — Add to Worker entry point
   - Resolve tenant from domain
   - Set PostgreSQL context per request

### Phase 4: Modernization

7. **Tailwind v3 → v4** (if applicable)
   - See `checklists/tailwind-v3-to-v4.md`
   - Gradual migration: config.js works in v4, then move to @theme

8. **Vite upgrade** (if applicable)
   - Ensure `@cloudflare/vite-plugin` compatibility
   - Update build scripts

## Risk Mitigation

- Run old and new auth in parallel before cutting over
- Add RLS policies in permissive mode first (log violations, don't block)
- Keep the existing build pipeline until the new one is proven
- Feature-flag tenant-aware code paths during transition
