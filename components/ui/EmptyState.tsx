import type { ReactNode } from "react";

/**
 * Shared empty / error / zero-result presentation, so every such state in the
 * app looks and behaves the same instead of being re-invented per page.
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "neutral",
}: {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={`card p-10 sm:p-16 text-center ${
        tone === "error" ? "border-red-200 bg-red-50" : ""
      }`}
      role={tone === "error" ? "alert" : undefined}
    >
      <p className="text-4xl sm:text-5xl mb-4" aria-hidden="true">
        {icon}
      </p>
      <h2
        className={`text-lg sm:text-xl font-semibold mb-2 ${
          tone === "error" ? "text-red-800" : "text-slate-800"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mb-6 max-w-md mx-auto ${
            tone === "error" ? "text-red-700" : "text-slate-500"
          }`}
        >
          {description}
        </p>
      )}
      {action && <div className="flex flex-wrap gap-3 justify-center">{action}</div>}
    </div>
  );
}
