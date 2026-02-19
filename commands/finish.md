# finish — Interior Finish

> Construction frame · Stage 5 of 5
> Previous: `wire` | Next: ship it.

Load `frames/construction/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

The building is structurally complete. Now it becomes livable.

Finish is where craft is visible. The token system traces every color to its
cultural source. Accessibility is the occupancy permit — the building is not
finished until people of all abilities can use it. Observability means the
building can see itself. And ship is the moment the doors open.

**Finish is complete when**: a design identity is live, WCAG 2.2 passes, the
system observes itself with dashboards and SLOs, and the product has shipped
to production.

---

## Gate check (from `wire`)

Before proceeding, verify wire is done. Ask or check `.p4s/status.json`:

- [ ] CI green on main
- [ ] Secrets injected via Doppler (nothing hardcoded)
- [ ] `tsc --noEmit` passes with zero errors

If wire is incomplete:

> *"Don't finish before the wire is inspected. Broken CI behind finished
> walls is expensive. Run `/webplatform4sync:wire` first."*

---

## Subcommands

If the user provides a subcommand, route directly.
If no subcommand, present this menu grouped by concern.

### Design

| Subcommand | What it does |
|-----------|-------------|
| `tokens` | Culturally-grounded design token system — DTCG JSON + Tailwind 4 output + React artifact |
| `theme` | Full theme: token system + identity picker (10 curated designs) + live preview |
| `ui` | Web components and pages requiring distinctive visual design |

### Accessibility

| Subcommand | What it does |
|-----------|-------------|
| `a11y` | WCAG 2.2 audit with automated testing, manual verification, and remediation guidance |
| `sr` | Screen reader testing — VoiceOver, NVDA, JAWS compatibility validation |

### Observability

| Subcommand | What it does |
|-----------|-------------|
| `watch` | Production Grafana dashboards for real-time metrics visualization |
| `metrics` | Prometheus metric collection, storage, and alerting setup |
| `slo` | SLIs, SLOs, and error budgets — reliability targets and alerting |
| `trace` | Distributed tracing with Jaeger / Tempo for request flow analysis |
| `perf` | Core Web Vitals audit via Chrome DevTools — FCP, LCP, CLS, TBT |

### Ship

| Subcommand | What it does |
|-----------|-------------|
| `ship` | Final deploy — production gate, release checklist, npm publish if applicable |

**Recommended order**: `tokens` → `a11y` → `watch` → `slo` → `ship`

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `tokens` | Read and follow `skills/theme-inspired-tokens/skill.md` |
| `theme` | Read and follow `skills/theme-inspired-tokens/skill.md` (full identity mode) |
| `ui` | Invoke `frontend-design:frontend-design` skill |
| `a11y` | Invoke `accessibility-compliance:wcag-audit-patterns` skill |
| `sr` | Invoke `accessibility-compliance:screen-reader-testing` skill |
| `watch` | Invoke `observability-monitoring:grafana-dashboards` skill |
| `metrics` | Invoke `observability-monitoring:prometheus-configuration` skill |
| `slo` | Invoke `observability-monitoring:slo-implementation` skill |
| `trace` | Invoke `observability-monitoring:distributed-tracing` skill |
| `perf` | Invoke `cloudflare:web-perf` skill |
| `ship` | Invoke `cicd-automation:deployment-pipeline-design` skill (production mode) |

---

## Key decisions at this stage

**Design identity selection**
> *"Ten curated identities are available — Swiss International, Nihon Traditional,
> Nordic Modern, and seven others. Admin picks one; it propagates to all tenant
> instances. This is the Mac wallpaper model: you commit to an identity, not
> to arbitrary tokens. Run `finish:theme` to preview before committing."*

**Accessibility scope**
> *"WCAG 2.2 Level AA is the minimum. Level AAA for public-facing forms.
> Run `a11y` before `ship` — accessibility issues found in production
> cost 10x what they cost in finish."*

**SLO targets**
> *"Set SLO budgets before ship, not after the first incident.
> Auth latency, Neon query p99, Worker cold start — three SLOs at minimum.
> Run `slo` while you still know what 'normal' looks like."*

---

## Occupancy checklist

Before `ship`, run through this explicitly:

```
Finish Inspection — <project-name>
════════════════════════════════════

  Design          [ ] Design identity selected and live in all environments
                  [ ] Token system generates correct CSS for chosen theme
                  [ ] No hardcoded hex values in components

  Accessibility   [ ] WCAG 2.2 Level AA passes (automated)
                  [ ] Keyboard navigation works end-to-end
                  [ ] Screen reader tested on at least one AT (VoiceOver / NVDA)
                  [ ] Focus indicators visible, color contrast ≥ 4.5:1

  Observability   [ ] Grafana dashboard live for at least: request rate, error rate, latency
                  [ ] SLO targets defined with error budgets
                  [ ] Alerting fires on SLO breach

  Pre-ship        [ ] Legal docs in place (Privacy Policy, Terms, DPA if applicable)
                  [ ] No console.log or debug output in production bundle
                  [ ] Environment variables verified in production Doppler config
                  [ ] Rollback plan documented
```

If any item fails:

> *"The building is not ready to open. [Item] is the outstanding punch list item.
> Fix it, then ship."*

---

## Completion message

When the occupancy checklist passes and `ship` is run:

> *"The building is open.*
> *Design is live. Accessibility certified. The system sees itself.*
> *Ship it."*

Update `.p4s/status.json` steps `tokens` and `validate` to `completed` if the file exists.
