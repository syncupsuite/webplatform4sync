/**
 * Canonical authentication types and constants.
 *
 * The graduated auth spectrum: ANONYMOUS → PREVIEW → OAUTH → FULL
 * Each level unlocks more functionality. The same Google/GitHub clientId
 * is used at OAUTH and FULL levels, enabling seamless graduation.
 */

// ---------------------------------------------------------------------------
// Auth Levels
// ---------------------------------------------------------------------------

export enum AuthLevel {
  /** No authentication. Public access only. */
  ANONYMOUS = 'anonymous',
  /** Email captured via inquiry/preview form. Limited interaction. */
  PREVIEW = 'preview',
  /** Identity confirmed via Google/GitHub OAuth. Personalized experience. */
  OAUTH = 'oauth',
  /** Full Better Auth session. RBAC, tenant membership, billing. */
  FULL = 'full',
}

/**
 * Numeric ordering for level comparisons.
 *
 * Usage:
 *   if (AUTH_LEVEL_ORDER[current] >= AUTH_LEVEL_ORDER[required]) { ... }
 */
export const AUTH_LEVEL_ORDER: Record<AuthLevel, number> = {
  [AuthLevel.ANONYMOUS]: 0,
  [AuthLevel.PREVIEW]: 1,
  [AuthLevel.OAUTH]: 2,
  [AuthLevel.FULL]: 3,
} as const;

// ---------------------------------------------------------------------------
// Auth State Types (discriminated union)
// ---------------------------------------------------------------------------

export interface AnonymousAuth {
  level: AuthLevel.ANONYMOUS;
}

export interface PreviewAuth {
  level: AuthLevel.PREVIEW;
  email: string;
  previewSessionId: string;
}

export interface OAuthAuth {
  level: AuthLevel.OAUTH;
  provider: string;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export interface FullAuth {
  level: AuthLevel.FULL;
  userId: string;
  sessionId: string;
  email: string;
  name?: string;
  picture?: string;
  roles: string[];
  tenantId: string;
  tenantRole?: string;
}

export type AuthState = AnonymousAuth | PreviewAuth | OAuthAuth | FullAuth;

// ---------------------------------------------------------------------------
// Better Auth Table Names (singular — matches Better Auth convention)
// ---------------------------------------------------------------------------

export const AUTH_TABLES = {
  user: 'user',
  session: 'session',
  account: 'account',
  verification: 'verification',
  organization: 'organization',
  member: 'member',
} as const;

export const AUTH_SCHEMA = 'neon_auth' as const;

// ---------------------------------------------------------------------------
// Session Cookie Defaults
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = {
  name: 'better-auth.session_token',
  maxAge: 7 * 24 * 60 * 60, // 7 days
  httpOnly: true,
  secure: true,
  sameSite: 'Lax' as const,
  path: '/',
} as const;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure session ID.
 * 32 bytes (256 bits) of randomness, hex-encoded.
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
