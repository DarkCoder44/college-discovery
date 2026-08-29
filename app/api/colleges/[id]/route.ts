/**
 * GET /api/colleges/[id]
 * ----------------------
 * Full college detail: overview, courses, placements and reviews.
 * `[id]` accepts either the cuid or the SEO slug.
 *
 * When the request carries a valid session, the response also reports whether
 * this user has already saved the college, so the client can render the correct
 * toggle state without a second round-trip.
 */

import { NextRequest } from "next/server";
import { collegeIdentifierSchema } from "@/lib/validation/schemas";
import { requireCollege } from "@/lib/services/college.service";
import { isCollegeSaved } from "@/lib/services/saved.service";
import { getCurrentUser } from "@/lib/auth/session";
import { ok, handleApiError, validationErrorResponse } from "@/lib/api/responses";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const parsed = collegeIdentifierSchema.safeParse(id);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error, "Invalid college identifier");
    }

    const college = await requireCollege(parsed.data);

    const user = await getCurrentUser();
    const isSaved = user ? await isCollegeSaved(user.id, college.id) : false;

    return ok({ ...college, isSaved });
  } catch (error) {
    return handleApiError(error, "GET /api/colleges/[id]");
  }
}
