/**
 * Application Errors
 * ------------------
 * A single typed error class that services throw and route handlers translate
 * into HTTP responses.
 *
 * Why not throw plain `Error`s? The previous approach matched on message
 * strings (`error.message.startsWith("Colleges not found:")`), which is fragile
 * and silently breaks when a message is reworded. A typed error carries the
 * HTTP status and a machine-readable code, so the mapping is explicit.
 *
 * Rule: `message` on an AppError is ALWAYS safe to show to the end user.
 * Anything else (a Prisma failure, a bug) is caught by `handleApiError` and
 * replaced with a generic 500 so internal details never leak.
 */

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;
  /** Seconds until the client may retry — becomes the Retry-After header. */
  readonly retryAfterSeconds?: number;

  constructor(
    code: AppErrorCode,
    message: string,
    details?: unknown,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ─── Convenience constructors ────────────────────────────────────────────────

export const validationError = (message: string, details?: unknown) =>
  new AppError("VALIDATION_ERROR", message, details);

export const unauthenticatedError = (message = "You must be signed in to do that") =>
  new AppError("UNAUTHENTICATED", message);

export const forbiddenError = (message = "You do not have permission to do that") =>
  new AppError("FORBIDDEN", message);

export const notFoundError = (message = "Resource not found") =>
  new AppError("NOT_FOUND", message);

export const conflictError = (message: string) => new AppError("CONFLICT", message);

export const rateLimitedError = (
  message = "Too many attempts. Please try again later.",
  retryAfterSeconds?: number
) => new AppError("RATE_LIMITED", message, undefined, retryAfterSeconds);
