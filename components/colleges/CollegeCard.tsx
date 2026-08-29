"use client";

/**
 * College card used on the listing, homepage and saved pages.
 *
 * Pure presentation plus two callbacks — it holds no business logic and does no
 * fetching. Save/compare state is owned by the AuthProvider / CompareProvider
 * so every card in the app stays in sync.
 */

import Link from "next/link";
import RatingStars from "@/components/ui/RatingStars";
import {
  collegeTypeBadgeClass,
  formatCurrency,
  formatNumber,
} from "@/lib/format";
import type { CollegeCardData } from "@/lib/services/college.service";

interface CollegeCardProps {
  college: CollegeCardData;
  isSaved?: boolean;
  isInCompare?: boolean;
  onToggleSave?: (college: CollegeCardData) => void;
  onToggleCompare?: (college: CollegeCardData) => void;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CollegeCard({
  college,
  isSaved = false,
  isInCompare = false,
  onToggleSave,
  onToggleCompare,
}: CollegeCardProps) {
  return (
    <article className="card group overflow-hidden flex flex-col">
      {/* Banner — the initials placeholder avoids shipping stock imagery. */}
      <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <span className="text-4xl font-bold text-white/30 font-display" aria-hidden="true">
          {initialsOf(college.name)}
        </span>

        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(college)}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `Remove ${college.name} from saved colleges`
                : `Save ${college.name}`
            }
            className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isSaved
                ? "bg-amber-400 text-white"
                : "bg-white/90 text-slate-500 hover:bg-white hover:text-amber-500"
            }`}
          >
            <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
          </button>
        )}

        {onToggleCompare && (
          <button
            type="button"
            onClick={() => onToggleCompare(college)}
            aria-pressed={isInCompare}
            aria-label={
              isInCompare
                ? `Remove ${college.name} from comparison`
                : `Add ${college.name} to comparison`
            }
            className={`absolute top-2 right-2 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              isInCompare
                ? "bg-indigo-600 text-white"
                : "bg-white/90 text-slate-700 hover:bg-white"
            }`}
          >
            {isInCompare ? "✓ Comparing" : "+ Compare"}
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
              {college.name}
            </h3>
            <span className={`badge shrink-0 ${collegeTypeBadgeClass(college.type)}`}>
              {college.type}
            </span>
          </div>
          <p className="text-xs text-slate-500">{college.location}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <RatingStars rating={college.rating} />
          {college.reviewCount > 0 && (
            <span className="text-xs text-slate-400">
              ({college.reviewCount} review{college.reviewCount === 1 ? "" : "s"})
            </span>
          )}
          {college.accreditation && (
            <span className="ml-auto badge badge-success">{college.accreditation}</span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: "Annual Fees", value: formatCurrency(college.fees) },
            { label: "Avg. Package", value: formatCurrency(college.averagePlacement) },
            { label: "Students", value: formatNumber(college.totalStudents) },
            { label: "Established", value: String(college.establishedYear) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-2.5">
              <dt className="text-slate-400 mb-0.5">{label}</dt>
              <dd className="font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto pt-1">
          <Link
            href={`/colleges/${college.slug}`}
            className="btn btn-primary w-full"
            aria-label={`View details for ${college.name}`}
          >
            View Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
