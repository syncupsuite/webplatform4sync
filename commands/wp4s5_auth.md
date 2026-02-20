> **@deprecated** — Use a command frame instead.
> Construction: `/webplatform4sync:frame` → `auth`
> Shu-Ha-Ri: `/webplatform4sync:ha` → `auth`
> This command will be removed after one full project cycle with frames in use.

---

# wp4s5_auth

> Step 5 of 9 — Configure graduated authentication
> Previous: `wp4s4_database` | Next: `wp4s6_tokens`

## What This Does

Sets up the graduated authentication system: Firebase for identity verification (`auth.domain.tld`), Better Auth for sessions and authorization in Neon PostgreSQL, and optionally Google Identity Platform for multi-tenant white-label SSO. Users progress from anonymous to fully authenticated without friction walls.

## Instructions

### 1. Read Discovery State

Load `.p4s/status.json`. Check the `discover` findings for existing auth state (Better Auth, Firebase, OAuth providers). Verify `database` step is completed (auth needs Neon).

### 2. Load the Graduated Auth Skill

Read `skills/graduated-auth/skill.md` for the full specification. This covers:
- The graduation spectrum: ANONYMOUS -> PREVIEW -> OAUTH -> FULL
- Three auth layers (Firebase identity, Better Auth sessions, Google Identity Platform)
- Firebase's precise role (identity only, not sessions)
- DNS patterns for `auth.domain.tld`
- Worker middleware integration

### 3. Determine Auth Complexity

Ask the user:

> **What auth levels does your project need?**
> 1. **Simple** — Email/password + OAuth (Google/GitHub) via Better Auth only
> 2. **Graduated** — Full spectrum (Anonymous -> Preview -> OAuth -> Full Account)
> 3. **White-label** — Graduated + per-partner identity pools (Google Identity Platform)

### 4. Configure Better Auth (All Modes)

Generate or verify `src/lib/auth/better-auth.ts`:
- Auth factory function that creates a Better Auth instance per request (Workers are stateless)
- `neon_auth` schema for all auth tables
- 7-day session expiry, 1-day refresh
- Email/password enabled
- OAuth providers configured (Google, GitHub)
- Trusted origins from `APP_URL`

Generate or verify `src/contexts/AuthContext.tsx`:
- `AuthLevel` enum: ANONYMOUS, PREVIEW, OAUTH, FULL
- `signIn()`, `signUp()`, `signOut()`, `signInWithProvider()` methods
- `refreshSession()` on mount

Use templates from `skills/graduated-auth/templates/`:
- `templates/worker-auth-mw.ts` — Worker middleware for auth level resolution
- `templates/oauth-graduation.ts` — OAuth-to-full-account upgrade flow
- `templates/firebase-bridge.ts` — Firebase token verification bridge

### 5. Configure Firebase (Graduated and White-Label Modes)

If the user chose graduated or white-label auth:

- Firebase project should match GCP project ID (per naming convention)
- Region: `europe-west6` (Zurich) for Swiss data residency
- Configure `auth.domain.tld` custom domain on Firebase Hosting:
  1. Add custom domain in Firebase Hosting console
  2. Firebase provides TXT verification record and A/AAAA records
  3. Add DNS records in Cloudflare (proxy MUST be disabled — DNS only for Firebase)
  4. Firebase provisions SSL automatically

Document the DNS records needed:

```
auth.example.com  CNAME  <firebase-hosting>.web.app  (DNS only, no CF proxy)
```

See `skills/graduated-auth/references/dns-patterns.md` for details.

### 6. Configure Worker Middleware

Wire auth middleware into the Worker entry (`src/server/index.ts`):

```typescript
// Auth middleware resolves auth level on every request
// Routes enforce minimum auth level:
// /api/public/*     — ANONYMOUS
// /api/preview/*    — PREVIEW
// /api/user/*       — OAUTH
// /api/billing/*    — FULL
// /api/admin/*      — FULL + admin role
```

### 7. Set Up Worker Secrets

Document the secrets that need to be set:

```bash
# Via Doppler (recommended)
doppler secrets set BETTER_AUTH_SECRET "<generated>"
doppler secrets set NEON_DATABASE_URL "<connection-string>"

# Via Wrangler (for deployed Workers)
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put NEON_DATABASE_URL
```

### 8. Configure White-Label (White-Label Mode Only)

If white-label:
- Enable Google Identity Platform in GCP console
- Document tenant pool creation for T1 partners
- Configure per-tenant SSO federation (SAML, OIDC)
- Set up `auth.customerdomain.tld` custom domains

### 9. Update Status

Update `.p4s/status.json`:

```json
{
  "auth": {
    "status": "completed",
    "completedAt": "<ISO 8601>",
    "mode": "simple|graduated|whitelabel",
    "betterAuth": true,
    "firebase": true,
    "authLevels": ["ANONYMOUS", "PREVIEW", "OAUTH", "FULL"],
    "oauthProviders": ["google", "github"],
    "authSubdomain": "auth.example.com",
    "workerMiddleware": true
  }
}
```

## Reference

- `skills/graduated-auth/skill.md` — full graduated auth specification
- `skills/graduated-auth/references/auth-layers.md` — three-layer setup
- `skills/graduated-auth/references/dns-patterns.md` — DNS configuration
- `skills/graduated-auth/templates/firebase-bridge.ts` — Firebase token verification
- `skills/graduated-auth/templates/oauth-graduation.ts` — OAuth upgrade flow
- `skills/graduated-auth/templates/worker-auth-mw.ts` — Worker middleware
- `shared/contracts/auth.ts` — auth type definitions
- `scaffold/greenfield/base/src/lib/auth/better-auth.ts` — auth factory template

## Completion

The user has a working graduated auth system with Better Auth sessions, optional Firebase identity, and Worker middleware enforcing auth levels. Users can progress from anonymous to full account without friction.

Update `.p4s/status.json` step `auth` status to `completed`.
