# Analytics Conventions

All SyncUpSuite products use **PostHog** (EU instance) for analytics, feature flags, and session recording.

Last verified against BrandSyncUp production: 2026-02-21.

## PostHog Project Strategy

Each product gets its own PostHog project for product analytics. A shared **platform project** captures server-side cross-product metrics.

| PostHog Project | Scope | Key Location | Host in Production |
|----------------|-------|--------------|-------------------|
| `brandsyncup-com` | BSU client-side product analytics | Doppler `brandsyncup-com` → `VITE_PUBLIC_POSTHOG_KEY` | `pha.brandsyncup.com` |
| `legalsyncup-com` | LSU client-side product analytics | Doppler `legalsyncup-com` → `VITE_PUBLIC_POSTHOG_KEY` | `pha.legalsyncup.com` |
| `syncupsuite-com` | Website analytics | Doppler `syncupsuite-com` → `VITE_PUBLIC_POSTHOG_KEY` | `pha.syncupsuite.com` |
| `syncupsuite-platform` | Server-side cross-product | Doppler `brandsyncup-com` + `legalsyncup-com` → `POSTHOG_PLATFORM_KEY` | Direct to `eu.i.posthog.com` |

## Doppler Secrets

Client-side (per product):

| Secret | Purpose | Example Value |
|--------|---------|---------------|
| `VITE_PUBLIC_POSTHOG_KEY` | PostHog project API key (public, client-side) | `phc_...` |
| `VITE_PUBLIC_POSTHOG_HOST` | Reverse proxy URL (production) or direct URL (dev) | `https://pha.brandsyncup.com` |

Server-side (platform project, optional):

| Secret | Purpose |
|--------|---------|
| `POSTHOG_PLATFORM_KEY` | Platform PostHog project API key |
| `POSTHOG_PLATFORM_HOST` | Platform PostHog host (usually direct `https://eu.i.posthog.com`) |

## Reverse Proxy (DNS)

All products use a first-party reverse proxy subdomain to avoid ad blockers:

```
pha.{domain} → PostHog-managed CNAME → europehog.com
```

### DNS Configuration

| Record | Type | Value | Cloudflare Proxy |
|--------|------|-------|-----------------|
| `pha.{domain}` | CNAME | `{hash}.cf-prod-eu-proxy.europehog.com` | **DNS-only (grey cloud)** |

The CNAME target is provided by PostHog when you configure a reverse proxy in the PostHog dashboard (Settings → Reverse Proxy).

**Important**: DNS-only mode (grey cloud) is required — Cloudflare's orange-cloud proxy breaks PostHog's managed proxy certificates.

### Environment-Specific Hosts

| Environment | `VITE_PUBLIC_POSTHOG_HOST` |
|-------------|--------------------------|
| Development | `https://eu.i.posthog.com` (direct) |
| Staging | `https://eu.i.posthog.com` (direct) |
| Production | `https://pha.{domain}` (reverse proxy) |

## Client-Side Integration

### Dependencies

```json
{
  "dependencies": {
    "posthog-js": "^1.x"
  }
}
```

### Initialization Pattern

Create `src/lib/posthog.ts`:

```typescript
import posthog from 'posthog-js';

const POSTHOG_API_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let initialized = false;

export function initPostHog(): void {
  if (initialized || !POSTHOG_API_KEY) return;

  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: 'https://eu.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    disable_session_recording: true,
    respect_dnt: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    ip: false,
  });

  initialized = true;
}
```

**Note**: `ui_host` must be set to `https://eu.posthog.com` when using a reverse proxy. Without this, session replay links in the PostHog dashboard will point to the proxy host instead of the PostHog UI.

### React Provider

Wrap the app with `PostHogProvider` in `main.tsx`:

```tsx
import { PostHogProvider } from 'posthog-js/react';

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || '';
const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  ui_host: 'https://eu.posthog.com',
  // ... same options as above
};

// In render:
{posthogKey ? (
  <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
    <App />
  </PostHogProvider>
) : (
  <App />
)}
```

### User Identification

Call after login:

```typescript
posthog.identify(userId, {
  email,
  name,
  tenantId,
  role,
});
```

Call on logout:

```typescript
posthog.reset();
```

## Event Naming Convention

Events use `{domain}:{action}` format:

```
auth:signed_up
auth:logged_in
brand:created
asset:uploaded
subscription:checkout_started
onboarding:step_completed
```

Each product defines its own canonical event names in `src/lib/posthog.ts` as a `REQUIRED_EVENTS` const. This ensures type-safe event tracking across the codebase.

## Feature Flags

PostHog feature flags are used for:
- Progressive rollouts
- A/B testing (pricing pages, onboarding flows)
- Kill switches (disable features without deploys)
- Beta feature gating

Define flags as a typed const object in `src/lib/posthog.ts`:

```typescript
export const FEATURE_FLAGS = {
  DARK_MODE_ENABLED: 'dark-mode-enabled',
  NEW_DASHBOARD_UI: 'new-dashboard-ui',
} as const;

export type FeatureFlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
```

## Privacy Requirements

All products must:
- Set `respect_dnt: true` — honor Do Not Track browser headers
- Set `ip: false` — disable IP-based geolocation (EU compliance)
- Set `mask_all_text: true` — mask PII in session recordings
- Default `disable_session_recording: true` — opt-in only
- Use EU instance (`eu.i.posthog.com`) — data stays in EU

## Greenfield Scaffold

The greenfield scaffold includes a minimal PostHog setup. See `scaffold/greenfield/base/src/lib/analytics/posthog.ts`.
