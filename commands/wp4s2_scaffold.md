> **@deprecated** — Use a command frame instead.
> Construction: `/webplatform4sync:site` → `scaffold`
> Shu-Ha-Ri: `/webplatform4sync:shu` → `scaffold`
> This command will be removed after one full project cycle with frames in use.

---

# wp4s2_scaffold

> Step 2 of 9 — Generate project structure
> Previous: `wp4s1_discover` | Next: `wp4s3_tenant`

## What This Does

Generates or aligns a project's file structure to the Platform4Sync standard. Supports three modes: greenfield (new project from scratch), brownfield (migrate an existing project), and overlay (add the design token system only). Applies the naming convention where repo name = domain name = Google project ID.

## Instructions

### 1. Read Discovery State

Load `.p4s/status.json` from the target project. If it doesn't exist, recommend running `wp4s1_discover` first.

Check the `discover` step findings to understand what already exists.

### 2. Determine Scaffold Mode

Ask the user:

> **What type of project is this?**
> 1. **Greenfield** — New project, new domain, nothing exists yet
> 2. **Brownfield** — Existing project that needs to align with the standard
> 3. **Overlay** — Existing project that only needs the design token system

### 3. Gather Project Identity

Ask the user:

> **What is the domain for this project?** (e.g., `example.com`)

From the domain, derive:
- **Repo name**: `example-com` (domain with `.` replaced by `-`)
- **GCP project ID**: `example-com` (same as repo name, max 30 chars)
- **Schema name**: `example_com` (domain with `.` and `-` replaced by `_`)
- **Firebase project**: `example-com`

Validate against naming rules in `shared/conventions/naming.md`:
- Max 30 chars for GCP project ID
- Lowercase, hyphens only, starts with letter
- If > 30 chars, use `{product}-{tld}` pattern

### 4. Execute Scaffold

#### Greenfield Mode

Read `scaffold/greenfield/scaffold.md` for the full questionnaire and file generation plan.

Ask additional questions:
- Firebase auth subdomain needed? (`auth.example.com`)
- Swiss data residency? (determines Neon/Firebase region)
- Cultural foundation for tokens? (or use platform defaults)
- API style? (tRPC / Custom Worker Routes / Both)
- Stripe integration?

Generate all files from `scaffold/greenfield/base/`:
- `package.json` — with standard deps from `shared/conventions/stack.md`
- `vite.config.ts` — Cloudflare + Tailwind + React plugins
- `wrangler.jsonc` — Worker config with KV, R2, Hyperdrive bindings
- `tsconfig.json` — strict mode, path aliases
- `drizzle.config.ts` — schema filter for project schema
- `src/db/schema.ts` — tenant schema with closure table
- `src/server/index.ts` — Worker entry with health, auth, tenant resolution
- `src/lib/auth/better-auth.ts` — auth factory for Workers
- `src/lib/tenant/context.ts` — tenant resolution and context
- `src/contexts/AuthContext.tsx` — graduated auth context
- `src/contexts/TenantContext.tsx` — tenant context provider
- `src/styles/app.css` — Tailwind 4 with token imports
- `src/styles/tokens/core.css` — platform default tokens

Replace all placeholders (`{{PROJECT_NAME}}`, `{{DOMAIN}}`, `{{REPO_NAME}}`, `{{SCHEMA_NAME}}`, etc.) with actual values.

Generate infrastructure files:
- `.envrc` — direnv config with non-sensitive vars
- `.gitignore` — standard ignores
- `.pre-commit-config.yaml` — hooks
- `CLAUDE.md` — project-specific AI context
- `bootstrap.sh` — setup script

#### Brownfield Mode

Read `scaffold/brownfield/scaffold.md` for the migration strategy.

Assess existing project against standard and generate a phased migration plan:
1. **Foundation** (non-breaking): Add tenant schema, add design tokens incrementally
2. **Auth Alignment**: Integrate Better Auth alongside existing auth
3. **Isolation**: Enable RLS
4. **Modernization**: Tailwind v3→v4, Vite upgrade

Generate migration files:
- `scaffold/brownfield/migrations/add-tenant-id.sql`
- `scaffold/brownfield/migrations/enable-rls.sql`
- `scaffold/brownfield/checklists/tailwind-v3-to-v4.md`
- `scaffold/brownfield/checklists/token-adoption.md`

#### Overlay Mode

Read `scaffold/overlay/scaffold.md`. Only add the token system:
- `src/styles/tokens/core.css`
- `style-dictionary.config.cjs` (from `scaffold/overlay/templates/`)
- Tailwind integration (v4 `@theme` or v3 config update)

### 5. Update Status

Update `.p4s/status.json`:

```json
{
  "scaffold": {
    "status": "completed",
    "completedAt": "<ISO 8601>",
    "type": "greenfield|brownfield|overlay",
    "domain": "example.com",
    "repoName": "example-com",
    "gcpProject": "example-com",
    "schemaName": "example_com",
    "filesGenerated": ["package.json", "vite.config.ts", "..."]
  }
}
```

## Reference

- `scaffold/greenfield/scaffold.md` — greenfield questionnaire and file plan
- `scaffold/greenfield/base/` — all greenfield template files
- `scaffold/brownfield/scaffold.md` — brownfield migration strategy
- `scaffold/brownfield/migrations/` — SQL migration templates
- `scaffold/brownfield/checklists/` — migration checklists
- `scaffold/overlay/scaffold.md` — overlay setup guide
- `shared/conventions/naming.md` — naming convention rules
- `shared/conventions/stack.md` — canonical stack versions

## Completion

The user has a project structure aligned with the Platform4Sync standard. All files use the correct naming convention. The project is ready for tenant setup (`wp4s3_tenant`).

Update `.p4s/status.json` step `scaffold` status to `completed`.
