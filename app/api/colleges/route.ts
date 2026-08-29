/**
 * GET /api/colleges
 * -----------------
 * Search, filter, sort and paginate the college catalogue.
 *
 * Every filter, sort and page window is applied by PostgreSQL. The client never
 * receives rows it is going to discard.
 *
 * Query parameters: q, state, type, minFees, maxFees, minRating, maxRating,
 *                   page, limit, sortBy, sortOrder  (all optional)
 */

import { NextRequest } from "next/server";
import { collegeListSchema } from "@/lib/validation/schemas";
import { listColleges } from "@/lib/services/college.service";
import { ok, handleApiError, validationErrorResponse } from "@/lib/api/responses";

export async function GET(request: NextRequest) {
  try {
    const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = collegeListSchema.safeParse(rawParams);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error, "Invalid search parameters");
    }

    return ok(await listColleges(parsed.data));
  } catch (error) {
    return handleApiError(error, "GET /api/colleges");
  }
}
