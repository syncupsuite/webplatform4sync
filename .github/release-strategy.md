# Dual-Repo Release Strategy

## Overview

Platform4Sync exists as two repositories under the `syncupsuite` GitHub organization:

| Repo | Visibility | Purpose |
|------|-----------|---------|
| `syncupsuite/hn-platform4sync` | Private | Internal development, real infrastructure references, SyncUp-specific integration notes |
| `syncupsuite/p--platform4sync` | Public | Community release, genericized examples, no infrastructure IDs |

Both repos live under `syncupsuite`. The `hn-` prefix denotes internal use. The `p--` prefix denotes public release.

---

## What Stays in Both Repos

These are product names and public-facing references. They appear in both repos unchanged:

- **SyncUpSuite** — the platform umbrella name
- **BrandSyncUp** / **brandsyncup.com** — reference implementation, used as concrete examples
- **LegalSyncUp** / **legalsyncup.com** — second app, used to demonstrate cross-app patterns
- **syncupsuite** org name — the GitHub org hosting both repos
- Product domain names used as examples in templates

---

## What Gets Scrubbed for Public Release

### Category 1: Real Infrastructure IDs

These are actual resource identifiers. Replace with clearly fake values.

| Item | Internal Value | Public Replacement |
|------|---------------|-------------------|
| Neon project ID | `polished-truth-90679079` | `your-neon-project-id` |
| Neon branch: BSU prod | `br-damp-dust-agvnfraf` | `br-xxx-xxx-xxxxxxxx` |
| Neon branch: BSU dev | `br-broad-heart-aglkic7z` | `br-xxx-xxx-xxxxxxxx` |
| Neon branch: LSU prod | `br-cool-bird-agmnaox6` | `br-xxx-xxx-xxxxxxxx` |
| Neon branch: LSU dev | `br-polished-sun-ag8a15yi` | `br-xxx-xxx-xxxxxxxx` |
| Cloudflare account ID | `6b078bcaa9984a2d1dbe483e65c741b0` | `your-cloudflare-account-id` |
| KV namespace ID | `43b75292cfc44ed5b0483a1a030dee9f` | `your-kv-namespace-id` |
| Hyperdrive ID | `d98679b9c4084f11bca2b9679f3d1e5e` | `your-hyperdrive-config-id` |

**Files requiring ID scrubbing:**
- `docs/for-syncup.md` (remove entirely — marked private)
- `skills/neon-multi-tenant/skill.md` (lines 52, 58-64)
- `skills/neon-multi-tenant/references/neon-auth-schema.md` (lines 241-242)
- `skills/neon-multi-tenant/templates/branch-strategy.sql` (line 280)
- `scaffold/greenfield/scaffold.md` (lines 129-130)
- `skills/neon-multi-tenant/templates/hyperdrive-setup.md` (lines 40, 79)

### Category 2: Internal Org References

Replace references to the internal development org.

| Item | Internal Value | Public Replacement |
|------|---------------|-------------------|
| Internal org mention | `HabitusNet` / `habitusnet` | Remove or replace with "your organization" |
| Internal prefix explanation | `hn- = internal (habitusnet)` | Remove prefix convention section |

**Files requiring org scrubbing:**
- `CLAUDE.md` (line 8)
- `shared/conventions/naming.md` (line 27)
- `skills/multi-tenant-platform/skill.md` (line 30 — replace "HabitusNet" with "Your SaaS company")

### Category 3: Private-Only Files

These files exist only in `hn-platform4sync` and are excluded from the public repo.

| File | Reason |
|------|--------|
| `docs/for-syncup.md` | Contains all real infra IDs and internal gap analysis |
| `.github/release-strategy.md` | This file — internal process documentation |

---

## Release Process

### One-Time Setup

```bash
# 1. Create the public repo
gh repo create syncupsuite/p--platform4sync --public --description "Platform standards, skills, and scaffold templates for multi-tenant SaaS on Cloudflare Workers + Neon PostgreSQL"

# 2. Clone internal repo to a working directory
git clone git@github.com:syncupsuite/hn-platform4sync.git /tmp/p4s-release
cd /tmp/p4s-release

# 3. Run the scrub script (see below)
./scripts/prepare-public-release.sh

# 4. Verify no private data remains
grep -rn "polished-truth\|habitusnet\|6b078bca\|43b75292\|d98679b9\|br-damp-dust\|br-broad-heart\|br-cool-bird\|br-polished-sun" .

# 5. Set new remote and push
git remote set-url origin git@github.com:syncupsuite/p--platform4sync.git
git push -u origin main
```

### Ongoing Sync

When changes land in `hn-platform4sync` that should propagate to the public repo:

```bash
# In the public repo working copy
git remote add internal git@github.com:syncupsuite/hn-platform4sync.git
git fetch internal main
git cherry-pick <commit-hash>  # Or merge, then scrub

# Re-run scrub verification
grep -rn "polished-truth\|habitusnet\|6b078bca\|43b75292\|d98679b9" .

# Push
git push origin main
```

### Automated Verification

Add to CI for the public repo:

```yaml
# .github/workflows/scrub-check.yml
name: Private Data Check
on: [push, pull_request]
jobs:
  scrub-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for private data
        run: |
          PATTERNS="polished-truth|habitusnet|HabitusNet|6b078bca|43b75292|d98679b9|br-damp-dust|br-broad-heart|br-cool-bird|br-polished-sun|for-syncup"
          if grep -rn "$PATTERNS" --include="*.md" --include="*.ts" --include="*.sql" --include="*.json" --include="*.yml" .; then
            echo "ERROR: Private data detected in public repo"
            exit 1
          fi
          echo "Clean — no private data found"
```

---

## File Manifest

### Internal Only (hn-platform4sync)

| File | Content |
|------|---------|
| `docs/for-syncup.md` | Real infra IDs, gap analysis, migration priorities |
| `.github/release-strategy.md` | This document |

### Scrubbed for Public (p--platform4sync)

| File | Changes |
|------|---------|
| `CLAUDE.md` | Remove `hn-` prefix explanation, remove HabitusNet reference |
| `shared/conventions/naming.md` | Remove `hn-` and `su-` prefix rows, remove HabitusNet |
| `skills/multi-tenant-platform/skill.md` | Replace "HabitusNet" with generic |
| `skills/neon-multi-tenant/skill.md` | Replace real Neon IDs with placeholders |
| `skills/neon-multi-tenant/references/neon-auth-schema.md` | Replace branch IDs |
| `skills/neon-multi-tenant/templates/branch-strategy.sql` | Replace project ID |
| `skills/neon-multi-tenant/templates/hyperdrive-setup.md` | Replace Hyperdrive ID |
| `scaffold/greenfield/scaffold.md` | Replace example IDs |

### Identical in Both Repos

Everything else. Skills, contracts, templates, validators, rationale, architecture docs — all identical.
