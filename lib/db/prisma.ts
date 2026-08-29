/**
 * Prisma Client Singleton
 * -----------------------
 * In development Next.js hot-reloads modules, and a fresh `new PrismaClient()`
 * on every reload exhausts the Postgres connection pool within a few edits.
 * Stashing the instance on `globalThis` survives module reloads.
 *
 * In production the module is evaluated once, so a plain module-level instance
 * is correct — and we deliberately do NOT attach it to `globalThis` there.
 */

import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is noisy and leaks parameter values into logs — dev only.
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Cheap liveness probe for GET /api/health.
 * `SELECT 1` is a parameterless literal — no user input is involved, so this
 * use of $queryRaw carries no injection surface.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[health] Database connectivity check failed:", error);
    return false;
  }
}
