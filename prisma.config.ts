import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (migrate/studio/db push) needs a direct (non-pooled) connection
// for schema operations against Neon — the app's runtime client uses the
// pooled DATABASE_URL instead (see src/lib/prisma.ts).
//
// Deliberately NOT using the config module's own env() helper here — it
// throws synchronously the instant the config file loads if the variable is
// missing, before any actual command runs. That breaks `prisma generate`
// (the postinstall script, needed on every fresh `npm install`) on hosts
// that only inject env vars at container *runtime*, not during the Docker
// *build* step — Vercel makes them available during build, but e.g.
// Coolify/Railpack's default `npm ci` build stage does not, even though
// generate itself never opens a DB connection, only reads the schema. A
// plain fallback lets generate succeed everywhere; a command that actually
// needs the connection (migrate, db push, studio) still fails with a clear
// Prisma connection error if the variable is genuinely unset at that point.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
