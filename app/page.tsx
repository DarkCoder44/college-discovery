/**
 * Homepage — Server Component.
 *
 * Calls the college service directly rather than fetching its own API over
 * HTTP. A Server Component and a Route Handler run in the same process, so an
 * internal fetch would be a pointless network round-trip. The service layer is
 * the shared boundary; the HTTP API exists for the *browser*.
 */

import Link from "next/link";
import type { Metadata } from "next";
import {
  getFeaturedColleges,
  getPlatformStats,
} from "@/lib/services/college.service";
import RatingStars from "@/components/ui/RatingStars";
import { collegeTypeBadgeClass, formatCurrency, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "CollegeDiscover — Find and compare colleges in India",
  description:
    "Search, compare and shortlist colleges by fees, rating, placement package and location.",
};

/**
 * Rebuild this page at most once an hour. The featured list and counts change
 * only when the catalogue changes, so serving it from cache avoids two database
 * queries on every homepage visit.
 */
export const revalidate = 3600;

const FEATURES = [
  {
    title: "Search that runs on the database",
    description:
      "Filtering, sorting and pagination all happen in PostgreSQL. Your browser only ever downloads the page you are looking at.",
  },
  {
    title: "Side-by-side comparison",
    description:
      "Line up to three colleges against each other on fees, placements, rating and more, with the best value in each row highlighted.",
  },
  {
    title: "Detailed college profiles",
    description:
      "Overview, course list with fees and seats, year-by-year placement figures and student reviews on every college page.",
  },
  {
    title: "Your personal shortlist",
    description:
      "Create an account to save colleges. Your shortlist is stored against your account and is private to you.",
  },
];

export default async function HomePage() {
  const [featured, stats] = await Promise.all([
    getFeaturedColleges(6),
    getPlatformStats(),
  ]);

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28 text-center">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Find the right{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">
              college
            </span>{" "}
            for you
          </h1>

          <p className="text-lg text-indigo-200 max-w-2xl mx-auto mb-10">
            Search {stats.totalColleges} colleges across {stats.totalStates} states by
            fees, placement package, rating and location — then compare your
            shortlist side by side.
          </p>

          {/*
            A plain GET form: it works without JavaScript and lands on
            /colleges?q=… which the listing page reads straight from the URL.
          */}
          <form
            action="/colleges"
            method="get"
            className="max-w-xl mx-auto flex gap-2 bg-white rounded-xl p-1.5 shadow-2xl"
          >
            <label htmlFor="home-search" className="sr-only">
              Search colleges by name or city
            </label>
            <input
              id="home-search"
              type="search"
              name="q"
              placeholder="Search by college name or city…"
              className="flex-1 px-4 py-2.5 text-slate-800 bg-transparent outline-none text-sm"
            />
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Search
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-6 text-sm">
            {["Mumbai", "Delhi", "Bangalore", "Chennai", "Pune"].map((city) => (
              <Link
                key={city}
                href={`/colleges?q=${encodeURIComponent(city)}`}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-white border-b border-slate-100">
        <dl className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { label: "Colleges", value: formatNumber(stats.totalColleges) },
            { label: "Courses listed", value: formatNumber(stats.totalCourses) },
            { label: "Student reviews", value: formatNumber(stats.totalReviews) },
            { label: "States covered", value: formatNumber(stats.totalStates) },
          ].map(({ label, value }) => (
            <div key={label}>
              <dd className="text-2xl sm:text-3xl font-bold font-display text-indigo-700">
                {value}
              </dd>
              <dt className="text-sm text-slate-500 mt-1">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Featured ── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
              Top rated colleges
            </h2>
            <p className="text-slate-500 mt-1">Highest-rated institutions in the catalogue</p>
          </div>
          <Link href="/colleges" className="btn btn-secondary btn-sm hidden sm:inline-flex">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((college) => (
            <Link
              key={college.id}
              href={`/colleges/${college.slug}`}
              className="card p-5 block"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 leading-snug">
                    {college.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{college.location}</p>
                </div>
                <span className={`badge shrink-0 ${collegeTypeBadgeClass(college.type)}`}>
                  {college.type}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <RatingStars rating={college.rating} />
                {college.accreditation && (
                  <span className="ml-auto badge badge-success">
                    {college.accreditation}
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <dt className="text-slate-400">Annual fees</dt>
                  <dd className="font-semibold text-slate-800 mt-0.5">
                    {formatCurrency(college.fees)}
                  </dd>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <dt className="text-slate-400">Avg. package</dt>
                  <dd className="font-semibold text-slate-800 mt-0.5">
                    {formatCurrency(college.averagePlacement)}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/colleges" className="btn btn-primary btn-lg">
            Browse all {stats.totalColleges} colleges →
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-10">
            What you can do here
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(({ title, description }) => (
              <div key={title} className="card p-6">
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-10 sm:p-12 text-white text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
            Build your shortlist
          </h2>
          <p className="text-indigo-200 mb-8 max-w-lg mx-auto">
            Create a free account to save colleges and keep your comparisons in
            one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn bg-white text-indigo-700 hover:bg-indigo-50 btn-lg">
              Create an account
            </Link>
            <Link
              href="/colleges"
              className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20 btn-lg"
            >
              Browse colleges
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
