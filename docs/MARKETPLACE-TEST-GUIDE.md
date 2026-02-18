# Marketplace Installation Test Guide

End-to-end verification procedure for the webplatform4sync Claude Code Plugin Marketplace.

Run this guide after any significant change to skills, commands, or the `.claude-plugin/` configuration.

---

## Part 1: Fresh Marketplace Install

### 1.1 Prerequisites

- Claude Code CLI installed and authenticated
- A test project directory (can be empty)
- Git access to `github.com/syncupsuite/webplatform4sync`

### 1.2 Add to Claude Code Settings

In your test project, create or edit `.claude/settings.json`:

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

### 1.3 Verify Marketplace Appears

In a Claude Code session, run:

```
/webplatform4sync:wp4s1_discover
```

Expected result: Claude Code loads the `wp4s1_discover.md` command and begins the discovery workflow.

If the command is not found, verify:
1. `.claude/settings.json` has no JSON syntax errors
2. The GitHub repo is publicly accessible: `gh repo view syncupsuite/webplatform4sync`
3. `.claude-plugin/marketplace.json` exists and is valid JSON
4. `.claude-plugin/plugin.json` exists and is valid JSON

---

## Part 2: Skills Verification

### 2.1 File Existence Checks

All of the following files must exist and be non-empty:

```
skills/multi-tenant-platform/skill.md
skills/multi-tenant-platform/references/governance-rules.md
skills/multi-tenant-platform/references/isolation-modes.md
skills/multi-tenant-platform/templates/auth-middleware.ts
skills/multi-tenant-platform/templates/rls-policies.sql
skills/multi-tenant-platform/templates/tenant-schema.sql

skills/graduated-auth/skill.md
skills/graduated-auth/references/auth-layers.md
skills/graduated-auth/references/dns-patterns.md
skills/graduated-auth/templates/firebase-bridge.ts
skills/graduated-auth/templates/oauth-graduation.ts
skills/graduated-auth/templates/worker-auth-mw.ts

skills/neon-multi-tenant/skill.md
skills/neon-multi-tenant/references/neon-auth-schema.md
skills/neon-multi-tenant/templates/branch-strategy.sql
skills/neon-multi-tenant/templates/drizzle-tenant.ts
skills/neon-multi-tenant/templates/hyperdrive-setup.md

skills/theme-inspired-tokens/skill.md
skills/theme-inspired-tokens/references/theme-registry.md
skills/theme-inspired-tokens/references/token-schema.md
skills/theme-inspired-tokens/references/typography-mapping.md
skills/theme-inspired-tokens/transformers/tailwind-v4.ts
skills/theme-inspired-tokens/transformers/tailwind-v3.ts
```

Verify locally:

```bash
# From the webplatform4sync root
for f in \
  skills/multi-tenant-platform/skill.md \
  skills/graduated-auth/skill.md \
  skills/neon-multi-tenant/skill.md \
  skills/theme-inspired-tokens/skill.md \
  skills/theme-inspired-tokens/references/theme-registry.md \
  skills/theme-inspired-tokens/references/token-schema.md \
  skills/theme-inspired-tokens/references/typography-mapping.md \
  skills/theme-inspired-tokens/transformers/tailwind-v4.ts \
  skills/theme-inspired-tokens/transformers/tailwind-v3.ts; do
  [ -s "$f" ] && echo "OK: $f" || echo "MISSING OR EMPTY: $f"
done
```

### 2.2 Commands Existence Checks

All 9 workflow commands must exist:

```
commands/wp4s1_discover.md
commands/wp4s2_scaffold.md
commands/wp4s3_tenant.md
commands/wp4s4_database.md
commands/wp4s5_auth.md
commands/wp4s6_tokens.md
commands/wp4s7_deploy.md
commands/wp4s8_validate.md
commands/wp4s9_status.md
```

### 2.3 Plugin Configuration Checks

Verify `.claude-plugin/marketplace.json` is valid JSON:

```bash
python3 -c "import json; json.load(open('.claude-plugin/marketplace.json')); print('valid')"
python3 -c "import json; json.load(open('.claude-plugin/plugin.json')); print('valid')"
```

Expected output: `valid` for both.

Verify `marketplace.json` has the required keywords (should include `design-tokens` and `themes`):

```bash
python3 -c "
import json
m = json.load(open('.claude-plugin/marketplace.json'))
keywords = m['plugins'][0]['keywords']
required = ['multi-tenant', 'design-tokens', 'themes']
for k in required:
    print(f'keyword {k!r}: {\"OK\" if k in keywords else \"MISSING\"}')"
```

---

## Part 3: theme-inspired-tokens Skill Coherence

### 3.1 Quick Start Section

`skills/theme-inspired-tokens/skill.md` must contain a **Quick Start (pre-built)** section at the top with:

- `npm install @syncupsuite/themes`
- CSS import for `swiss-international`
- CSS import for `nihon-traditional`
- TypeScript import example using `swissInternational` and `buildTokens`
- A clear explanation of Skill vs. Package

Verify:

```bash
grep -c "Quick Start" skills/theme-inspired-tokens/skill.md  # should be >= 1
grep -c "@syncupsuite/themes" skills/theme-inspired-tokens/skill.md  # should be >= 2
grep -c "swiss-international" skills/theme-inspired-tokens/skill.md  # should be >= 1
grep -c "nihon-traditional" skills/theme-inspired-tokens/skill.md    # should be >= 1
```

### 3.2 Four-Layer Architecture

The skill must describe all four layers:

- Layer 1: Theme Source (Story)
- Layer 2: Color Expansion (System)
- Layer 3: Semantic Mapping (Meaning)
- Layer 4: Cross-Domain Tokens (Completeness)

### 3.3 Required Sections

Confirm these sections exist in `skill.md`:

- [ ] Quick Start (pre-built) with npm install
- [ ] Build Your Own section header
- [ ] Invocation with arguments table
- [ ] Four-Layer Architecture
- [ ] Output Format: DTCG-Aligned JSON
- [ ] Multi-Tenant Integration
- [ ] Performance Budget table
- [ ] Transformer Output table
- [ ] Validation Checklist (9 items)
- [ ] Related References section

### 3.4 Theme Registry

`skills/theme-inspired-tokens/references/theme-registry.md` must contain at minimum:

- `nihon-no-iro-traditional` foundation
- `swiss-international-style` foundation
- Each foundation has: ID, Name, Story, Philosophy, Era, Seed Colors table

Verify:

```bash
grep -c "^| \*\*ID\*\*" skills/theme-inspired-tokens/references/theme-registry.md  # should be >= 5
```

---

## Part 4: npm Package Verification

The marketplace README references these npm packages. Verify they are published:

```bash
npm info @syncupsuite/tokens version      # should return 0.1.0
npm info @syncupsuite/foundations version # should return 0.1.0
npm info @syncupsuite/transformers version # should return 0.1.0
npm info @syncupsuite/themes version      # should return 0.1.0
```

### 4.1 CSS Import Test

In a test project with `@syncupsuite/themes` installed:

```bash
mkdir -p /tmp/themes-test && cd /tmp/themes-test
npm init -y
npm install @syncupsuite/themes
ls node_modules/@syncupsuite/themes/
```

Expected: the package directory should contain at minimum:
- `swiss-international/tailwind.css` or equivalent
- `nihon-traditional/tailwind.css` or equivalent

```bash
find node_modules/@syncupsuite/themes -name "*.css" | head -10
find node_modules/@syncupsuite/themes -name "*.js" | head -10
```

---

## Part 5: README Marketplace Listing

The `README.md` must contain an **npm Packages** section with:

- [ ] `@syncupsuite/themes` heading
- [ ] `npm install @syncupsuite/themes` code block
- [ ] Available themes table (swiss-international, nihon-traditional)
- [ ] CSS usage example with `@import`
- [ ] TypeScript usage example
- [ ] Related packages table (tokens, foundations, transformers, themes)
- [ ] Link to `theme-inspired-tokens` skill for custom themes

Verify:

```bash
grep -c "npm Packages" README.md              # should be >= 1
grep -c "@syncupsuite/themes" README.md       # should be >= 3
grep -c "swiss-international" README.md       # should be >= 1
grep -c "nihon-traditional" README.md         # should be >= 1
```

---

## Part 6: Broken Link Check

All internal cross-references in skill.md files must point to files that exist:

```bash
# Check theme-inspired-tokens internal references
for ref in \
  "skills/theme-inspired-tokens/references/token-schema.md" \
  "skills/theme-inspired-tokens/references/theme-registry.md" \
  "skills/theme-inspired-tokens/references/typography-mapping.md" \
  "skills/theme-inspired-tokens/transformers/tailwind-v4.ts" \
  "skills/theme-inspired-tokens/transformers/tailwind-v3.ts"; do
  [ -f "$ref" ] && echo "OK: $ref" || echo "BROKEN: $ref"
done
```

---

## Part 7: End-to-End Workflow Test (Manual)

Run the full 9-step workflow on a new empty project directory to verify each command loads and guides correctly:

1. `/webplatform4sync:wp4s1_discover` -- should ask about project directory, scan, produce `.p4s/status.json`
2. `/webplatform4sync:wp4s2_scaffold` -- should offer greenfield/brownfield/overlay options
3. `/webplatform4sync:wp4s3_tenant` -- should ask about tenant model
4. `/webplatform4sync:wp4s4_database` -- should ask about Neon project
5. `/webplatform4sync:wp4s5_auth` -- should ask about auth provider
6. `/webplatform4sync:wp4s6_tokens` -- should ask about theme/tokens with mention of `@syncupsuite/themes` quick start
7. `/webplatform4sync:wp4s7_deploy` -- should guide Cloudflare deployment
8. `/webplatform4sync:wp4s8_validate` -- should run validation checks
9. `/webplatform4sync:wp4s9_status` -- should show overall adoption status

For each step, verify:
- The command loads without errors
- The instructions are coherent and actionable
- Cross-references to other skills and docs are valid
- No hardcoded project-specific IDs (all should be `{{PLACEHOLDER}}` or `your-*`)

---

## Checklist Summary

Run this checklist before any marketplace release:

- [ ] `.claude-plugin/marketplace.json` is valid JSON with correct keywords
- [ ] `.claude-plugin/plugin.json` is valid JSON
- [ ] All 4 `skills/*/skill.md` files exist and are non-empty
- [ ] All 9 `commands/wp4s*.md` files exist and are non-empty
- [ ] `theme-inspired-tokens/skill.md` has Quick Start section with `@syncupsuite/themes`
- [ ] `theme-registry.md` has at least 5 foundations with complete seed color data
- [ ] `README.md` has npm Packages section with themes listing
- [ ] `@syncupsuite/themes@0.1.0` is live on npm (`npm info @syncupsuite/themes`)
- [ ] No real credentials or project IDs in any public file
- [ ] `docs/contributing.md` sync audit is up to date
