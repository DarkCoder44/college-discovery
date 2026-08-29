"use client";

/**
 * The side-by-side comparison table.
 *
 * Each row highlights the "best" value where one is meaningful — lowest fees,
 * highest package, highest rating. Rows without an ordering (location,
 * accreditation, top recruiter) are rendered plain.
 */

import { Fragment } from "react";
import Link from "next/link";
import RatingStars from "@/components/ui/RatingStars";
import { collegeTypeBadgeClass, formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { CompareCollege } from "@/lib/services/college.service";

type Highlight = "high" | "low" | "none";

interface Row {
  label: string;
  /** Numeric value used for highlighting; null when not comparable. */
  values: Array<{ display: string; numeric: number | null }>;
  highlight: Highlight;
}

/** No winners — a stable empty reference. */
const NO_WINNERS: ReadonlySet<number> = new Set();

/**
 * Indices of the winning column(s) for a row.
 *
 * Returns a Set, not a single index, because ties are common in this data:
 * two colleges both rated 4.9 are equally best, and marking only the
 * left-most one would tell the user something false. Every column holding the
 * best value is marked.
 *
 * Returns nothing when:
 *  - the row is not orderable (location, accreditation, top recruiter),
 *  - fewer than two columns have a comparable value, or
 *  - every column ties, which makes "best" meaningless.
 *
 * Note the explicit `!== null` filter rather than a truthy check: a legitimate
 * value of 0 (a college with no recorded placements) must still take part.
 */
export function findBestIndices(
  values: Array<{ numeric: number | null }>,
  highlight: Highlight
): ReadonlySet<number> {
  if (highlight === "none") return NO_WINNERS;

  const comparable = values
    .map((value, index) => ({ value: value.numeric, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null);

  if (comparable.length < 2) return NO_WINNERS;

  const bestValue = comparable.reduce(
    (best, entry) =>
      highlight === "high"
        ? Math.max(best, entry.value)
        : Math.min(best, entry.value),
    comparable[0].value
  );

  if (comparable.every((entry) => entry.value === bestValue)) return NO_WINNERS;

  return new Set(
    comparable.filter((entry) => entry.value === bestValue).map((entry) => entry.index)
  );
}

function buildRows(colleges: CompareCollege[]): Array<{ section: string; rows: Row[] }> {
  const num = (raw: string | null | undefined): number | null => {
    if (raw === null || raw === undefined) return null;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return [
    {
      section: "General",
      rows: [
        {
          label: "Location",
          highlight: "none",
          values: colleges.map((c) => ({ display: c.location, numeric: null })),
        },
        {
          label: "Type",
          highlight: "none",
          values: colleges.map((c) => ({ display: c.type, numeric: null })),
        },
        {
          label: "Established",
          highlight: "low", // older institution wins
          values: colleges.map((c) => ({
            display: String(c.establishedYear),
            numeric: c.establishedYear,
          })),
        },
        {
          label: "Accreditation",
          highlight: "none",
          values: colleges.map((c) => ({
            display: c.accreditation ?? "—",
            numeric: null,
          })),
        },
        {
          label: "Total students",
          highlight: "none",
          values: colleges.map((c) => ({
            display: formatNumber(c.totalStudents),
            numeric: c.totalStudents,
          })),
        },
        {
          label: "Rating",
          highlight: "high",
          values: colleges.map((c) => ({
            display: `${Number.parseFloat(c.rating).toFixed(1)} / 5`,
            numeric: num(c.rating),
          })),
        },
        {
          label: "Reviews",
          highlight: "high",
          values: colleges.map((c) => ({
            display: formatNumber(c.reviewCount),
            numeric: c.reviewCount,
          })),
        },
      ],
    },
    {
      section: "Fees & courses",
      rows: [
        {
          label: "Annual fees",
          highlight: "low", // cheaper wins
          values: colleges.map((c) => ({
            display: formatCurrency(c.fees),
            numeric: num(c.fees),
          })),
        },
        {
          label: "Courses offered",
          highlight: "high",
          values: colleges.map((c) => ({
            display: formatNumber(c.courseCount),
            numeric: c.courseCount,
          })),
        },
      ],
    },
    {
      section: "Placements",
      rows: [
        {
          label: "Average package",
          highlight: "high",
          values: colleges.map((c) => ({
            display: formatCurrency(c.latestPlacement?.averagePackage ?? c.averagePlacement),
            numeric: num(c.latestPlacement?.averagePackage ?? c.averagePlacement),
          })),
        },
        {
          label: "Highest package",
          highlight: "high",
          values: colleges.map((c) => ({
            display: formatCurrency(c.latestPlacement?.highestPackage ?? c.highestPlacement),
            numeric: num(c.latestPlacement?.highestPackage ?? c.highestPlacement),
          })),
        },
        {
          label: "Placement rate",
          highlight: "high",
          values: colleges.map((c) => ({
            display: formatPercent(c.latestPlacement?.placementRate),
            numeric: num(c.latestPlacement?.placementRate ?? null),
          })),
        },
        {
          label: "Top recruiter",
          highlight: "none",
          values: colleges.map((c) => ({
            display: c.latestPlacement?.topRecruiter ?? "—",
            numeric: null,
          })),
        },
      ],
    },
  ];
}

export default function CompareTable({
  colleges,
  onRemove,
}: {
  colleges: CompareCollege[];
  onRemove: (id: string) => void;
}) {
  const sections = buildRows(colleges);

  return (
    <div className="card overflow-hidden">
      {/* Horizontal scroll is contained here so the page body never scrolls sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <caption className="sr-only">
            Side-by-side comparison of {colleges.map((c) => c.name).join(", ")}
          </caption>

          <thead>
            <tr>
              <th
                scope="col"
                className="py-5 px-5 text-left text-xs text-slate-400 uppercase tracking-wide w-44 sticky left-0 bg-white z-10"
              >
                Metric
              </th>
              {colleges.map((college) => (
                <th key={college.id} scope="col" className="py-5 px-5 text-center align-top">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm"
                      aria-hidden="true"
                    >
                      {college.name.charAt(0)}
                    </span>
                    <Link
                      href={`/colleges/${college.slug}`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-700 text-center leading-snug max-w-[150px]"
                    >
                      {college.name}
                    </Link>
                    <span className={`badge ${collegeTypeBadgeClass(college.type)}`}>
                      {college.type}
                    </span>
                    <RatingStars rating={college.rating} />
                    <button
                      type="button"
                      onClick={() => onRemove(college.id)}
                      className="text-xs text-slate-400 hover:text-red-600"
                      aria-label={`Remove ${college.name} from the comparison`}
                    >
                      Remove ×
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/*
              Each section is a Fragment, not a wrapper element — a <div> or an
              extra <tr> here would be invalid inside <tbody> and browsers would
              silently hoist it out of the table.
            */}
            {sections.map(({ section, rows }) => (
              <Fragment key={section}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={colleges.length + 1}
                    className="py-2 px-5 bg-slate-50 text-left text-xs text-slate-500 font-semibold uppercase tracking-wide"
                  >
                    {section}
                  </th>
                </tr>

                {rows.map((row) => {
                  const bestIndices = findBestIndices(row.values, row.highlight);
                  return (
                    <tr key={row.label} className="border-t border-slate-100">
                      <th
                        scope="row"
                        className="py-3.5 px-5 text-sm text-slate-500 font-medium text-left sticky left-0 bg-white z-10"
                      >
                        {row.label}
                      </th>
                      {row.values.map((value, index) => {
                        const isBest = bestIndices.has(index);
                        return (
                          <td
                            key={index}
                            className={`py-3.5 px-5 text-sm font-semibold text-center ${
                              isBest ? "text-indigo-700 bg-indigo-50" : "text-slate-800"
                            }`}
                          >
                            {value.display}
                            {isBest && (
                              <>
                                <span
                                  className="ml-1 text-indigo-500 text-xs"
                                  aria-hidden="true"
                                >
                                  ✓
                                </span>
                                <span className="sr-only">(best in this row)</span>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}

            <tr className="border-t-2 border-slate-200">
              <td className="py-4 px-5 sticky left-0 bg-white z-10" />
              {colleges.map((college) => (
                <td key={college.id} className="py-4 px-5 text-center">
                  <Link href={`/colleges/${college.slug}`} className="btn btn-primary btn-sm">
                    View details →
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
