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

# -----------------------------------------------------------------------
# 1. Remove internal-only files
# -----------------------------------------------------------------------
echo "[1/5] Removing internal-only files..."

rm -f docs/for-syncup.md
rm -f .github/release-strategy.md
rm -f scripts/prepare-public-release.sh

echo "  Removed: docs/for-syncup.md"
echo "  Removed: .github/release-strategy.md"
echo "  Removed: scripts/prepare-public-release.sh"

# -----------------------------------------------------------------------
# 2. Replace real infrastructure IDs with placeholders
# -----------------------------------------------------------------------
echo "[2/5] Replacing infrastructure IDs..."

# Neon project ID
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/polished-truth-90679079/your-neon-project-id/g'

# Neon branch IDs
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/br-damp-dust-agvnfraf/br-xxx-xxx-xxxxxxxx/g'
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/br-broad-heart-aglkic7z/br-xxx-xxx-xxxxxxxx/g'
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/br-cool-bird-agmnaox6/br-xxx-xxx-xxxxxxxx/g'
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/br-polished-sun-ag8a15yi/br-xxx-xxx-xxxxxxxx/g'

# Cloudflare account ID
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' -o -name '*.yml' | xargs sed -i '' \
  's/6b078bcaa9984a2d1dbe483e65c741b0/your-cloudflare-account-id/g'

# KV namespace ID
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/43b75292cfc44ed5b0483a1a030dee9f/your-kv-namespace-id/g'

# Hyperdrive ID
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/d98679b9c4084f11bca2b9679f3d1e5e/your-hyperdrive-config-id/g'

# Neon project name
find . -name '*.md' -o -name '*.ts' -o -name '*.sql' | xargs sed -i '' \
  's/syncup-brand-legal/your-neon-project/g'

echo "  Replaced all infrastructure IDs"

# -----------------------------------------------------------------------
# 3. Replace internal org references
# -----------------------------------------------------------------------
echo "[3/5] Replacing internal org references..."

# Remove hn- prefix and internal references from CLAUDE.md
sed -i '' '/\*\*Prefix\*\*: `hn-` = internal/d' CLAUDE.md
sed -i '' 's|Public counterpart.*webplatform4sync.*|**Repo**: `syncupsuite/webplatform4sync`|' CLAUDE.md

# naming.md: remove internal prefix rows (handles both old and current forms)
sed -i '' '/| `hn-` | Internal (syncupsuite) | Private |/d' shared/conventions/naming.md
sed -i '' '/| `hn-` | Internal (habitusnet) | Private |/d' shared/conventions/naming.md
sed -i '' '/| `su-` | SyncUp product repos | Private (existing convention) |/d' shared/conventions/naming.md

echo "  Replaced internal org references"

# -----------------------------------------------------------------------
# 4. Update repo metadata
# -----------------------------------------------------------------------
echo "[4/5] Updating metadata..."

# Update README
cat > README.md << 'EOF'
# Platform4Sync

Platform standards, skills, and scaffold templates for building multi-tenant SaaS applications on Cloudflare Workers + Neon PostgreSQL.

## What's Inside

- **Skills** — Claude Code skills for multi-tenant architecture, graduated auth, Neon isolation, and design tokens
- **Scaffolds** — Project templates for greenfield, brownfield, and overlay adoption
- **Contracts** — Shared type definitions ensuring cross-skill compatibility
- **Validators** — Token and tenant configuration validators

## Documentation

- [What is Platform4Sync?](docs/what-is-platform4sync.md) — Overview and technical architecture
- [Architecture Standard](docs/architecture-standard.md) — Canonical reference
- [Architecture Rationale](docs/rationale.md) — Design decisions and review history
- [Contributing](docs/contributing.md) — How to add skills and templates

## Quick Start

Each skill has a `skill.md` entry point. Point Claude Code at the skill directory and describe your task:

```
skills/multi-tenant-platform/   → 3-tier tenant architecture
skills/graduated-auth/          → Anonymous → OAuth → Full auth
skills/neon-multi-tenant/       → Neon branches, Hyperdrive, Drizzle
skills/theme-inspired-tokens/   → Culturally-grounded design tokens
```

## License

MIT
EOF

echo "  Updated README.md"

# -----------------------------------------------------------------------
# 5. Verify no private data remains
# -----------------------------------------------------------------------
echo "[5/5] Verifying scrub..."
echo ""

PATTERNS="polished-truth-90679079|habitusnet|HabitusNet|6b078bcaa9984a2d1dbe483e65c741b0|43b75292cfc44ed5b0483a1a030dee9f|d98679b9c4084f11bca2b9679f3d1e5e|br-damp-dust-agvnfraf|br-broad-heart-aglkic7z|br-cool-bird-agmnaox6|br-polished-sun-ag8a15yi|for-syncup\.md"

if grep -rn "$PATTERNS" --include="*.md" --include="*.ts" --include="*.sql" --include="*.json" --include="*.yml" . 2>/dev/null; then
  echo ""
  echo "WARNING: Private data still detected. Review matches above."
  exit 1
else
  echo "CLEAN — no private data found."
  echo ""
  echo "Ready to push to syncupsuite/webplatform4sync"
fi
