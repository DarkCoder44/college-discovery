"use client";

/**
 * Typeahead for adding a college to the comparison without leaving /compare.
 *
 * Searches server-side via /api/colleges — it never downloads the full
 * catalogue to filter in the browser.
 */

import { useEffect, useId, useRef, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import type { CollegeCardData, PaginatedResult } from "@/lib/services/college.service";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

interface CollegePickerProps {
  excludedIds: string[];
  disabled?: boolean;
  onSelect: (college: { id: string; name: string; slug: string }) => void;
}

export default function CollegePicker({
  excludedIds,
  disabled = false,
  onSelect,
}: CollegePickerProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Results are stored together with the query they answer, so "is a search in
   * flight?" is derived rather than tracked in a separate flag set at the top
   * of the effect. That avoids a synchronous setState inside the effect body.
   */
  const [searchState, setSearchState] = useState<{
    forQuery: string;
    items: CollegeCardData[];
  }>({ forQuery: "", items: [] });

  const trimmedQuery = query.trim();
  const isQueryLongEnough = trimmedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isQueryLongEnough) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      apiFetch<PaginatedResult<CollegeCardData>>(
        `/api/colleges?q=${encodeURIComponent(trimmedQuery)}&limit=6`,
        { signal: controller.signal }
      )
        .then((data) => setSearchState({ forQuery: trimmedQuery, items: data.data }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          // Record the empty result so the "no matches" state can render.
          setSearchState({ forQuery: trimmedQuery, items: [] });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery, isQueryLongEnough]);

  // Close on outside click. `mousedown` rather than `blur` means a click on a
  // result still registers before the list unmounts.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDismissed(true);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const isSearching = isQueryLongEnough && searchState.forQuery !== trimmedQuery;
  const results = searchState.forQuery === trimmedQuery ? searchState.items : [];
  const isOpen = isQueryLongEnough && !isDismissed && !disabled;

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor={inputId} className="label">
        Add a college to compare
      </label>
      <input
        id={inputId}
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsDismissed(false);
        }}
        onFocus={() => setIsDismissed(false)}
        placeholder={
          disabled ? "Remove a college to add another" : "Search by name or city…"
        }
        className="input"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={`${inputId}-results`}
      />

      {isOpen && (
        <ul
          id={`${inputId}-results`}
          role="listbox"
          className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto"
        >
          {isSearching && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">Searching…</li>
          )}

          {!isSearching && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">
              No colleges match &ldquo;{query}&rdquo;
            </li>
          )}

          {results.map((college) => {
            const alreadyAdded = excludedIds.includes(college.id);
            return (
              <li key={college.id} role="option" aria-selected={alreadyAdded}>
                <button
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => {
                    onSelect({
                      id: college.id,
                      name: college.name,
                      slug: college.slug,
                    });
                    setQuery("");
                    setIsDismissed(true);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="block text-sm font-medium text-slate-900">
                    {college.name}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {college.location}
                    {alreadyAdded && " · already added"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
