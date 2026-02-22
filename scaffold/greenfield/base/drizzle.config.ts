import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env["NEON_DATABASE_URL"]!,
  },
  schemaFilter: ["platform", "{{SCHEMA_NAME}}"],
  verbose: true,
  strict: true,
});
