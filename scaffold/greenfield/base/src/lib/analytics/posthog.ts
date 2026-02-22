/**
 * PostHog Analytics Client — {{PROJECT_NAME}}
 *
 * BROWSER ONLY — do not import from Workers or SSR contexts.
 * posthog-js accesses window/document/navigator and will crash in non-browser environments.
 *
 * See: shared/conventions/analytics.md for full platform conventions.
 *
 * Doppler secrets required:
 *   VITE_PUBLIC_POSTHOG_KEY  — PostHog project API key
 *   VITE_PUBLIC_POSTHOG_HOST — Reverse proxy URL (production: https://pha.{{DOMAIN}})
 */

import posthog from "posthog-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POSTHOG_API_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

let initialized = false;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export function initPostHog(): void {
  if (typeof window === "undefined") return;
  if (initialized || !POSTHOG_API_KEY) {
    if (!POSTHOG_API_KEY && import.meta.env.DEV) {
      console.warn("[PostHog] VITE_PUBLIC_POSTHOG_KEY not configured — analytics disabled");
    }
    return;
  }

  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: "https://eu.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
    disable_session_recording: true,
    respect_dnt: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    ip: false,
  });

  initialized = true;
}

export function isPostHogAvailable(): boolean {
  return initialized && !!POSTHOG_API_KEY;
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export function identifyUser(
  userId: string,
  properties?: { email?: string; name?: string; tenantId?: string; role?: string; [key: string]: unknown }
): void {
  if (!isPostHogAvailable()) return;
  posthog.identify(userId, properties);
}

export function resetUser(): void {
  if (!isPostHogAvailable()) return;
  posthog.reset();
}

// ---------------------------------------------------------------------------
// Event tracking
// ---------------------------------------------------------------------------

export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!isPostHogAvailable()) return;
  posthog.capture(eventName, properties);
}

// Canonical event names for your product.
// Convention: {domain}:{action} (e.g., "brand:created", "auth:logged_in")
export const REQUIRED_EVENTS = {
  signed_up: "auth:signed_up",
  logged_in: "auth:logged_in",
  logged_out: "auth:logged_out",
} as const;

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

export const FEATURE_FLAGS = {} as const;

export type FeatureFlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export function isFeatureEnabled(flagName: string): boolean {
  if (!isPostHogAvailable()) return false;
  return posthog.isFeatureEnabled(flagName) ?? false;
}

export { posthog };
