/**
 * POST /api/auth/login
 * --------------------
 * Verifies credentials and starts a session.
 *
 * Body: { email, password }
 * 200 → { data: { user } }   400 → invalid credentials (deliberately generic)
 * 429 → too many attempts
 */

import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation/schemas";
import { authenticateUser } from "@/lib/services/auth.service";
import { createUserSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rate-limit";
import { rateLimitedError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/request";
import { ok, handleApiError, validationErrorResponse } from "@/lib/api/responses";

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      // A generic message on a login form: naming the malformed field would
      // confirm that an email is well-formed, and by extension probe-able.
      return validationErrorResponse(parsed.error, "Invalid email or password");
    }

    /*
     * Throttle well-formed attempts. This — not bcrypt — is what makes online
     * password guessing impractical; bcrypt's cost only slows down an attacker
     * who has already stolen the hashes.
     *
     * Keyed by client IP rather than by email, so an attacker cannot lock a
     * specific victim out of their own account by deliberately failing logins
     * against it.
     */
    const limit = checkRateLimit(
      `login:${getClientIdentifier(request)}`,
      LOGIN_LIMIT,
      LOGIN_WINDOW_MS
    );
    if (!limit.allowed) {
      throw rateLimitedError(
        "Too many login attempts. Please try again in a few minutes.",
        limit.retryAfterSeconds
      );
    }

    const user = await authenticateUser(parsed.data);
    await createUserSession(user);

    return ok({ user });
  } catch (error) {
    return handleApiError(error, "POST /api/auth/login");
  }
}
