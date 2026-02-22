# What is Platform4Sync?

Platform4Sync is a skills marketplace for building production-grade, multi-tenant SaaS applications. It ships as a set of Claude Code skills, scaffold templates, and shared contracts that encode the full architecture of a modern edge-deployed platform — from database isolation to design tokens to graduated authentication.

Tell Claude Code what you're building. The skills handle the how.

---

## The Problem

Building a multi-tenant SaaS platform means solving the same hard problems every time:

- **Tenant isolation** that actually works under audit — not just `WHERE tenant_id = ?` sprinkled across queries, but PostgreSQL Row Level Security with defense-in-depth at every layer.

- **Authentication that grows with the product** — anonymous access for marketing pages, lightweight OAuth for personalization, full session management for paying customers. Most teams build one auth model and rebuild it twice.

- **Design systems that respect brand identity** — a white-label platform where every tenant gets their own look, but status colors and accessibility indicators remain untouchable.

- **Edge deployment from day one** — not as a performance optimization bolted on later, but as the primary architecture. Cloudflare Workers, connection pooling, sub-millisecond cache reads.

These problems are well-understood individually. The difficulty is making all the solutions work together without contradictions. Platform4Sync solves the integration problem.

---

## How It Works

### For New Projects

```
You: "I'm building a SaaS platform for managing brand assets"
Claude: Uses the greenfield scaffold to generate a complete project:
        - 3-tier tenant model (platform → partner → customer)
        - Neon PostgreSQL with branch-per-partner isolation
        - Better Auth with graduated access levels
        - Cloudflare Worker entry point with Hyperdrive pooling
        - Design token pipeline with DTCG-compliant output
        - RLS policies that enforce isolation at the database layer
```

The generated project compiles, deploys, and enforces tenant isolation from the first commit. Multi-tenancy is not a feature you add later — it is the foundation.

### For Existing Projects

```
You: "I need to add multi-tenant support to my existing app"
Claude: Uses the brownfield scaffold to generate:
        - Migration SQL that adds tenant_id to existing tables
        - RLS policies for your schema
        - Middleware that resolves tenant context per request
        - A checklist for incremental adoption
```

### For Design Systems Only

```
You: "I just need a token system with dark mode and brand theming"
Claude: Uses the overlay scaffold + theme-inspired-tokens skill:
        - Generates culturally-grounded design tokens
        - Produces Tailwind v4 CSS with @theme integration
        - Validates accessibility compliance
        - Outputs DTCG-standard token files
```

---

## What's in the Marketplace

### Skills

Skills are abstract, reusable architectural patterns. Each skill has a `skill.md` entry point that Claude Code reads, plus concrete templates and reference documentation.

| Skill | What It Solves |
|-------|---------------|
| **multi-tenant-platform** | 3-tier tenant hierarchy (T0/T1/T2), governance rules, RLS policies, closure-table relationships, tenant middleware, audit logging |
| **graduated-auth** | Authentication spectrum from anonymous to fully authenticated. Firebase identity + Better Auth sessions + RBAC. OAuth graduation without re-consent. |
| **neon-multi-tenant** | Neon PostgreSQL branch strategy, Hyperdrive connection pooling, Drizzle ORM tenant-scoped queries, migration coordination across branches |
| **theme-inspired-tokens** | Culturally-grounded design token generation. DTCG format. Protected accessibility tokens. Tailwind v3/v4 CSS output. Multi-tier token inheritance. |

Skills are standalone. Any skill can be used independently. When used together, they produce compatible artifacts because they conform to the same shared contracts.

### Scaffold Templates

| Template | Starting Point | What You Get |
|----------|---------------|-------------|
| **greenfield** | Empty directory | Complete project: Worker entry, Drizzle schema, RLS policies, auth middleware, token pipeline, package.json |
| **brownfield** | Existing project | Migration scripts, adoption checklists, incremental path to the standard |
| **overlay** | Any project | Design token pipeline only — no infrastructure changes |

### Shared Contracts

The glue that makes skills compatible without making them dependent.

Contracts define the vocabulary: what a tenant tier is (numeric `0 | 1 | 2`, not a string enum), what the RLS session variable is called (`app.tenant_id`, exactly), what Better Auth table names are (singular: `user`, `session`, `account`), what token paths are protected.

If two skills disagree on the RLS variable name, PostgreSQL silently returns zero rows. Contracts prevent that class of bug entirely.

---

## Technical Architecture

### Tenant Model

```
Tier 0 (Platform)   →  Owns infrastructure, global policies, design tokens
Tier 1 (Partner)    →  Branded instance, manages sub-tenants, owns domains
Tier 2 (Customer)   →  Consumes platform, inherits branding, scoped access
```

Every project has all three tiers from day one. For a single-tenant app, T0 and T1 are dormant: one row in the tenants table, one hardcoded `tenant_id`. The RLS policies are in place but pass-through. When the product grows to support partners or enterprise customers, the machinery activates without a rewrite.

**Isolation layers** (defense-in-depth):

| Layer | Mechanism | What It Prevents |
|-------|-----------|-----------------|
| Infrastructure | Neon branch per T1 partner | Cross-partner data access at the storage level |
| Database | RLS with `app.tenant_id` session variable | Cross-tenant queries within a branch |
| Application | Tenant resolved from authenticated session, never from headers | Client-side tenant spoofing |

### Auth Spectrum

```
ANONYMOUS  →  PREVIEW  →  OAUTH  →  FULL
(no identity)  (email only)  (Google/GitHub)  (Better Auth + RBAC)
```

Each level is a distinct security posture with its own session mechanism:

| Level | Session Store | Latency | Use Case |
|-------|--------------|---------|----------|
| ANONYMOUS | None | 0ms | Public pages |
| PREVIEW | Cloudflare KV | <1ms | Inquiry forms, trials |
| OAUTH | Cloudflare KV | <1ms | Personalized, lightweight |
| FULL | Neon PostgreSQL | 10-30ms | Billing, RBAC, tenant-scoped |

The same Google/GitHub OAuth `clientId` is used at both OAUTH and FULL levels. When a user graduates from OAUTH to FULL, there is no second consent screen. The identity is already verified — Better Auth links it to a full account with roles and tenant membership.

### Database Architecture

```
Neon Project
├── production (default branch)
│   └── neon_auth schema (Better Auth: user, session, account, verification, organization, member)
│
├── app-alpha-prod (T1 branch)
│   ├── app_alpha schema (domain data)
│   └── app-alpha-dev (development branch, resettable)
│
└── app-beta-prod (T1 branch)
    ├── app_beta schema (domain data)
    └── app-beta-dev (development branch, resettable)
```

- **Shared auth**: All apps authenticate against `neon_auth` on the production branch. A session created by logging into App Alpha is valid in App Beta (cross-app SSO).
- **Isolated data**: Each app's domain tables live on app-specific branches. Copy-on-write means branches share unchanged pages with the parent — cost-effective isolation.
- **Hyperdrive pooling**: Cloudflare Hyperdrive maintains persistent TCP connections to Neon, eliminating the 50-150ms connection setup cost on every Worker invocation.

### Design Token Pipeline

```
Platform Core Tokens (T0)      ← Protected: status colors, focus rings, accessibility
  └─ Brand Tokens (T1)         ← Brand identity: primary, accent, typography
     └─ Cultural Overlay        ← Optional: culturally-grounded color narratives
        └─ Tenant Overrides (T2) ← Permitted customizations only
           └─ User Preferences   ← Light/dark/high-contrast
```

Tokens follow the W3C Design Tokens Community Group (DTCG) specification. The pipeline produces CSS custom properties that integrate with Tailwind 4's `@theme` directive:

```css
@theme {
  --color-primary: var(--semantic-light-interactive-primary);
  --color-accent: var(--semantic-light-interactive-accent);
}
```

Protected tokens (status.error, status.success, focus.ring, accessibility.*) cannot be overridden by any tier. This is enforced by the token validator, not just by convention.

### Edge Deployment

```
Request → Cloudflare Worker → Tenant Resolution → Auth Middleware → Hyperdrive → Neon
                                    ↓                    ↓
                              KV (cache/sessions)    R2 (assets)
```

Workers are the deployment target, not an optimization layer. Every template and pattern in the marketplace is Workers-compatible: no filesystem access, no long-running processes, no Node.js-specific APIs.

---

## The Standard Stack

| Component | Technology | Why This One |
|-----------|-----------|-------------|
| React 19 | UI framework | Concurrent features, transitions, broad ecosystem |
| TypeScript 5.9 | Language | Strict mode across the full stack |
| Tailwind 4.1 | Styling | CSS-first config, native `@theme` for token integration |
| Vite 7 | Build | Fast dev server, `@cloudflare/vite-plugin` for Workers |
| Cloudflare Workers | Runtime | Edge deployment, KV/R2/Hyperdrive bindings |
| Neon PostgreSQL | Database | Serverless, branch-based isolation, Hyperdrive pooling |
| Drizzle ORM | ORM | Type-safe, lightweight, good Neon support |
| Better Auth | Sessions | Neon-native, RBAC, organization/tenant support |
| Firebase | Identity | Google Identity Platform, email delivery, Swiss residency |
| Style Dictionary | Tokens | W3C DTCG format, multi-platform output |

---

## Who Is This For

**Teams building multi-tenant SaaS products** who want tenant isolation, graduated auth, and design token inheritance without reinventing each pattern from scratch.

**Solo developers shipping a product** who want production-grade architecture from day one. The 3-tier model costs nothing when dormant but saves weeks when the product outgrows single-tenancy.

**Agencies building white-label platforms** where every customer gets their own brand, their own domain, their own data isolation — but the platform operator maintains control over accessibility standards and global policies.

**Enterprise teams adopting edge deployment** who need Cloudflare Workers patterns that handle connection pooling, session management, and tenant resolution at the edge.

---

## What Makes It Different

**It's skills, not a framework.** There is no `platform4sync` package to install and no runtime dependency to maintain. Skills are patterns that Claude Code applies to your project. The output is your code, in your repo, with no vendor lock-in.

**Standalone but aligned.** Each skill works independently. Use just the token skill if that's all you need. Use just the auth skill for graduated authentication. When you use multiple skills together, they produce compatible artifacts because they share a contract vocabulary — not because they share code.

**Security-hardened by review.** Every template has been through a multi-agent security audit covering OWASP top 10, RLS bypass vectors, CSRF validation, account takeover via email linking, and session management. The review findings and fixes are documented in `docs/rationale.md`.

**Culturally-grounded design.** The token system doesn't just generate colors — it traces every visual decision to a cultural or aesthetic narrative. "This blue is Hanada blue from Japanese indigo dyeing" has more staying power than "I liked this hex code."

**Swiss-capable from the start.** The architecture supports `europe-west6` data residency for Google Identity Platform without rework. Data sovereignty is a configuration choice, not an architectural change.
