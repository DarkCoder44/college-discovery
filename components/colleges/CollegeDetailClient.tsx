"use client";

/**
 * College detail view: overview, courses, placements and reviews.
 *
 * The college object is fetched on the server (Server Component) and passed in
 * as a prop — no client-side fetch and no loading spinner for the main content.
 * Only the save/compare toggles are interactive, which is why this is a Client
 * Component at all.
 */

import { useState } from "react";
import Link from "next/link";
import RatingStars from "@/components/ui/RatingStars";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCompare } from "@/components/providers/CompareProvider";
import {
  collegeTypeBadgeClass,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRating,
} from "@/lib/format";
import type { CollegeDetail } from "@/lib/services/college.service";

const TABS = ["overview", "courses", "placements", "reviews"] as const;
type Tab = (typeof TABS)[number];

export default function CollegeDetailClient({ college }: { college: CollegeDetail }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isSaving, setIsSaving] = useState(false);

  const { isSaved, toggleSaved, isLoading: isAuthLoading } = useAuth();
  const { isSelected, toggle: toggleCompare, canCompare, compareHref } = useCompare();

  const saved = isSaved(college.id);
  const inCompare = isSelected(college.id);

  async function handleSaveClick() {
    setIsSaving(true);
    try {
      await toggleSaved(college.id, college.name);
    } finally {
      setIsSaving(false);
    }
  }

  const ratingValue = Number.parseFloat(college.rating);
  const latestPlacement = college.placements[0] ?? null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ── Hero ── */}
      <header className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
          <nav className="text-sm text-indigo-300 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">
              ›
            </span>
            <Link href="/colleges" className="hover:text-white">
              Colleges
            </Link>
            <span className="mx-2" aria-hidden="true">
              ›
            </span>
            <span className="text-white">{college.name}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`badge ${collegeTypeBadgeClass(college.type)}`}>
                  {college.type}
                </span>
                {college.accreditation && (
                  <span className="badge badge-success">{college.accreditation}</span>
                )}
                <span className="text-indigo-300 text-xs">
                  Established {college.establishedYear}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-2">
                {college.name}
              </h1>
              <p className="text-indigo-200">{college.location}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaving || isAuthLoading}
                aria-pressed={saved}
                className={`btn ${
                  saved
                    ? "bg-amber-400 text-white hover:bg-amber-500"
                    : "bg-white/10 text-white border border-white/30 hover:bg-white/20"
                }`}
              >
                {isSaving ? "Saving…" : saved ? "★ Saved" : "☆ Save"}
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleCompare({
                    id: college.id,
                    name: college.name,
                    slug: college.slug,
                  })
                }
                aria-pressed={inCompare}
                className={`btn ${
                  inCompare
                    ? "bg-white text-indigo-700 hover:bg-indigo-50"
                    : "bg-white/10 text-white border border-white/30 hover:bg-white/20"
                }`}
              >
                {inCompare ? "✓ In comparison" : "⚖ Add to compare"}
              </button>

              {/*
                Only offer the link once the selection is actually valid.
                Previously this linked to /compare?ids=<single-id>, which the
                API correctly rejected with "select at least 2 colleges".
              */}
              {canCompare && (
                <Link
                  href={compareHref}
                  className="btn bg-white/10 text-white border border-white/30 hover:bg-white/20"
                >
                  View comparison →
                </Link>
              )}

              {college.website && (
                <a
                  href={college.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-white/10 text-white border border-white/30 hover:bg-white/20"
                >
                  Official site ↗
                </a>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { label: "Rating", value: `${formatRating(college.rating)} / 5.0` },
              { label: "Annual fees", value: formatCurrency(college.fees) },
              { label: "Average package", value: formatCurrency(college.averagePlacement) },
              { label: "Highest package", value: formatCurrency(college.highestPlacement) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <dd className="font-bold text-xl">{value}</dd>
                <dt className="text-indigo-300 text-xs mt-1">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="College information">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-4 text-sm font-medium capitalize border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
                {tab === "courses" && ` (${college.courses.length})`}
                {tab === "reviews" && ` (${college.reviewCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <section className="card p-6">
                <h2 className="font-semibold text-slate-900 text-lg mb-3">
                  About {college.name}
                </h2>
                <p className="text-slate-600 leading-relaxed">{college.description}</p>
              </section>

              <section className="card p-6">
                <h2 className="font-semibold text-slate-900 text-lg mb-4">Quick facts</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Type", value: college.type },
                    { label: "City", value: college.city },
                    { label: "State", value: college.state },
                    { label: "Established", value: String(college.establishedYear) },
                    { label: "Total students", value: formatNumber(college.totalStudents) },
                    { label: "Accreditation", value: college.accreditation ?? "Not listed" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3">
                      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
                      <dd className="font-medium text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {latestPlacement && (
                <section className="card p-6">
                  <h2 className="font-semibold text-slate-900 text-lg mb-4">
                    Placement snapshot ({latestPlacement.year})
                  </h2>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Average", value: formatCurrency(latestPlacement.averagePackage) },
                      { label: "Highest", value: formatCurrency(latestPlacement.highestPackage) },
                      { label: "Placed", value: formatPercent(latestPlacement.placementRate) },
                      { label: "Top recruiter", value: latestPlacement.topRecruiter ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-indigo-50 rounded-lg p-3">
                        <dd className="font-semibold text-slate-900">{value}</dd>
                        <dt className="text-xs text-slate-500 mt-0.5">{label}</dt>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <div className="card p-6">
                <h2 className="font-semibold text-slate-900 mb-4">Overall rating</h2>
                <div className="text-center mb-5">
                  <p className="text-5xl font-bold text-indigo-700">
                    {formatRating(college.rating)}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">out of 5.0</p>
                  <RatingStars rating={ratingValue} showValue={false} className="mt-2" />
                </div>

                {/*
                  Distribution is computed from the 10 most recent reviews the
                  API returns, not from all reviews — labelled accordingly so
                  the numbers are not misread as a full histogram.
                */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = college.reviews.filter((r) => r.rating === star).length;
                    const percentage =
                      college.reviews.length === 0
                        ? 0
                        : (count / college.reviews.length) * 100;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-6">{star}★</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-amber-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-4 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 text-center mt-4">
                  From the {college.reviews.length} most recent of{" "}
                  {college.reviewCount} review{college.reviewCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="card p-5 text-center">
                <p className="text-slate-500 text-sm">Shortlisted by</p>
                <p className="font-bold text-2xl text-indigo-700 mt-1">
                  {formatNumber(college.savedCount)}
                </p>
                <p className="text-slate-400 text-xs">
                  student{college.savedCount === 1 ? "" : "s"}
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* ── Courses ── */}
        {activeTab === "courses" && (
          <section role="tabpanel" id="panel-courses" aria-labelledby="tab-courses" className="card overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-lg">
                Courses offered ({college.courses.length})
              </h2>
            </div>

            {college.courses.length === 0 ? (
              <p className="p-12 text-center text-slate-400">
                No course information is available for this college.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Courses offered by {college.name}</caption>
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th scope="col" className="text-left px-6 py-3">Course</th>
                      <th scope="col" className="text-left px-6 py-3">Degree</th>
                      <th scope="col" className="text-left px-6 py-3">Duration</th>
                      <th scope="col" className="text-left px-6 py-3">Annual fees</th>
                      <th scope="col" className="text-left px-6 py-3">Seats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {college.courses.map((course) => (
                      <tr key={course.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{course.name}</td>
                        <td className="px-6 py-4">
                          <span className="badge badge-brand">{course.degree}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{course.duration}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {formatCurrency(course.fees)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {course.seats === null ? "—" : formatNumber(course.seats)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Placements ── */}
        {activeTab === "placements" && (
          <div role="tabpanel" id="panel-placements" aria-labelledby="tab-placements" className="space-y-5">
            {college.placements.length === 0 ? (
              <p className="card p-12 text-center text-slate-400">
                No placement information is available for this college.
              </p>
            ) : (
              college.placements.map((placement) => (
                <section key={placement.id} className="card p-6">
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                    <h2 className="font-semibold text-slate-900 text-lg">
                      Placements {placement.year}
                    </h2>
                    <span className="badge badge-success">
                      {formatPercent(placement.placementRate)} placed
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Average package", value: formatCurrency(placement.averagePackage) },
                      { label: "Highest package", value: formatCurrency(placement.highestPackage) },
                      { label: "Placement rate", value: formatPercent(placement.placementRate) },
                      { label: "Top recruiter", value: placement.topRecruiter ?? "—" },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4"
                      >
                        <dd className="font-bold text-slate-900 text-lg">{value}</dd>
                        <dt className="text-xs text-slate-500 mt-0.5">{label}</dt>
                      </div>
                    ))}
                  </dl>

                  {placement.totalPlaced !== null && (
                    <p className="text-sm text-slate-500 mt-4">
                      Students placed:{" "}
                      <span className="font-medium text-slate-800">
                        {formatNumber(placement.totalPlaced)}
                      </span>
                    </p>
                  )}
                </section>
              ))
            )}
          </div>
        )}

        {/* ── Reviews ── */}
        {activeTab === "reviews" && (
          <div role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" className="space-y-4">
            {college.reviews.length === 0 ? (
              <p className="card p-12 text-center text-slate-400">
                No reviews have been written for this college yet.
              </p>
            ) : (
              <>
                {college.reviews.map((review) => (
                  <article key={review.id} className="card p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{review.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {review.author ?? "Anonymous"} · {formatDate(review.createdAt)}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1 shrink-0">
                        <span className="text-amber-500 text-sm" aria-hidden="true">★</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {review.rating}
                        </span>
                        <span className="sr-only">out of 5</span>
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{review.body}</p>
                  </article>
                ))}

                {college.reviewCount > college.reviews.length && (
                  <p className="text-center text-sm text-slate-400 py-2">
                    Showing the {college.reviews.length} most recent of{" "}
                    {college.reviewCount} reviews.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
