"use client";

/**
 * Compare page controller.
 *
 * Selection source of truth:
 *   1. On first load, `?ids=` from the URL wins — that is what makes a
 *      comparison link shareable.
 *   2. After that, CompareProvider owns it, and the URL is kept in sync.
 *
 * College data is always fetched from /api/compare. The store keeps only ids
 * and display names, so every figure shown comes from PostgreSQL and can never
 * be a stale localStorage value.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CompareTable from "@/components/compare/CompareTable";
import CollegePicker from "@/components/compare/CollegePicker";
import EmptyState from "@/components/ui/EmptyState";
import { useCompare, PENDING_NAME } from "@/components/providers/CompareProvider";
import { apiFetch, ApiError } from "@/lib/client/api";
import { MAX_COMPARE_COLLEGES, MIN_COMPARE_COLLEGES } from "@/lib/validation/schemas";
import type { CompareCollege } from "@/lib/services/college.service";
import type { CompareEntry } from "@/lib/client/compare-store";

/** Stable empty reference, so the memo below never yields a new array. */
const EMPTY_COLLEGES: CompareCollege[] = [];

interface CompareFetchState {
  /** The comma-joined ids this result belongs to; "" before anything loaded. */
  forIds: string;
  colleges: CompareCollege[];
  error: string | null;
}

export default function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { entries, ids, count, isFull, toggle, remove, clear, replace, syncNames } =
    useCompare();

  const [fetchState, setFetchState] = useState<CompareFetchState>({
    forIds: "",
    colleges: [],
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  const idsKey = useMemo(() => ids.join(","), [ids]);
  const hasEnough = count >= MIN_COMPARE_COLLEGES;

  // ── Adopt ?ids= exactly once, on mount ──
  // Re-running this would fight the URL sync effect below on every change.
  const hasAdoptedUrl = useRef(false);

  useEffect(() => {
    if (hasAdoptedUrl.current) return;
    hasAdoptedUrl.current = true;

    const urlIds = (searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_COMPARE_COLLEGES);

    if (urlIds.length === 0) return;

    // Replace rather than merge: the visitor asked for THIS comparison. Real
    // names are unknown until the data arrives, so each entry starts on a
    // placeholder that one of the two resolvers below fills in.
    replace(urlIds.map((id) => ({ id, name: PENDING_NAME, slug: id })));
  }, [searchParams, replace]);

  // ── Keep the address bar in step with the selection (shareable link) ──
  useEffect(() => {
    router.replace(idsKey ? `/compare?ids=${idsKey}` : "/compare", { scroll: false });
  }, [idsKey, router]);

  // ── Fetch the comparison ──
  useEffect(() => {
    if (!hasEnough) return;

    const controller = new AbortController();

    apiFetch<{ colleges: CompareCollege[] }>(`/api/compare?ids=${idsKey}`, {
      signal: controller.signal,
    })
      .then((data) => {
        setFetchState({ forIds: idsKey, colleges: data.colleges, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetchState({
          forIds: idsKey,
          colleges: [],
          error:
            err instanceof ApiError
              ? err.message
              : "Could not load the comparison. Please try again.",
        });
      });

    return () => controller.abort();
  }, [idsKey, hasEnough, reloadToken]);

  // Derived rather than stored, so the flag can never drift from the data and
  // no setState happens synchronously inside an effect body.
  const isLoading = hasEnough && fetchState.forIds !== idsKey;
  const error = isLoading || !hasEnough ? null : fetchState.error;
  // Memoised so its identity is stable — the effect below depends on it, and a
  // fresh [] each render would re-run that effect indefinitely.
  const colleges = useMemo(
    () => (fetchState.forIds === idsKey ? fetchState.colleges : EMPTY_COLLEGES),
    [fetchState, idsKey]
  );

  // Replace the placeholders with real names once the comparison arrives.
  // `syncNames` no-ops when nothing changed, so this settles in one pass.
  useEffect(() => {
    if (colleges.length === 0) return;
    syncNames(colleges.map((c) => ({ id: c.id, name: c.name, slug: c.slug })));
  }, [colleges, syncNames]);

  /*
   * Fallback resolver for a single-college link.
   *
   * /api/compare deliberately requires at least two ids, so a shared link like
   * `/compare?ids=<one>` never triggers the fetch above and its chip would sit
   * on the "Loading…" placeholder forever. Resolve those names one at a time
   * instead. An id that no longer exists is dropped from the selection rather
   * than left as a permanent placeholder.
   */
  const pendingIds = useMemo(
    () => entries.filter((entry) => entry.name === PENDING_NAME).map((e) => e.id),
    [entries]
  );
  const pendingKey = pendingIds.join(",");

  useEffect(() => {
    if (hasEnough || pendingIds.length === 0) return;

    const controller = new AbortController();

    Promise.all(
      pendingIds.map((id) =>
        apiFetch<{ id: string; name: string; slug: string }>(`/api/colleges/${id}`, {
          signal: controller.signal,
        })
          .then((college) => ({
            id: college.id,
            name: college.name,
            slug: college.slug,
          }))
          .catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "AbortError") return null;
            // 404 or malformed id — this college cannot be compared.
            remove(id);
            return null;
          })
      )
    ).then((resolved) => {
      const found = resolved.filter((entry): entry is CompareEntry => entry !== null);
      if (found.length > 0) syncNames(found);
    });

    return () => controller.abort();
    // `pendingIds` is derived from `entries`; keying on the joined string keeps
    // this from re-running on every unrelated selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey, hasEnough, syncNames, remove]);

  const handleRetry = useCallback(() => setReloadToken((token) => token + 1), []);

  const needed = MIN_COMPARE_COLLEGES - count;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Compare colleges
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Pick {MIN_COMPARE_COLLEGES}–{MAX_COMPARE_COLLEGES} colleges to see them
              side by side
            </p>
          </div>
          {count > 0 && (
            <button type="button" onClick={clear} className="btn btn-ghost btn-sm">
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* ── Selection ── */}
        <div className="card p-5 sm:p-6">
          {count > 0 && (
            <ul className="flex flex-wrap gap-2 mb-5">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full pl-3.5 pr-2 py-1.5"
                >
                  <span className="text-sm text-indigo-800 font-medium max-w-[220px] truncate">
                    {entry.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    className="text-indigo-400 hover:text-indigo-800 leading-none"
                    aria-label={`Remove ${entry.name} from the comparison`}
                  >
                    ×
                  </button>
                </li>
              ))}

              {Array.from({ length: Math.max(0, MIN_COMPARE_COLLEGES - count) }).map(
                (_, index) => (
                  <li
                    key={`slot-${index}`}
                    className="flex items-center border-2 border-dashed border-slate-200 rounded-full px-4 py-1.5 text-slate-400 text-xs"
                  >
                    Empty slot
                  </li>
                )
              )}
            </ul>
          )}

          <div className="max-w-sm">
            <CollegePicker excludedIds={ids} disabled={isFull} onSelect={toggle} />
            {isFull && (
              <p className="text-xs text-slate-500 mt-1.5">
                You have reached the {MAX_COMPARE_COLLEGES}-college limit. Remove one
                to add another.
              </p>
            )}
          </div>
        </div>

        {/* ── Empty ── */}
        {count === 0 && (
          <EmptyState
            icon="⚖️"
            title="Nothing to compare yet"
            description={`Search above, or add colleges from the listing page. You can compare ${MIN_COMPARE_COLLEGES} or ${MAX_COMPARE_COLLEGES} at a time.`}
            action={
              <Link href="/colleges" className="btn btn-primary">
                Browse colleges →
              </Link>
            }
          />
        )}

        {/*
          One selected college is a normal, expected state — not an error. The
          previous implementation fired the API with a single id, received the
          "select at least 2" 400, and rendered it as a red failure banner.
        */}
        {count > 0 && !hasEnough && (
          <EmptyState
            icon="➕"
            title={`Add ${needed} more college${needed === 1 ? "" : "s"}`}
            description="A comparison needs at least two colleges."
            action={
              <Link href="/colleges" className="btn btn-secondary">
                Find colleges →
              </Link>
            }
          />
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="card p-12 text-center" role="status">
            <div
              className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"
              aria-hidden="true"
            />
            <p className="text-slate-500">Loading comparison…</p>
          </div>
        )}

        {/* ── Error (e.g. a shared link naming a deleted college) ── */}
        {error && (
          <EmptyState
            tone="error"
            icon="⚠️"
            title="Could not load the comparison"
            description={error}
            action={
              <>
                <button type="button" onClick={handleRetry} className="btn btn-primary">
                  Try again
                </button>
                <button type="button" onClick={clear} className="btn btn-ghost">
                  Clear selection
                </button>
              </>
            }
          />
        )}

        {/* ── Table ── */}
        {!isLoading && !error && colleges.length >= MIN_COMPARE_COLLEGES && (
          <CompareTable colleges={colleges} onRemove={remove} />
        )}
      </div>
    </div>
  );
}
