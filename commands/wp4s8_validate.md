> **@deprecated** — Use a command frame instead.
> Construction: `/webplatform4sync:finish` → `a11y`, `sr`, or `watch`
> Shu-Ha-Ri: `/webplatform4sync:ri` → `a11y`, `sr`, or `watch`
> This command will be removed after one full project cycle with frames in use.

---

# wp4s8_validate

> Step 8 of 9 — Validate tenant model, tokens, and contract alignment
> Previous: `wp4s7_deploy` | Next: `wp4s9_status`

## What This Does

Runs the validation suite against the project: tenant hierarchy validation, RLS policy checks, token schema and accessibility validation, and contract alignment with the Platform4Sync standard. Catches misconfigurations before they reach production.

## Instructions

### 1. Read Discovery State

Load `.p4s/status.json`. Check which steps have been completed to determine which validations are applicable.

### 2. Run Tenant Validation

If `tenant` step is completed, use `shared/validation/tenant-validator.ts`:

#### Hierarchy Validation (`validateHierarchy`)

Validates the tenant configuration:
- T0 has no parent (`hierarchy.t0-no-parent`)
- T1/T2 have a parent (`hierarchy.requires-parent`)
- Parent exists in the tenant list (`hierarchy.parent-exists`)
- Parent tier is less than child tier (`hierarchy.tier-ordering`)
- Slugs are valid: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` (`naming.slug`)
- No cycles in hierarchy (`hierarchy.no-cycles`)

#### RLS Policy Checks (`generateRLSCheckQueries`)

For each domain table, generate and run SQL queries to verify:
1. `relrowsecurity = true` on the table
2. `relforcerowsecurity = true` (owner doesn't bypass RLS)
3. `pg_policy` entries exist for the table
4. `tenant_id` column exists
5. `tenant_id` has an index

Report any tables that fail these checks.

### 3. Run Token Validation

If `tokens` step is completed, use `shared/validation/token-validator.ts`:

#### Schema Validation (`validateSchema`)

- All required semantic tokens are present (errors for missing)
- Every token has `$type`, `$value`, `$description`

#### Contrast Validation (`validateContrast`)

- `text.primary` on `background.canvas` >= 4.5:1 (WCAG AA)
- `text.secondary` on `background.canvas` >= 4.5:1 (WCAG AA)
- `interactive.primary` on `background.canvas` >= 3:1 (large text / UI components)

Run for both light and dark modes.

#### Override Validation (`validateOverride`)

- No T1/T2 overrides of protected token paths:
  - `status.error.*`, `status.success.*`, `status.warning.*`
  - `focus.ring`
  - `accessibility.*`

### 4. Verify Stack Alignment

Check `package.json` dependencies against `shared/conventions/stack.md`:

| Dependency | Required Version |
|-----------|-----------------|
| react | ^19.2 |
| typescript | ^5.7 |
| tailwindcss | ^4.0 |
| vite | ^7.0 |
| drizzle-orm | ^0.38 |
| better-auth | ^1.x |
| wrangler | ^4.x |

Report outdated or misaligned dependencies.

### 5. Verify Contract Alignment

Check that project types align with shared contracts in `shared/contracts/`:
- `tenant.ts` — `TenantContext`, `TenantTier`, `IsolationMode`
- `auth.ts` — `AuthLevel`, `AuthContext`
- `tokens.ts` — token type definitions
- `env.ts` — `Env` interface (Hyperdrive, KV, R2 bindings)

### 6. Verify Naming Convention

Check against `shared/conventions/naming.md`:
- Repo name matches domain convention
- Wrangler names follow pattern (`<project>-worker`, `<project>-cache`, etc.)
- Schema name follows convention

### 7. Present Validation Report

```
Platform4Sync Validation — <project-name>
═══════════════════════════════════════════

Tenant Hierarchy
  ✅ T0 has no parent
  ✅ T1/T2 have valid parents
  ✅ No cycles detected
  ✅ All slugs valid

RLS Policies
  ✅ items — RLS enabled, forced, policies exist, tenant_id indexed
  ⚠️  documents — RLS enabled but NOT forced (owner bypasses)
  ❌ audit_log — RLS not enabled

Tokens
  ✅ All required semantic tokens present
  ✅ Light mode contrast: AA pass (4.8:1 primary, 5.2:1 secondary)
  ✅ Dark mode contrast: AA pass (4.6:1 primary, 5.0:1 secondary)
  ✅ No protected token overrides

Stack Alignment
  ✅ react 19.2.0 (^19.2 required)
  ⚠️  drizzle-orm 0.37.0 (^0.38 required — update recommended)

Naming
  ✅ repo=domain convention followed

3 passed | 1 warning | 1 error
```

### 8. Update Status

Update `.p4s/status.json`:

```json
{
  "validate": {
    "status": "completed",
    "completedAt": "<ISO 8601>",
    "results": {
      "tenantHierarchy": { "passed": 5, "warnings": 0, "errors": 0 },
      "rlsPolicies": { "passed": 3, "warnings": 1, "errors": 1 },
      "tokenSchema": { "passed": 4, "warnings": 0, "errors": 0 },
      "tokenContrast": { "passed": 2, "warnings": 0, "errors": 0 },
      "stackAlignment": { "passed": 6, "warnings": 1, "errors": 0 },
      "naming": { "passed": 3, "warnings": 0, "errors": 0 }
    },
    "totalPassed": 23,
    "totalWarnings": 2,
    "totalErrors": 1
  }
}
```

## Reference

- `shared/validation/tenant-validator.ts` — hierarchy validation and RLS check queries
- `shared/validation/token-validator.ts` — token schema, contrast, and override validation
- `shared/contracts/` — TypeScript type contracts (auth, tenant, tokens, env)
- `shared/conventions/stack.md` — canonical dependency versions
- `shared/conventions/naming.md` — naming convention rules

## Completion

The user has a full validation report showing what passes, what needs attention, and what blocks production readiness. Any errors should be resolved before deploying.

Update `.p4s/status.json` step `validate` status to `completed`.
