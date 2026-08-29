/**
 * GET /api/colleges/filter-options
 * --------------------------------
 * Distinct states and college types, used to populate the filter dropdowns.
 * Kept separate from /api/colleges so the option list is fetched once per
 * session instead of on every search.
 */

import { getFilterOptions } from "@/lib/services/college.service";
import { ok, handleApiError } from "@/lib/api/responses";

export async function GET() {
  try {
    return ok(await getFilterOptions());
  } catch (error) {
    return handleApiError(error, "GET /api/colleges/filter-options");
  }
}
