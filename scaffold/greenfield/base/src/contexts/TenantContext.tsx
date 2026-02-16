import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { TenantContext as TenantInfo } from "@/lib/tenant/context";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface TenantContextValue {
  /** Resolved tenant for the current session. Null while loading. */
  tenant: TenantInfo | null;
  /** True during initial tenant resolution */
  loading: boolean;
  /** Error message if tenant resolution failed */
  error: string | null;
  /** Force re-resolve (e.g., after tenant switch) */
  refresh: () => void;
}

const TenantCtx = createContext<TenantContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/tenant/current", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Tenant resolution failed: ${response.status}`);
        }

        const data = (await response.json()) as TenantInfo;

        if (!cancelled) {
          setTenant(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setTenant(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <TenantCtx.Provider value={{ tenant, loading, error, refresh }}>
      {children}
    </TenantCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current tenant context. Must be used within a TenantProvider.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { tenant, loading } = useTenant();
 *   if (loading) return <Spinner />;
 *   return <h1>{tenant?.name} Dashboard</h1>;
 * }
 * ```
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantCtx);
  if (ctx === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return ctx;
}
