# diagnose-tokens — Token Installation Diagnostic

> Standalone command · No frame dependency
> Read-only — does not modify any files

---

## What this command does

Runs a 9-step diagnostic on an existing design token installation to detect
silent failures. Outputs `[PASS]`, `[FAIL]`, or `[WARN]` per check with
specific fix instructions.

Use this when tokens appear installed but styling is broken, dark mode doesn't
work, or Tailwind utilities don't resolve to theme values.

---

## Prerequisites

- Project must have a CSS entry point (e.g. `src/styles/app.css`)
- Tailwind CSS v3 or v4 must be installed

---

## Diagnostic Steps

Run each check in order. Report results in a summary table at the end.

### Step 1: Package Version

Check if `@syncupsuite/themes` is installed and which version.

```bash
# Check package.json or node_modules
cat node_modules/@syncupsuite/themes/package.json | grep version
```

- `[PASS]` if >= 0.2.2
- `[WARN]` if < 0.2.2 (pre-security-audit version — upgrade recommended)
- `[FAIL]` if not installed

### Step 2: CSS Entry Point

Locate the main CSS file and verify it imports a theme.

Look for an `@import` of `@syncupsuite/themes/*/tailwind.css` or a local
`tokens/core.css` file.

- `[PASS]` if theme import found
- `[FAIL]` if no token/theme import in CSS entry point

### Step 3: `:root` Completeness

Verify all required CSS custom properties are defined in `:root`.

**Required semantic tokens** (minimum set):
- `--color-primary`, `--color-accent`, `--color-background`, `--color-surface`
- `--color-text`, `--color-text-secondary`, `--color-text-muted`
- `--color-border`, `--color-error`, `--color-success`, `--color-warning`
- `--font-family-sans`, `--font-family-mono`
- `--radius-sm`, `--radius-md`, `--radius-lg`

- `[PASS]` if all present
- `[FAIL]` if any missing — list which ones

> This is the #1 silent failure mode. Tailwind utilities resolve to empty
> values when `:root` properties are missing.

### Step 4: Dark Mode Block

Check that a dark mode block exists and has 1:1 parity with `:root` color tokens.

- For Tailwind v4 / class strategy: look for `[data-theme="dark"]` or `.dark` selector
- For Tailwind v3 / media strategy: look for `@media (prefers-color-scheme: dark)`

- `[PASS]` if dark block exists with matching token count
- `[WARN]` if dark block exists but has fewer tokens than `:root`
- `[FAIL]` if no dark mode block found

### Step 5: Circular `var()` References

Scan CSS for self-referential custom properties that would silently resolve to
the initial value (usually empty).

```
BAD:  --color-primary: var(--color-primary);  /* in :root — circular */
OK:   --color-primary: var(--color-primary);  /* in @theme — Tailwind v4 registration pattern */
```

- `[PASS]` if no circular references in `:root` or dark mode blocks
- `[FAIL]` if circular reference found — list which properties

> Note: Self-referential `var()` inside a Tailwind v4 `@theme` block is the
> correct registration pattern, not a bug.

### Step 6: Strategy Alignment

Verify the dark mode strategy in CSS matches the Tailwind configuration.

| Tailwind Version | Expected Strategy | CSS Selector |
|-----------------|-------------------|-------------|
| v4 (CSS-first) | `class` (default) | `[data-theme="dark"]` or `.dark` |
| v3 (config) | Check `darkMode` in `tailwind.config.*` | Matches config value |

- `[PASS]` if CSS selector matches Tailwind strategy
- `[FAIL]` if mismatch (e.g. CSS uses `@media` but Tailwind expects `class`)

### Step 7: Semantic Pairing

Verify that text colors have sufficient contrast against their intended
background colors by checking the token pairs exist:

| Foreground | Background |
|-----------|-----------|
| `--color-text` | `--color-background` |
| `--color-text-secondary` | `--color-background` |
| `--color-text-muted` | `--color-background` |
| `--color-text` | `--color-surface` |

- `[PASS]` if all pairs have both tokens defined
- `[WARN]` if surface-level pairs are missing

### Step 8: Contrast Ratios

For each semantic pair from Step 7, compute the WCAG 2.1 contrast ratio.

- `[PASS]` if all text pairs >= 4.5:1 (AA normal text)
- `[WARN]` if any pair is between 3:1 and 4.5:1 (AA large text only)
- `[FAIL]` if any pair < 3:1

> If token values use OKLCH or HSL, convert to sRGB for contrast calculation.

### Step 9: Typography Loading

Check that `--font-family-sans` and `--font-family-mono` reference fonts that
are actually loaded (via `@font-face`, Google Fonts import, or system font stack).

- `[PASS]` if font families resolve to loaded fonts or system stacks
- `[WARN]` if custom font referenced but no `@font-face` or import found

---

## Output Format

After running all checks, output a summary table:

```
Token Installation Diagnostic
==============================

  Step 1: Package version        [PASS] @syncupsuite/themes@0.2.2
  Step 2: CSS entry point        [PASS] src/styles/app.css imports tailwind.css
  Step 3: :root completeness     [FAIL] Missing: --color-warning, --radius-lg
  Step 4: Dark mode block        [WARN] 14/17 tokens have dark equivalents
  Step 5: Circular var()         [PASS] No circular references
  Step 6: Strategy alignment     [PASS] class strategy, [data-theme="dark"] selector
  Step 7: Semantic pairing       [PASS] All pairs defined
  Step 8: Contrast ratios        [PASS] All pairs >= 4.5:1
  Step 9: Typography loading     [WARN] "Inter" referenced but no @font-face found

Result: 7 PASS · 2 WARN · 1 FAIL
```

For each `[FAIL]` or `[WARN]`, provide a specific fix instruction immediately
below the summary.

---

## Routing

This is a standalone diagnostic. It reads the following skill for token
architecture context:

| Resource | Path |
|----------|------|
| Token skill | `skills/theme-inspired-tokens/skill.md` |
| Token schema | `skills/theme-inspired-tokens/references/token-schema.md` |
| Scaffold CSS | `scaffold/greenfield/base/src/styles/` |
