import { Suspense } from "react";
import type { Metadata } from "next";
import CollegeListClient from "@/components/colleges/CollegeListClient";
import { CollegeListSkeleton } from "@/components/colleges/CollegeSkeleton";

export const metadata: Metadata = {
  title: "Browse colleges",
  description:
    "Search and filter colleges by location, fees, rating and placement package. Compare up to three side by side.",
};

export default function CollegesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Browse colleges
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Search, filter and compare colleges across India
          </p>
        </div>
      </div>

      {/*
        CollegeListClient calls useSearchParams(), which requires a Suspense
        boundary — without one, Next.js opts the entire route out of static
        rendering at build time.
      */}
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-6">
            <CollegeListSkeleton count={8} />
          </div>
        }
      >
        <CollegeListClient />
      </Suspense>
    </div>
  );
}
