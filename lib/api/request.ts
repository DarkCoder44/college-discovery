/**
 * Request Parsing Helpers
 * -----------------------
 * Reading a JSON body can fail before validation even starts (empty body,
 * truncated upload, wrong content-type). That must surface as a 400, never as
 * an unhandled exception, so every handler routes through here.
 */

import { validationError } from "@/lib/api/errors";

/**
 * Reads and JSON-parses a request body.
 * Throws a 400-mapped AppError when the body is absent or not a JSON object.
 */
export async function parseJsonBody(request: Request): Promise<unknown> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw validationError("Request body must be valid JSON");
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw validationError("Request body must be a JSON object");
  }

  return body;
}
