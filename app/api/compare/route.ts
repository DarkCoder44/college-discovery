/**
 * GET /api/compare?ids=id1,id2[,id3]
 * ----------------------------------
 * Comparison data for 2-3 colleges, fetched in one query.
 *
 * Duplicate ids are collapsed by the schema before the count is checked, so
 * `?ids=x,x` is rejected as "select at least 2" rather than silently comparing
 * a college against itself.
 */

import { NextRequest } from "next/server";
import { compareQuerySchema } from "@/lib/validation/schemas";
import { compareColleges } from "@/lib/services/college.service";
import {
  ok,
  handleApiError,
  validationErrorResponse,
  firstIssueMessage,
} from "@/lib/api/responses";

export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.get("ids");

    const parsed = compareQuerySchema.safeParse({ ids: ids ?? "" });
    if (!parsed.success) {
      // Surface the specific rule that failed ("Select at least 2 colleges to
      // compare") — the UI shows this string directly.
      return validationErrorResponse(
        parsed.error,
        firstIssueMessage(parsed.error, "Invalid comparison selection")
      );
    }

    return ok({ colleges: await compareColleges(parsed.data.ids) });
  } catch (error) {
    return handleApiError(error, "GET /api/compare");
  }
}
