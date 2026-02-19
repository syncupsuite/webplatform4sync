# Construction Frame — Onboard Wizard

> Run this when the Construction frame is first activated (bare `/webplatform4sync:site`
> or `/webplatform4sync:pour` with no prior `.claude/frame` file in the project).

---

## What this is

You are activating the **Construction frame** for Platform4Sync.

This frame maps your project build to five physical stages:

```
site    →  Clear the ground. Set up the environment.
pour    →  Pour the foundation. Platform core and data layer.
frame   →  Raise the skeleton. Auth, API, edge infrastructure.
wire    →  Run the wire. CI/CD, secrets, integrations.
finish  →  Apply the finish. Design, accessibility, ship.
```

Each stage has hard dependencies on the one before it. The frame will remind you
when sequencing is wrong — but it will not block you if you confirm you know what
you are doing.

---

## Step 1 — Identify the project

Ask:

> **Which project should we build?**
> - Current directory (default)
> - A specific path
> - New project (no directory yet)

If the path does not exist, offer to run `/webplatform4sync:site` → `scaffold` immediately.

---

## Step 2 — Scan for existing structure

Check for these signals to determine the current stage:

| Signal | Indicates |
|--------|----------|
| No directory / empty | site not started |
| `.envrc` present + stack files exist | site complete |
| `tenant_id` in DB schema + RLS migrations | pour complete |
| Better Auth config + at least one `wrangler.jsonc` | frame complete |
| `.github/workflows/` + Doppler references in wrangler | wire complete |
| Tokens in `src/styles/tokens/` + CI green + deployed | finish in progress |

---

## Step 3 — Write the frame file

Create `.claude/frame` in the project root:

```
construction
```

Create `.claude/` directory if it does not exist.

---

## Step 4 — Present the site assessment

Show where the project currently stands using the Construction status format:

```
Construction Assessment — <project-name>
═══════════════════════════════════════════

  site    [status]  [one-line finding]
  pour    [status]  [one-line finding or "not started"]
  frame   [status]  [one-line finding or "not started"]
  wire    [status]  [not started]
  finish  [status]  [not started]

Ground level: <which stage is active now>
```

---

## Step 5 — Recommend the first command

Based on the assessment, recommend exactly one command:

- site not started → `/webplatform4sync:site` → pick `init` or `scaffold`
- site done, pour not started → `/webplatform4sync:pour` → start with `platform`
- pour done, frame not started → `/webplatform4sync:frame` → start with `auth`
- frame done, wire not started → `/webplatform4sync:wire` → start with `ci`
- wire done, finish not started → `/webplatform4sync:finish` → start with `tokens` or `a11y`
- all stages complete → `/webplatform4sync:finish` → `ship`

End with:

> *"The frame is set. Run the recommended command when ready — or ask what any
> stage command does before committing."*
