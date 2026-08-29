"use client";

/**
 * Pagination control.
 *
 * Renders a *window* of page numbers around the current page rather than always
 * showing pages 1-7 — on page 20 of 30, buttons for pages 1-7 are useless.
 */

interface PaginationProps {
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

/** Page numbers to render, with `null` marking an ellipsis gap. */
export function buildPageWindow(
  page: number,
  totalPages: number,
  maxButtons = 7
): Array<number | null> {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);
  // Two neighbours either side of the current page.
  for (let offset = 1; offset <= 2; offset++) {
    if (page - offset > 1) pages.add(page - offset);
    if (page + offset < totalPages) pages.add(page + offset);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | null> = [];

  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push(null);
    result.push(value);
  });

  return result;
}

export default function Pagination({
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const window = buildPageWindow(page, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1.5 mt-10 flex-wrap"
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className="btn btn-ghost btn-sm"
      >
        ← Prev
      </button>

      {window.map((pageNumber, index) =>
        pageNumber === null ? (
          <span key={`gap-${index}`} className="px-1.5 text-slate-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            aria-current={pageNumber === page ? "page" : undefined}
            aria-label={`Page ${pageNumber}`}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              pageNumber === page
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {pageNumber}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className="btn btn-ghost btn-sm"
      >
        Next →
      </button>
    </nav>
  );
}
