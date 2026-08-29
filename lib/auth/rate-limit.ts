/**
 * In-Memory Rate Limiter
 * ----------------------
 * A fixed-window counter used to slow down credential stuffing and signup
 * abuse on the auth endpoints.
 *
 * Deliberate scope: this is an in-process Map, NOT Redis. For this application
 * that is the right trade-off — it costs zero dependencies and zero
 * infrastructure, and it stops the naive "hammer /api/auth/login in a loop"
 * attack that an unprotected endpoint invites.
 *
 * Known limitation (documented in the README): on a multi-instance or
 * serverless deployment each instance keeps its own counter, so the effective
 * limit is per-instance. A production system at real scale would move this to
 * Redis or an edge rate limiter. Adding that here would be premature.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the Map cannot grow without bound. */
function evictExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Cheap opportunistic cleanup — the auth endpoints are low traffic.
  if (buckets.size > 1000) evictExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Test helper — clears all counters. */
export function resetRateLimits() {
  buckets.clear();
}

/**
 * Best-effort client identifier. Behind Vercel/most proxies the real client IP
 * arrives in `x-forwarded-for`. This is only used for rate limiting, never for
 * authorization, so a spoofed header cannot escalate privileges.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
