import { PrismaClient } from "@prisma/client";

/**
 * Reuse a single PrismaClient across hot reloads in development so we don't
 * exhaust the Postgres connection pool with every module re-evaluation.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
