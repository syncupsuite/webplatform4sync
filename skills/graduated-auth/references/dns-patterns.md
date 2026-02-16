# DNS Patterns for Auth

Configuration patterns for `auth.domain.tld` subdomains used in graduated authentication.

---

## Overview

The `auth.` subdomain hosts Firebase's authentication action pages — email verification, password reset, and email link sign-in. This subdomain is managed by Firebase Hosting and is separate from your application's domain on Cloudflare Workers.

```
auth.brandsyncup.com  → Firebase Hosting (auth action pages)
app.brandsyncup.com   → Cloudflare Workers (application)
brandsyncup.com       → Cloudflare Workers (marketing site / app)
api.brandsyncup.com   → Cloudflare Workers (API, optional)
```

---

## Initial Firebase Hosting Setup for auth.domain.tld

### Prerequisites

- Firebase project created and linked to your GCP project
- Firebase Authentication enabled with at least one provider
- Access to DNS management for your domain (typically Cloudflare)

### Step 1: Initialize Firebase Hosting

If not already initialized:

```bash
# In your project directory
firebase init hosting

# Select your Firebase project
# Set public directory to a minimal folder (e.g., 'auth-public')
# Configure as single-page app: No
# Automatic builds: No
```

Create a minimal `auth-public/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=https://brandsyncup.com">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="https://brandsyncup.com">brandsyncup.com</a>...</p>
</body>
</html>
```

This page is only shown if someone visits `auth.brandsyncup.com` directly. The actual auth action pages (`/__/auth/action`) are served by Firebase automatically.

### Step 2: Deploy Firebase Hosting

```bash
firebase deploy --only hosting
```

This makes the default Firebase Hosting URL active (e.g., `brandsyncup-com.web.app`).

### Step 3: Add Custom Domain

In Firebase Console > Hosting > Custom domains:

1. Click "Add custom domain"
2. Enter: `auth.brandsyncup.com`
3. Firebase shows DNS records to add

### Step 4: DNS Verification

Firebase requires domain ownership verification before provisioning SSL.

**Option A: TXT record verification (recommended)**

Firebase provides a TXT record to add:

```
Type:  TXT
Name:  auth          (or _acme-challenge.auth, depending on Firebase's request)
Value: firebase-site-verification=<unique-value>
TTL:   Auto (or 300)
```

**Option B: A record verification**

Firebase may also accept the A records directly as verification.

### Step 5: Add Hosting Records

After verification, add the A and AAAA records Firebase provides:

```
Type:  A
Name:  auth
Value: 151.101.1.195     (Firebase Hosting IP — check Firebase Console for current values)
TTL:   Auto

Type:  A
Name:  auth
Value: 151.101.65.195    (second A record)
TTL:   Auto
```

**IMPORTANT**: If your domain is on Cloudflare DNS, these records MUST have the proxy toggled OFF (DNS only / grey cloud). Firebase Hosting needs to terminate TLS directly. Cloudflare's proxy would intercept the connection and break Firebase's SSL provisioning.

```
Cloudflare DNS Settings:
  auth  A  151.101.1.195    DNS only (grey cloud)
  auth  A  151.101.65.195   DNS only (grey cloud)
```

### Step 6: SSL Provisioning

Firebase automatically provisions an SSL certificate for `auth.brandsyncup.com` after DNS records propagate. This usually takes 15-60 minutes but can take up to 24 hours.

Check status in Firebase Console > Hosting > Custom domains.

### Step 7: Configure Auth Action URLs

In Firebase Console > Authentication > Templates:

For each email template (email verification, password reset, email change):

1. Click the pencil icon to edit
2. Set "Action URL" to: `https://auth.brandsyncup.com/__/auth/action`
3. Set "Continue URL" to: `https://app.brandsyncup.com/auth/complete` (or wherever your app handles post-auth redirects)

---

## DNS Verification Process

### How Firebase Verifies Domain Ownership

Firebase uses one of these methods:
1. **TXT record**: Add a specific TXT record to prove DNS control
2. **Meta tag**: Add a meta tag to the root page (not practical for subdomains)
3. **File upload**: Host a verification file at a specific URL (not practical before hosting is live)

TXT records are the most reliable method for subdomains.

### Verification Troubleshooting

| Issue | Solution |
|-------|----------|
| "Verification failed" | Ensure TXT record has propagated (use `dig TXT auth.yourdomain.com`) |
| "Domain already in use" | Another Firebase project owns this domain. Remove it there first. |
| SSL not provisioning | Ensure A records are DNS-only (no Cloudflare proxy). Check for CAA records blocking Google's CA. |
| "Certificate pending" for >24h | Check for conflicting AAAA records. Remove any existing records for the subdomain before adding Firebase's. |

### Verify DNS Propagation

```bash
# Check TXT record
dig TXT auth.brandsyncup.com

# Check A records
dig A auth.brandsyncup.com

# Check from Google's perspective
dig @8.8.8.8 A auth.brandsyncup.com
```

---

## Options After Verification

Once `auth.domain.tld` is verified and working, you have options for the long-term setup.

### Option A: Keep on Firebase Hosting (Recommended)

Leave `auth.domain.tld` on Firebase Hosting permanently. Firebase serves the auth action pages and handles SSL renewal automatically.

**Pros**:
- Zero maintenance
- Firebase updates action pages automatically
- SSL auto-renewal
- Reliable email action handling

**Cons**:
- Firebase Hosting serves the pages (minimal control over UI)
- Separate infrastructure from your Cloudflare Workers

**When to use**: Most projects. The auth subdomain serves a narrow purpose (email actions) and does not need customization.

### Option B: Redirect to Worker (Advanced)

After verification, redirect `auth.domain.tld` to a Cloudflare Worker that handles auth actions with a custom UI.

**Steps**:
1. Keep Firebase Hosting active for initial verification and SSL
2. Create a Cloudflare Worker that handles `/__/auth/action` routes
3. Update DNS to point `auth.domain.tld` to Cloudflare (orange cloud proxy)
4. Worker verifies Firebase action codes and renders custom UI

**Pros**:
- Full control over auth action page UI
- Consistent design with your application
- Cloudflare edge performance

**Cons**:
- More work to implement and maintain
- Must handle Firebase action code verification yourself
- Risk of breaking email flows if implementation is wrong

**When to use**: Only when brand consistency on auth pages is a hard requirement (e.g., enterprise white-label).

### Option C: Hybrid (Firebase Hosting + Worker Redirect)

Firebase Hosting serves auth action pages, but a Cloudflare Worker handles the post-action redirect.

```
User clicks email link
  → auth.brandsyncup.com/__/auth/action (Firebase Hosting)
  → Firebase verifies email / resets password
  → Redirects to app.brandsyncup.com/auth/complete (Cloudflare Worker)
  → Worker creates Better Auth session and redirects to dashboard
```

This is effectively Option A with a well-designed continue URL. It is the recommended approach for most projects.

---

## SSL/TLS Considerations

### Firebase Hosting SSL

- Automatic provisioning via Let's Encrypt
- Automatic renewal
- Supports HSTS
- HTTP/2 enabled by default

### Cloudflare DNS + Firebase Hosting Interaction

When your domain's DNS is managed by Cloudflare:

1. **auth subdomain**: Must be DNS-only (grey cloud). Firebase needs direct access to provision and renew SSL.
2. **app/www subdomains**: Can use Cloudflare proxy (orange cloud). These point to Cloudflare Workers.
3. **Root domain**: Can use Cloudflare proxy. Points to Workers.

```
Cloudflare DNS Records:
  @     A     <CF Workers IP>        Proxied (orange)
  www   CNAME brandsyncup.com        Proxied (orange)
  app   CNAME brandsyncup.com        Proxied (orange)
  auth  A     151.101.1.195          DNS only (grey)
  auth  A     151.101.65.195         DNS only (grey)
```

### CAA Records

If you have CAA (Certificate Authority Authorization) records, ensure Google's certificate authorities are allowed:

```
Type:  CAA
Name:  auth
Value: 0 issue "pki.goog"
TTL:   Auto

Type:  CAA
Name:  auth
Value: 0 issue "letsencrypt.org"
TTL:   Auto
```

If you do not have CAA records, no action needed — all CAs are allowed by default.

---

## Multi-Domain Support (T1 Tenants)

When T1 (partner/enterprise) customers need their own auth domain.

### Pattern: auth.customerdomain.tld

Each T1 customer can have `auth.theirdomain.com` for white-label authentication.

**Setup per T1 customer**:

1. **Customer action**: Add DNS records pointing `auth.theirdomain.com` to Firebase Hosting IPs

   ```
   auth  A  151.101.1.195    (DNS only, no proxy)
   auth  A  151.101.65.195   (DNS only, no proxy)
   ```

2. **Platform admin action**: Add custom domain in Firebase Hosting

   ```bash
   # Via Firebase CLI or Console
   firebase hosting:channel:deploy auth-theirdomain \
     --expires 365d \
     --site auth-theirdomain-com
   ```

   Or more commonly, via Firebase Console > Hosting > Add custom domain.

3. **Platform admin action**: Map domain to Identity Platform tenant

   Store the mapping in your application database:

   ```sql
   INSERT INTO brandsyncup.tenant_auth_domains (
     tenant_id,
     auth_domain,
     idp_tenant_id,
     firebase_site_id,
     status
   ) VALUES (
     'acme-corp',
     'auth.acmecorp.com',
     'tenant-acme-xyz123',
     'auth-acmecorp-com',
     'provisioning'
   );
   ```

4. **Automated**: Firebase provisions SSL for the custom domain

5. **Platform admin action**: Update email templates for this tenant to use their auth domain

### DNS Requirements for T1 Customers

Provide customers with these instructions:

```
Add the following DNS records for auth.yourdomain.com:

Type: A
Name: auth
Value: 151.101.1.195

Type: A
Name: auth
Value: 151.101.65.195

IMPORTANT:
- If using Cloudflare, set proxy to DNS-only (grey cloud)
- Do not add AAAA records unless instructed
- Allow 24-48 hours for SSL provisioning

Verification:
  We will send a verification email once SSL is active.
  You can check DNS propagation at: https://dnschecker.org
```

### Managing Multiple Auth Domains

Firebase Hosting supports multiple custom domains per project. Each T1 customer's auth domain is added as a separate custom domain.

```
Firebase Hosting Custom Domains:
  auth.brandsyncup.com      → Platform default
  auth.acmecorp.com         → T1: Acme Corp
  auth.globalpartners.com   → T1: Global Partners
  auth.enterprise.example   → T1: Enterprise Example
```

All domains serve the same Firebase Hosting content (auth action pages) but the Identity Platform tenant context differs based on the domain.

### Auth Domain Routing in Firebase

Firebase Auth action URLs include query parameters that identify the tenant:

```
https://auth.acmecorp.com/__/auth/action?
  mode=verifyEmail&
  oobCode=<code>&
  tenantId=tenant-acme-xyz123&
  continueUrl=https://app.brandsyncup.com/auth/complete?tenant=acme-corp
```

The `tenantId` parameter tells Firebase which Identity Platform tenant to use. The `continueUrl` includes your application's tenant identifier so the Worker knows which tenant context to activate after the auth action.

---

## Cloudflare DNS Integration

### Recommended Cloudflare DNS Configuration

For a typical project with graduated auth:

```
# Application (Cloudflare Workers)
@       A       192.0.2.1              Proxied    # Workers route
www     CNAME   brandsyncup.com        Proxied    # Redirect to root
app     CNAME   brandsyncup.com        Proxied    # App subdomain

# Auth (Firebase Hosting)
auth    A       151.101.1.195          DNS only   # Firebase Hosting
auth    A       151.101.65.195         DNS only   # Firebase Hosting

# Verification (added during Firebase setup, can remove after)
auth    TXT     firebase-site-verification=<value>  DNS only

# Email (if using custom email domain)
@       MX      10 mx.example.com      DNS only
@       TXT     v=spf1 include:_spf.google.com ~all
```

### Cloudflare Page Rules (Optional)

If you want to redirect bare `auth.domain.tld` to your app (for users who type it directly):

Since the auth subdomain is DNS-only, Cloudflare Page Rules will not apply. Instead, handle this in the Firebase Hosting configuration:

```json
// firebase.json
{
  "hosting": {
    "public": "auth-public",
    "redirects": [
      {
        "source": "/",
        "destination": "https://brandsyncup.com",
        "type": 302
      }
    ],
    "rewrites": []
  }
}
```

This redirects `https://auth.brandsyncup.com/` to your main site while preserving `/__/auth/action` routes for Firebase's auth handling.
