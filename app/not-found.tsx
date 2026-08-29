import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
      <div>
        <p className="text-8xl font-bold text-slate-200 font-display" aria-hidden="true">
          404
        </p>
        <h1 className="text-2xl font-bold text-slate-800 mt-4 mb-2">Page not found</h1>
        <p className="text-slate-500 mb-8">
          This page doesn&apos;t exist, or it has moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn btn-primary">
            Go home
          </Link>
          <Link href="/colleges" className="btn btn-ghost">
            Browse colleges
          </Link>
        </div>
      </div>
    </div>
  );
}
