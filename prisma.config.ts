import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma CLI (migrate/studio/db push) needs a direct (non-pooled) connection
// for schema operations against Neon — the app's runtime client uses the
// pooled DATABASE_URL instead (see src/lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
