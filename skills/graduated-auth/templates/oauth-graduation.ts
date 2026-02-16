/**
 * OAuth Graduation Flow
 *
 * Implements the lightweight OAuth -> Full Account upgrade path.
 * Users start with standard Google/GitHub OAuth (just clientId, no Firebase SDK).
 * When they need full features, their existing OAuth identity is used to create
 * a Better Auth account — no re-authentication required.
 *
 * The critical design decision: the same Google/GitHub clientId is used for both
 * the lightweight OAuth flow AND Firebase Authentication. This means the user's
 * identity (email, sub claim) is identical in both systems, making "graduation"
 * a backend operation invisible to the user.
 *
 * Dependencies:
 *   - better-auth (session management)
 *   - drizzle-orm (if using direct DB queries for KV fallback)
 *
 * Environment bindings (wrangler.toml):
 *   - GOOGLE_CLIENT_ID: string
 *   - GOOGLE_CLIENT_SECRET: string (only needed for code exchange)
 *   - GITHUB_CLIENT_ID: string
 *   - GITHUB_CLIENT_SECRET: string (only needed for code exchange)
 *   - OAUTH_SESSION_KV: KVNamespace (for lightweight session storage)
 *   - BETTER_AUTH_SECRET: string
 */

import {
  AuthLevel,
  type OAuthAuth,
  type FullAuth,
  type BetterAuthInstance,
  type GraduationResult,
  graduateFromOAuth,
} from './firebase-bridge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported OAuth providers for lightweight flow. */
export type OAuthProvider = 'google' | 'github';

/** Minimal user profile extracted from OAuth token/API. */
export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
}

/** Lightweight OAuth session stored in KV. */
export interface OAuthSession {
  id: string;
  provider: OAuthProvider;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  createdAt: number;
  expiresAt: number;
}

/** Configuration for the OAuth graduation flow. */
export interface OAuthGraduationConfig {
  /** Google OAuth client ID (same one used by Firebase) */
  googleClientId: string;
  /** Google OAuth client secret */
  googleClientSecret: string;
  /** GitHub OAuth client ID */
  githubClientId: string;
  /** GitHub OAuth client secret */
  githubClientSecret: string;
  /** KV namespace for lightweight session storage */
  sessionKv: KVNamespace;
  /** Better Auth instance for full account creation */
  betterAuth: BetterAuthInstance;
  /** Default tenant ID for graduated users */
  defaultTenantId: string;
  /** Cookie name for lightweight OAuth session */
  sessionCookieName?: string;
  /** Session TTL in seconds (default: 7 days) */
  sessionTtlSeconds?: number;
  /** Base URL for OAuth callbacks (e.g., https://app.brandsyncup.com) */
  baseUrl: string;
}

// ---------------------------------------------------------------------------
// OAuth Flow: Step 1 — Initiate
// ---------------------------------------------------------------------------

/**
 * Generate the OAuth authorization URL for a provider.
 *
 * This starts the lightweight OAuth flow. The user is redirected to
 * Google/GitHub consent screen. No Firebase SDK involved.
 *
 * @param provider - 'google' or 'github'
 * @param config - OAuth configuration
 * @param state - CSRF state parameter (caller should generate and store)
 * @param redirectPath - Path to redirect to after OAuth (default: /auth/callback)
 * @returns Authorization URL to redirect the user to
 */
export function getAuthorizationUrl(
  provider: OAuthProvider,
  config: OAuthGraduationConfig,
  state: string,
  redirectPath = '/auth/callback'
): string {
  const redirectUri = `${config.baseUrl}${redirectPath}`;

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  if (provider === 'github') {
    const params = new URLSearchParams({
      client_id: config.githubClientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

// ---------------------------------------------------------------------------
// OAuth Flow: Step 2 — Handle Callback
// ---------------------------------------------------------------------------

/**
 * Exchange the authorization code for tokens and fetch user profile.
 *
 * @param provider - 'google' or 'github'
 * @param code - Authorization code from callback
 * @param config - OAuth configuration
 * @param redirectPath - Must match the redirect URI used in authorization
 * @returns OAuth profile with tokens
 */
export async function exchangeCodeForProfile(
  provider: OAuthProvider,
  code: string,
  config: OAuthGraduationConfig,
  redirectPath = '/auth/callback'
): Promise<OAuthProfile> {
  const redirectUri = `${config.baseUrl}${redirectPath}`;

  if (provider === 'google') {
    return exchangeGoogleCode(code, config, redirectUri);
  }

  if (provider === 'github') {
    return exchangeGitHubCode(code, config, redirectUri);
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`);
}

async function exchangeGoogleCode(
  code: string,
  config: OAuthGraduationConfig,
  redirectUri: string
): Promise<OAuthProfile> {
  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Google token exchange failed: ${tokenResponse.status} ${body}`);
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  };

  // Fetch user profile
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`Google profile fetch failed: ${profileResponse.status}`);
  }

  const profile = (await profileResponse.json()) as {
    id: string;
    email: string;
    verified_email?: boolean;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  return {
    provider: 'google',
    providerId: profile.id,
    email: profile.email,
    emailVerified: profile.verified_email ?? profile.email_verified ?? false,
    name: profile.name,
    picture: profile.picture,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
}

async function exchangeGitHubCode(
  code: string,
  config: OAuthGraduationConfig,
  redirectUri: string
): Promise<OAuthProfile> {
  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    error?: string;
    error_description?: string;
  };

  if (tokens.error) {
    throw new Error(`GitHub OAuth error: ${tokens.error} — ${tokens.error_description}`);
  }

  // Fetch user profile
  const profileResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SyncUpSuite-OAuth',
    },
  });

  if (!profileResponse.ok) {
    throw new Error(`GitHub profile fetch failed: ${profileResponse.status}`);
  }

  const profile = (await profileResponse.json()) as {
    id: number;
    login: string;
    name?: string;
    avatar_url?: string;
    email?: string;
  };

  // GitHub may not return email in profile — fetch from emails endpoint
  let email = profile.email;
  let emailVerified = false;

  // Always fetch from emails endpoint to get verification status
  const emailsResponse = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SyncUpSuite-OAuth',
    },
  });

  if (emailsResponse.ok) {
    const emails = (await emailsResponse.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    const primary = emails.find((e) => e.primary && e.verified);
    if (primary) {
      email = primary.email;
      emailVerified = true;
    } else {
      const verified = emails.find((e) => e.verified);
      if (verified) {
        email = email || verified.email;
        emailVerified = true;
      }
    }
  }

  if (!email) {
    throw new Error('GitHub account has no verified email — cannot proceed with OAuth');
  }

  return {
    provider: 'github',
    providerId: String(profile.id),
    email,
    emailVerified,
    name: profile.name || profile.login,
    picture: profile.avatar_url,
    accessToken: tokens.access_token,
  };
}

// ---------------------------------------------------------------------------
// OAuth Flow: Step 3 — Create Lightweight Session
// ---------------------------------------------------------------------------

/**
 * Create a lightweight OAuth session stored in KV.
 *
 * This is NOT a Better Auth session. It is a minimal session that proves
 * the user's identity without full platform access. The session is stored
 * in Cloudflare KV with a TTL matching the session expiry.
 *
 * @param profile - OAuth profile from code exchange
 * @param config - OAuth configuration
 * @returns Session ID (to be set as cookie value)
 */
export async function createLightweightSession(
  profile: OAuthProfile,
  config: OAuthGraduationConfig
): Promise<{ sessionId: string; session: OAuthSession }> {
  const ttl = config.sessionTtlSeconds ?? 7 * 24 * 60 * 60; // 7 days
  const sessionId = generateSessionId();
  const now = Date.now();

  const session: OAuthSession = {
    id: sessionId,
    provider: profile.provider,
    providerId: profile.providerId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    name: profile.name,
    picture: profile.picture,
    createdAt: now,
    expiresAt: now + ttl * 1000,
  };

  // Store in KV with TTL
  await config.sessionKv.put(`oauth_session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: ttl,
  });

  return { sessionId, session };
}

/**
 * Retrieve a lightweight OAuth session from KV.
 *
 * @param sessionId - Session ID from cookie
 * @param kv - KV namespace
 * @returns Session or null if expired/not found
 */
export async function getLightweightSession(
  sessionId: string,
  kv: KVNamespace
): Promise<OAuthSession | null> {
  const raw = await kv.get(`oauth_session:${sessionId}`);
  if (!raw) return null;

  const session = JSON.parse(raw) as OAuthSession;

  // Double-check expiry (KV TTL is approximate)
  if (session.expiresAt < Date.now()) {
    await kv.delete(`oauth_session:${sessionId}`);
    return null;
  }

  return session;
}

/**
 * Convert a lightweight OAuth session to an OAuthAuth state.
 */
export function sessionToAuthState(session: OAuthSession): OAuthAuth {
  return {
    level: AuthLevel.OAUTH,
    provider: session.provider,
    providerId: session.providerId,
    email: session.email,
    emailVerified: session.emailVerified,
    name: session.name,
    picture: session.picture,
  };
}

// ---------------------------------------------------------------------------
// OAuth Flow: Step 4 — Graduate to Full Account
// ---------------------------------------------------------------------------

/**
 * Upgrade an OAUTH-level user to a FULL Better Auth account.
 *
 * This is the graduation moment. The user already has a verified identity
 * from their OAuth session. We create a Better Auth account using that
 * identity — no re-authentication, no Firebase involvement.
 *
 * After graduation:
 * - The lightweight OAuth session in KV is deleted
 * - A Better Auth session cookie replaces the OAuth session cookie
 * - The user has full platform access (RBAC, tenant membership, etc.)
 *
 * @param oauthSessionId - Current lightweight OAuth session ID
 * @param config - OAuth configuration
 * @returns Graduation result with new session token, or null if session not found
 */
export async function graduateOAuthToFull(
  oauthSessionId: string,
  config: OAuthGraduationConfig
): Promise<GraduationResult | null> {
  // Retrieve current OAuth session
  const session = await getLightweightSession(oauthSessionId, config.sessionKv);
  if (!session) return null;

  const oauthState = sessionToAuthState(session);

  // Graduate via the bridge
  const result = await graduateFromOAuth(oauthState, {
    betterAuth: config.betterAuth,
    defaultTenantId: config.defaultTenantId,
  });

  // Clean up lightweight session
  await config.sessionKv.delete(`oauth_session:${oauthSessionId}`);

  return result;
}

// ---------------------------------------------------------------------------
// Edge Case: User Already Has Better Auth Account
// ---------------------------------------------------------------------------

/**
 * Check if an OAuth user already has a Better Auth account.
 *
 * This handles the case where a user:
 * 1. Previously created a full account (via direct sign-up or another entry point)
 * 2. Later visits a public page and triggers lightweight OAuth
 * 3. Should be recognized as an existing full user, not a new OAuth-level user
 *
 * Call this during the OAuth callback, after exchanging the code for a profile.
 * If it returns a session, skip lightweight session creation and set the
 * Better Auth session cookie directly.
 *
 * @param profile - OAuth profile from code exchange
 * @param config - OAuth configuration
 * @returns Better Auth session if user already exists, null otherwise
 */
export async function checkExistingAccount(
  profile: OAuthProfile,
  config: OAuthGraduationConfig
): Promise<GraduationResult | null> {
  const existingUser = await config.betterAuth.findUserByEmail(profile.email);
  if (!existingUser) return null;

  // User exists — create a Better Auth session directly (skip lightweight)
  const oauthState: OAuthAuth = {
    level: AuthLevel.OAUTH,
    provider: profile.provider,
    providerId: profile.providerId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    name: profile.name,
    picture: profile.picture,
  };

  return graduateFromOAuth(oauthState, {
    betterAuth: config.betterAuth,
    defaultTenantId: config.defaultTenantId,
  });
}

// ---------------------------------------------------------------------------
// Complete OAuth Callback Handler
// ---------------------------------------------------------------------------

/**
 * Complete handler for OAuth callback that implements the full decision tree:
 *
 * 1. Exchange code for profile
 * 2. Check if user already has a Better Auth account
 *    - YES: Create Better Auth session, return FULL auth state
 *    - NO: Create lightweight OAuth session, return OAUTH auth state
 *
 * The caller decides whether to redirect to the app or to a graduation prompt.
 *
 * @param provider - 'google' or 'github'
 * @param code - Authorization code from callback
 * @param config - OAuth configuration
 * @returns Auth state (OAUTH or FULL) and cookie data to set
 */
export async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string,
  config: OAuthGraduationConfig,
  state: string,
  expectedState: string
): Promise<{
  authState: OAuthAuth | FullAuth;
  cookie: {
    name: string;
    value: string;
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax';
    path: string;
  };
}> {
  if (!state || state !== expectedState) {
    throw new Error('Invalid OAuth state parameter — possible CSRF attack');
  }

  const cookieName = config.sessionCookieName ?? 'syncup_session';
  const profile = await exchangeCodeForProfile(provider, code, config);

  // Check for existing full account
  const existingResult = await checkExistingAccount(profile, config);
  if (existingResult) {
    return {
      authState: existingResult.authState,
      cookie: {
        name: cookieName,
        value: existingResult.sessionToken,
        maxAge: 7 * 24 * 60 * 60, // 7 days
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const,
        path: '/',
      },
    };
  }

  // Create lightweight OAuth session
  const { sessionId, session } = await createLightweightSession(profile, config);
  return {
    authState: sessionToAuthState(session),
    cookie: {
      name: cookieName,
      value: sessionId,
      maxAge: config.sessionTtlSeconds ?? 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax' as const,
      path: '/',
    },
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure session ID.
 * Uses Web Crypto API available in Cloudflare Workers.
 */
function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
