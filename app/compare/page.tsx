import { Suspense } from "react";
import type { Metadata } from "next";
import CompareClient from "@/components/compare/CompareClient";

export const metadata: Metadata = {
  title: "Compare colleges",
  description:
    "Compare up to three colleges side by side on fees, placements, rating and location.",
};

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-400">Loading comparison…</p>
        </div>
      }
    >
      <CompareClient />
    </Suspense>
  );
}
