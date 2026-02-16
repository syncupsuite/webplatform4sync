import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth/better-auth";
import { resolveTenantFromDomain, setTenantContext } from "@/lib/tenant/context";

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

const ALLOWED_ORIGINS = [
  "https://{{DOMAIN}}",
  "https://staging.{{DOMAIN}}",
  "http://localhost:8080",
];

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
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
          { headers: cors }
        );
      }

      // ---- Better Auth ----
      if (url.pathname.startsWith("/api/auth/")) {
        const authResponse = await auth(env).handler(request);
        // Merge CORS headers into auth response
        const headers = new Headers(authResponse.headers);
        for (const [key, value] of Object.entries(cors)) {
          headers.set(key, value);
        }
        return new Response(authResponse.body, {
          status: authResponse.status,
          headers,
        });
      }

      // ---- Tenant resolution ----
      const host = request.headers.get("Host") ?? url.hostname;
      const tenant = await resolveTenantFromDomain(host, env);

      if (!tenant && !url.pathname.startsWith("/api/public/")) {
        return Response.json(
          { error: "Tenant not found" },
          { status: 404, headers: cors }
        );
      }

      // Set RLS context for database queries
      const sql = neon(env.DB.connectionString);
      if (tenant) {
        await setTenantContext(sql, tenant.id);
      }

      // ---- API routes ----
      if (url.pathname.startsWith("/api/")) {
        // TODO: Replace with tRPC handler or custom route handler
        // based on scaffold qualification answer #5.
        //
        // tRPC example:
        //   return handleTRPC(request, { env, tenant, sql });
        //
        // Custom routes example:
        //   return routeHandler(request, { env, tenant, sql });

        return Response.json(
          { error: "Not found" },
          { status: 404, headers: cors }
        );
      }

      // ---- Static assets (Vite build output) ----
      // The @cloudflare/vite-plugin handles asset serving automatically.
      // This fallback returns the SPA index for client-side routing.
      return new Response("Not found", { status: 404, headers: cors });

    } catch (error) {
      console.error("Worker error:", error);
      return Response.json(
        {
          error: "Internal server error",
          ...(env.ENVIRONMENT === "development" && {
            message: error instanceof Error ? error.message : String(error),
          }),
        },
        { status: 500, headers: cors }
      );
    }
  },
} satisfies ExportedHandler<Env>;
