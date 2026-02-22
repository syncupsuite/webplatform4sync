import { betterAuth } from "better-auth";

import type { Env } from "@/server/index";

// Session duration — mirrors shared/contracts/constants.ts (keep in sync)
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;      // 7 days
const SESSION_REFRESH_SECONDS = 24 * 60 * 60;       // 1 day

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
      expiresIn: SESSION_TTL_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
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
      ...(env.ENVIRONMENT === "development" ? ["http://localhost:8080"] : []),
    ],
  });
}

// ---------------------------------------------------------------------------
// Auth types - re-export for use in route handlers
// ---------------------------------------------------------------------------

export type Auth = ReturnType<typeof auth>;
