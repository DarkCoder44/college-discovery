"use client";

/**
 * The search + filter + sort bar.
 *
 * Presentational: it owns no data-fetching. All state lives in
 * CollegeListClient so the URL, the query and the controls cannot drift apart.
 */

import { COLLEGE_TYPES } from "@/lib/validation/schemas";

export interface CollegeFilterValues {
  q: string;
  state: string;
  type: string;
  minFees: string;
  maxFees: string;
  minRating: string;
  sortBy: string;
  sortOrder: string;
}

/** Fee brackets, encoded as "min:max" so one <select> drives two params. */
const FEE_RANGES = [
  { label: "All fees", min: "", max: "" },
  { label: "Under ₹1L", min: "", max: "100000" },
  { label: "₹1L – ₹3L", min: "100000", max: "300000" },
  { label: "₹3L – ₹6L", min: "300000", max: "600000" },
  { label: "Above ₹6L", min: "600000", max: "" },
];

const SORT_OPTIONS = [
  { label: "Highest rated", sortBy: "rating", sortOrder: "desc" },
  { label: "Highest package", sortBy: "averagePlacement", sortOrder: "desc" },
  { label: "Lowest fees", sortBy: "fees", sortOrder: "asc" },
  { label: "Highest fees", sortBy: "fees", sortOrder: "desc" },
  { label: "Name (A–Z)", sortBy: "name", sortOrder: "asc" },
  { label: "Oldest first", sortBy: "establishedYear", sortOrder: "asc" },
];

interface CollegeFiltersProps {
  values: CollegeFilterValues;
  states: string[];
  hasActiveFilters: boolean;
  onChange: (patch: Partial<CollegeFilterValues>) => void;
  onReset: () => void;
}

export default function CollegeFilters({
  values,
  states,
  hasActiveFilters,
  onChange,
  onReset,
}: CollegeFiltersProps) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="college-search"
              type="search"
              value={values.q}
              onChange={(e) => onChange({ q: e.target.value })}
              placeholder="Search by college name, city or state…"
              className="input pl-10"
              aria-label="Search colleges"
            />
          </div>

          {hasActiveFilters && (
            <button type="button" onClick={onReset} className="btn btn-ghost btn-sm">
              Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={values.state}
            onChange={(e) => onChange({ state: e.target.value })}
            className="input max-w-[170px] text-sm"
            aria-label="Filter by state"
          >
            <option value="">All states</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <select
            value={values.type}
            onChange={(e) => onChange({ type: e.target.value })}
            className="input max-w-[150px] text-sm"
            aria-label="Filter by college type"
          >
            <option value="">All types</option>
            {COLLEGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={values.minRating}
            onChange={(e) => onChange({ minRating: e.target.value })}
            className="input max-w-[150px] text-sm"
            aria-label="Filter by minimum rating"
          >
            <option value="">Any rating</option>
            <option value="3">3.0+ ★</option>
            <option value="3.5">3.5+ ★</option>
            <option value="4">4.0+ ★</option>
            <option value="4.5">4.5+ ★</option>
          </select>

          <select
            value={`${values.minFees}:${values.maxFees}`}
            onChange={(e) => {
              const [min, max] = e.target.value.split(":");
              onChange({ minFees: min, maxFees: max });
            }}
            className="input max-w-[170px] text-sm"
            aria-label="Filter by annual fees"
          >
            {FEE_RANGES.map((range) => (
              <option key={range.label} value={`${range.min}:${range.max}`}>
                {range.label}
              </option>
            ))}
          </select>

          <select
            value={`${values.sortBy}:${values.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split(":");
              onChange({ sortBy, sortOrder });
            }}
            className="input max-w-[190px] text-sm sm:ml-auto"
            aria-label="Sort colleges"
          >
            {SORT_OPTIONS.map((option) => (
              <option
                key={option.label}
                value={`${option.sortBy}:${option.sortOrder}`}
              >
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
