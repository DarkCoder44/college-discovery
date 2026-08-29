/**
 * Typed fetch wrapper for this app's API.
 * -----------------------------------------
 * Every endpoint answers with `{ data }` or `{ error, code, details }`, so the
 * unwrapping and error-shaping is done once here instead of in every component.
 *
 * A failed request throws an `ApiError` carrying the server's user-safe message,
 * which the UI can render directly.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthenticated() {
    return this.status === 401;
  }
}

interface ApiOptions extends RequestInit {
  /** Abort signal so stale in-flight requests can be cancelled. */
  signal?: AbortSignal;
}

export async function apiFetch<T>(url: string, options: ApiOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    // Re-throw aborts untouched so callers can ignore them.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Check your connection.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // A body-less response (or malformed JSON) is handled by the status check.
  }

  if (!response.ok) {
    const body = (payload ?? {}) as {
      error?: string;
      code?: string;
      details?: Record<string, string[]>;
    };
    throw new ApiError(
      response.status,
      body.code ?? "UNKNOWN",
      body.error ?? "Something went wrong. Please try again.",
      body.details
    );
  }

  return (payload as { data: T }).data;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export function del<T>(url: string): Promise<T> {
  return apiFetch<T>(url, { method: "DELETE" });
}
