# Shu-Ha-Ri Frame — Onboard Wizard

> Run this when the Shu-Ha-Ri frame is first activated (bare `/webplatform4sync:shu`,
> `/webplatform4sync:ha`, or `/webplatform4sync:ri` with no prior `.claude/frame`
> file in the project).

---

## What this frame is

You are activating the **Shu-Ha-Ri frame** for Platform4Sync.

This frame maps your work to three stages of mastery. Unlike a sequential
checklist, stages apply per concern — you might be in Shu on auth and Ha on
design at the same time. That is not a contradiction; it is the point.

```
Shu  →  Follow the pattern. Understand why it is the way it is.
Ha   →  Break the pattern intentionally. Build what is specific to you.
Ri   →  Transcend. Operate the whole. Observe, compose, publish.
```

---

## Step 1 — Identify the project

Ask:

> **Which project are we working in?**
> - Current directory (default)
> - A specific path
> - New project (no directory yet)

If the path does not exist, offer to run `shu:scaffold` immediately — that is
the first Shu act for any new project.

---

## Step 2 — Assess mastery per concern

Do not scan for binary completion. Assess the developer's *relationship* to
each concern by checking these signals:

| Concern | Shu signal | Ha signal | Ri signal |
|---------|-----------|----------|----------|
| Infrastructure | `.envrc` present, `init-stack` complete | Custom envrc, non-standard services added | Automated, reproducible, documented |
| Platform | Greenfield scaffold in place | Custom tenant hierarchy, non-standard T1/T2 config | Tenant onboarding automated, operational |
| Auth | Standard graduated auth scaffold installed | Custom graduation levels, bespoke OAuth flow | Auth operating in production, no manual intervention |
| Design | Token scaffold present, no identity chosen | Cultural identity chosen and documented | Identity published as package, propagates automatically |
| Delivery | No CI | CI exists, custom pipeline | Deploys automatically, gated, production-proven |
| Observability | No dashboards | Custom dashboards and alerts | SLOs defined, error budgets tracked, team responds to alerts |

Ask one question if signals are ambiguous:

> *"For [concern] — are you following the standard scaffold, building something
> specific to your needs, or operating it in production?"*

---

## Step 3 — Write the frame file

Create `.claude/frame` in the project root:

```
shuhari
```

Create `.claude/` directory if it does not exist.

---

## Step 4 — Present the mastery map

Show where each concern currently sits:

```
Shu-Ha-Ri Assessment — <project-name>
═══════════════════════════════════════════

  Concern          Stage   Notes
  ─────────────────────────────────────────
  Infrastructure   [stage] [one-line finding]
  Platform         [stage] [one-line finding]
  Auth             [stage] [one-line finding]
  Design           [stage] [one-line finding]
  Delivery         [stage] [one-line finding]
  Observability    [stage] [one-line finding]
```

Use `—` for concerns that have not been started. Do not use `pending` —
unstarted concerns are simply not yet begun, not blocked.

---

## Step 5 — Recommend the highest-value next move

Look across all concerns and identify the one where progress would have the
most leverage. Recommend exactly one command.

Prioritization heuristics:
- A concern stuck in Shu that is blocking Ha elsewhere → move it to Ha
- A concern in Ha that is nearly stable → move it toward Ri
- An unstarted Ri concern where the Ha layer is solid → begin Ri now, before an incident forces it
- Design in Shu with no identity chosen → `ha:theme` (the design identity question compounds over time)

End with:

> *"The frame is set. Your mastery map is above.*
> *Run the recommended command when ready — or tell me which concern you want
> to move forward on and I will tell you which stage to invoke."*
