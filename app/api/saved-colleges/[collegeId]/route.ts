/**
 * DELETE /api/saved-colleges/[collegeId] — remove a college from the shortlist
 *
 * The delete is scoped by the session user id, so a request naming another
 * user's saved record matches nothing and returns 404 — it can never delete it.
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { collegeIdSchema } from "@/lib/validation/schemas";
import { unsaveCollege } from "@/lib/services/saved.service";
import { unauthenticatedError } from "@/lib/api/errors";
import { ok, handleApiError, validationErrorResponse } from "@/lib/api/responses";

type RouteContext = { params: Promise<{ collegeId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) throw unauthenticatedError("Sign in to manage your saved colleges");

    const { collegeId } = await params;
    const parsed = collegeIdSchema.safeParse(collegeId);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error, "Invalid college");
    }

    await unsaveCollege(user.id, parsed.data);

    return ok({ collegeId: parsed.data, saved: false });
  } catch (error) {
    return handleApiError(error, "DELETE /api/saved-colleges/[collegeId]");
  }
}
