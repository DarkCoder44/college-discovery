/**
 * POST /api/auth/logout
 * ---------------------
 * Destroys the session cookie.
 *
 * POST rather than GET on purpose: a GET logout can be triggered by any
 * <img src="/api/auth/logout"> on a third-party page, and browsers pre-fetch
 * GETs. State-changing operations must not be reachable that way.
 */

import { destroyUserSession } from "@/lib/auth/session";
import { ok, handleApiError } from "@/lib/api/responses";

export async function POST() {
  try {
    await destroyUserSession();
    return ok({ message: "Signed out successfully" });
  } catch (error) {
    return handleApiError(error, "POST /api/auth/logout");
  }
}
