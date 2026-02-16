# Graduated Auth Skill

## Purpose

Implement graduated authentication — the pattern where users progress from anonymous to fully authenticated without friction. No login walls. No forced sign-up. Users gain capabilities as they need them, and the system remembers them across transitions.

## The Graduation Spectrum

```
ANONYMOUS → PREVIEW/INQUIRY → OAUTH → FULL ACCOUNT
   ↓              ↓              ↓          ↓
 Browse        Submit form    Identity   Sessions,
 public        or request     confirmed  RBAC,
 content       preview        via Google tenant-scoped
                              or GitHub  permissions
```

Each level unlocks new capabilities without invalidating the previous state:

| Level | What the user did | What they can do | Auth infrastructure |
|-------|-------------------|------------------|---------------------|
| **ANONYMOUS** | Nothing (visited URL) | Browse public pages, view pricing, read docs | None required |
| **PREVIEW** | Submitted email via inquiry form, or entered a gated preview | Limited interaction: save preferences, receive emails, trial features | Cookie or KV-stored session, email captured |
| **OAUTH** | Signed in with Google or GitHub | Identity confirmed, personalized experience, comment/collaborate | OAuth token verified, minimal profile stored |
| **FULL** | Graduated to full account (explicit or automatic) | Full platform: RBAC, tenant membership, billing, admin features | Better Auth session + Firebase identity |

## The Key Insight

**Use the same Google/GitHub OAuth `clientId` for lightweight OAuth AND Firebase Authentication.**

When a user first clicks "Sign in with Google," the app uses a standard OAuth flow with your Google `clientId`. Firebase is not involved yet. The user gets OAUTH-level access.

When that user later needs full platform features (joins a tenant, needs RBAC, triggers billing), the system "graduates" them: it creates a Better Auth account using the same identity. Because Firebase Authentication is configured with the same Google `clientId`, the Firebase identity and the OAuth identity are the same person — same email, same `sub` claim. No re-authentication. No "link your accounts" flow. The user just gains new capabilities.

## Three Auth Layers

### Layer 1: Identity Provider — Firebase Auth / Google Identity Platform

**Role**: Identity verification ONLY. Firebase does not manage sessions, does not store application data, does not host the application.

**Responsibilities**:
- Google OAuth (via shared `clientId`)
- GitHub OAuth
- Email/password flows (registration, password reset, email verification)
- Hosting `auth.domain.tld` for email action URLs (verify email, reset password)
- Swiss data residency via `europe-west6` region
- White-label Identity Platform pools for corporate T1 customers

**What Firebase does NOT do**:
- Session management (that is Better Auth)
- Authorization/RBAC (that is Better Auth)
- Database storage (that is Neon)
- Application hosting (that is Cloudflare Workers)
- API authentication (that is Worker middleware)

**Configuration**:
- Firebase project per domain (matches GCP project: `brandsyncup-com`)
- Google Identity Platform enabled for multi-tenant support
- `auth.domain.tld` configured via Firebase Hosting for email flows
- Region: `europe-west6` (Zurich) for Swiss compliance

### Layer 2: Session & Authorization — Better Auth in Neon PostgreSQL

**Role**: Once a user is identified (by any means), Better Auth manages what they can do.

**Responsibilities**:
- Session creation and management (7-day expiry, refresh tokens)
- Role-Based Access Control (RBAC)
- Tenant-scoped permissions (user X has role Y in tenant Z)
- Organization/team membership
- Session storage in `neon_auth` schema (shared across SyncUpSuite apps)

**Schema**: `neon_auth` in the shared Neon project. This schema is the single source of truth for:
- `user` — canonical user record
- `session` — active sessions with expiry
- `account` — linked OAuth providers
- `verification` — email/phone verification tokens
- `organization`, `member` — tenant membership and roles

### Layer 3: Multi-Tenant IdP — Google Identity Platform

**Role**: Per-T1 (partner/enterprise) identity pools for white-label authentication.

**Responsibilities**:
- Corporate customers get their own identity pool
- SSO integration (SAML, OIDC) per T1 tenant
- Custom branding on auth screens per T1
- Federated identity across T1 boundaries when needed

**When this activates**: Only when a T1 tenant requires white-label auth (their own domain, their own branding, their own SSO provider). Most projects start without this layer and activate it on demand.

## When to Use Which Layer

```
Route: /pricing (public)
→ No auth check. ANONYMOUS level. Serve the page.

Route: /preview/report (gated content)
→ Check for PREVIEW cookie/session. If missing, show inquiry form.
→ On form submit, store email in KV, set PREVIEW cookie.

Route: /dashboard (personalized)
→ Check for OAUTH or FULL. If missing, show "Sign in with Google/GitHub."
→ On OAuth success, store minimal profile, set OAUTH cookie.

Route: /settings/billing (full platform)
→ Require FULL auth level. If user is OAUTH, trigger graduation.
→ Graduation: create Better Auth account from OAuth identity, redirect back.

Route: /admin/tenants (admin)
→ Require FULL auth level + admin role via Better Auth RBAC.
```

## Firebase's Precise Role

Firebase is an **identity service** in this architecture. Think of it as a managed identity provider that handles the messy parts of auth (email delivery, password hashing, OAuth provider integration, email verification flows) so that Better Auth does not have to.

```
User clicks "Sign in with Google"
  → Google OAuth consent screen (YOUR clientId)
  → Token returned to Worker
  → Worker verifies token
  → Worker creates/updates Better Auth session
  → Firebase is NOT involved yet

User clicks "Reset password"
  → Firebase handles the email flow
  → auth.domain.tld hosts the password reset page
  → Firebase verifies the new password
  → Worker is notified or polls for changes
  → Better Auth session continues unchanged

Corporate customer needs SSO
  → Google Identity Platform tenant pool created
  → Customer's IdP (Okta, Azure AD) federated
  → auth.customerdomain.tld configured
  → Worker validates tokens from this pool
  → Better Auth session created as normal
```

## DNS Patterns for auth.domain.tld

The `auth.` subdomain serves Firebase Hosting for email action URLs:

```
auth.brandsyncup.com → Firebase Hosting (email flows)
app.brandsyncup.com  → Cloudflare Workers (application)
brandsyncup.com      → Cloudflare Workers (marketing/app)
```

**Initial setup**:
1. Add `auth.domain.tld` as a custom domain in Firebase Hosting
2. Firebase provides verification TXT record and A/AAAA records
3. Add DNS records (can be in Cloudflare DNS, but proxy MUST be disabled/DNS-only for Firebase)
4. Firebase provisions SSL certificate automatically

See `references/dns-patterns.md` for detailed configuration.

## Worker Middleware Integration

Every request passes through auth middleware that resolves the current auth level:

```typescript
// In your Worker entry point
import { authMiddleware, requireAuth, AuthLevel } from './auth/middleware';

// Middleware resolves auth state on every request
app.use('*', authMiddleware());

// Route guards enforce minimum auth level
app.get('/api/public/*', handler);                           // ANONYMOUS OK
app.get('/api/preview/*', requireAuth(AuthLevel.PREVIEW), handler);
app.get('/api/user/*', requireAuth(AuthLevel.OAUTH), handler);
app.post('/api/billing/*', requireAuth(AuthLevel.FULL), handler);
app.all('/api/admin/*', requireAuth(AuthLevel.FULL, 'admin'), handler);
```

The middleware:
1. Checks for `Authorization: Bearer <token>` header (API clients)
2. Checks for session cookie (browser clients)
3. Checks for preview/inquiry cookie (limited access)
4. Falls back to ANONYMOUS
5. Attaches resolved `AuthContext` to the request

See `templates/worker-auth-mw.ts` for the full implementation.

## Template Files

| File | Purpose |
|------|---------|
| `templates/firebase-bridge.ts` | Firebase token verification and Better Auth session creation |
| `templates/oauth-graduation.ts` | Lightweight OAuth to full account upgrade flow |
| `templates/worker-auth-mw.ts` | Cloudflare Worker middleware for auth level resolution |

## Reference Files

| File | Purpose |
|------|---------|
| `references/auth-layers.md` | Detailed setup for all three auth layers |
| `references/dns-patterns.md` | DNS configuration for auth subdomains |

## Adapting This Skill

**Greenfield project**: Use all templates as-is. Configure Firebase project, set up `auth.domain.tld`, wire up Worker middleware.

**Brownfield project (already has auth)**: Map existing auth to graduation levels. Introduce ANONYMOUS and PREVIEW levels first (no breaking changes). Then bridge existing identity to Better Auth if not already using it.

**Simple project (no multi-tenant)**: Skip Layer 3 entirely. Use Layer 1 (Firebase) and Layer 2 (Better Auth) only. Hardcode `tenant_id` in Better Auth. The multi-tenant machinery exists but stays dormant.
