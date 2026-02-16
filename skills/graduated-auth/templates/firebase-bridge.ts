/**
 * Firebase <-> Better Auth Bridge
 *
 * Verifies Firebase ID tokens in a Cloudflare Worker and creates/links
 * Better Auth sessions from Firebase identities. This is the core of
 * the "graduation" flow: a user authenticated via OAuth clientId gets
 * upgraded to a full Better Auth account without re-authentication.
 *
 * Dependencies:
 *   - jose (JWT verification without Node.js crypto)
 *   - drizzle-orm (database access)
 *   - better-auth (session management)
 *
 * Environment bindings (wrangler.toml):
 *   - FIREBASE_PROJECT_ID: string
 *   - NEON_DATABASE_URL: string (via Hyperdrive or secret)
 *   - BETTER_AUTH_SECRET: string
 */

// ---------------------------------------------------------------------------
// Auth Level Enum
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

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Decoded Firebase ID token claims (subset relevant to graduation). */
export interface FirebaseTokenClaims {
  /** Firebase user UID */
  uid: string;
  /** User email (may be unverified) */
  email?: string;
  /** Whether Firebase has verified the email */
  email_verified?: boolean;
  /** Display name from OAuth provider */
  name?: string;
  /** Profile photo URL */
  picture?: string;
  /** OAuth provider ID (e.g., 'google.com', 'github.com') */
  sign_in_provider?: string;
  /** Firebase tenant ID (for multi-tenant Identity Platform) */
  firebase_tenant?: string;
  /** Token issued-at (unix seconds) */
  iat: number;
  /** Token expiry (unix seconds) */
  exp: number;
  /** Audience (Firebase project ID) */
  aud: string;
  /** Issuer */
  iss: string;
  /** Subject (same as uid) */
  sub: string;
}

/** Auth state for ANONYMOUS users. */
export interface AnonymousAuth {
  level: AuthLevel.ANONYMOUS;
}

/** Auth state for PREVIEW users (email captured, no verified identity). */
export interface PreviewAuth {
  level: AuthLevel.PREVIEW;
  email: string;
  previewSessionId: string;
}

/** Auth state for OAUTH users (identity verified, no Better Auth session). */
export interface OAuthAuth {
  level: AuthLevel.OAUTH;
  provider: string;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

/** Auth state for FULL users (Better Auth session active). */
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

/** Union of all auth states. Discriminated on `level`. */
export type AuthState = AnonymousAuth | PreviewAuth | OAuthAuth | FullAuth;

// ---------------------------------------------------------------------------
// Firebase Token Verification
// ---------------------------------------------------------------------------

/**
 * Google's public key endpoint for Firebase ID token verification.
 * Keys rotate; responses include Cache-Control headers.
 */
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/** Cached public keys with expiry. */
let cachedKeys: { keys: Record<string, string>; expiresAt: number } | null = null;

/**
 * Fetch Google's public keys for Firebase token verification.
 * Caches based on Cache-Control max-age header.
 */
async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedKeys && cachedKeys.expiresAt > now) {
    return cachedKeys.keys;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${response.status}`);
  }

  const keys = (await response.json()) as Record<string, string>;

  // Parse Cache-Control for max-age
  const cacheControl = response.headers.get('Cache-Control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600_000;

  cachedKeys = { keys, expiresAt: now + maxAge };
  return keys;
}

/**
 * Verify a Firebase ID token and return decoded claims.
 *
 * Performs full verification:
 * - Signature validation against Google's public keys
 * - Expiry check
 * - Audience check (must match Firebase project ID)
 * - Issuer check
 *
 * @param idToken - The raw Firebase ID token (JWT string)
 * @param projectId - Expected Firebase project ID
 * @returns Decoded token claims
 * @throws Error if token is invalid, expired, or audience mismatch
 */
export async function verifyFirebaseToken(
  idToken: string,
  projectId: string
): Promise<FirebaseTokenClaims> {
  // Dynamically import jose — works in Cloudflare Workers
  const { jwtVerify, createRemoteJWKSet, importX509 } = await import('jose');

  // Decode header to get kid
  const [headerB64] = idToken.split('.');
  const header = JSON.parse(atob(headerB64)) as { kid?: string; alg?: string };

  if (!header.kid) {
    throw new Error('Firebase token missing kid in header');
  }

  // Fetch public keys and find matching key
  const publicKeys = await getFirebasePublicKeys();
  const certPem = publicKeys[header.kid];

  if (!certPem) {
    // Key might have rotated — clear cache and retry once
    cachedKeys = null;
    const freshKeys = await getFirebasePublicKeys();
    const freshCert = freshKeys[header.kid];
    if (!freshCert) {
      throw new Error(`Firebase public key not found for kid: ${header.kid}`);
    }
    return verifyWithCert(idToken, freshCert, projectId, { importX509, jwtVerify });
  }

  return verifyWithCert(idToken, certPem, projectId, { importX509, jwtVerify });
}

async function verifyWithCert(
  idToken: string,
  certPem: string,
  projectId: string,
  jose: { importX509: typeof import('jose').importX509; jwtVerify: typeof import('jose').jwtVerify }
): Promise<FirebaseTokenClaims> {
  const publicKey = await jose.importX509(certPem, 'RS256');

  const { payload } = await jose.jwtVerify(idToken, publicKey, {
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
    algorithms: ['RS256'],
  });

  // Extract Firebase-specific claims
  const firebaseClaim = (payload as Record<string, unknown>).firebase as
    | { sign_in_provider?: string; tenant?: string }
    | undefined;

  return {
    uid: payload.sub as string,
    email: payload.email as string | undefined,
    email_verified: payload.email_verified as boolean | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    sign_in_provider: firebaseClaim?.sign_in_provider,
    firebase_tenant: firebaseClaim?.tenant,
    iat: payload.iat as number,
    exp: payload.exp as number,
    aud: (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) as string,
    iss: payload.iss as string,
    sub: payload.sub as string,
  };
}

// ---------------------------------------------------------------------------
// Firebase -> Better Auth Bridge
// ---------------------------------------------------------------------------

/**
 * Options for the graduation bridge.
 */
export interface GraduationBridgeOptions {
  /** Firebase project ID for token verification */
  firebaseProjectId: string;
  /** Better Auth instance (initialized with Neon connection) */
  betterAuth: BetterAuthInstance;
  /** Default tenant ID for new users (platform T0 tenant) */
  defaultTenantId: string;
  /** Default role for new users within the tenant */
  defaultRole?: string;
}

/**
 * Minimal interface for Better Auth instance methods used by the bridge.
 * The actual Better Auth instance has many more methods — this keeps
 * the bridge loosely coupled.
 */
export interface BetterAuthInstance {
  /** Create a new user account */
  createUser(data: {
    email: string;
    name?: string;
    image?: string;
    emailVerified?: boolean;
  }): Promise<{ id: string }>;

  /** Find user by email */
  findUserByEmail(email: string): Promise<{ id: string; email: string } | null>;

  /** Link an OAuth account to a user */
  linkAccount(data: {
    userId: string;
    provider: string;
    providerAccountId: string;
    accessToken?: string;
    refreshToken?: string;
  }): Promise<void>;

  /** Create a new session for a user */
  createSession(data: {
    userId: string;
    expiresAt?: Date;
  }): Promise<{ id: string; token: string; expiresAt: Date }>;

  /** Get user roles for a tenant */
  getUserRoles(userId: string, tenantId: string): Promise<string[]>;

  /** Add user to a tenant with a role */
  addTenantMember(data: {
    userId: string;
    tenantId: string;
    role: string;
  }): Promise<void>;
}

/**
 * Result of a successful graduation.
 */
export interface GraduationResult {
  /** The Better Auth user ID */
  userId: string;
  /** The new session token (set as cookie) */
  sessionToken: string;
  /** Session expiry */
  expiresAt: Date;
  /** Whether this was a new account (true) or existing account link (false) */
  isNewAccount: boolean;
  /** The full auth state after graduation */
  authState: FullAuth;
}

/**
 * Graduate a Firebase-authenticated user to a full Better Auth account.
 *
 * This is the core bridge function. It:
 * 1. Verifies the Firebase ID token
 * 2. Checks if a Better Auth account already exists for this email
 * 3. If not, creates one and links the OAuth provider
 * 4. Creates a Better Auth session
 * 5. Returns the session token for cookie storage
 *
 * The caller is responsible for setting the session cookie on the response.
 *
 * @param firebaseIdToken - Raw Firebase ID token from the client
 * @param options - Bridge configuration
 * @returns Graduation result with session token
 */
export async function graduateToFullAccount(
  firebaseIdToken: string,
  options: GraduationBridgeOptions
): Promise<GraduationResult> {
  const { firebaseProjectId, betterAuth, defaultTenantId, defaultRole = 'member' } = options;

  // Step 1: Verify Firebase token
  const claims = await verifyFirebaseToken(firebaseIdToken, firebaseProjectId);

  if (!claims.email) {
    throw new Error('Firebase token missing email claim — cannot graduate');
  }

  if (!claims.email_verified) {
    throw new Error('Email not verified — cannot graduate to full account');
  }

  // Step 2: Check for existing Better Auth account
  let userId: string;
  let isNewAccount = false;

  const existingUser = await betterAuth.findUserByEmail(claims.email);

  if (existingUser) {
    // Security: Do not auto-link accounts by email. The user must authenticate
    // into the existing account first, then link the new provider explicitly.
    throw new Error(
      'An account with this email already exists. Sign in to the existing account first, then link your Firebase identity.'
    );
  } else {
    // Step 3: Create new Better Auth account
    const newUser = await betterAuth.createUser({
      email: claims.email,
      name: claims.name,
      image: claims.picture,
      emailVerified: claims.email_verified ?? false,
    });
    userId = newUser.id;
    isNewAccount = true;

    // Link OAuth provider
    if (claims.sign_in_provider) {
      await betterAuth.linkAccount({
        userId,
        provider: claims.sign_in_provider,
        providerAccountId: claims.uid,
      });
    }

    // Add to default tenant
    await betterAuth.addTenantMember({
      userId,
      tenantId: defaultTenantId,
      role: defaultRole,
    });
  }

  // Step 4: Create Better Auth session (7-day expiry)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await betterAuth.createSession({ userId, expiresAt });

  // Step 5: Resolve roles for auth state
  const roles = await betterAuth.getUserRoles(userId, defaultTenantId);

  return {
    userId,
    sessionToken: session.token,
    expiresAt: session.expiresAt,
    isNewAccount,
    authState: {
      level: AuthLevel.FULL,
      userId,
      sessionId: session.id,
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      roles,
      tenantId: defaultTenantId,
      tenantRole: roles[0],
    },
  };
}

/**
 * Graduate from OAUTH level to FULL without Firebase involvement.
 *
 * When the user authenticated via lightweight OAuth (just clientId, no Firebase),
 * this function creates a Better Auth account directly from the OAuth profile.
 * No Firebase token required — the OAuth identity is already trusted.
 *
 * @param oauthState - Current OAUTH-level auth state
 * @param options - Bridge configuration (firebaseProjectId not used here)
 * @returns Graduation result with session token
 */
export async function graduateFromOAuth(
  oauthState: OAuthAuth,
  options: Omit<GraduationBridgeOptions, 'firebaseProjectId'>
): Promise<GraduationResult> {
  const { betterAuth, defaultTenantId, defaultRole = 'member' } = options;

  let userId: string;
  let isNewAccount = false;

  const existingUser = await betterAuth.findUserByEmail(oauthState.email);

  if (existingUser) {
    userId = existingUser.id;

    // Link provider if not already linked
    try {
      await betterAuth.linkAccount({
        userId,
        provider: oauthState.provider,
        providerAccountId: oauthState.providerId,
      });
    } catch {
      // Already linked
    }
  } else {
    const newUser = await betterAuth.createUser({
      email: oauthState.email,
      name: oauthState.name,
      image: oauthState.picture,
      emailVerified: oauthState.emailVerified === true,
    });
    userId = newUser.id;
    isNewAccount = true;

    await betterAuth.linkAccount({
      userId,
      provider: oauthState.provider,
      providerAccountId: oauthState.providerId,
    });

    await betterAuth.addTenantMember({
      userId,
      tenantId: defaultTenantId,
      role: defaultRole,
    });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await betterAuth.createSession({ userId, expiresAt });
  const roles = await betterAuth.getUserRoles(userId, defaultTenantId);

  return {
    userId,
    sessionToken: session.token,
    expiresAt: session.expiresAt,
    isNewAccount,
    authState: {
      level: AuthLevel.FULL,
      userId,
      sessionId: session.id,
      email: oauthState.email,
      name: oauthState.name,
      picture: oauthState.picture,
      roles,
      tenantId: defaultTenantId,
      tenantRole: roles[0],
    },
  };
}
