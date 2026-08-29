/**
 * POST /api/auth/signup
 * ---------------------
 * Creates an account and immediately starts a session.
 *
 * Body: { name, email, password }
 * 201 → { data: { user } }    400 → validation failed
 * 409 → email already registered
 * 429 → too many attempts from this client
 */

import { NextRequest } from "next/server";
import { signupSchema } from "@/lib/validation/schemas";
import { registerUser } from "@/lib/services/auth.service";
import { createUserSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIdentifier } from "@/lib/auth/rate-limit";
import { rateLimitedError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/request";
import { created, handleApiError, validationErrorResponse } from "@/lib/api/responses";

const SIGNUP_LIMIT = 10;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error, "Please correct the errors below");
    }

    /*
     * Rate-limit AFTER validation, not before.
     *
     * The budget should be spent on real account-creation attempts. Counting
     * rejected-by-validation requests means a user who mistypes their password
     * a few times on the form gets locked out for an hour — while an attacker
     * scripting well-formed requests is throttled either way. Malformed
     * requests are cheap (no bcrypt, no database write), so leaving them
     * uncounted costs nothing.
     */
    const limit = checkRateLimit(
      `signup:${getClientIdentifier(request)}`,
      SIGNUP_LIMIT,
      SIGNUP_WINDOW_MS
    );
    if (!limit.allowed) {
      throw rateLimitedError(
        "Too many sign-up attempts. Please try again later.",
        limit.retryAfterSeconds
      );
    }

    const user = await registerUser(parsed.data);
    await createUserSession(user);

    // registerUser's projection is id/name/email only — the password hash
    // never leaves the service layer.
    return created({ user });
  } catch (error) {
    return handleApiError(error, "POST /api/auth/signup");
  }
}
