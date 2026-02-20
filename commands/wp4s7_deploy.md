> **@deprecated** — Use a command frame instead.
> Construction: `/webplatform4sync:wire` → `ci` or `deploy`, then `/webplatform4sync:finish` → `ship`
> Shu-Ha-Ri: `/webplatform4sync:ri` → `flow` or `ship`
> This command will be removed after one full project cycle with frames in use.

---

# wp4s7_deploy

> Step 7 of 9 — Deploy to Cloudflare Workers
> Previous: `wp4s6_tokens` | Next: `wp4s8_validate`

## What This Does

Configures Cloudflare Worker deployment with Vite 7 build, Doppler secret injection, DNS setup, and health checks. Establishes the develop -> staging -> production pipeline with environment-specific Doppler configs.

## Instructions

### 1. Read Discovery State

Load `.p4s/status.json`. Check `discover` findings for existing hosting/deployment state. Verify the project has a `wrangler.jsonc` (from step 2).

### 2. Load Deployment Conventions

Read `shared/conventions/deployment.md` for the standard deployment pipeline. Read `shared/conventions/stack.md` for Cloudflare Workers and Vite version requirements.

### 3. Verify Vite Configuration

Ensure `vite.config.ts` includes:
- `@cloudflare/vite-plugin` (Cloudflare Workers integration)
- `@tailwindcss/vite` (Tailwind CSS 4 plugin)
- `@vitejs/plugin-react` (React support)
- Manual chunk splitting: `vendor-react` consolidates `react`, `react-dom`, `react-router-dom`
- Chunk size warning limit: 1000KB

### 4. Verify Wrangler Configuration

Ensure `wrangler.jsonc` includes:
- `main: "src/server/index.ts"` (Worker entry point)
- `compatibility_date` set to a recent date
- `nodejs_compat` compatibility flag
- **Bindings**: `CACHE` (KV), `ASSETS` (R2 if needed), `DB` (Hyperdrive)
- **Environments**: `staging` and `production` with appropriate routes
- **Routes**: `staging.domain.tld` for staging, `domain.tld` + `www.domain.tld` for production

### 5. Configure Doppler

Ensure Doppler project and configs exist:

```bash
# Set up Doppler for this project
doppler setup --project <project-name> --config dev

# Configs needed:
# - dev   (local development)
# - stg   (staging deployment)
# - prd   (production deployment)
```

Required secrets per environment:
- `NEON_DATABASE_URL` — connection string for the appropriate branch
- `BETTER_AUTH_SECRET` — session signing secret
- `APP_URL` — the URL for the environment

### 6. Configure DNS

Document DNS records for Cloudflare:

```
@              CNAME  <worker-route>    (proxied)
www            CNAME  <worker-route>    (proxied)
staging        CNAME  <worker-route>    (proxied)
auth           CNAME  <firebase>.web.app (DNS only — if Firebase configured)
```

### 7. Set Up Health Checks

Ensure the Worker responds to health check endpoints:
- `GET /api/health` — returns `{ status: "ok", environment, timestamp }`
- `GET /api/openapi.json` — returns valid OpenAPI spec (if applicable)

Add health check script to `package.json`:
```json
{
  "health:test": "curl -sf https://<domain>/api/health | jq ."
}
```

### 8. Configure Deployment Scripts

Ensure `package.json` has deployment scripts:

```json
{
  "deploy:staging": "doppler run --config stg -- npx wrangler deploy --env staging",
  "deploy:production": "doppler run --config prd -- npx wrangler deploy --env production"
}
```

### 9. Set Worker Secrets

Document the wrangler secret setup for deployed Workers:

```bash
# Set secrets for staging
wrangler secret put NEON_DATABASE_URL --env staging
wrangler secret put BETTER_AUTH_SECRET --env staging

# Set secrets for production
wrangler secret put NEON_DATABASE_URL --env production
wrangler secret put BETTER_AUTH_SECRET --env production
```

### 10. Test Deployment Pipeline

Walk the user through:
1. `npm run build` — verify build succeeds
2. `npm run deploy:staging` — deploy to staging
3. `npm run health:test` — verify staging health
4. `npm run deploy:production` — deploy to production (confirm with user first)
5. `npm run health:test` — verify production health

### 11. Update Status

Update `.p4s/status.json`:

```json
{
  "deploy": {
    "status": "completed",
    "completedAt": "<ISO 8601>",
    "platform": "cloudflare-workers",
    "environments": ["staging", "production"],
    "doppler": true,
    "healthCheck": true,
    "dns": {
      "root": true,
      "www": true,
      "staging": true,
      "auth": false
    }
  }
}
```

## Reference

- `shared/conventions/deployment.md` — deployment pipeline standard
- `shared/conventions/stack.md` — Cloudflare Workers and Vite versions
- `scaffold/greenfield/base/wrangler.jsonc` — wrangler config template
- `scaffold/greenfield/base/vite.config.ts` — Vite config template
- `scaffold/greenfield/base/package.json` — script templates
- `scaffold/greenfield/base/src/server/index.ts` — Worker entry with health endpoint

## Completion

The user has a working deployment pipeline: build, deploy to staging, verify, deploy to production, verify. DNS is configured, secrets are managed via Doppler, and health checks confirm the deployment is healthy.

Update `.p4s/status.json` step `deploy` status to `completed`.
