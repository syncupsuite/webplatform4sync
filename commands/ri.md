# ri — Transcend

> Shu-Ha-Ri frame · Stage: Transcend
> You are no longer thinking about individual components.
> You operate the whole.

Load `frames/shuhari/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

Ri is the third stage of mastery: transcend the pattern.

At Ri, the developer no longer thinks in terms of components — auth, tokens,
workers, CI. They think in terms of the system. The system deploys itself.
The system observes itself. The system can be handed to the next developer
and they will understand it.

Ri is not a reward you reach after completing Shu and Ha everywhere. It is a
state you enter for each concern as it matures. A team can be in Ri on delivery
(the pipeline runs itself) while still in Ha on design (the identity is being
refined). Ri on one concern does not wait for Ri on all concerns.

**Ri is complete for a concern when**: it is operating without manual intervention,
it has observable behavior the team can act on, and it is durable — it will
survive beyond the current developer and the current conversation.

---

## Subcommands

If the user provides a subcommand, route directly.
If no subcommand, present this menu grouped by concern.

### Delivery

| Subcommand | What it does |
|-----------|-------------|
| `flow` | GitHub Actions pipeline — test, build, deploy as one continuous motion |
| `ship` | Multi-stage deployment with approval gates and GitOps — the system deploys itself |
| `secrets` | Secrets management — Doppler injection, rotation strategy, CI integration |

### Observability

| Subcommand | What it does |
|-----------|-------------|
| `watch` | Production Grafana dashboards — the system sees itself |
| `metrics` | Prometheus metric collection, storage, and alerting setup |
| `slo` | SLIs, SLOs, and error budgets — reliability as a first-class property |
| `trace` | Distributed tracing — understand the system as requests move through it |
| `perf` | Core Web Vitals audit — the system performs for the people using it |

### Accessibility

| Subcommand | What it does |
|-----------|-------------|
| `a11y` | WCAG 2.2 audit with automated testing and remediation — the system is accessible to everyone |
| `sr` | Screen reader testing — VoiceOver, NVDA, JAWS |

### Publication

| Subcommand | What it does |
|-----------|-------------|
| `publish` | Publish packages to npm in correct order — the work outlives this context |

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `flow` | Invoke `cicd-automation:github-actions-templates` skill |
| `ship` | Invoke `cicd-automation:deployment-pipeline-design` skill |
| `secrets` | Invoke `cicd-automation:secrets-management` skill |
| `watch` | Invoke `observability-monitoring:grafana-dashboards` skill |
| `metrics` | Invoke `observability-monitoring:prometheus-configuration` skill |
| `slo` | Invoke `observability-monitoring:slo-implementation` skill |
| `trace` | Invoke `observability-monitoring:distributed-tracing` skill |
| `perf` | Invoke `cloudflare:web-perf` skill |
| `a11y` | Invoke `accessibility-compliance:wcag-audit-patterns` skill |
| `sr` | Invoke `accessibility-compliance:screen-reader-testing` skill |
| `publish` | Read and follow `@syncupsuite/publish` skill |

---

## How to run a Ri command

At Ri, shift the framing from "you built X" to "the system does X."

Before the skill runs, surface what the system will now do autonomously:

> *"At Ri on [concern], [what used to require manual intervention] runs without
> you. What does that free you to focus on?"*

**Key Ri framings by concern:**

`ri:flow` and `ri:ship`
> *"The pipeline is the system's metabolism — it runs continuously whether
> anyone is watching or not. The question is not 'does CI work' but
> 'does the system deploy itself safely when no one is present?' Set the
> gates for the system, not for this session."*

`ri:slo`
> *"SLOs are a commitment the system makes to its users. Setting them before
> an incident means setting them while you know what 'normal' looks like.
> Auth latency, Neon query p99, Worker cold start — three SLOs at minimum.
> What would wake you up at 3am if it breached?"*

`ri:watch`
> *"Dashboards are the system's self-portrait. A dashboard that no one looks
> at is not observability — it is decoration. Design for the moment of an
> incident: what do you need to see in the first 60 seconds?"*

`ri:a11y`
> *"Accessibility at Ri is not a scan — it is the system's ongoing commitment
> to every user. WCAG is the floor. The question is what process keeps it
> there after this audit, as the system changes."*

`ri:publish`
> *"Publishing is Ri in its most literal form — the work leaves the context
> that created it and becomes available to systems and developers that do not
> know you. Publish order: tokens → foundations → transformers → themes.
> Version, changelog, and CHANGELOG.md are the handover note."*

---

## The Ri quality test

Before completing a Ri session, apply this test:

> *"Could someone who did not build this system understand what it is doing,
> respond to an alert it fires, and deploy a change to it — without asking you?"*

If yes: the concern is in Ri.
If no: identify what is missing and make it explicit:

> *"The system is not yet legible without you. The gap is [specific thing].
> Fix that, and Ri is complete for this concern."*

---

## Completion message

When a Ri command completes and the Ri quality test passes:

> *"[Concern] is in Ri.*
> *The system operates this concern. It sees itself. It deploys itself.*
> *It can be handed to the next developer.*
> *The pattern has been followed, broken, and transcended."*

If `ri:publish` completes:

> *"Published. The work now exists beyond this conversation.*
> *That is Ri in its final form."*
