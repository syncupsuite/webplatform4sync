# Platform4Sync

Production multi-tenant infrastructure for Claude Code. Greenfield or brownfield.

```json
{
  "permissions": {
    "allow": ["WebFetch"],
    "deny": []
  },
  "mcpServers": {},
  "customInstructions": "",
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

- **12 cultural identities** — Swiss International, Nihon Traditional, Nordic Modern, Tang Imperial, Shuimo Modern, Nihon Minimal, Renaissance, Art Deco, Wiener Werkstaette, Milanese Design, De Stijl, Swiss Modernist
- **Multi-tenant isolation** — 3-tier architecture (Platform / Partner / Customer) with RLS, Neon PostgreSQL, and Drizzle ORM
- **Graduated auth** — Anonymous to Preview to OAuth to Full Account, with Better Auth sessions and Firebase identity

[Documentation](https://docs.syncupsuite.com)

Not a template. The same patterns shipping in brandsyncup.com and legalsyncup.com.

## License

MIT
