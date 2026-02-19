# frame — Structural Framing

> Construction frame · Stage 3 of 5
> Previous: `pour` | Next: `wire`

Load `frames/construction/frame.md` before proceeding. All voice and sequencing
rules in that file apply to this session.

---

## What this stage is

The skeleton defines the shape of everything that follows.

Auth determines who can enter the building. The API defines every room. Edge
infrastructure sets where the building sits on the network. Frame decisions
have immediate downstream consequences for how wire runs — the CI pipeline,
secrets injection, and type safety all assume the frame is square before they start.

**Frame is complete when**: auth is graduated and working, at least one Cloudflare
Worker is deployed, API routes are defined, and the overall shape of the system is clear.

---

## Gate check (from `pour`)

Before proceeding, verify pour is done. Ask or check `.p4s/status.json`:

- [ ] `tenant_id` in every application table
- [ ] RLS enabled and policies written
- [ ] Drizzle schema committed, initial migration run

If pour is incomplete:

> *"Auth frames the door, but the foundation needs to be poured first —
> `tenant_id` in the schema determines what auth can gate.
> Run `/webplatform4sync:pour` before framing."*

---

## Subcommands

If the user provides a subcommand, route directly.
If no subcommand, present this menu.

| Subcommand | What it does |
|-----------|-------------|
| `auth` | Graduated auth — Anonymous → OAuth → Full Account with Better Auth + Firebase |
| `worker` | Cloudflare Workers — author and review against production best practices |
| `agent` | Stateful AI agent on Cloudflare with Agents SDK (state, WebSockets, tool calling) |
| `mcp` | Remote MCP server with OAuth on Cloudflare Workers |
| `do` | Durable Objects — stateful coordination (chat rooms, booking, SQLite, alarms) |
| `api` | Production-ready API scaffolding with async patterns and dependency injection |

**Recommended order**: `auth` → `worker`. Add `agent`, `mcp`, `do`, or `api` as needed.

---

## Routing

| Subcommand | Skill to load |
|-----------|--------------|
| `auth` | Read and follow `skills/graduated-auth/skill.md` |
| `worker` | Invoke `cloudflare:workers-best-practices` skill |
| `agent` | Invoke `cloudflare:building-ai-agent-on-cloudflare` skill |
| `mcp` | Invoke `cloudflare:building-mcp-server-on-cloudflare` skill |
| `do` | Invoke `cloudflare:durable-objects` skill |
| `api` | Invoke `api-scaffolding:fastapi-templates` skill |

---

## Key decisions at this stage

**Auth graduation levels needed**
> *"Anonymous → Preview → OAuth → Full Account — which levels does your product require?
> The auth frame is cheapest to get right now. Bolting on new levels later means
> rewriting the session middleware."*

**Worker routing model**
> *"Single Worker handling all routes, or Workers-for-each-domain?
> The frame you set here determines how `wire:ci` deploys — one pipeline or many."*

**Edge vs. origin split**
> *"What lives on the Worker (auth middleware, API routing, static assets) and
> what hits Neon directly via Hyperdrive? Frame this boundary before wiring."*

---

## Gate check (before `wire`)

Before recommending `wire`, confirm:

- [ ] Graduated auth configured (Better Auth session setup + Firebase for identity)
- [ ] At least one `wrangler.jsonc` present and `wrangler deploy` succeeds
- [ ] API routes defined (even if handlers are stubs)
- [ ] Tenant context middleware in place on the Worker
- [ ] Auth subdomain configured (`auth.domain.tld` via Firebase Hosting)

If any are missing:

> *"The frame is not yet square — [missing item] needs to be set before
> wire can run cleanly. Fix the frame first."*

---

## Completion message

When frame is confirmed complete:

> *"Frame is up. Graduated auth handles Anonymous → OAuth → Full.
> Workers are deployed. The shape is clear.*
> *Next: `/webplatform4sync:wire` — CI/CD, secrets, and integrations."*

Update `.p4s/status.json` step `auth` to `completed` if the file exists.
