"use client";

/**
 * Sticky comparison tray.
 *
 * Rendered once in the root layout so the selection follows the user across
 * every page — listing, detail, saved — rather than only existing on the
 * listing page. It reads directly from CompareProvider.
 *
 * Hidden on /compare itself, where the full table already shows the selection.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "@/components/providers/CompareProvider";
import { MAX_COMPARE_COLLEGES, MIN_COMPARE_COLLEGES } from "@/lib/validation/schemas";

export default function CompareTray() {
  const pathname = usePathname();
  const { entries, count, canCompare, compareHref, remove, clear } = useCompare();

  if (count === 0) return null;
  if (pathname === "/compare") return null;

  const remaining = MIN_COMPARE_COLLEGES - count;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-indigo-500 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      role="region"
      aria-label="College comparison selection"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-sm font-semibold text-indigo-700 whitespace-nowrap">
            Compare ({count}/{MAX_COMPARE_COLLEGES})
          </span>

          <ul className="flex gap-2 overflow-x-auto flex-1 min-w-0 py-0.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full pl-3 pr-1.5 py-1 shrink-0"
              >
                <span className="text-xs text-indigo-800 font-medium max-w-[160px] truncate">
                  {entry.name}
                </span>
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  className="text-indigo-400 hover:text-indigo-800 text-base leading-none w-4 h-4 flex items-center justify-center"
                  aria-label={`Remove ${entry.name} from comparison`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={clear} className="btn btn-ghost btn-sm">
            Clear all
          </button>

          {canCompare ? (
            <Link href={compareHref} className="btn btn-primary btn-sm">
              Compare now →
            </Link>
          ) : (
            <span className="text-xs text-slate-500">
              Add {remaining} more college{remaining === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
