# site — Site Preparation

> Construction frame · Stage 1 of 5
> Previous: none | Next: `pour`

Load `frames/construction/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

Clear the ground. Survey the lot. Set up the environment.

Nothing load-bearing exists yet. Site prep is permits and groundwork — the work
that makes it legal and safe to pour. Skip it and the foundation will shift.

**Site is complete when**: the project directory exists, the full stack is initialized,
the environment is wired, and you are ready to pour.

---

## Subcommands

If the user provides a subcommand (e.g. `/webplatform4sync:site init`), route directly.
If no subcommand, present this menu and ask which to run.

| Subcommand | What it does |
|-----------|-------------|
| `init` | Interactive multi-service stack setup — GitHub, GCP, Firebase, Neon, Cloudflare, Doppler |
| `envrc` | Create or update `.envrc` with standardized environment config (auto-detects stack) |
| `tune` | Analyze and optimize Claude Code configuration for this project's stack |
| `clear` | Find and safely remove space-wasting artifacts from repos |
| `scaffold` | Initialize your project to the platform structure — greenfield (new), brownfield (existing), or overlay (tokens only) |

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `init` | Read and follow `@syncupsuite/init-stack` skill |
| `envrc` | Read and follow `@syncupsuite/setup-project-envrc` skill |
| `tune` | Read and follow `@syncupsuite/optimize-onboarding` skill |
| `clear` | Read and follow `@syncupsuite/repo-cleanup` skill |
| `scaffold` | Read and follow `scaffold/greenfield/scaffold.md` or `scaffold/brownfield/scaffold.md` |

---

## Gate check (before `pour`)

Before recommending `pour`, confirm all of these:

- [ ] Project directory exists with correct naming (`repo = domain = GCP project ID`)
- [ ] `.envrc` is written and `direnv allow` has been run
- [ ] Doppler project exists and CLI is authenticated
- [ ] GitHub repo created and initial commit pushed
- [ ] Neon project created (branch will be set in `pour`)
- [ ] Cloudflare account accessible via `wrangler whoami`

If any are missing, surface them clearly before moving on:

> *"Site prep is almost done — Cloudflare authentication is missing.
> Run `wrangler login` before pouring."*

---

## Completion message

When site is confirmed complete:

> *"Ground is cleared. The lot is ready.*
> *Next: `/webplatform4sync:pour` — platform core and data layer."*

Update `.p4s/status.json` step `site` to `completed` if the file exists.
