> **@deprecated** — Use a command frame instead.
> Construction: `/webplatform4sync:site` → `init` or `scaffold`
> Shu-Ha-Ri: `/webplatform4sync:shu` → `init` or `scaffold`
> This command will be removed after one full project cycle with frames in use.

---

# wp4s1_discover

> Step 1 of 9 — Scan project against the Platform4Sync standard
> Previous: none | Next: `wp4s2_scaffold`

## What This Does

Scans an existing or new project directory against the Platform4Sync standard stack. Detects the current state of the stack (framework, auth, database, tokens, tenancy, hosting) and writes a `.p4s/status.json` file that tracks adoption progress across all 9 steps.

This is always the first command to run. It establishes what exists and what needs to be done.

## Instructions

### 1. Identify the Target Project

Ask the user:

> **Which project directory should I scan?**
> - Current directory (default)
> - A specific path

If no project exists yet, note that in findings and recommend `wp4s2_scaffold` with greenfield mode.

### 2. Scan Against the Standard Stack

Read `shared/conventions/stack.md` for the canonical stack definition. Check for each component:

| Component | What to Check |
|-----------|--------------|
| **React** | `package.json` dependencies for `react` version |
| **TypeScript** | `tsconfig.json` presence, strict mode, path aliases |
| **Tailwind CSS** | Version (v3 vs v4), config style (`tailwind.config.js` vs CSS-first `@theme`) |
| **Vite** | Version, `@cloudflare/vite-plugin` presence |
| **Cloudflare Workers** | `wrangler.jsonc` or `wrangler.toml` presence and structure |
| **Neon PostgreSQL** | `@neondatabase/serverless` in deps, Drizzle config, schema files |
| **Drizzle ORM** | `drizzle.config.ts`, schema files in `src/db/` |
| **Better Auth** | Auth config, `neon_auth` schema usage, session setup |
| **Firebase** | `firebase.json`, `.firebaserc`, auth subdomain config |
| **Design Tokens** | Token files in `src/styles/tokens/`, Style Dictionary config |
| **Multi-Tenancy** | `tenant_id` in schema, RLS policies, tenant context |
| **Naming Convention** | Check if repo name matches domain convention per `shared/conventions/naming.md` |

### 3. Assess Each Step

For each of the 9 workflow steps, determine a status:

- `completed` — fully aligned with standard
- `partial` — some elements present, gaps identified
- `pending` — not started
- `not_applicable` — intentionally skipped (user confirmed)

### 4. Create `.p4s/status.json`

Create the `.p4s/` directory in the target project and write `status.json`:

```json
{
  "project": "<project-name>",
  "domain": "<detected-or-asked domain>",
  "createdAt": "<ISO 8601>",
  "updatedAt": "<ISO 8601>",
  "steps": {
    "discover": {
      "status": "completed",
      "completedAt": "<ISO 8601>",
      "findings": {
        "framework": { "react": "19.2.0", "typescript": "5.7.0", "aligned": true },
        "styling": { "tailwind": "4.1.0", "mode": "css-first", "aligned": true },
        "build": { "vite": "7.0.0", "cloudflarePlugin": true, "aligned": true },
        "database": { "neon": true, "drizzle": true, "hyperdrive": false, "aligned": false },
        "auth": { "betterAuth": true, "firebase": false, "neonAuthSchema": true, "aligned": false },
        "tokens": { "styleDict": false, "dtcg": false, "coreTokens": true, "aligned": false },
        "tenancy": { "tenantId": true, "rls": false, "tenantContext": true, "aligned": false },
        "hosting": { "cloudflareWorkers": true, "wranglerJsonc": true, "aligned": true },
        "naming": { "repoName": "example-com", "matchesDomain": true, "aligned": true }
      }
    },
    "scaffold": { "status": "pending" },
    "tenant": { "status": "pending" },
    "database": { "status": "pending" },
    "auth": { "status": "pending" },
    "tokens": { "status": "pending" },
    "deploy": { "status": "pending" },
    "validate": { "status": "pending" },
    "status": { "status": "pending" }
  }
}
```

Adapt the findings to what is actually detected. Omit fields that don't apply.

### 5. Present Summary

Show the user a clear summary table:

```
Platform4Sync Discovery — <project-name>
═══════════════════════════════════════════

  Framework     ✅ React 19.2 + TypeScript 5.7
  Styling       ✅ Tailwind 4.1 (CSS-first)
  Build         ✅ Vite 7 + Cloudflare plugin
  Database      ⚠️  Neon + Drizzle present, Hyperdrive missing
  Auth          ⚠️  Better Auth present, Firebase not configured
  Tokens        ❌ No design token pipeline
  Tenancy       ⚠️  tenant_id exists, RLS not enabled
  Hosting       ✅ Cloudflare Workers
  Naming        ✅ repo=domain convention

Recommended next step: /webplatform4sync:wp4s3_tenant
```

Recommend the most impactful next step based on what's missing.

## Reference

- `shared/conventions/stack.md` — canonical stack versions
- `shared/conventions/naming.md` — naming convention rules
- `shared/conventions/deployment.md` — deployment standards

## Completion

The user has a `.p4s/status.json` file with a complete snapshot of their project's alignment to the Platform4Sync standard, and a clear recommendation for which step to run next.

Update `.p4s/status.json` step `discover` status to `completed`.
