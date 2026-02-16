# Auth Layers Reference

Detailed setup and configuration for the three-layer graduated authentication architecture.

---

## Layer 1: Identity Provider (Firebase Auth / Google Identity Platform)

Firebase serves as a managed identity provider. It handles the messy, security-critical parts of identity verification so your application does not have to implement them from scratch.

### What Firebase Does

- Google OAuth consent flow
- GitHub OAuth consent flow
- Email/password registration and login
- Email verification (sends verification emails)
- Password reset (sends reset emails, hosts reset page)
- Phone authentication (if needed)
- Identity token issuance (JWT ID tokens)

### What Firebase Does NOT Do

- Session management (Better Auth handles this)
- Authorization / RBAC (Better Auth handles this)
- Application data storage (Neon handles this)
- Application hosting (Cloudflare Workers handles this)
- API authentication (Worker middleware handles this)

### Setup Instructions

#### 1. Create Firebase Project

The Firebase project should match your GCP project naming convention:

```
Domain:           brandsyncup.com
GCP Project ID:   brandsyncup-com
Firebase Project:  brandsyncup-com (same)
```

Steps:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Select your existing GCP project (`brandsyncup-com`) or create new
4. Enable Google Analytics if desired (optional)
5. Finish setup

#### 2. Enable Authentication Providers

In Firebase Console > Authentication > Sign-in method:

**Google OAuth:**
1. Enable Google provider
2. Set project support email
3. Note: Firebase uses the same Google OAuth `clientId` that you configure for the Web app. This is the key to seamless graduation.

**GitHub OAuth:**
1. Enable GitHub provider
2. Create a GitHub OAuth App at https://github.com/settings/developers
3. Set Authorization callback URL to: `https://brandsyncup-com.firebaseapp.com/__/auth/handler`
4. Enter Client ID and Client Secret in Firebase Console

**Email/Password:**
1. Enable Email/Password provider
2. Enable Email link (passwordless) sign-in if desired
3. Configure email templates (Firebase Console > Authentication > Templates)

#### 3. Configure auth.domain.tld

See `dns-patterns.md` for detailed DNS setup.

In Firebase Console > Hosting:
1. Click "Add custom domain"
2. Enter `auth.yourdomain.tld`
3. Follow DNS verification steps
4. Firebase provisions SSL automatically

The `auth.` subdomain hosts Firebase's default auth action pages:
- Email verification landing page
- Password reset form
- Email link sign-in confirmation

#### 4. Customize Auth Action URLs

In Firebase Console > Authentication > Templates, update action URLs:

```
Action URL: https://auth.brandsyncup.com/__/auth/action
Continue URL: https://app.brandsyncup.com/auth/complete
```

This means:
- User clicks email link -> lands on `auth.brandsyncup.com` (Firebase Hosting)
- After action completes -> redirects to `app.brandsyncup.com` (Cloudflare Worker)

### Google Identity Platform Configuration

Google Identity Platform is the enterprise layer on top of Firebase Auth. It adds multi-tenant support for white-label scenarios.

#### Enable Identity Platform

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to Security > Identity Platform
3. Click "Enable" (this upgrades Firebase Auth to Identity Platform)
4. All existing Firebase Auth configuration is preserved

#### Swiss Data Residency (europe-west6)

For Swiss compliance, configure the Identity Platform to store data in Zurich:

1. When creating the GCP project, set the location to `europe-west6`
2. In Identity Platform settings, verify the data storage region
3. Note: Some Identity Platform features have region restrictions. Check the [Google Cloud regions page](https://cloud.google.com/identity-platform/docs/locations) for current support.

Firebase configuration in code:

```typescript
// firebase-config.ts
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'your-api-key',            // OK to expose — this is a public identifier
  authDomain: 'auth.brandsyncup.com', // Custom domain, not default .firebaseapp.com
  projectId: 'brandsyncup-com',
  storageBucket: 'brandsyncup-com.firebasestorage.app',
  messagingSenderId: '...',
  appId: '...',
};

export const app = initializeApp(firebaseConfig);
```

The `apiKey` in Firebase config is NOT a secret. It is a public identifier that restricts which APIs can be called. It is safe to include in client-side code. Security is enforced by Firebase Security Rules and server-side token verification.

---

## Layer 2: Session & Authorization (Better Auth in Neon PostgreSQL)

Better Auth manages what authenticated users can do. It stores sessions, roles, and tenant memberships in the `neon_auth` schema of the shared Neon PostgreSQL project.

### neon_auth Schema Structure

Better Auth creates and manages these tables in the `neon_auth` schema:

```sql
-- Core user table
CREATE TABLE neon_auth.user (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT,
  email         TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  image         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Active sessions
CREATE TABLE neon_auth.session (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Linked OAuth accounts (one user can have multiple providers)
CREATE TABLE neon_auth.account (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id               TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  account_id            TEXT NOT NULL,        -- Provider's user ID
  provider_id           TEXT NOT NULL,        -- 'google', 'github', 'credential'
  access_token          TEXT,
  refresh_token         TEXT,
  access_token_expires_at TIMESTAMPTZ,
  scope                 TEXT,
  id_token              TEXT,
  password              TEXT,                 -- Hashed, only for credential provider
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, account_id)
);

-- Email/phone verification tokens
CREATE TABLE neon_auth.verification (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier  TEXT NOT NULL,                  -- Email or phone number
  value       TEXT NOT NULL,                  -- Verification code/token
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Organizations (tenants)
CREATE TABLE neon_auth.organization (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  logo        TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Organization membership with roles
CREATE TABLE neon_auth.member (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES neon_auth.organization(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);
```

### Session Management

**Session lifetime**: 7 days (configurable per project).

**Session flow**:
1. User authenticates (any method)
2. Better Auth creates a `session` row with a unique `token` and `expires_at`
3. Token is set as an HTTP-only cookie (`syncup_session`)
4. On each request, middleware looks up the session by token
5. If expired, the session is deleted and user must re-authenticate
6. Active sessions can be refreshed (slide expiry window)

**Better Auth configuration**:

```typescript
// better-auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      // Map to neon_auth schema tables
      user: neonAuthUser,
      session: neonAuthSession,
      account: neonAuthAccount,
      verification: neonAuthVerification,
    },
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24,     // Refresh if older than 1 day
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization({
      // Tenant/organization support
      allowUserToCreateOrganization: false,
      // Organizations are created by platform admins
    }),
  ],
});
```

### RBAC Model

Roles are stored in the `member.role` column, scoped to an organization (tenant).

**Standard roles**:

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| `owner` | Tenant owner | Full access, billing, member management |
| `admin` | Tenant administrator | Feature management, user invites, settings |
| `member` | Regular member | Standard feature access |
| `viewer` | Read-only access | View dashboards, reports |
| `billing` | Billing contact | Invoice access, payment methods |

**Role checking in code**:

```typescript
// In Worker middleware (after auth resolution)
if (auth.hasRole('admin')) {
  // Admin-only logic
}

// In Better Auth query
const members = await auth.api.listOrganizationMembers({
  organizationId: tenantId,
});
```

### Tenant-Scoped Permissions

Every data query must be scoped to the active tenant. The auth middleware resolves both the user's identity AND their tenant context.

```typescript
// CORRECT: Always scope queries to tenant
const projects = await db.query.projects.findMany({
  where: eq(projects.tenantId, auth.tenantId),
});

// WRONG: Never query without tenant scope
const projects = await db.query.projects.findMany();
```

The `tenantId` comes from:
1. The authenticated session's tenant membership (server-side only — never from client headers)
2. The user's default organization in Better Auth
3. A single hardcoded value (for single-tenant deployments)

---

## Layer 3: Multi-Tenant IdP (Google Identity Platform)

This layer activates when a T1 (partner/enterprise) customer needs their own branded authentication experience.

### When to Use This Layer

- Customer wants their employees to sign in with their corporate SSO (Okta, Azure AD)
- Customer wants `auth.theirdomain.com` instead of your auth domain
- Customer has regulatory requirements for identity management
- Customer wants to manage their own user directory

### Per-T1 Identity Pools

Google Identity Platform supports "tenants" (not to be confused with your application tenants). Each Identity Platform tenant is an isolated identity pool.

**Setup per T1 customer**:

1. Create an Identity Platform tenant:
   ```bash
   gcloud identity-platform tenants create \
     --display-name="Acme Corp" \
     --project=brandsyncup-com
   ```

2. Note the tenant ID (e.g., `tenant-acme-xyz123`)

3. Configure allowed identity providers for this tenant:
   ```bash
   # Enable Google sign-in for this tenant
   gcloud identity-platform tenants update tenant-acme-xyz123 \
     --enable-google-signin \
     --project=brandsyncup-com

   # Add SAML provider (customer's Okta)
   gcloud identity-platform tenants idp-configs create \
     --tenant=tenant-acme-xyz123 \
     --type=saml \
     --idp-entity-id="https://acme.okta.com/..." \
     --sso-url="https://acme.okta.com/sso/saml" \
     --idp-certificates="cert.pem" \
     --sp-entity-id="https://auth.brandsyncup.com" \
     --project=brandsyncup-com
   ```

4. Map the Identity Platform tenant to your application tenant:
   ```sql
   -- In your app schema, not neon_auth
   INSERT INTO brandsyncup.tenant_idp_mapping (
     tenant_id,
     idp_tenant_id,
     domain
   ) VALUES (
     'acme-corp-tenant-id',          -- Your app's tenant ID
     'tenant-acme-xyz123',           -- Identity Platform tenant ID
     'auth.acmecorp.com'             -- Custom auth domain
   );
   ```

### White-Label Configuration

Each T1 customer can customize:

**Auth screen branding** (via Identity Platform console or API):
- Logo
- Background color
- Terms of service URL
- Privacy policy URL

**Custom domain** (`auth.customerdomain.com`):
- Customer adds DNS records pointing to Firebase Hosting
- Firebase provisions SSL
- Auth flows use the customer's domain

**Federated identity providers**:
- SAML 2.0 (Okta, Azure AD, OneLogin, etc.)
- OIDC (any compliant provider)
- Social providers (can be restricted per tenant)

### Corporate Customer SSO Integration

Typical flow for a corporate customer SSO setup:

```
1. Customer provides:
   - SAML metadata XML (or OIDC discovery URL)
   - List of allowed domains (e.g., @acmecorp.com)
   - Desired auth domain (auth.acmecorp.com)

2. Platform admin:
   - Creates Identity Platform tenant
   - Configures SAML/OIDC provider
   - Sets up custom domain (see dns-patterns.md)
   - Maps IdP tenant to app tenant

3. At runtime:
   - User visits app, selects "Sign in with SSO"
   - App detects user's email domain (@acmecorp.com)
   - Redirects to correct Identity Platform tenant
   - Identity Platform handles SAML/OIDC flow with customer's IdP
   - Returns ID token to Worker
   - Worker creates/updates Better Auth session
   - User lands in their tenant with correct RBAC
```

### Token Verification with Tenants

When verifying Firebase ID tokens from a multi-tenant setup, include the tenant ID:

```typescript
import { verifyFirebaseToken } from '../templates/firebase-bridge';

const claims = await verifyFirebaseToken(idToken, 'brandsyncup-com');

// Check tenant claim
if (claims.firebase_tenant) {
  // User authenticated via a tenant-specific IdP
  const tenantMapping = await db.query.tenantIdpMapping.findFirst({
    where: eq(tenantIdpMapping.idpTenantId, claims.firebase_tenant),
  });

  if (!tenantMapping) {
    throw new Error('Unknown Identity Platform tenant');
  }

  // Use tenantMapping.tenantId for Better Auth session creation
}
```

### Relationship Between Layers

```
Layer 3 (Multi-Tenant IdP)
  ↓ Issues Firebase ID token with tenant claim
Layer 1 (Firebase / Identity Platform)
  ↓ Token verified by Worker middleware
Layer 2 (Better Auth in Neon)
  ↓ Session created, RBAC resolved
Application
  ↓ User has access scoped to their tenant
```

For most projects, Layer 3 is dormant. Layers 1 and 2 handle all authentication needs. Layer 3 activates only when a T1 customer requires white-label SSO.
