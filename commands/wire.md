# wire — Electrical & Plumbing

> Construction frame · Stage 4 of 5
> Previous: `frame` | Next: `finish`

Load `frames/construction/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

Wire and plumbing run through the frame. They are invisible in the finished
building but everything depends on them.

A broken CI pipeline behind finished walls is expensive. Secrets hardcoded
into source files are a structural defect that cannot be patched without
tearing out the wall. Wire must be clean before finish begins.

**Wire is complete when**: CI is green on every push to main, deployment is
gated on passing tests, secrets are injected via Doppler and never committed,
TypeScript is strict with zero errors.

---

## Gate check (from `frame`)

Before proceeding, verify frame is done. Ask or check `.p4s/status.json`:

- [ ] Graduated auth is working (at least OAuth level operational)
- [ ] At least one Worker deployed (`wrangler deploy` has run successfully)
- [ ] API routes defined

If frame is incomplete:

> *"Wire runs through the frame. Set the structural layer before wiring —
> the CI pipeline needs to know what it is deploying.
> Run `/webplatform4sync:frame` first."*

---

## Subcommands

If the user provides a subcommand, route directly.
If no subcommand, present this menu.

| Subcommand | What it does |
|-----------|-------------|
| `ci` | GitHub Actions workflow — test, build, and deploy on every push |
| `deploy` | Multi-stage deployment pipeline with approval gates and GitOps patterns |
| `secrets` | Secrets management — Doppler injection, rotation strategy, CI integration |
| `ts` | TypeScript type system hardening — generics, conditional types, strict mode |
| `test` | Test infrastructure setup — Vitest, Testing Library, TDD/BDD patterns |

**Recommended order**: `ci` → `secrets` → `ts` → `test`. Add `deploy` for production gating.

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `ci` | Invoke `cicd-automation:github-actions-templates` skill |
| `deploy` | Invoke `cicd-automation:deployment-pipeline-design` skill |
| `secrets` | Invoke `cicd-automation:secrets-management` skill |
| `ts` | Invoke `javascript-typescript:typescript-advanced-types` skill |
| `test` | Invoke `javascript-typescript:javascript-testing-patterns` skill |

---

## Key decisions at this stage

**Doppler environment structure**
> *"Doppler environments: `dev`, `staging`, `prod` — or per-branch previews?
> Set this now. The CI workflow will inject secrets by environment name.
> Renaming environments after wiring means touching every pipeline."*

**Deploy gating model**
> *"Gate on: tests green + type check clean + no secrets in diff?
> Or add manual approval for production? Wire the gate you actually want —
> removing gates later is easier than adding them after an incident."*

**TypeScript strictness level**
> *"Full `strict: true` (recommended) or staged strictness?
> The finish stage assumes types are reliable — a11y tooling and token
> validation both depend on it. Wire strict now."*

---

## Inspection checklist

Wire inspection is mandatory before finish. Run through this explicitly:

```
Wire Inspection — <project-name>
═══════════════════════════════════

  CI pipeline     [ ] GitHub Actions workflow present
                  [ ] Runs on push to main and PRs
                  [ ] Tests, type check, and lint all pass

  Deployment      [ ] Wrangler deploy wired into CI
                  [ ] Production deploy requires manual approval gate
                  [ ] Preview deploys on PR branches

  Secrets         [ ] Doppler connected to CI (GitHub Actions secret: DOPPLER_TOKEN)
                  [ ] No raw secrets in wrangler.jsonc or source files
                  [ ] .gitignore covers .env and .dev.vars

  TypeScript      [ ] tsconfig.json has "strict": true
                  [ ] tsc --noEmit passes with zero errors
                  [ ] Path aliases working

  Tests           [ ] vitest.config.ts present
                  [ ] At least one test file running in CI
```

If any item fails:

> *"Wire has a break at [item]. Fix it before finishing — broken wire behind
> finished walls is the most expensive repair."*

---

## Gate check (before `finish`)

Before recommending `finish`, all inspection items must pass.

---

## Completion message

When wire inspection passes:

> *"Wire is live. CI green. Secrets clean. Types strict.*
> *The inspection is done — this building is ready to finish.*
> *Next: `/webplatform4sync:finish` — design, accessibility, observability, and ship."*

Update `.p4s/status.json` step `deploy` to `completed` if the file exists.
