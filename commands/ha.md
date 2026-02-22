# ha — Break

> Shu-Ha-Ri frame · Stage: Break
> You understand the pattern. Now build what is specific to you.

Load `frames/shuhari/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

Ha is the second stage of mastery: deviate from the pattern with intention.

The word "break" is not destruction — it is the moment a practitioner stops
following the form exactly and starts adapting it to their specific situation.
The pattern was learned in Shu. Ha is where that understanding becomes creative.

A Ha deviation is not a mistake or a shortcut. It is a deliberate architectural
decision made by someone who understands what they are departing from.
**Every Ha deviation should be documented.** An undocumented deviation looks
identical to an accidental one to the next developer.

**Ha is complete for a concern when**: the system reflects your specific
requirements, the deviation from the standard is intentional, and the reason
for that deviation is captured somewhere — an ADR, a comment, a CLAUDE.md note.

---

## Subcommands

If the user provides a subcommand, route directly.
If no subcommand, present this menu grouped by concern.

### Platform

| Subcommand | What it does |
|-----------|-------------|
| `platform` | 3-tier multi-tenant architecture — customize the hierarchy for your domain model |
| `neon` | Neon PostgreSQL — schema design, RLS policies, branch isolation, Drizzle ORM |

### Auth & Edge

| Subcommand | What it does |
|-----------|-------------|
| `auth` | Graduated auth — customize the graduation spectrum for your product's flow |
| `worker` | Cloudflare Workers — build and review against production standards |
| `agent` | Stateful AI agent on Cloudflare — state management, WebSockets, tool calling |
| `mcp` | Remote MCP server with OAuth on Cloudflare Workers |
| `do` | Durable Objects — stateful coordination, SQLite, alarms, WebSockets |
| `api` | Production API scaffolding — async patterns, dependency injection, error handling |

### Design

| Subcommand | What it does |
|-----------|-------------|
| `tokens` | Culturally-grounded design token system — every color, font, and spacing has a source |
| `theme` | Full theme: identity picker (12 curated identities) + live preview |

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `platform` | Read and follow `skills/multi-tenant-platform/skill.md` |
| `neon` | Read and follow `skills/neon-multi-tenant/skill.md` |
| `auth` | Read and follow `skills/graduated-auth/skill.md` |
| `worker` | Invoke `cloudflare:workers-best-practices` skill |
| `agent` | Invoke `cloudflare:building-ai-agent-on-cloudflare` skill |
| `mcp` | Invoke `cloudflare:building-mcp-server-on-cloudflare` skill |
| `do` | Invoke `cloudflare:durable-objects` skill |
| `api` | Invoke `api-scaffolding:fastapi-templates` skill |
| `tokens` | Read and follow `skills/theme-inspired-tokens/skill.md` |
| `theme` | Read and follow `skills/theme-inspired-tokens/skill.md` (full identity mode) |

---

## How to run a Ha command

At the start of every Ha session, name the pattern being broken:

> *"The standard [concern] scaffold does X. Where does your situation differ?"*

Surface the decision explicitly before the skill runs — do not let the deviation
happen implicitly inside a tool invocation.

**Key Ha questions by concern:**

`ha:platform`
> *"The standard model has T0 platform / T1 partner / T2 customer — three tiers,
> all active. Does your tenant hierarchy match this, or do you need T1 dormant?
> Do your T2 customers have sub-organizations? That is a T3 — the standard does
> not have one. Document the deviation before implementing."*

`ha:neon`
> *"Shared schema with RLS is the standard — every tenant's data in one schema,
> isolated by `tenant_id` and RLS policies. If you need schema-per-tenant or
> database-per-tenant, name the reason: regulatory, performance, or customer
> contract? The isolation mode you pick here shapes every query you write."*

`ha:auth`
> *"The graduation spectrum is Anonymous → Preview → OAuth → Full Account.
> Which transitions are relevant to your product? A B2B SaaS may skip Preview
> entirely. A marketplace needs all four. A developer tool might live at OAuth
> permanently. Name your spectrum before building the scaffold."*

`ha:tokens`
> *"Cultural tokens are the baseline — every identity in the system traces its
> colors, typography, and spacing to a documented cultural source. That is Shu.
> The Ha decision is which culture to adopt, and whether to deviate from one
> of the 12 pre-built identities. You are not choosing whether to use cultural
> theming. You are choosing which cultural foundation fits your product."*

`ha:theme`
> *"Twelve curated identities are available: Swiss International, Nihon
> Traditional, Nordic Modern, Tang Imperial, Shuimo Modern, Nihon Minimal,
> Renaissance, Art Deco, Wiener Werkstaette, Milanese Design, De Stijl,
> and Swiss Modernist. You pick one; it propagates everywhere.
> This is the Mac wallpaper model — not a color scheme, an identity. Swiss
> International carries precision and neutrality. Nihon Traditional carries
> restraint and depth. Which one fits the product's voice?"*

`ha:domain`
> *"Does each T1 partner resolve to one domain or many? Primary, alias, vanity —
> this is a Ha decision. The standard model assumes one canonical domain per
> partner. If your partners need vanity domains or locale-specific subdomains,
> name the routing model before implementing. Domain mapping shapes tenant
> resolution and SSL provisioning."*

---

## Document the deviation

After every Ha command, prompt documentation:

> *"This is a Ha decision — it differs from the standard scaffold in [specific way].
> Where should we capture the reason? Options:*
> - *ADR in `docs/decisions/` (recommended for architecture choices)*
> - *CLAUDE.md note in this repo*
> - *Inline comment at the decision point in code"*

Do not skip this step. An undocumented Ha deviation becomes technical debt.
A documented one becomes organizational knowledge.

---

## Readiness for Ri

After a concern stabilizes in Ha, note the opening toward Ri:

> *"[Concern] is in Ha and holding. The deviation is intentional and documented.
> When this concern is operating in production and you are thinking about
> the system as a whole rather than this component — that is when Ri begins.
> Run `/webplatform4sync:ri` when you are ready to transcend it."*

---

## Completion message

When a Ha command completes:

> *"[Concern] is in Ha.*
> *The pattern has been broken with intention. The deviation is yours.*
> *Document it — then build on it."*
