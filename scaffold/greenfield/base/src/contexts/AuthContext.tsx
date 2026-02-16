import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Auth level - graduated authentication
// ---------------------------------------------------------------------------

/**
 * Graduated auth levels allow pages to render with decreasing
 * privilege. A marketing page works at ANONYMOUS; a dashboard
 * requires FULL.
 */
export enum AuthLevel {
  /** No authentication - public content */
  ANONYMOUS = "anonymous",
  /** Preview/limited access - e.g., shared link with token */
  PREVIEW = "preview",
  /** OAuth-authenticated but no org membership confirmed */
  OAUTH = "oauth",
  /** Fully authenticated with verified org/tenant membership */
  FULL = "full",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface Session {
  user: User;
  expiresAt: string;
}

interface AuthContextValue {
  /** Current user, null if not authenticated */
  user: User | null;
  /** Current session data */
  session: Session | null;
  /** Current authentication level */
  authLevel: AuthLevel;
  /** True while checking session on mount */
  loading: boolean;
  /** Error from last auth operation */
  error: string | null;
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign up with email/password */
  signUp: (email: string, password: string, name: string) => Promise<void>;
  /** Sign in with OAuth provider */
  signInWithProvider: (provider: "google" | "github") => void;
  /** Sign out and clear session */
  signOut: () => Promise<void>;
  /** Force refresh session from server */
  refreshSession: () => Promise<void>;
}

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLevel, setAuthLevel] = useState<AuthLevel>(AuthLevel.ANONYMOUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Session check ----

  const refreshSession = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/auth/get-session", {
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        setSession(null);
        setAuthLevel(AuthLevel.ANONYMOUS);
        return;
      }

      const data = (await res.json()) as Session;
      setUser(data.user);
      setSession(data);
      setAuthLevel(AuthLevel.FULL);
    } catch {
      setUser(null);
      setSession(null);
      setAuthLevel(AuthLevel.ANONYMOUS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // ---- Sign in ----

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "Sign in failed");
      }

      const data = (await res.json()) as Session;
      setUser(data.user);
      setSession(data);
      setAuthLevel(AuthLevel.FULL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Sign up ----

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
          const body = (await res.json()) as { message?: string };
          throw new Error(body.message ?? "Sign up failed");
        }

        const data = (await res.json()) as Session;
        setUser(data.user);
        setSession(data);
        setAuthLevel(AuthLevel.FULL);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign up failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ---- OAuth ----

  const signInWithProvider = useCallback((provider: "google" | "github") => {
    window.location.href = `/api/auth/sign-in/social?provider=${provider}`;
  }, []);

  // ---- Sign out ----

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setSession(null);
      setAuthLevel(AuthLevel.ANONYMOUS);
    }
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        authLevel,
        loading,
        error,
        signIn,
        signUp,
        signInWithProvider,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current auth context. Must be used within an AuthProvider.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { user, authLevel, signOut } = useAuth();
 *   if (authLevel === AuthLevel.ANONYMOUS) return <LoginButton />;
 *   return <span>Hello, {user?.name} <button onClick={signOut}>Logout</button></span>;
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
