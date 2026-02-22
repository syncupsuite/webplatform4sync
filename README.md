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

## License

MIT
