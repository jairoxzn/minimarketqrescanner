import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireEnv } from "@/lib/env";

// Runtime queries go through Neon's pooled connection (PgBouncer) — la
// conexión directa/unpooled queda reservada para el CLI de Prisma en
// migraciones (ver prisma.config.ts). requireEnv() falla con un mensaje
// claro en los logs del servidor si esto falta, en vez de un error críptico
// de conexión más adelante.
const adapter = new PrismaPg({ connectionString: requireEnv("DATABASE_URL") });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
