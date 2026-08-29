/**
 * Loading placeholders that mirror the real card/detail layout, so the page
 * does not jump when data arrives.
 */

export function CollegeCardSkeleton() {
  return (
    <div className="card overflow-hidden flex flex-col" aria-hidden="true">
      <div className="h-32 skeleton rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        <div>
          <div className="skeleton h-5 w-3/4 mb-2" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-4 w-32" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
        <div className="skeleton h-10 rounded-lg mt-1" />
      </div>
    </div>
  );
}

export function CollegeListSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      role="status"
      aria-label="Loading colleges"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CollegeCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading colleges…</span>
    </div>
  );
}
