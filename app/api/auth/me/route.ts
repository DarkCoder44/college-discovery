/**
 * GET /api/auth/me
 * ----------------
 * The current session's user, or 401 when anonymous.
 *
 * This is an authentication probe, NOT a health check — an unauthenticated
 * caller correctly receives a 401. Use GET /api/health for liveness.
 */

import { getCurrentUser } from "@/lib/auth/session";
import { ok, handleApiError, errorResponse } from "@/lib/api/responses";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(401, "UNAUTHENTICATED", "Not signed in");
    }

    return ok({ user });
  } catch (error) {
    return handleApiError(error, "GET /api/auth/me");
  }
}
