# pour — Foundation Pour

> Construction frame · Stage 2 of 5
> Previous: `site` | Next: `frame`

Load `frames/construction/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

The foundation determines everything above it.

Once the foundation cures, you build on it. You do not revise it without a
significant migration — and migrations at the platform layer are expensive.
The decisions made in `pour` are load-bearing: tenant model, schema design,
isolation strategy, RLS policy shape.

**Pour is complete when**: the tenant model is committed, the database is migrated,
RLS is enforced at every table, and the platform core can hold production load.

---

## Gate check (from `site`)

Before proceeding, verify site is done. Ask or check `.p4s/status.json`:

- [ ] Stack initialized (`site:init` or `site:scaffold` completed)
- [ ] Environment wired (`.envrc` present, Doppler configured)
- [ ] Cloudflare and Neon accounts accessible

If site is incomplete, state the dependency clearly — then proceed if the user confirms.

---

## Subcommands

If the user provides a subcommand, route directly.
If no subcommand, present this menu.

| Subcommand | What it does |
|-----------|-------------|
| `platform` | 3-tier multi-tenant architecture — tenant hierarchy, RLS, governance rules, RBAC model |
| `neon` | Neon PostgreSQL setup — schema, RLS policies, branch isolation strategy, Drizzle ORM config |
| `arch` | Analyze existing architecture — identify load-bearing decisions, flag structural risks |

**Recommended order**: `platform` → `neon`. Run `arch` if migrating an existing system.

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `platform` | Read and follow `skills/multi-tenant-platform/skill.md` |
| `neon` | Read and follow `skills/neon-multi-tenant/skill.md` |
| `arch` | Invoke `architecture-introspector:architecture-introspector` skill |

---

## Key decisions at this stage

These are load-bearing choices. Surface them explicitly before the skill runs:

**Tenant isolation model**
> *"Shared schema with RLS (recommended — Neon native), or schema-per-tenant?
> This determines your migration story for the next 3 years."*

**Tenant hierarchy depth**
> *"Do you need all 3 tiers active (T0 platform / T1 partner / T2 customer)?
> Or T0 + T2 only, with T1 dormant? Both work — dormant tiers activate without
> a rewrite, but the schema is the same either way."*

**Branch strategy**
> *"Neon branch per environment (prod / staging / dev / per-PR)?
> Set this now — changing branch strategy after migration is a rebuild."*

---

## Gate check (before `frame`)

Before recommending `frame`, confirm:

- [ ] `tenant_id UUID NOT NULL` exists in every application table
- [ ] RLS policies written and enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] `neon_auth` schema present if using Better Auth
- [ ] Drizzle schema committed and initial migration run
- [ ] Neon branches configured for each environment

If any are missing:

> *"The foundation is not yet cured — [missing item] is still wet.
> Do not frame until the pour is solid."*

---

## Completion message

When pour is confirmed complete:

> *"Foundation poured. `tenant_id` is in every table. RLS enforces T2 isolation.
> The pour is cured — ready to frame.*
> *Next: `/webplatform4sync:frame` — auth, API, and edge infrastructure."*

Update `.p4s/status.json` steps `tenant` and `database` to `completed` if the file exists.
