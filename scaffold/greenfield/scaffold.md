# Greenfield Scaffold

> SyncUpSuite standard project scaffold for new applications.
> Stack: React 19 + TypeScript 5.7 + Tailwind 4 + Vite 7 + Cloudflare Workers + Neon PostgreSQL + Drizzle ORM + Better Auth

---

## Qualification Questions

Answer these before scaffolding. Each answer drives template customization.

### 1. Project domain?

```
Domain: _____________________________.com
```

- Sets the repository name (e.g., `su-example-com`)
- Sets Google Cloud project ID (e.g., `example-com`)
- Sets Cloudflare Workers project name
- Sets Doppler project name
- Sets Neon database branch name

### 2. Firebase auth subdomain needed?

```
Firebase auth.domain.tld? [ ] Yes  [ ] No
```

- **Yes**: Includes Firebase project setup, `auth.{{DOMAIN}}` subdomain config, Firebase SDK dependencies
- **No**: Auth runs entirely through Better Auth on the Worker

### 3. Swiss data residency?

```
Swiss data residency required? [ ] Yes  [ ] No
```

- **Yes**: Neon region `europe-west6` (Zurich), Cloudflare location hints for `eu`, R2 bucket location `WEUR`
- **No**: Neon region `us-east-2` (default), no location constraints

### 4. Cultural foundation for design tokens?

```
Cultural theme: [ ] Swiss Professional  [ ] Latin Warm  [ ] Nordic Clean  [ ] Platform Defaults  [ ] Custom
```

- Launches the `theme-inspired-tokens` skill for Swiss Professional, Latin Warm, or Nordic Clean
- **Platform Defaults**: Uses `src/styles/tokens/core.css` as-is (neutral slate palette)
- **Custom**: Creates a blank token override layer for manual population

### 5. API style?

```
API layer: [ ] tRPC  [ ] Custom Worker Routes  [ ] Both
```

- **tRPC**: Adds `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`. Generates `src/server/trpc.ts` and `src/server/routers/`
- **Custom Worker Routes**: Generates `src/workers/api/handlers/` with typed route handlers
- **Both**: tRPC for app mutations, custom routes for public/webhook endpoints

### 6. Stripe integration?

```
Stripe billing? [ ] Yes  [ ] No
```

- **Yes**: Adds `stripe` dependency, webhook handler at `/api/webhooks/stripe`, billing schema tables, Stripe secret bindings in `wrangler.jsonc`
- **No**: No billing infrastructure

---

## Generated Files

After qualification, the following files are generated and customized:

### Always Generated (base/)

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `vite.config.ts` | Build configuration with Workers + Tailwind |
| `wrangler.jsonc` | Cloudflare Workers deployment config |
| `tsconfig.json` | TypeScript strict configuration |
| `drizzle.config.ts` | Database migration config |
| `src/db/schema.ts` | Multi-tenant Drizzle schema (3-tier) |
| `src/server/index.ts` | Worker entry point with tenant resolution |
| `src/lib/auth/better-auth.ts` | Better Auth server configuration |
| `src/lib/tenant/context.ts` | Tenant resolution and RLS utilities |
| `src/contexts/TenantContext.tsx` | React tenant context provider |
| `src/contexts/AuthContext.tsx` | React auth context provider |
| `src/styles/tokens/core.css` | Platform design tokens |
| `src/styles/app.css` | Main stylesheet with Tailwind 4 |

### Conditionally Generated (options/)

| Condition | Files |
|-----------|-------|
| Firebase = Yes | `firebase.json`, `.firebaserc`, Firebase SDK setup |
| Swiss residency = Yes | Region overrides in `wrangler.jsonc`, Neon config |
| Cultural theme != Defaults | `src/styles/tokens/cultural-overlay.css` |
| API = tRPC | `src/server/trpc.ts`, `src/server/routers/app.ts` |
| API = Custom Routes | `src/workers/api/handlers/`, route registry |
| Stripe = Yes | `src/server/routers/billing.ts` or webhook handler, billing schema |

### Infrastructure Files (always generated)

| File | Purpose |
|------|---------|
| `.envrc` | direnv config (non-sensitive vars only) |
| `.gitignore` | Standard ignores |
| `.pre-commit-config.yaml` | Pre-commit hooks |
| `CLAUDE.md` | AI assistant context |
| `bootstrap.sh` | Dependency + auth setup script |

---

## Customization Placeholders

The following placeholders are replaced during scaffolding:

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{{PROJECT_NAME}}` | Question 1 | `brandsyncup` |
| `{{DOMAIN}}` | Question 1 | `brandsyncup.com` |
| `{{REPO_NAME}}` | Question 1 | `su-brandsyncup-com` |
| `{{SCHEMA_NAME}}` | Question 1 | `brandsyncup` |
| `{{NEON_REGION}}` | Question 3 | `europe-west6` or `us-east-2` |
| `{{CF_ACCOUNT_ID}}` | Cloudflare auth | `6b078bcaa9984a2d1dbe483e65c741b0` |
| `{{NEON_PROJECT_ID}}` | Neon project | `polished-truth-90679079` |

---

## Post-Scaffold Steps

1. **Initialize git**: `git init && git add -A && git commit -m "feat: scaffold from greenfield template"`
2. **Configure Doppler**: `doppler setup --project {{PROJECT_NAME}} --config dev`
3. **Allow direnv**: `direnv allow`
4. **Install deps**: `npm install`
5. **Push Neon schema**: `doppler run -- npm run db:push`
6. **First deploy**: `doppler run -- npm run deploy:staging`
7. **Verify health**: `npm run health:test`
