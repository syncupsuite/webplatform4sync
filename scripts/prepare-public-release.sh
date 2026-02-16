#!/usr/bin/env bash
set -euo pipefail

# Prepare a working copy of hn-platform4sync for public release as webplatform4sync.
#
# Usage:
#   git clone git@github.com:syncupsuite/hn-platform4sync.git /tmp/p4s-release
#   cd /tmp/p4s-release
#   ./scripts/prepare-public-release.sh
#   # Verify, then push to webplatform4sync

echo "=== Platform4Sync Public Release Preparation ==="
echo ""

# File extensions to scrub
EXTS=( '*.md' '*.ts' '*.sql' '*.json' '*.yml' '*.yaml' '*.jsonc' '*.css' )

scrub_files() {
  local pattern="$1"
  local replacement="$2"
  for ext in "${EXTS[@]}"; do
    find . -name "$ext" -not -path './.git/*' -exec sed -i '' "s|${pattern}|${replacement}|g" {} + 2>/dev/null || true
  done
}

# -----------------------------------------------------------------------
# 1. Remove internal-only files
# -----------------------------------------------------------------------
echo "[1/6] Removing internal-only files..."

rm -f docs/for-syncup.md
rm -f .github/release-strategy.md
rm -f scripts/prepare-public-release.sh

echo "  Removed: docs/for-syncup.md"
echo "  Removed: .github/release-strategy.md"
echo "  Removed: scripts/prepare-public-release.sh (self-delete)"

# -----------------------------------------------------------------------
# 2. Replace real infrastructure IDs with placeholders
# -----------------------------------------------------------------------
echo "[2/6] Replacing infrastructure IDs..."

scrub_files "polished-truth-90679079" "your-neon-project-id"
scrub_files "br-damp-dust-agvnfraf" "br-xxx-xxx-xxxxxxxx"
scrub_files "br-broad-heart-aglkic7z" "br-xxx-xxx-xxxxxxxx"
scrub_files "br-cool-bird-agmnaox6" "br-xxx-xxx-xxxxxxxx"
scrub_files "br-polished-sun-ag8a15yi" "br-xxx-xxx-xxxxxxxx"
scrub_files "6b078bcaa9984a2d1dbe483e65c741b0" "your-cloudflare-account-id"
scrub_files "43b75292cfc44ed5b0483a1a030dee9f" "your-kv-namespace-id"
scrub_files "d98679b9c4084f11bca2b9679f3d1e5e" "your-hyperdrive-config-id"
scrub_files "syncup-brand-legal" "your-neon-project"

echo "  Replaced all infrastructure IDs"

# -----------------------------------------------------------------------
# 3. Replace internal org references
# -----------------------------------------------------------------------
echo "[3/6] Replacing internal org references..."

# CLAUDE.md: remove hn- prefix line, update title and public counterpart line
sed -i '' 's/# CLAUDE.md — hn-platform4sync/# CLAUDE.md — webplatform4sync/' CLAUDE.md
sed -i '' '/\*\*Prefix\*\*: `hn-` = internal/d' CLAUDE.md
sed -i '' 's|Public counterpart.*webplatform4sync.*|**Repo**: `syncupsuite/webplatform4sync`|' CLAUDE.md

# naming.md: remove internal prefix rows
sed -i '' '/| `hn-` | Internal (syncupsuite) | Private |/d' shared/conventions/naming.md
sed -i '' '/| `hn-` | Internal (habitusnet) | Private |/d' shared/conventions/naming.md
sed -i '' '/| `su-` | SyncUp product repos | Private (existing convention) |/d' shared/conventions/naming.md

echo "  Replaced internal org references"

# -----------------------------------------------------------------------
# 4. Update repo metadata
# -----------------------------------------------------------------------
echo "[4/6] Updating metadata..."

cat > README.md << 'EOF'
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
EOF

# Update repository-metadata.yml for public context
sed -i '' 's/hn-platform4sync/webplatform4sync/g' .github/repository-metadata.yml
sed -i '' 's/Internal platform/Platform/g' .github/repository-metadata.yml
sed -i '' 's/# Visibility: private (internal repo)/# Visibility: public/' .github/repository-metadata.yml
sed -i '' '/# Public counterpart/d' .github/repository-metadata.yml

echo "  Updated README.md and metadata"

# -----------------------------------------------------------------------
# 5. Add LICENSE
# -----------------------------------------------------------------------
echo "[5/6] Adding LICENSE..."

cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 SyncUpSuite

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

echo "  Added MIT LICENSE"

# -----------------------------------------------------------------------
# 6. Verify no private data remains
# -----------------------------------------------------------------------
echo "[6/6] Verifying scrub..."
echo ""

PATTERNS="polished-truth-90679079|habitusnet|HabitusNet|6b078bcaa9984a2d1dbe483e65c741b0|43b75292cfc44ed5b0483a1a030dee9f|d98679b9c4084f11bca2b9679f3d1e5e|br-damp-dust-agvnfraf|br-broad-heart-aglkic7z|br-cool-bird-agmnaox6|br-polished-sun-ag8a15yi|for-syncup\.md|syncup-brand-legal"

if grep -rn "$PATTERNS" --include="*.md" --include="*.ts" --include="*.sql" --include="*.json" --include="*.yml" --include="*.yaml" --include="*.jsonc" --include="*.css" . 2>/dev/null | grep -v '.git/'; then
  echo ""
  echo "WARNING: Private data still detected. Review matches above."
  exit 1
else
  echo "CLEAN — no private data found."
  echo ""
  echo "Next steps:"
  echo "  git add -A && git commit -m 'chore: prepare v0.1.0 public release'"
  echo "  git remote set-url origin git@github.com:syncupsuite/webplatform4sync.git"
  echo "  git push -u origin main"
  echo "  git tag v0.1.0 && git push origin v0.1.0"
fi
