"use client";

import { useEffect } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Root error boundary.
 *
 * The user never sees a stack trace. The real error goes to the server/browser
 * console (and would go to an error tracker in a real deployment); the page
 * shows a recoverable message and a way out.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Unhandled render error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-24">
      <EmptyState
        tone="error"
        icon="⚠️"
        title="Something went wrong"
        description="An unexpected error occurred. Please try again — if it keeps happening, come back in a few minutes."
        action={
          <>
            <button type="button" onClick={reset} className="btn btn-primary">
              Try again
            </button>
            <Link href="/" className="btn btn-ghost">
              Go home
            </Link>
          </>
        }
      />
    </div>
  );
}
