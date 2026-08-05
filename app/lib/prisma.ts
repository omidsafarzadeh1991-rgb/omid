import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaBetterSqlite3({ url });
  // SQLite serializes transactions through a single connection, so several
  // concurrent bookings (bot + panel + another bot chat) queue up briefly
  // instead of running in parallel. The defaults (maxWait 2s, timeout 5s)
  // are tight enough that a short burst of contention can throw a raw
  // Prisma error instead of the polite "SLOT_TAKEN" rejection.
  const client = new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 10_000, timeout: 10_000 },
  });

  // WAL mode lets ordinary reads (loading the dashboard, checking free
  // slots) keep working while a booking write is in progress, instead of
  // SQLite's default journal mode where a write briefly locks readers out
  // too - matters once the bot webhook, the manual panel, and the reminder
  // sweep can all touch the database around the same moment. This setting
  // is stored inside the database file itself, so this only does real work
  // once per install; every startup after that it's a harmless no-op.
  client.$executeRawUnsafe("PRAGMA journal_mode = WAL;").catch((error: unknown) => {
    console.error("Failed to enable SQLite WAL mode:", error);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
