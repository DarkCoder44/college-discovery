"use client";

import { useEffect } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Catches a failure inside the detail route — most likely the database being
 * unreachable. The user sees a recoverable message, never a stack trace.
 */
export default function CollegeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[colleges/[id]] Render error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <EmptyState
        tone="error"
        icon="⚠️"
        title="Could not load this college"
        description="Something went wrong on our end. Please try again in a moment."
        action={
          <>
            <button type="button" onClick={reset} className="btn btn-primary">
              Try again
            </button>
            <Link href="/colleges" className="btn btn-ghost">
              Back to colleges
            </Link>
          </>
        }
      />
    </div>
  );
}
