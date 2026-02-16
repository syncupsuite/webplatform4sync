# Cloudflare Hyperdrive Setup for Neon PostgreSQL

## What Hyperdrive Does

Cloudflare Hyperdrive is a connection pooling and caching layer that sits between Cloudflare Workers and your PostgreSQL database. For Neon PostgreSQL in a serverless context, it solves two critical problems:

1. **Connection overhead**: Every Worker invocation would normally open a new TCP + TLS connection to Neon (~50-150ms). Hyperdrive maintains persistent connection pools from Cloudflare's network, eliminating this cost.

2. **Query caching**: Hyperdrive can cache read query results at the edge, further reducing latency for repeated queries.

Without Hyperdrive, each request pays the full connection setup cost. With Hyperdrive, the first request to a cold pool pays a small setup cost, and subsequent requests reuse pooled connections with near-zero overhead.

### Performance Characteristics

| Metric | Direct Neon (serverless driver) | Neon via Hyperdrive |
|--------|--------------------------------|---------------------|
| Connection setup | 50-150ms (WebSocket + TLS) | ~0ms (pooled TCP) |
| First query latency | 80-200ms | 10-30ms |
| Sustained query latency | 20-50ms | 10-30ms |
| Cold start impact | High (connection per invocation) | Minimal (pool warmth) |

---

## Creating a Hyperdrive Configuration

### Prerequisites

- A Neon database with a connection string
- Cloudflare account with Workers paid plan
- `wrangler` CLI installed (`npm install -g wrangler`)

### Step 1: Create the Hyperdrive Config

```bash
# Create a Hyperdrive config pointing to your Neon production branch
wrangler hyperdrive create brandsyncup-prod \
  --connection-string="postgres://neondb_owner:PASSWORD@ep-XXXXX.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

This outputs a Hyperdrive config ID (e.g., `your-hyperdrive-config-id`). Store this ID -- you will reference it in your Worker configuration.

### Step 2: Configure Caching (Optional)

```bash
# Update caching settings
wrangler hyperdrive update brandsyncup-prod \
  --caching-disabled=false \
  --max-age=60 \
  --stale-while-revalidate=15
```

Caching options:

| Setting | Description | Recommended |
|---------|-------------|-------------|
| `--caching-disabled` | Disable all query caching | `false` for reads, `true` for write-heavy |
| `--max-age` | Cache TTL in seconds | 60 for general, 0 for real-time data |
| `--stale-while-revalidate` | Serve stale while refreshing | 15 seconds |

**Important**: Hyperdrive only caches read queries (`SELECT`). Mutations (`INSERT`, `UPDATE`, `DELETE`) always go to the origin.

---

## Worker Configuration

### wrangler.jsonc

```jsonc
{
  "name": "brandsyncup-worker",
  "main": "src/worker.ts",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],

  // Hyperdrive bindings -- one per database branch
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "your-hyperdrive-config-id"
    }
  ],

  // Environment-specific overrides
  "env": {
    "staging": {
      "hyperdrive": [
        {
          "binding": "HYPERDRIVE",
          "id": "staging-hyperdrive-config-id"
        }
      ]
    }
  }
}
```

### TypeScript Types

```typescript
// src/types/env.d.ts
export interface Env {
  HYPERDRIVE: Hyperdrive;
  // Fallback for local development
  NEON_DATABASE_URL?: string;
  // Other bindings
  CACHE: KVNamespace;
  ASSETS: R2Bucket;
}
```

---

## Using Hyperdrive with Drizzle ORM

### Connection Setup

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema';

export function createDb(env: Env) {
  // In production, Hyperdrive provides a pooled connection string.
  // In development (wrangler dev), fall back to direct Neon URL.
  const connectionString = env.HYPERDRIVE?.connectionString ?? env.NEON_DATABASE_URL;

  if (!connectionString) {
    throw new Error('No database connection available');
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}
```

### Full Worker Example

```typescript
import { createDb } from './db';
import { documents } from './db/schema';
import { eq, sql } from 'drizzle-orm';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = createDb(env);

    // Set tenant context for RLS
    const tenantId = getTenantFromSession(request);
    await db.execute(
      sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`
    );

    // Query -- RLS ensures tenant isolation
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.status, 'published'));

    return Response.json(docs);
  },
};
```

---

## Environment-Specific Setup

### Production

- Uses Hyperdrive for connection pooling
- Connection string provided by `env.HYPERDRIVE.connectionString`
- Caching enabled for read queries
- Points to the app's production Neon branch

### Staging

- Uses a separate Hyperdrive config pointing to the staging/dev Neon branch
- Caching may be disabled for testing accuracy
- Configure in `wrangler.jsonc` under `env.staging`

### Local Development (`wrangler dev`)

Hyperdrive is available during `wrangler dev` but connects through Cloudflare's network. For faster local iteration, you can use the direct Neon connection:

```bash
# .dev.vars (local development secrets, NOT committed)
NEON_DATABASE_URL=postgres://neondb_owner:PASSWORD@ep-XXXXX.us-east-2.aws.neon.tech/neondb?sslmode=require
```

The connection factory falls back to `NEON_DATABASE_URL` when `HYPERDRIVE` is not available. However, using `wrangler dev` with Hyperdrive is recommended for production-parity testing.

### Running with Doppler

```bash
# Inject secrets and start local dev
doppler run -- npx wrangler dev

# Or with npm script (if configured)
doppler run -- npm run worker:dev
```

---

## Creating Hyperdrive for Multiple Branches

For the SyncUpSuite setup with multiple Neon branches, create one Hyperdrive config per production branch:

```bash
# BrandSyncUp production
wrangler hyperdrive create brandsyncup-prod \
  --connection-string="$(doppler secrets get NEONDB_BRANDSYNCUP_PRODUCTION_URL --plain)"

# LegalSyncUp production
wrangler hyperdrive create legalsyncup-prod \
  --connection-string="$(doppler secrets get NEONDB_LEGALSYNCUP_PRODUCTION_URL --plain)"
```

Dev branches do NOT need Hyperdrive -- they connect directly via the Neon serverless driver during development.

---

## Monitoring and Troubleshooting

### Check Hyperdrive Status

```bash
# List all Hyperdrive configs
wrangler hyperdrive list

# Get details for a specific config
wrangler hyperdrive get brandsyncup-prod
```

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Connection refused` in production | Hyperdrive config not bound in wrangler.jsonc | Add `hyperdrive` binding to wrangler.jsonc |
| Stale data after writes | Query caching returning old results | Set `--max-age=0` for write-heavy tables or use `--caching-disabled=true` |
| `TypeError: env.HYPERDRIVE is undefined` | Missing binding in local dev | Add `NEON_DATABASE_URL` to `.dev.vars` as fallback |
| High latency despite Hyperdrive | Cold pool (first request after idle) | Expected -- pool warms after first connection |
| Connection errors after Neon password rotation | Hyperdrive caches credentials | Run `wrangler hyperdrive update` with new connection string |

### Rotating Neon Credentials

When rotating Neon database passwords, update both Doppler and Hyperdrive:

```bash
# 1. Update the password in Neon console or via API
# 2. Update Doppler
doppler secrets set NEONDB_BRANDSYNCUP_PRODUCTION_URL "postgres://...new-password..."

# 3. Update Hyperdrive
wrangler hyperdrive update brandsyncup-prod \
  --connection-string="$(doppler secrets get NEONDB_BRANDSYNCUP_PRODUCTION_URL --plain)"
```

---

## Security Notes

- Hyperdrive connection strings contain database credentials. They are stored encrypted in Cloudflare's infrastructure and are never exposed to Worker code directly.
- The `env.HYPERDRIVE.connectionString` in Worker code is a Cloudflare-internal proxy URL, not the actual Neon connection string.
- Workers cannot extract the original Neon credentials from the Hyperdrive binding.
- Always store the original Neon connection string in Doppler, not in Worker environment variables or wrangler.jsonc.
