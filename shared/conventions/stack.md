# Stack Conventions

Canonical dependency versions for all SyncUpSuite projects.

Last verified against BrandSyncUp production: 2026-02-21.

## Locked Versions

| Dependency | Version | Notes |
|-----------|---------|-------|
| React | ^19.2 | Concurrent features, use transitions |
| React DOM | ^19.2 | Must match React version |
| TypeScript | ^5.9 | Latest stable, strict mode required |
| Tailwind CSS | ^4.1 | CSS-first config (`@theme` directive, no `tailwind.config.js` for greenfield) |
| Vite | ^7.0 | With `@cloudflare/vite-plugin` |
| Drizzle ORM | ^0.45 | With `drizzle-kit ^0.31` for migrations |
| Better Auth | ^1.4 | Session management, RBAC, `neon_auth` schema |
| Cloudflare Workers | wrangler ^4.x | `wrangler.jsonc` format |
| Neon Serverless | @neondatabase/serverless ^1.0 | With Hyperdrive connection pooling |
| Style Dictionary | ^4.x | W3C DTCG token format (new projects). BSU still on ^3.9 — migration pending. |
| React Router | ^7.13 | Merged package — use `react-router` (not `react-router-dom`). v7 unified both. |

## Optional Dependencies

| Dependency | Version | When |
|-----------|---------|------|
| tRPC | ^11.8 | If API layer uses tRPC (vs custom Worker routes) |
| Firebase (client) | ^12.8 | If using Firebase Identity Platform |
| Stripe | ^20.x | If payment integration needed |
| Playwright | ^1.58 | E2E testing |
| Vitest | ^4.0 | Unit/integration testing |
| posthog-js | ^1.x | Analytics — standard for all products (see `shared/conventions/analytics.md`) |
| Sentry | @sentry/react ^10.x | Error tracking (optional, BSU uses it) |

## Tailwind 4 Notes

Tailwind 4 uses CSS-first configuration:

```css
/* Greenfield: use @theme in CSS */
@import "tailwindcss";

@theme {
  --color-primary: var(--color-primary);
  --color-accent: var(--color-accent);
}
```

```js
// Brownfield: tailwind.config.js still supported for migration
// Use the v3→v4 migration checklist in scaffold/brownfield/
```

## TypeScript Configuration

All projects use strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "module": "ESNext",
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Note: `module: "ESNext"` is the correct choice with `moduleResolution: "Bundler"` — this matches Vite's expectations. The scaffold `tsconfig.json` is the canonical reference.

## Path Alias

All projects use `@/` for src imports:

```typescript
import { Button } from '@/components/ui/button'
import { TenantContext } from '@/contexts/TenantContext'
```
