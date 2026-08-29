/**
 * GET  /api/saved-colleges — the signed-in user's shortlist
 * POST /api/saved-colleges — add a college to it   Body: { collegeId }
 *
 * Both operations are scoped to the session user. The user id comes from the
 * encrypted cookie and is never read from the request, so a caller cannot act
 * on another account by changing a parameter.
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { saveCollegeSchema } from "@/lib/validation/schemas";
import { getSavedColleges, saveCollege } from "@/lib/services/saved.service";
import { unauthenticatedError } from "@/lib/api/errors";
import { parseJsonBody } from "@/lib/api/request";
import {
  ok,
  created,
  handleApiError,
  validationErrorResponse,
} from "@/lib/api/responses";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw unauthenticatedError("Sign in to view your saved colleges");

    return ok({ saved: await getSavedColleges(user.id) });
  } catch (error) {
    return handleApiError(error, "GET /api/saved-colleges");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw unauthenticatedError("Sign in to save colleges");

    const body = await parseJsonBody(request);
    const parsed = saveCollegeSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error, "Invalid college");
    }

    await saveCollege(user.id, parsed.data.collegeId);

    return created({ collegeId: parsed.data.collegeId, saved: true });
  } catch (error) {
    return handleApiError(error, "POST /api/saved-colleges");
  }
}
