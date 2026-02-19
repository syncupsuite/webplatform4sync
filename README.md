# Platform4Sync

Platform standards, skills, and scaffold templates for building multi-tenant SaaS on Cloudflare Workers + Neon PostgreSQL.

**Same tools. Different approaches.** Choose a command frame that matches how your team thinks about building software.

---

## Install

Add to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "webplatform4sync": {
      "source": {
        "source": "github",
        "repo": "syncupsuite/webplatform4sync"
      }
    }
  }
}
```

---

## Pick a Frame

The first decision is which frame you want. Both give you access to the same skills — the frame changes the command names, the stage groupings, and how Claude communicates with you.

### Construction — `site → pour → frame → wire → finish`

Physical build sequence. Hard dependencies. Everyone knows what comes first.

```bash
/webplatform4sync:site      # Clear the ground. Init stack, envrc, scaffold.
/webplatform4sync:pour      # Pour the foundation. Platform, database, tenancy.
/webplatform4sync:frame     # Raise the skeleton. Auth, workers, API.
/webplatform4sync:wire      # Run the wire. CI/CD, secrets, types, tests.
/webplatform4sync:finish    # Apply the finish. Design, a11y, observability, ship.
```

Best for teams who think in **sequential milestones** and want explicit gates between stages.

### Shu-Ha-Ri — `shu → ha → ri`

Mastery progression per concern. Stages apply independently — a project can be in Shu on auth and Ri on delivery at the same time.

```bash
/webplatform4sync:shu       # Follow the pattern. Setup, scaffold, conventions.
/webplatform4sync:ha        # Break the pattern. Platform, auth, design, edge — your way.
/webplatform4sync:ri        # Transcend. Operate, observe, publish. The system runs itself.
```

Best for teams who think in **craft and mastery**, or projects with uneven maturity across concerns.

### Activating a frame

Run the bare stage command — the onboard wizard starts automatically:

```bash
/webplatform4sync:site      # → activates Construction, runs discovery wizard
/webplatform4sync:shu       # → activates Shu-Ha-Ri, runs mastery assessment
```

Your choice is saved to `.claude/frame` in the project root.

---

## Command Reference

### Construction

| Command | Subcommands | What it covers |
|---------|------------|----------------|
| `site` | `init` `envrc` `tune` `clear` `scaffold` | Project setup, environment, repo hygiene |
| `pour` | `platform` `neon` `arch` | Multi-tenant architecture, database, RLS |
| `frame` | `auth` `worker` `agent` `mcp` `do` `api` | Auth, Cloudflare Workers, API layer |
| `wire` | `ci` `deploy` `secrets` `ts` `test` | CI/CD, secrets management, type safety |
| `finish` | `tokens` `theme` `ui` `a11y` `sr` `watch` `metrics` `slo` `trace` `perf` `ship` | Design, accessibility, observability, deploy |

### Shu-Ha-Ri

| Command | Subcommands | What it covers |
|---------|------------|----------------|
| `shu` | `init` `envrc` `tune` `clean` `scaffold` | Standard patterns, project setup |
| `ha` | `platform` `neon` `auth` `worker` `agent` `mcp` `do` `api` `tokens` `theme` | Build your own system on the foundation |
| `ri` | `flow` `ship` `secrets` `watch` `metrics` `slo` `trace` `perf` `a11y` `sr` `publish` | Operate, observe, publish at scale |

---

## Skills

The underlying skills both frames route to:

| Skill | Purpose |
|-------|---------|
| `skills/multi-tenant-platform/` | 3-tier tenant architecture (Platform / Partner / Customer) |
| `skills/graduated-auth/` | Anonymous → Preview → OAuth → Full Account |
| `skills/neon-multi-tenant/` | Neon branches, Hyperdrive, Drizzle ORM, RLS |
| `skills/theme-inspired-tokens/` | Culturally-grounded design tokens (W3C DTCG) |

## Scaffolds

| Template | When to use |
|----------|-------------|
| `scaffold/greenfield/` | New project from scratch |
| `scaffold/brownfield/` | Migrating existing project to standards |
| `scaffold/overlay/` | Adding design token system only |

---

## npm Packages

Pre-built implementations, ready to install:

### @syncupsuite/themes

10 curated design identities grounded in cultural and aesthetic traditions. Each theme is a complete token system: colors with provenance, typography, spacing, and dark mode.

```bash
npm install @syncupsuite/themes
```

| Theme | Identity |
|-------|----------|
| `swiss-international` | Swiss International Style — grid discipline, Neue Haas Grotesk, precise neutrals |
| `nihon-traditional` | Nihon Traditional — 465 Edo-period colors, wabi-sabi philosophy, warm indigo anchors |

More identities in progress. Roadmap targets 10 curated themes.

```css
/* Pick one — they are not combined */
@import '@syncupsuite/themes/swiss-international/tailwind.css';
```

```typescript
import { swissInternational } from '@syncupsuite/themes';
import { buildTokens } from '@syncupsuite/transformers';

const css = buildTokens(swissInternational, { output: 'tailwind-v4' });
```

| Package | Purpose |
|---------|---------|
| `@syncupsuite/tokens` | Raw DTCG-aligned token primitives |
| `@syncupsuite/foundations` | Semantic token layer (light + dark) |
| `@syncupsuite/transformers` | Format converters (Tailwind v4/v3, DTCG JSON) |
| `@syncupsuite/themes` | Bundled themes (tokens + foundations + CSS) |

Need a custom theme? Use `/webplatform4sync:finish theme` (Construction) or `/webplatform4sync:ha theme` (Shu-Ha-Ri) to build your own from any cultural tradition.

---

## Documentation

- [What is Platform4Sync?](docs/what-is-platform4sync.md)
- [Architecture Rationale](docs/rationale.md)
- [Command Frame Spec](https://github.com/syncupsuite/su-prd-mgmt/blob/main/docs/COMMAND-FRAME-SPEC.md) — full spec in su-prd-mgmt
- [Contributing](docs/contributing.md)

---

## License

MIT
