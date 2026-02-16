# Auth Graduation Pattern

How users progress from anonymous to fully authenticated across SyncUpSuite projects.

---

## The Spectrum

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ANONYMOUS │ → │ PREVIEW  │ → │  OAUTH   │ → │   FULL   │
│          │   │          │   │          │   │          │
│No identity│  │Session   │   │Google/   │   │Better Auth│
│Public     │  │cookie    │   │GitHub ID │   │+ Firebase │
│content    │  │Limited   │   │Profile   │   │RBAC, RLS  │
│only       │  │features  │   │access    │   │Full access│
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

---

## Auth Levels

### ANONYMOUS
- No identity attached
- Access to public content only
- No session, no cookies (beyond analytics)
- Suitable for: landing pages, documentation, pricing

### PREVIEW
- Lightweight session (cookie or KV-stored)
- Can submit inquiry forms, save preferences
- No OAuth identity yet
- Suitable for: product previews, trials, lead capture

### OAUTH
- Google or GitHub OAuth via clientId
- User has an identity (email, name, avatar)
- Stored in session cookie, minimal server state
- **Key**: Uses the same clientId that Firebase uses
- Suitable for: commenting, basic collaboration, community features

### FULL
- Better Auth session in Neon (`neon_auth` schema)
- RBAC roles and tenant-scoped permissions
- Firebase Identity Platform for advanced features
- Full RLS enforcement
- Suitable for: admin, billing, sensitive data, multi-tenant management

---

## The Graduation Mechanism

### OAuth → Full Account (The Smooth Path)

The critical insight: if you use the same Google OAuth `clientId` for lightweight OAuth AND Firebase Authentication, the user's identity is already known to Google. When they "graduate" to a full account:

1. User authenticates with Google OAuth (OAUTH level)
2. You store their `sub` (Google user ID), email, name
3. When full features are needed, create a Better Auth account linked to the same Google identity
4. No re-authentication — the OAuth token proves who they are
5. Firebase sees the same Google identity and links automatically

```typescript
// Graduation flow (simplified)
async function graduateToFullAccount(oauthUser: OAuthUser): Promise<FullAccount> {
  // Check if Better Auth account already exists
  const existing = await betterAuth.getAccountByEmail(oauthUser.email);
  if (existing) {
    // Link OAuth identity and create session
    return await betterAuth.linkAccount(existing.id, 'google', oauthUser.sub);
  }

  // Create new Better Auth account from OAuth identity
  const account = await betterAuth.createUser({
    email: oauthUser.email,
    name: oauthUser.name,
    image: oauthUser.avatar,
    accounts: [{ provider: 'google', providerAccountId: oauthUser.sub }]
  });

  // Assign to tenant
  await assignToTenant(account.id, resolveTenantFromContext());

  return account;
}
```

### Preview → OAuth (The Nudge)

When a PREVIEW user needs more access:

1. Show a non-blocking "Sign in with Google/GitHub" prompt
2. On success, upgrade their session from PREVIEW to OAUTH
3. Migrate any PREVIEW-level data (saved preferences, form drafts) to the authenticated identity

---

## Firebase's Role

Firebase provides **identity services only**:

| Firebase Does | Firebase Does Not |
|--------------|-------------------|
| Google Identity Platform | Database |
| Email delivery (password reset, verification) | Application hosting |
| `auth.domain.tld` hosting | Session management |
| Swiss residency (europe-west6) | Authorization/RBAC |
| White-label IdP pools (corporate) | Tenant resolution |
| OAuth provider management | API routing |

### auth.domain.tld Setup

1. Create Firebase project matching Google project ID (e.g., `brandsyncup-com`)
2. Enable Authentication in Firebase Console
3. Add `auth.domain.tld` to Firebase Hosting
4. Verify DNS ownership via TXT record
5. Configure OAuth providers (Google, GitHub)
6. Set region to `europe-west6` for Swiss residency

After setup, `auth.domain.tld` handles:
- Password reset emails
- Email verification
- OAuth redirect flows (if routed through Firebase)

The subdomain can stay on Firebase or redirect elsewhere — it depends on whether Firebase's email templates are actively used.

---

## Multi-Tenant Identity (Corporate / White-Label)

For T1 partners who need their own identity pools:

```
Google Identity Platform
├── Default Pool (platform users)
├── T1-A Pool (Corporate A employees)
│   └── SSO via Corporate A's Azure AD
├── T1-B Pool (Corporate B employees)
│   └── SSO via Corporate B's Okta
└── T1-C Pool (White-label partner)
    └── Custom domain + branded login
```

Each T1 can have:
- Custom OAuth providers (their own Google Workspace, Azure AD, Okta)
- Branded login pages
- Separate user directories
- All federated through Google Identity Platform's multi-tenant feature

---

## Worker Middleware Integration

```typescript
// Route-level access control
app.get('/api/public/*', noAuth());           // ANONYMOUS
app.get('/api/preview/*', requireAuth(AuthLevel.PREVIEW));
app.get('/api/content/*', requireAuth(AuthLevel.OAUTH));
app.get('/api/admin/*', requireAuth(AuthLevel.FULL));
app.get('/api/billing/*', requireAuth(AuthLevel.FULL, { role: 'admin' }));
```

The middleware resolves auth level from the request and attaches it to the context. Route handlers declare their minimum required level.

---

## Database Interaction by Auth Level

| Level | Database Access | Tenant Context |
|-------|----------------|----------------|
| ANONYMOUS | None (or read-only public cache) | Not set |
| PREVIEW | KV/R2 only (no PostgreSQL) | Not set |
| OAUTH | Read-only via Hyperdrive | Set from user's tenant |
| FULL | Full CRUD via Hyperdrive + RLS | Set and enforced |

---

## Implementation Checklist

- [ ] Configure Google OAuth clientId (same for lightweight + Firebase)
- [ ] Set up Firebase project with `auth.domain.tld`
- [ ] Implement Better Auth with Neon `neon_auth` schema
- [ ] Create Worker auth middleware with level resolution
- [ ] Implement graduation flow (OAuth → Full)
- [ ] Wire route-level guards
- [ ] Test each level independently
- [ ] Verify RLS enforcement at FULL level
- [ ] Test graduation path (no re-auth required)
