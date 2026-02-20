> **@deprecated** — Use a command frame instead.
> Construction: run any stage command with no subcommand to see status, or start fresh with `/webplatform4sync:site`
> Shu-Ha-Ri: run `/webplatform4sync:shu` with no subcommand to see the mastery map
> This command will be removed after one full project cycle with frames in use.

---

# wp4s9_status

> Step 9 of 9 — Show adoption status and suggest next step
> Previous: `wp4s8_validate` | Next: none (workflow complete)

## What This Does

Reads `.p4s/status.json` and presents a clear adoption checklist showing which steps are done, pending, in progress, skipped, or blocked. Suggests the most impactful next command to run.

## Instructions

### 1. Read Status File

Load `.p4s/status.json` from the target project. If the file doesn't exist, tell the user to start with `wp4s1_discover`.

### 2. Present Adoption Checklist

Display a numbered checklist matching the workflow sequence:

```
Platform4Sync Adoption — <project-name>
═══════════════════════════════════════════

  1. Discover      ✅ completed  (2026-02-17)
  2. Scaffold      ✅ completed  (2026-02-17)  greenfield
  3. Tenant        ✅ completed  (2026-02-17)  simple mode
  4. Database      ⏳ in_progress
  5. Auth          ⬚  pending
  6. Tokens        ⬚  pending
  7. Deploy        ⬚  pending
  8. Validate      ⬚  pending
  9. Status        ✅ running now

Progress: 3/8 completed (status doesn't count)
```

Use these indicators:
- `✅` completed
- `⏳` in_progress
- `⬚` pending
- `⏭️` skipped
- `🚫` blocked

### 3. Show Step Details

For completed steps, show a one-line summary from their status data:
- Scaffold: `greenfield | brownfield | overlay`
- Tenant: `simple | partner | whitelabel`
- Database: Neon project, branches, Hyperdrive status
- Auth: `simple | graduated | whitelabel`, providers
- Tokens: `defaults | cultural | custom`, Tailwind version
- Deploy: environments, health check status
- Validate: pass/warn/error counts

### 4. Suggest Next Step

Recommend the next command to run based on:

1. **Sequential order** — suggest the first `pending` step in sequence
2. **Dependencies** — some steps build on others:
   - `tenant` benefits from `scaffold` being done first
   - `database` needs `tenant` for schema
   - `auth` needs `database` for Neon
   - `validate` should run after other steps complete
3. **Quick wins** — if most steps are done, suggest `validate` to verify everything

```
Suggested next step: /webplatform4sync:wp4s4_database
  → Set up Neon branch strategy and Drizzle tenant-scoped queries
```

### 5. Show Available Commands

List all 9 commands for reference:

```
Available commands:
  /webplatform4sync:wp4s1_discover   Scan project against standard
  /webplatform4sync:wp4s2_scaffold   Generate project structure
  /webplatform4sync:wp4s3_tenant     Set up 3-tier tenant model
  /webplatform4sync:wp4s4_database   Neon + Drizzle + Hyperdrive
  /webplatform4sync:wp4s5_auth       Firebase + Better Auth + Identity Platform
  /webplatform4sync:wp4s6_tokens     Design token system
  /webplatform4sync:wp4s7_deploy     Cloudflare Workers deployment
  /webplatform4sync:wp4s8_validate   Run validation suite
  /webplatform4sync:wp4s9_status     This command
```

### 6. Update Status

Update `.p4s/status.json`:

```json
{
  "status": {
    "status": "completed",
    "lastRun": "<ISO 8601>"
  }
}
```

Also update the top-level `updatedAt` timestamp.

## Reference

- `.p4s/status.json` — persistent adoption state

## Completion

The user has a clear picture of their Platform4Sync adoption progress and knows exactly which command to run next.

Update `.p4s/status.json` step `status` to `completed` with `lastRun` timestamp.
