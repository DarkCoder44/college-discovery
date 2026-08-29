/**
 * Display Formatters
 * ------------------
 * `formatCurrency` was duplicated (with three slightly different
 * implementations) across five components — the homepage rendered ₹250K where
 * the card rendered ₹2.5L for the same number. One implementation now.
 *
 * Monetary values arrive from the API as strings, because Prisma `Decimal`
 * values lose precision when converted to a JS number. Parsing happens at the
 * display boundary only.
 */

/** Indian numbering: ₹1,00,000 → ₹1.0L, ₹1,00,00,000 → ₹1.0Cr */
export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";

  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(value)) return "—";

  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2).replace(/\.?0+$/, "")}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2).replace(/\.?0+$/, "")}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value.toFixed(0)}`;
}

export function formatRating(rating: string | number | null | undefined): string {
  if (rating === null || rating === undefined) return "—";
  const value = typeof rating === "string" ? Number.parseFloat(rating) : rating;
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(num) ? `${num.toFixed(1)}%` : "—";
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-IN");
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Tailwind class for the college-type pill, kept beside the other formatters. */
export function collegeTypeBadgeClass(type: string): string {
  switch (type) {
    case "Public":
      return "badge-public";
    case "Private":
      return "badge-private";
    default:
      return "badge-deemed";
  }
}
