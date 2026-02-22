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
