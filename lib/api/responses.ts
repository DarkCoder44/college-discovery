/**
 * API Response Helpers
 * --------------------
 * Every endpoint returns one of exactly two JSON shapes, so the frontend never
 * has to guess:
 *
 *   Success:  { "data": <payload> }
 *   Error:    { "error": "<user-safe message>", "code": "<MACHINE_CODE>",
 *               "details"?: <field errors> }
 *
 * `handleApiError` is the single place where an exception becomes a response.
 * Known (AppError / Zod) failures map to their proper status; anything else is
 * logged server-side and returned as a generic 500 so we never leak internals
 * such as SQL text, table names, or stack traces to the client.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, type AppErrorCode } from "@/lib/api/errors";

// ─── Success ─────────────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

// ─── Error ───────────────────────────────────────────────────────────────────

export function errorResponse(
  status: number,
  code: AppErrorCode | "INTERNAL_ERROR",
  message: string,
  details?: unknown,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    { error: message, code, ...(details !== undefined ? { details } : {}) },
    { status, ...(headers ? { headers } : {}) }
  );
}

/**
 * Translate any thrown value into a safe HTTP response.
 * `context` identifies the route in server logs (e.g. "GET /api/colleges").
 */
export function handleApiError(error: unknown, context: string) {
  if (error instanceof AppError) {
    // Retry-After tells a well-behaved client exactly when to try again,
    // rather than making it guess.
    const headers = error.retryAfterSeconds
      ? { "Retry-After": String(error.retryAfterSeconds) }
      : undefined;
    return errorResponse(
      error.status,
      error.code,
      error.message,
      error.details,
      headers
    );
  }

  // A Zod error escaping a service means we forgot a safeParse — still a 400.
  if (error instanceof ZodError) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Invalid input",
      error.flatten().fieldErrors
    );
  }

  // Database problems: log the real cause, return a generic message.
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    console.error(`[${context}] Database error:`, error);
    return errorResponse(
      503,
      "INTERNAL_ERROR",
      "The service is temporarily unavailable. Please try again shortly."
    );
  }

  console.error(`[${context}] Unhandled error:`, error);
  return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}

/** Turn a failed Zod `safeParse` into a 400 with per-field messages. */
export function validationErrorResponse(error: ZodError, message = "Invalid input") {
  return errorResponse(400, "VALIDATION_ERROR", message, error.flatten().fieldErrors);
}

/**
 * The first human-readable message from a ZodError.
 * Used where a single sentence is more useful to the UI than a field map —
 * e.g. "Select at least 2 colleges to compare".
 */
export function firstIssueMessage(error: ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}
