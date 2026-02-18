# Platform4Sync

Platform standards, skills, and scaffold templates for building multi-tenant SaaS applications on Cloudflare Workers + Neon PostgreSQL.

## Install as Claude Code Marketplace

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

## What's Inside

- **Skills** — Claude Code skills for multi-tenant architecture, graduated auth, Neon isolation, and design tokens
- **Scaffolds** — Project templates for greenfield, brownfield, and overlay adoption
- **Contracts** — Shared type definitions ensuring cross-skill compatibility
- **Validators** — Token and tenant configuration validators

## Documentation

- [What is Platform4Sync?](docs/what-is-platform4sync.md) — Overview and technical architecture
- [Architecture Rationale](docs/rationale.md) — Design decisions and review history
- [Contributing](docs/contributing.md) — How to add skills and templates

## Skills

Each skill has a `skill.md` entry point. Point Claude Code at the skill directory and describe your task:

| Skill | Purpose |
|-------|---------|
| `skills/multi-tenant-platform/` | 3-tier tenant architecture (Platform/Partner/Customer) |
| `skills/graduated-auth/` | Anonymous → Preview → OAuth → Full Account |
| `skills/neon-multi-tenant/` | Neon branches, Hyperdrive, Drizzle ORM |
| `skills/theme-inspired-tokens/` | Culturally-grounded design tokens (W3C DTCG) |

## Scaffolds

| Template | When to Use |
|----------|-------------|
| `scaffold/greenfield/` | New project from scratch |
| `scaffold/brownfield/` | Migrating existing project to standards |
| `scaffold/overlay/` | Adding design token system only |

## npm Packages

Pre-built implementations of Platform4Sync patterns, ready to install:

### @syncupsuite/themes

10 curated design identities grounded in cultural and aesthetic traditions. Each theme is a complete token system: colors with provenance, typography, spacing, and dark mode -- all generated using the `theme-inspired-tokens` skill pattern.

```bash
npm install @syncupsuite/themes
```

**Available themes**:

| Theme | Identity | Tailwind CSS |
|-------|----------|-------------|
| `swiss-international` | Swiss International Style -- grid discipline, Neue Haas Grotesk, precise neutrals | `@syncupsuite/themes/swiss-international/tailwind.css` |
| `nihon-traditional` | Nihon Traditional -- 465 Edo-period colors, wabi-sabi philosophy, warm indigo anchors | `@syncupsuite/themes/nihon-traditional/tailwind.css` |

More identities in progress. The roadmap targets 10 curated themes.

**CSS usage**:

```css
/* Pick one theme -- they are not combined */
@import '@syncupsuite/themes/swiss-international/tailwind.css';
/* or */
@import '@syncupsuite/themes/nihon-traditional/tailwind.css';
```

**TypeScript usage**:

```typescript
import { swissInternational } from '@syncupsuite/themes';
import { buildTokens } from '@syncupsuite/transformers';

// Access the token object directly
const tokens = swissInternational;

// Or transform to your preferred format
const css = buildTokens(swissInternational, { output: 'tailwind-v4' });
```

**Related packages** (published separately for tree-shaking):

| Package | Purpose |
|---------|---------|
| `@syncupsuite/tokens` | Raw DTCG-aligned token primitives |
| `@syncupsuite/foundations` | Semantic token layer (light + dark) |
| `@syncupsuite/transformers` | Format converters (Tailwind v4/v3, DTCG JSON) |
| `@syncupsuite/themes` | Bundled themes (tokens + foundations + CSS) |

**Need a custom theme?** Use the `skills/theme-inspired-tokens/` skill to build your own cultural token system from any tradition.

## License

MIT
