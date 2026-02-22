import { auth } from "@/lib/auth/better-auth";
import { resolveTenantFromDomain } from "@/lib/tenant/context";

// ---------------------------------------------------------------------------
// Types - see shared/contracts/env.ts for canonical Env shape
// ---------------------------------------------------------------------------

export interface Env {
  DB: Hyperdrive;
  CACHE: KVNamespace;
  ASSETS: R2Bucket;
  ENVIRONMENT: string;
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  NEON_DATABASE_URL: string;
  // Add project-specific secrets here
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

function getAllowedOrigins(env: Env): string[] {
  const origins = [
    `https://{{DOMAIN}}`,
    `https://staging.{{DOMAIN}}`,
  ];
  if (env.ENVIRONMENT === "development") {
    origins.push("http://localhost:8080");
  }
  return origins;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  if (!getAllowedOrigins(env).includes(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://eu.i.posthog.com https://eu.posthog.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

// ---------------------------------------------------------------------------
// Rate limiting (KV-based, per-IP)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;

async function checkRateLimit(
  ip: string,
  kv: KVNamespace,
  path: string,
): Promise<boolean> {
  const key = `rl:${path}:${ip}`;
  const current = parseInt((await kv.get(key)) ?? "0", 10);
  if (current >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  await kv.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

/** Merge CORS + security headers + request ID into a single headers object. */
function responseHeaders(request: Request, env: Env, requestId: string): Record<string, string> {
  return {
    ...SECURITY_HEADERS,
    ...corsHeaders(request, env),
    "X-Request-ID": requestId,
  };
}

/**
 * CSRF check for state-mutating requests on custom API routes.
 * Validates that the Origin header matches an allowed origin.
 * Better Auth handles its own CSRF — this covers custom /api/ routes.
 */
function csrfCheck(request: Request, env: Env): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  return getAllowedOrigins(env).includes(origin);
}

// ExportedHandler, ExecutionContext — ambient globals from @cloudflare/workers-types
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const headers = responseHeaders(request, env, requestId);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    try {
      // ---- Health check ----
      if (url.pathname === "/api/health") {
        return Response.json(
          {
            status: "ok",
            environment: env.ENVIRONMENT,
            timestamp: new Date().toISOString(),
          },
          { headers }
        );
      }

      // ---- Better Auth (handles its own CSRF) ----
      if (url.pathname.startsWith("/api/auth/")) {
        // Rate limit auth endpoints
        const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
        const allowed = await checkRateLimit(ip, env.CACHE, "auth");
        if (!allowed) {
          return Response.json(
            { error: "Too many requests" },
            { status: 429, headers: { ...headers, "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS) } }
          );
        }

        const authResponse = await auth(env).handler(request);
        // Merge CORS + security headers into auth response
        const merged = new Headers(authResponse.headers);
        for (const [key, value] of Object.entries(headers)) {
          merged.set(key, value);
        }
        return new Response(authResponse.body, {
          status: authResponse.status,
          headers: merged,
        });
      }

      // ---- Tenant resolution ----
      const host = request.headers.get("Host") ?? url.hostname;
      const tenant = await resolveTenantFromDomain(host, env);

      if (!tenant && !url.pathname.startsWith("/api/public/")) {
        return Response.json(
          { error: "Tenant not found" },
          { status: 404, headers }
        );
      }

      // ---- Tenant current endpoint (used by TenantContext.tsx) ----
      if (url.pathname === "/api/tenant/current") {
        if (!tenant) {
          return Response.json(
            { error: "Tenant not found" },
            { status: 404, headers }
          );
        }
        return Response.json(tenant, { headers });
      }

      // ---- API routes ----
      if (url.pathname.startsWith("/api/")) {
        // CSRF protection for state-mutating requests
        if (!csrfCheck(request, env)) {
          return Response.json(
            { error: "CSRF validation failed" },
            { status: 403, headers }
          );
        }

        // TODO: Replace with tRPC handler or custom route handler
        // based on scaffold qualification answer #5.
        //
        // All database queries MUST use tenantQuery() to enforce RLS.
        // tenantQuery() wraps set_config + your query in a single
        // transaction so the RLS context is guaranteed to apply.
        //
        // WARNING: Do NOT call set_config() separately from your
        // queries. The Neon HTTP driver uses separate connections
        // per call. See: skills/neon-multi-tenant/templates/drizzle-tenant.ts
        //
        // Example:
        //   import { tenantQuery } from "@/lib/tenant/context";
        //   import * as schema from "@/db/schema";
        //
        //   const items = await tenantQuery(
        //     env.DB.connectionString,
        //     tenant.id,
        //     async (db) => db.select().from(schema.items)
        //   );
        //   return Response.json(items, { headers });

        return Response.json(
          { error: "Not found" },
          { status: 404, headers }
        );
      }

      // ---- Static assets (Vite build output) ----
      // The @cloudflare/vite-plugin handles asset serving automatically.
      // This fallback returns the SPA index for client-side routing.
      return new Response("Not found", { status: 404, headers });

    } catch (error) {
      console.error(`Worker error [${requestId}]:`, error);
      return Response.json(
        {
          error: "Internal server error",
          requestId,
          ...(env.ENVIRONMENT === "development" && {
            message: error instanceof Error ? error.message : String(error),
          }),
        },
        { status: 500, headers }
      );
    }
  },
} satisfies ExportedHandler<Env>;
