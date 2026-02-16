# Naming Conventions

## The Rule

```
repo name = domain name = Google project ID
```

### Examples

| Domain | Repo Name | GCP Project ID |
|--------|-----------|---------------|
| brandsyncup.com | brandsyncup-com | brandsyncup-com |
| legalsyncup.com | legalsyncup-com | legalsyncup-com |
| syncupsuite.com | syncupsuite-com | syncupsuite-com |

### Constraints

- **Google Project IDs**: max 30 chars, lowercase, hyphens only, must start with letter
- **Repo names**: use the domain with `.` replaced by `-`
- **If domain > 30 chars**: use `{product}-{tld}` pattern

## Prefix Conventions

| Prefix | Meaning | Visibility |
|--------|---------|------------|
| `p--` | Public release | Public |

## Firebase Project Naming

Firebase projects match the GCP project ID. Firebase hosting serves `auth.domain.tld` for identity flows.

```
Firebase project: brandsyncup-com
Auth hostname:    auth.brandsyncup.com
Region:           europe-west6 (Zurich)
```

## Cloudflare Naming

Workers and KV namespaces follow the repo name:

```
Worker:     brandsyncup-com-worker
KV:         brandsyncup-com-cache
R2:         brandsyncup-com-assets
Hyperdrive: brandsyncup-com-db
```

## Database Naming

Neon project per logical group. Branches per environment:

```
Neon project: your-neon-project
├── production (default branch)
├── brandsyncup-prod
│   └── brandsyncup-dev
└── legalsyncup-prod
    └── legalsyncup-dev
```

Schema per app: `brandsyncup`, `legalsyncup`
Shared schema: `neon_auth` (Better Auth tables)
