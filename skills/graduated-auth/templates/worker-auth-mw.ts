// Canonical types: see shared/contracts/auth.ts for AuthLevel, AuthState, etc.
// This skill re-exports from firebase-bridge.ts but the canonical source is contracts.

/**
 * Cloudflare Worker Auth Middleware
 *
 * Resolves the current auth level from incoming requests and provides
 * route-level guards for graduated authentication. Works with both
 * Hono framework and raw fetch handler patterns.
 *
 * Auth resolution order:
 *   1. Authorization: Bearer <token> header (API clients, Better Auth JWT)
 *   2. Session cookie (browser clients, Better Auth or OAuth session)
 *   3. Preview cookie (limited access, inquiry form submissions)
 *   4. Falls back to ANONYMOUS
 *
 * Dependencies:
 *   - hono (optional — middleware works with both Hono and raw fetch)
 *
 * Environment bindings (wrangler.toml):
 *   - OAUTH_SESSION_KV: KVNamespace
 *   - NEON_DATABASE_URL: string (via Hyperdrive)
 *   - BETTER_AUTH_SECRET: string
 */

import {
  AuthLevel,
  type AuthState,
  type AnonymousAuth,
  type PreviewAuth,
  type OAuthAuth,
  type FullAuth,
  type BetterAuthInstance,
} from './firebase-bridge';

// Re-export for convenience
export { AuthLevel, type AuthState };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cloudflare Worker environment bindings. */
export interface Env {
  OAUTH_SESSION_KV: KVNamespace;
  NEON_DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  [key: string]: unknown;
}

/** Auth context attached to each request after middleware runs. */
export interface AuthContext {
  /** Resolved auth state (discriminated union on `level`) */
  state: AuthState;
  /** Resolved auth level (shorthand for state.level) */
  level: AuthLevel;
  /** Tenant ID if resolved (from authenticated session only) */
  tenantId?: string;
  /** Whether the user has at least the given auth level */
  hasLevel(required: AuthLevel): boolean;
  /** Whether the user has a specific role (only for FULL auth) */
  hasRole(role: string): boolean;
}

/** Options for auth middleware initialization. */
export interface AuthMiddlewareOptions {
  /** Better Auth instance for session verification */
  betterAuth: BetterAuthInstance;
  /** KV namespace for lightweight OAuth sessions */
  sessionKv: KVNamespace;
  /** Cookie name for sessions (default: 'syncup_session') */
  sessionCookieName?: string;
  /** Cookie name for preview sessions (default: 'syncup_preview') */
  previewCookieName?: string;
  /** Firebase project ID for token verification (optional, for Bearer tokens) */
  firebaseProjectId?: string;
}

// ---------------------------------------------------------------------------
// Auth Level Ordering
// ---------------------------------------------------------------------------

const AUTH_LEVEL_ORDER: Record<AuthLevel, number> = {
  [AuthLevel.ANONYMOUS]: 0,
  [AuthLevel.PREVIEW]: 1,
  [AuthLevel.OAUTH]: 2,
  [AuthLevel.FULL]: 3,
};

/**
 * Check if one auth level meets or exceeds a required level.
 */
function meetsLevel(current: AuthLevel, required: AuthLevel): boolean {
  return AUTH_LEVEL_ORDER[current] >= AUTH_LEVEL_ORDER[required];
}

// ---------------------------------------------------------------------------
// Auth Context Factory
// ---------------------------------------------------------------------------

function createAuthContext(state: AuthState): AuthContext {
  return {
    state,
    level: state.level,
    tenantId: state.level === AuthLevel.FULL ? state.tenantId : undefined,
    hasLevel(required: AuthLevel): boolean {
      return meetsLevel(state.level, required);
    },
    hasRole(role: string): boolean {
      if (state.level !== AuthLevel.FULL) return false;
      return state.roles.includes(role);
    },
  };
}

// ---------------------------------------------------------------------------
// Auth Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve auth state from a request.
 *
 * Checks (in order):
 * 1. Authorization header (Bearer token → Better Auth or Firebase)
 * 2. Session cookie (Better Auth session or OAuth lightweight session)
 * 3. Preview cookie (inquiry/preview session)
 * 4. ANONYMOUS fallback
 */
async function resolveAuthState(
  request: Request,
  options: AuthMiddlewareOptions
): Promise<AuthState> {
  const cookieName = options.sessionCookieName ?? 'syncup_session';
  const previewCookieName = options.previewCookieName ?? 'syncup_preview';

  // Parse cookies
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);

  // 1. Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const state = await resolveFromBearerToken(token, options);
    if (state) return state;
  }

  // 2. Check session cookie (could be Better Auth or OAuth)
  const sessionToken = cookies[cookieName];
  if (sessionToken) {
    const state = await resolveFromSessionToken(sessionToken, options);
    if (state) return state;
  }

  // 3. Check preview cookie
  const previewToken = cookies[previewCookieName];
  if (previewToken) {
    const state = await resolveFromPreviewToken(previewToken, options);
    if (state) return state;
  }

  // 4. ANONYMOUS
  return { level: AuthLevel.ANONYMOUS };
}

/**
 * Resolve auth from a Bearer token.
 * Tries Better Auth session token first, then Firebase ID token.
 */
async function resolveFromBearerToken(
  token: string,
  options: AuthMiddlewareOptions
): Promise<AuthState | null> {
  // Try Better Auth session lookup
  try {
    const session = await verifyBetterAuthSession(token, options.betterAuth);
    if (session) return session;
  } catch {
    // Not a valid Better Auth token — try Firebase
  }

  // Try Firebase ID token (if configured)
  if (options.firebaseProjectId) {
    try {
      const { verifyFirebaseToken } = await import('./firebase-bridge');
      const claims = await verifyFirebaseToken(token, options.firebaseProjectId);
      if (claims.email) {
        return {
          level: AuthLevel.OAUTH,
          provider: claims.sign_in_provider || 'firebase',
          providerId: claims.uid,
          email: claims.email,
          emailVerified: claims.email_verified === true,
          name: claims.name,
          picture: claims.picture,
        };
      }
    } catch {
      // Not a valid Firebase token either
    }
  }

  return null;
}

/**
 * Resolve auth from a session cookie value.
 * Tries Better Auth session first, then KV-stored OAuth session.
 */
async function resolveFromSessionToken(
  token: string,
  options: AuthMiddlewareOptions
): Promise<AuthState | null> {
  // Try Better Auth session
  try {
    const session = await verifyBetterAuthSession(token, options.betterAuth);
    if (session) return session;
  } catch {
    // Not a Better Auth session
  }

  // Try KV-stored OAuth session
  try {
    const raw = await options.sessionKv.get(`oauth_session:${token}`);
    if (raw) {
      const session = JSON.parse(raw) as {
        provider: string;
        providerId: string;
        email: string;
        emailVerified?: boolean;
        name?: string;
        picture?: string;
        expiresAt: number;
      };

      if (session.expiresAt > Date.now()) {
        return {
          level: AuthLevel.OAUTH,
          provider: session.provider,
          providerId: session.providerId,
          email: session.email,
          emailVerified: session.emailVerified === true,
          name: session.name,
          picture: session.picture,
        };
      }
    }
  } catch {
    // Invalid KV data
  }

  return null;
}

/**
 * Resolve auth from a preview cookie value.
 * Preview sessions are stored in KV with minimal data.
 */
async function resolveFromPreviewToken(
  token: string,
  options: AuthMiddlewareOptions
): Promise<PreviewAuth | null> {
  try {
    const raw = await options.sessionKv.get(`preview_session:${token}`);
    if (raw) {
      const session = JSON.parse(raw) as {
        email: string;
        expiresAt: number;
      };

      if (session.expiresAt > Date.now()) {
        return {
          level: AuthLevel.PREVIEW,
          email: session.email,
          previewSessionId: token,
        };
      }
    }
  } catch {
    // Invalid preview session
  }

  return null;
}

/**
 * Verify a Better Auth session token and return FULL auth state.
 *
 * This MUST be implemented before use. The stub throws to prevent
 * silent authentication bypass.
 */
async function verifyBetterAuthSession(
  token: string,
  betterAuth: BetterAuthInstance
): Promise<FullAuth | null> {
  // Better Auth session verification is implementation-specific.
  // Typical pattern: decode session token, look up in neon_auth.session table,
  // check expiry, fetch user and roles.
  //
  // Example (replace with actual Better Auth API):
  //
  // const session = await betterAuth.verifySession(token);
  // if (!session) return null;
  //
  // const roles = await betterAuth.getUserRoles(session.userId, session.tenantId);
  //
  // return {
  //   level: AuthLevel.FULL,
  //   userId: session.userId,
  //   sessionId: session.id,
  //   email: session.user.email,
  //   name: session.user.name,
  //   picture: session.user.image,
  //   roles,
  //   tenantId: session.tenantId,
  //   tenantRole: roles[0],
  // };

  throw new Error(
    'verifyBetterAuthSession() is not implemented. ' +
    'You MUST implement this function to validate Better Auth sessions. ' +
    'See: skills/graduated-auth/references/auth-layers.md'
  );
}

// ---------------------------------------------------------------------------
// Preview Session Management
// ---------------------------------------------------------------------------

/**
 * Create a preview session from an inquiry form submission.
 *
 * @param email - Email from the inquiry form
 * @param kv - KV namespace for session storage
 * @param ttlSeconds - Session TTL (default: 30 days)
 * @returns Session ID to set as preview cookie
 */
export async function createPreviewSession(
  email: string,
  kv: KVNamespace,
  ttlSeconds = 30 * 24 * 60 * 60
): Promise<string> {
  const sessionId = generateId();
  const session = {
    email,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlSeconds * 1000,
  };

  await kv.put(`preview_session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: ttlSeconds,
  });

  return sessionId;
}

// ---------------------------------------------------------------------------
// Hono Middleware
// ---------------------------------------------------------------------------

/**
 * Hono-compatible auth middleware.
 *
 * Attaches an `AuthContext` to `c.var.auth` on every request.
 *
 * Usage:
 * ```typescript
 * import { Hono } from 'hono';
 * import { authMiddleware, requireAuth, AuthLevel } from './worker-auth-mw';
 *
 * const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();
 *
 * app.use('*', authMiddleware({ betterAuth, sessionKv: env.OAUTH_SESSION_KV }));
 *
 * app.get('/api/public', (c) => {
 *   const auth = c.var.auth;
 *   return c.json({ level: auth.level });
 * });
 *
 * app.get('/api/protected', requireAuth(AuthLevel.OAUTH), (c) => {
 *   const auth = c.var.auth;
 *   return c.json({ email: (auth.state as OAuthAuth).email });
 * });
 * ```
 */
export function authMiddleware(options: AuthMiddlewareOptions) {
  return async (c: HonoContext, next: () => Promise<void>) => {
    const state = await resolveAuthState(c.req.raw, options);
    const auth = createAuthContext(state);

    c.set('auth', auth);
    await next();
  };
}

/**
 * Hono middleware that requires a minimum auth level.
 *
 * Returns 401 for ANONYMOUS users and 403 for users below the required level.
 *
 * @param level - Minimum required auth level
 * @param requiredRole - Optional role check (only for FULL auth level)
 */
export function requireAuth(level: AuthLevel, requiredRole?: string) {
  return async (c: HonoContext, next: () => Promise<void>) => {
    const auth = c.var.auth as AuthContext | undefined;

    if (!auth) {
      return c.json({ error: 'Auth middleware not initialized' }, 500);
    }

    if (auth.level === AuthLevel.ANONYMOUS && level !== AuthLevel.ANONYMOUS) {
      return c.json(
        {
          error: 'Authentication required',
          required: level,
          graduateUrl: '/auth/login',
        },
        401
      );
    }

    if (!auth.hasLevel(level)) {
      return c.json(
        {
          error: 'Insufficient auth level',
          current: auth.level,
          required: level,
          graduateUrl: level === AuthLevel.FULL ? '/auth/graduate' : '/auth/login',
        },
        403
      );
    }

    if (requiredRole && !auth.hasRole(requiredRole)) {
      return c.json(
        {
          error: 'Insufficient permissions',
          required: requiredRole,
        },
        403
      );
    }

    await next();
  };
}

// ---------------------------------------------------------------------------
// Raw Fetch Handler Integration
// ---------------------------------------------------------------------------

/**
 * For Workers that do not use Hono, this function resolves auth state
 * from a raw Request object and returns an AuthContext.
 *
 * Usage:
 * ```typescript
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const auth = await resolveAuth(request, {
 *       betterAuth,
 *       sessionKv: env.OAUTH_SESSION_KV,
 *     });
 *
 *     if (!auth.hasLevel(AuthLevel.OAUTH)) {
 *       return new Response('Unauthorized', { status: 401 });
 *     }
 *
 *     // ... handle request
 *   }
 * };
 * ```
 */
export async function resolveAuth(
  request: Request,
  options: AuthMiddlewareOptions
): Promise<AuthContext> {
  const state = await resolveAuthState(request, options);
  return createAuthContext(state);
}

// ---------------------------------------------------------------------------
// Route Guard for Raw Fetch Handler
// ---------------------------------------------------------------------------

/**
 * Create a guard function for use in raw fetch handlers.
 *
 * Usage:
 * ```typescript
 * const guard = createRouteGuard(auth);
 *
 * // Returns null if authorized, Response if not
 * const denied = guard(AuthLevel.FULL, 'admin');
 * if (denied) return denied;
 * ```
 */
export function createRouteGuard(auth: AuthContext) {
  return (level: AuthLevel, requiredRole?: string): Response | null => {
    if (auth.level === AuthLevel.ANONYMOUS && level !== AuthLevel.ANONYMOUS) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          required: level,
          graduateUrl: '/auth/login',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!auth.hasLevel(level)) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient auth level',
          current: auth.level,
          required: level,
          graduateUrl: level === AuthLevel.FULL ? '/auth/graduate' : '/auth/login',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (requiredRole && !auth.hasRole(requiredRole)) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions',
          required: requiredRole,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return null;
  };
}

// ---------------------------------------------------------------------------
// Example: Complete Hono App with Graduated Auth
// ---------------------------------------------------------------------------

/**
 * Example showing a complete Hono app with graduated auth routes.
 *
 * ```typescript
 * import { Hono } from 'hono';
 * import { authMiddleware, requireAuth, AuthLevel, type AuthContext, type Env } from './worker-auth-mw';
 * import { graduateOAuthToFull, type OAuthGraduationConfig } from './oauth-graduation';
 *
 * type Variables = { auth: AuthContext };
 * const app = new Hono<{ Bindings: Env; Variables: Variables }>();
 *
 * // --- Global middleware ---
 * app.use('*', async (c, next) => {
 *   const mw = authMiddleware({
 *     betterAuth: getBetterAuth(c.env),
 *     sessionKv: c.env.OAUTH_SESSION_KV,
 *   });
 *   return mw(c, next);
 * });
 *
 * // --- ANONYMOUS: Public routes ---
 * app.get('/', (c) => c.json({ message: 'Welcome' }));
 * app.get('/pricing', (c) => c.json({ plans: ['free', 'pro'] }));
 *
 * // --- PREVIEW: Gated content ---
 * app.get('/preview/report', requireAuth(AuthLevel.PREVIEW), (c) => {
 *   const auth = c.var.auth;
 *   return c.json({ report: 'sample data', email: (auth.state as any).email });
 * });
 *
 * // --- OAUTH: Personalized features ---
 * app.get('/api/profile', requireAuth(AuthLevel.OAUTH), (c) => {
 *   const auth = c.var.auth;
 *   return c.json({ profile: auth.state });
 * });
 *
 * // --- FULL: Platform features ---
 * app.get('/api/dashboard', requireAuth(AuthLevel.FULL), (c) => {
 *   const auth = c.var.auth;
 *   return c.json({ dashboard: 'full access', tenant: auth.tenantId });
 * });
 *
 * // --- FULL + ROLE: Admin features ---
 * app.get('/api/admin/users', requireAuth(AuthLevel.FULL, 'admin'), (c) => {
 *   return c.json({ users: [] });
 * });
 *
 * // --- Graduation endpoint ---
 * app.post('/auth/graduate', requireAuth(AuthLevel.OAUTH), async (c) => {
 *   const sessionCookie = getCookie(c, 'syncup_session');
 *   if (!sessionCookie) return c.json({ error: 'No session' }, 400);
 *
 *   const config: OAuthGraduationConfig = {
 *     // ... config from env
 *   };
 *
 *   const result = await graduateOAuthToFull(sessionCookie, config);
 *   if (!result) return c.json({ error: 'Session expired' }, 401);
 *
 *   setCookie(c, 'syncup_session', result.sessionToken, {
 *     httpOnly: true,
 *     secure: true,
 *     sameSite: 'Lax',
 *     maxAge: 7 * 24 * 60 * 60,
 *     path: '/',
 *   });
 *
 *   return c.json({ graduated: true, isNewAccount: result.isNewAccount });
 * });
 *
 * export default app;
 * ```
 */

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Parse Cookie header into key-value pairs. */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(';')) {
    const [key, ...valueParts] = pair.trim().split('=');
    if (key) {
      cookies[key.trim()] = valueParts.join('=').trim();
    }
  }

  return cookies;
}

/** Generate a cryptographically secure random ID. */
function generateId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Hono Type Shim
// ---------------------------------------------------------------------------

/**
 * Minimal Hono context type to avoid requiring hono as a dependency.
 * Replace with actual Hono types in your project.
 */
interface HonoContext {
  req: {
    raw: Request;
    header(name: string): string | undefined;
  };
  var: Record<string, unknown>;
  set(key: string, value: unknown): void;
  json(data: unknown, status?: number): Response;
}
