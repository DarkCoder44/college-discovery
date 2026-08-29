"use client";

/**
 * Saved colleges list.
 *
 * Server-rendered with data already present (`initialSaved`), so there is no
 * loading state on first paint. Removals update this list optimistically and
 * roll back if the server rejects them.
 */

import { useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import RatingStars from "@/components/ui/RatingStars";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCompare } from "@/components/providers/CompareProvider";
import {
  collegeTypeBadgeClass,
  formatCurrency,
  formatDate,
  formatNumber,
} from "@/lib/format";
import { MIN_COMPARE_COLLEGES } from "@/lib/validation/schemas";
import type { SavedCollegeEntry } from "@/lib/services/saved.service";

interface SavedCollegesClientProps {
  initialSaved: SavedCollegeEntry[];
  userName: string;
}

export default function SavedCollegesClient({
  initialSaved,
  userName,
}: SavedCollegesClientProps) {
  /**
   * The server-rendered `initialSaved` is the base list. Rather than copying it
   * into state and re-syncing it with an effect (which sets state during the
   * render that follows a prop change), removals are tracked as a set of ids
   * and the visible list is derived.
   */
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { toggleSaved, savedCollegeIds, isLoading: isAuthLoading } = useAuth();
  const { isSelected, toggle: toggleCompare, canCompare, compareHref } = useCompare();

  async function handleRemove(collegeId: string, collegeName: string) {
    setRemovingId(collegeId);

    // Optimistic removal — the row disappears immediately.
    setRemovedIds((current) => new Set(current).add(collegeId));

    const succeeded = await toggleSaved(collegeId, collegeName);

    if (!succeeded) {
      // toggleSaved has already shown the error; put the row back.
      setRemovedIds((current) => {
        const next = new Set(current);
        next.delete(collegeId);
        return next;
      });
    }

    setRemovingId(null);
  }

  /**
   * Derived list. `savedCollegeIds` also filters out anything unsaved from
   * another page in this session — but only once the auth probe has resolved,
   * since before that the set is empty and would blank the whole list.
   */
  const visible = initialSaved.filter((entry) => {
    if (removedIds.has(entry.college.id)) return false;
    if (isAuthLoading) return true;
    return savedCollegeIds.has(entry.college.id);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              ★ Saved colleges
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {userName.split(" ")[0]}&apos;s shortlist — {visible.length} college
              {visible.length === 1 ? "" : "s"}
            </p>
          </div>

          {canCompare && (
            <Link href={compareHref} className="btn btn-secondary btn-sm">
              ⚖ View comparison
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
        {visible.length === 0 ? (
          <EmptyState
            icon="📌"
            title="No saved colleges yet"
            description="Browse the catalogue and use the ☆ button on any college to add it to your shortlist."
            action={
              <Link href="/colleges" className="btn btn-primary">
                Browse colleges →
              </Link>
            }
          />
        ) : (
          <ul className="space-y-4">
            {visible.map(({ savedAt, college }) => (
              <li key={college.id} className="card p-5 flex flex-col sm:flex-row gap-5">
                <span
                  className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  aria-hidden="true"
                >
                  {college.name.charAt(0)}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-semibold text-slate-900">{college.name}</h2>
                    <span className={`badge ${collegeTypeBadgeClass(college.type)}`}>
                      {college.type}
                    </span>
                    {college.accreditation && (
                      <span className="badge badge-success">{college.accreditation}</span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 mb-3">{college.location}</p>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                    <RatingStars rating={college.rating} />
                    <span>{formatCurrency(college.fees)} / year</span>
                    <span>{formatCurrency(college.averagePlacement)} avg. package</span>
                    <span>{formatNumber(college.totalStudents)} students</span>
                    <span className="text-slate-400">Saved {formatDate(savedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      toggleCompare({
                        id: college.id,
                        name: college.name,
                        slug: college.slug,
                      })
                    }
                    aria-pressed={isSelected(college.id)}
                    className={`btn btn-sm ${
                      isSelected(college.id) ? "btn-primary" : "btn-ghost"
                    }`}
                  >
                    {isSelected(college.id) ? "✓ Comparing" : "+ Compare"}
                  </button>

                  <Link href={`/colleges/${college.slug}`} className="btn btn-secondary btn-sm">
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() => void handleRemove(college.id, college.name)}
                    disabled={removingId === college.id}
                    className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    aria-label={`Remove ${college.name} from saved colleges`}
                  >
                    {removingId === college.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {visible.length === 1 && (
          <p className="text-center text-sm text-slate-400 mt-6">
            Save at least {MIN_COMPARE_COLLEGES} colleges to compare them side by side.
          </p>
        )}
      </div>
    </div>
  );
}
