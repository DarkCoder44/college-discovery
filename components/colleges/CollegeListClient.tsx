"use client";

/**
 * College listing: search, filter, sort, paginate.
 *
 * Data flow:
 *   filter state → debounced query string → GET /api/colleges → render
 *
 * Everything is computed by PostgreSQL. The browser never holds more than one
 * page of colleges, so the dataset can grow without the client changing.
 *
 * The filter state is mirrored into the URL (replace, not push) so a search is
 * shareable and survives a refresh, without flooding browser history with one
 * entry per keystroke.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CollegeCard from "@/components/colleges/CollegeCard";
import CollegeFilters, {
  type CollegeFilterValues,
} from "@/components/colleges/CollegeFilters";
import { CollegeListSkeleton } from "@/components/colleges/CollegeSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCompare } from "@/components/providers/CompareProvider";
import { apiFetch, ApiError } from "@/lib/client/api";
import type {
  CollegeCardData,
  PaginatedResult,
} from "@/lib/services/college.service";

/** Typing pause before a search fires. Long enough to avoid a request per key. */
const SEARCH_DEBOUNCE_MS = 350;

const DEFAULT_FILTERS: CollegeFilterValues = {
  q: "",
  state: "",
  type: "",
  minFees: "",
  maxFees: "",
  minRating: "",
  sortBy: "rating",
  sortOrder: "desc",
};

function readFiltersFromUrl(params: URLSearchParams): CollegeFilterValues {
  return {
    q: params.get("q") ?? "",
    state: params.get("state") ?? "",
    type: params.get("type") ?? "",
    minFees: params.get("minFees") ?? "",
    maxFees: params.get("maxFees") ?? "",
    minRating: params.get("minRating") ?? "",
    sortBy: params.get("sortBy") ?? DEFAULT_FILTERS.sortBy,
    sortOrder: params.get("sortOrder") ?? DEFAULT_FILTERS.sortOrder,
  };
}

function buildQueryString(filters: CollegeFilterValues, page: number): string {
  const params = new URLSearchParams();

  // Omit empty values entirely so the URL stays readable and the server sees
  // "absent" rather than "".
  (Object.keys(filters) as Array<keyof CollegeFilterValues>).forEach((key) => {
    const value = filters[key];
    if (value !== "" && value !== DEFAULT_FILTERS[key]) params.set(key, value);
  });

  // Sort is always explicit so a shared link reproduces the exact ordering.
  params.set("sortBy", filters.sortBy);
  params.set("sortOrder", filters.sortOrder);
  if (page > 1) params.set("page", String(page));

  return params.toString();
}

export default function CollegeListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSaved, toggleSaved } = useAuth();
  const { isSelected, toggle: toggleCompare } = useCompare();

  // Initialised from the URL so /colleges?q=Delhi works as a deep link.
  const [filters, setFilters] = useState<CollegeFilterValues>(() =>
    readFiltersFromUrl(new URLSearchParams(searchParams.toString()))
  );
  const [page, setPage] = useState(() => {
    const parsed = Number(searchParams.get("page") ?? "1");
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  });

  /**
   * One state object holding the response AND the query it belongs to.
   *
   * `isLoading` is then *derived* — "the data I have is not for the query I am
   * asking" — rather than being a separate flag flipped at the top of the fetch
   * effect. Setting state synchronously inside an effect body triggers a
   * cascading render (and React 19 flags it); deriving it removes both the
   * extra render and the possibility of the flag drifting out of sync with the
   * data.
   */
  const [fetchState, setFetchState] = useState<{
    forQuery: string | null;
    result: PaginatedResult<CollegeCardData> | null;
    error: string | null;
  }>({ forQuery: null, result: null, error: null });

  const [states, setStates] = useState<string[]>([]);

  // The text input updates on every keystroke; the *query* only follows after
  // the user pauses. This is what the previous implementation intended — its
  // debounce timer was created but never used, so every character refetched.
  const [debouncedQuery, setDebouncedQuery] = useState(filters.q);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.q), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const effectiveFilters = useMemo(
    () => ({ ...filters, q: debouncedQuery }),
    [filters, debouncedQuery]
  );

  const queryString = useMemo(
    () => buildQueryString(effectiveFilters, page),
    [effectiveFilters, page]
  );

  // `reloadToken` lets "Try again" re-run the same query.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // Aborting on cleanup means a slow earlier response can never overwrite a
    // newer one — the classic out-of-order race when a user types quickly.
    const controller = new AbortController();

    apiFetch<PaginatedResult<CollegeCardData>>(`/api/colleges?${queryString}`, {
      signal: controller.signal,
    })
      .then((data) => {
        setFetchState({ forQuery: queryString, result: data, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchState({
          forQuery: queryString,
          result: null,
          error:
            err instanceof ApiError
              ? err.message
              : "Could not load colleges. Please try again.",
        });
      });

    return () => controller.abort();
  }, [queryString, reloadToken]);

  // Derived, not stored: true whenever the data on hand is for a stale query.
  const isLoading = fetchState.forQuery !== queryString;
  const error = isLoading ? null : fetchState.error;

  // Keep the address bar in sync with the current search (shareable URL).
  useEffect(() => {
    router.replace(`/colleges${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [queryString, router]);

  // Filter options are static per dataset — fetched once, not per search.
  useEffect(() => {
    apiFetch<{ states: string[] }>("/api/colleges/filter-options")
      .then((data) => setStates(data.states))
      .catch(() => setStates([])); // Dropdown degrades to "All states".
  }, []);

  const handleFilterChange = useCallback((patch: Partial<CollegeFilterValues>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1); // Any filter change invalidates the current page number.
  }, []);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedQuery("");
    setPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.state !== "" ||
    filters.type !== "" ||
    filters.minFees !== "" ||
    filters.maxFees !== "" ||
    filters.minRating !== "";

  const pagination = isLoading ? null : fetchState.result?.pagination;
  const colleges = isLoading ? [] : (fetchState.result?.data ?? []);

  return (
    <div>
      <CollegeFilters
        values={filters}
        states={states}
        hasActiveFilters={hasActiveFilters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* pb-24 leaves room for the fixed compare tray at the bottom. */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {!isLoading && !error && pagination && pagination.total > 0 && (
          <p className="text-sm text-slate-500 mb-5" aria-live="polite">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{pagination.total}</span>{" "}
            colleges
          </p>
        )}

        {isLoading && <CollegeListSkeleton count={8} />}

        {!isLoading && error && (
          <EmptyState
            tone="error"
            icon="⚠️"
            title="Could not load colleges"
            description={error}
            action={
              <button
                type="button"
                onClick={() => setReloadToken((t) => t + 1)}
                className="btn btn-primary"
              >
                Try again
              </button>
            }
          />
        )}

        {!isLoading && !error && colleges.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No colleges match your search"
            description={
              hasActiveFilters
                ? "Try removing a filter or searching for a different city."
                : "There are no colleges in the database yet. Run the seed script to load sample data."
            }
            action={
              hasActiveFilters ? (
                <button type="button" onClick={handleReset} className="btn btn-primary">
                  Clear all filters
                </button>
              ) : (
                <Link href="/" className="btn btn-primary">
                  Back to home
                </Link>
              )
            }
          />
        )}

        {!isLoading && !error && colleges.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {colleges.map((college) => (
              <CollegeCard
                key={college.id}
                college={college}
                isSaved={isSaved(college.id)}
                isInCompare={isSelected(college.id)}
                onToggleSave={(c) => void toggleSaved(c.id, c.name)}
                onToggleCompare={(c) =>
                  toggleCompare({ id: c.id, name: c.name, slug: c.slug })
                }
              />
            ))}
          </div>
        )}

        {!isLoading && !error && pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            hasPrev={pagination.hasPrev}
            hasNext={pagination.hasNext}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
