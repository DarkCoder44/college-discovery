import Link from "next/link";
import type { ReactNode } from "react";

/** Shared shell for the login and signup screens, so the two stay identical. */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-display font-bold text-xl text-slate-900"
          >
            <span
              className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              aria-hidden="true"
            >
              CD
            </span>
            CollegeDiscover
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="card p-8">{children}</div>

        <p className="text-center text-sm text-slate-500 mt-6">{footer}</p>
      </div>
    </div>
  );
}
