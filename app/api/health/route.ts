/**
 * GET /api/health
 * ---------------
 * Liveness/readiness probe for uptime monitoring and deployment checks.
 *
 * Reports application status AND database connectivity, because an app that
 * cannot reach Postgres is not actually healthy even though it responds.
 * Returns 503 when the database is unreachable so a load balancer or platform
 * health check can act on it.
 *
 * Intentionally exposes nothing sensitive: no connection string, no version of
 * anything that would help fingerprint the stack, no error details.
 */

import { checkDatabaseConnection } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

// Never cached — a cached health check is worse than none.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const databaseUp = await checkDatabaseConnection();
  const latencyMs = Date.now() - startedAt;

  const body = {
    status: databaseUp ? ("ok" as const) : ("degraded" as const),
    database: databaseUp ? ("up" as const) : ("down" as const),
    latencyMs,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: databaseUp ? 200 : 503 });
}
