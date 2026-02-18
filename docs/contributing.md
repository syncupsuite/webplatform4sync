# Contributing

How to add skills, templates, and foundations to the marketplace.

---

## Adding a New Skill

Skills are abstract, reusable patterns. They live in `skills/`.

### Structure

```
skills/{skill-name}/
├── skill.md          # Entry point — Claude Code reads this
├── templates/        # Concrete code templates
└── references/       # Supporting documentation
```

### Requirements

1. `skill.md` must include:
   - When to use the skill
   - Non-negotiable rules
   - Workflow steps
   - Integration points with other skills

2. Templates must be:
   - Concrete and runnable (not pseudocode)
   - Parameterized with `{{PLACEHOLDER}}` for project-specific values
   - Tested against at least one real project

3. References should:
   - Document decisions and trade-offs
   - Include comparison tables where multiple approaches exist
   - Link to external documentation sparingly

---

## Adding a Cultural Foundation

Cultural foundations live in the theme registry (`skills/theme-inspired-tokens/references/theme-registry.md`).

### Requirements

Every foundation needs:
- **5-7 seed colors** with traceable cultural origin
- **Story**: 1-2 sentences explaining the cultural source
- **Philosophy**: Design principle derived from the culture
- **Era**: Traditional, Modernist, or Contemporary
- **Metadata**: Inspiration sources, movements, notable designers

"This blue comes from traditional indigo dyeing" is good.
"This is a nice blue" is insufficient.

---

## Adding a Scaffold Template

Scaffold templates are concrete project starters. They live in `scaffold/`.

### Types

| Type | Purpose | What It Contains |
|------|---------|-----------------|
| greenfield | New project from scratch | Full file tree |
| brownfield | Migrate existing project | Migration scripts + checklists |
| overlay | Add token system only | Token files + integration guide |

### Requirements

1. Must produce output that aligns with the architecture standard
2. Must include the 3-tier tenant model (even if dormant)
3. Must use dependencies from `shared/conventions/stack.md`
4. Must be tested by scaffolding a real project

---

## Updating Stack Versions

When a dependency version changes:

1. Update `shared/conventions/stack.md`
2. Update `scaffold/greenfield/base/package.json`
3. Check all skills for version-specific references
4. Test against an existing project (BrandSyncUp or LegalSyncUp)
5. Document migration path if breaking changes exist

---

## Validation

Before merging changes:

- [ ] Skill follows the standard structure
- [ ] Templates are parameterized, not hardcoded to one project
- [ ] No secrets or credentials anywhere in the repo
- [ ] Cross-references between skills are valid
- [ ] Tested against at least one real SyncUpSuite project

---

## Sync with hn-platform4sync

`webplatform4sync` is the public mirror of `syncupsuite/hn-platform4sync` (private). The two repos are kept in sync with the following intentional divergences:

| Path | Present in | Reason |
|------|-----------|--------|
| `docs/for-syncup.md` | hn only | Internal usage guidance, not public |
| `.github/release-strategy.md` | hn only | Internal release process |
| `scripts/prepare-public-release.sh` | hn only | Scrub script for public release |
| `scaffold/greenfield/options/` | hn only | Internal scaffold variants |
| `scaffold/greenfield/base/src/components/` | hn only | Internal component library |
| `README.md` | different | Public-facing description vs internal |
| `CLAUDE.md` | different | Repo-specific context |
| `.github/repository-metadata.yml` | different | Public vs private visibility metadata |
| `shared/conventions/naming.md` | different | Internal prefixes (`hn-`, `su-`) and real project names omitted from public |
| `scaffold/greenfield/scaffold.md` | different | Real account IDs replaced with placeholders in public |
| `skills/neon-multi-tenant/**` | different | Real Neon project/branch IDs replaced with placeholders in public |

All `skills/` files (skill.md, templates, references) are identical between the two repos except where real credentials/IDs have been replaced with `your-*` placeholders in the public version.

**Sync audit** (last run: 2026-02-18): No unintentional divergence found. All differences are accounted for above.
