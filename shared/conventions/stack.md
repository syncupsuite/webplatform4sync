# Stack Conventions

Canonical dependency versions for all SyncUpSuite projects.

## Locked Versions

| Dependency | Version | Notes |
|-----------|---------|-------|
| React | ^19.2 | Concurrent features, use transitions |
| React DOM | ^19.2 | Must match React version |
| TypeScript | ^5.7 | Latest stable, strict mode required |
| Tailwind CSS | ^4.0 | CSS-first config (`@theme` directive, no `tailwind.config.js` for greenfield) |
| Vite | ^7.0 | With `@cloudflare/vite-plugin` |
| Drizzle ORM | ^0.38 | With `drizzle-kit` for migrations |
| Better Auth | ^1.x | Session management, RBAC, `neon_auth` schema |
| Cloudflare Workers | wrangler ^4.x | `wrangler.jsonc` format |
| Neon Serverless | @neondatabase/serverless | With Hyperdrive connection pooling |
| Style Dictionary | ^4.x | W3C DTCG token format |

## Optional Dependencies

| Dependency | Version | When |
|-----------|---------|------|
| tRPC | ^11.x | If API layer uses tRPC (vs custom Worker routes) |
| Firebase Admin | ^13.x | If using Firebase Identity Platform |
| Stripe | ^17.x | If payment integration needed |
| Playwright | ^1.49 | E2E testing |
| Vitest | ^3.x | Unit/integration testing |

## Tailwind 4 Notes

Tailwind 4 uses CSS-first configuration:

```css
/* Greenfield: use @theme in CSS */
@import "tailwindcss";

@theme {
  --color-primary: var(--token-color-primary);
  --color-accent: var(--token-color-accent);
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
    "exactOptionalPropertyTypes": false,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ES2022",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Path Alias

All projects use `@/` for src imports:

```typescript
import { Button } from '@/components/ui/button'
import { TenantContext } from '@/contexts/TenantContext'
```
