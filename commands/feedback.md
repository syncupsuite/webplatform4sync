# feedback — Issue Reporting

> Standalone command · No frame dependency
> Read-only by default — writes a report file with user confirmation

---

## What this command does

Generates a structured report when a skill produces unexpected output. Use this
when tokens don't render correctly, CSS conflicts with existing styles, RLS
policies don't apply as expected, or any step doesn't work as documented.

---

## When to use

- Token colors differ from the swatch preview or cultural source
- Dark mode doesn't toggle or has missing semantic mappings
- CSS conflicts with existing styles after importing a theme
- RLS policies don't isolate tenant data as expected
- Auth graduation fails to promote a user to the next level
- Any skill instruction produces a different result than described

---

## What it captures

The feedback command generates a structured report based on the current session
context:

- **Skill used**: Which skill or command was active when the issue occurred
- **Step that failed**: The specific instruction that didn't produce the expected result
- **Error observed**: What happened vs. what was expected
- **Workaround applied**: How you resolved it (if you did)
- **Environment**: Package versions, OS, runtime, Tailwind version

---

## Output

The report is written to `.platform/feedback/YYYY-MM-DD-<slug>.md` in your
project directory. The slug is derived from the skill name and a short
description of the issue.

Example path: `.platform/feedback/2026-02-22-theme-tokens-dark-mode-missing.md`

---

## Optional: submit to the platform team

With user consent, the feedback command can open a GitHub issue on
`syncupsuite/webplatform4sync` containing the report. The user reviews the
full issue content before submission — nothing is sent without confirmation.

To submit:

```bash
gh issue create --repo syncupsuite/webplatform4sync \
  --title "Feedback: <skill> — <short description>" \
  --body-file .platform/feedback/YYYY-MM-DD-<slug>.md
```

---

## Why this exists

This is Layer 4 of the design taxonomy (Token Engine -> Curated Packs ->
Design Identity -> Feedback Channel). When an LLM uses a skill and something
doesn't work, that information needs a structured path back to the platform
team. Without it, the same issues recur across projects and the skills don't
improve.

---

## Routing

This is a standalone command. It reads the following skills for context:

| Resource | Path |
|----------|------|
| Token skill | `skills/theme-inspired-tokens/skill.md` |
| Multi-tenant skill | `skills/multi-tenant-platform/skill.md` |
| Auth skill | `skills/graduated-auth/skill.md` |
| Neon skill | `skills/neon-multi-tenant/skill.md` |
