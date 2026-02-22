# Deployment Conventions

## Standard Pipeline

```
develop → staging → production
```

### Commands

```bash
npm run build              # Production build
npm run deploy:staging     # Deploy to staging.domain.tld
npm run deploy:production  # Deploy to domain.tld (confirm first)
npm run health:test        # Verify deployment health
```

### Health Checks

Every deployment must verify:
- `/api/health` returns 200
- `/api/openapi.json` returns valid spec (if API project)
- Core routes render without errors

## Cloudflare Workers Deployment

### wrangler.jsonc Structure

```jsonc
{
  "name": "project-name-worker",
  "compatibility_date": "2025-12-01",
  "main": "src/server/index.ts",
  "env": {
    "staging": {
      "name": "project-name-staging",
      "routes": [{ "pattern": "staging.domain.tld/*" }]
    },
    "production": {
      "name": "project-name-production",
      "routes": [{ "pattern": "domain.tld/*" }]
    }
  }
}
```

### Secrets

Never commit secrets. Use Doppler for local dev, wrangler for deployed secrets:

```bash
# Local development
doppler run -- npm run dev

# Deployed Workers
wrangler secret put NEON_DATABASE_URL --env production
wrangler secret put BETTER_AUTH_SECRET --env production
```

## DNS Configuration

### Standard Records

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `@` | CNAME | Cloudflare Worker route | Main site |
| `staging` | CNAME | Cloudflare Worker route | Staging |
| `auth` | CNAME | Firebase Hosting | Identity flows (initial) |
| `pha` | CNAME | PostHog managed CNAME (`europehog.com`) | Analytics reverse proxy (DNS-only, no orange cloud) |

### Firebase Auth Subdomain

1. Add `auth.domain.tld` to Firebase Hosting
2. Verify DNS ownership via TXT record
3. Firebase handles email templates for password management
4. After verification, `auth` subdomain can stay on Firebase or redirect as needed

## Environment Separation

| Environment | Database Branch | Cloudflare Env | Doppler Config |
|-------------|----------------|----------------|----------------|
| Development | `*-dev` | local (miniflare) | `dev` |
| Staging | `*-prod` (read replica) | `staging` | `stg` |
| Production | `*-prod` | `production` | `prd` |
