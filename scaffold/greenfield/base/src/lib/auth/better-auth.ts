import { betterAuth } from "better-auth";
import { neon } from "@neondatabase/serverless";

import type { Env } from "@/server/index";

// ---------------------------------------------------------------------------
// Better Auth - server configuration
// ---------------------------------------------------------------------------

/**
 * Creates a Better Auth instance scoped to the current request environment.
 * Called per-request because Workers don't persist state between invocations.
 *
 * Auth data lives in the shared `neon_auth` schema so all SyncUpSuite apps
 * share a single identity layer.
 */
export function auth(env: Env) {
  const sql = neon(env.NEON_DATABASE_URL);

  return betterAuth({
    database: {
      type: "postgres",
      url: env.NEON_DATABASE_URL,
    },

    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_URL,
    basePath: "/api/auth",

    // ---- Session ----
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24,       // refresh daily
    },

    // ---- OAuth providers ----
    // Uncomment and configure per scaffold qualification.
    // socialProviders: {
    //   google: {
    //     clientId: env.GOOGLE_CLIENT_ID,
    //     clientSecret: env.GOOGLE_CLIENT_SECRET,
    //   },
    //   github: {
    //     clientId: env.GITHUB_CLIENT_ID,
    //     clientSecret: env.GITHUB_CLIENT_SECRET,
    //   },
    // },

    // ---- Email/password ----
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },

    // ---- Tenant-scoped sessions ----
    // Organization support for multi-tenant isolation
    // organization: {
    //   enabled: true,
    // },

    // ---- Advanced ----
    trustedOrigins: [
      env.APP_URL,
      "http://localhost:8080",
    ],
  });
}

// ---------------------------------------------------------------------------
// Auth types - re-export for use in route handlers
// ---------------------------------------------------------------------------

export type Auth = ReturnType<typeof auth>;
