/**
 * Accessible star rating.
 * The stars are decorative (aria-hidden); the numeric value is announced via a
 * visually-hidden label so screen readers get "4.5 out of 5" rather than a run
 * of star characters.
 */

export default function RatingStars({
  rating,
  showValue = true,
  className = "",
}: {
  rating: string | number;
  showValue?: boolean;
  className?: string;
}) {
  const value = typeof rating === "string" ? Number.parseFloat(rating) : rating;
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  const full = Math.floor(safe);
  const hasHalf = safe - full >= 0.5;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="stars text-sm leading-none" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i}>{i < full ? "★" : i === full && hasHalf ? "⯨" : "☆"}</span>
        ))}
      </span>
      {showValue && (
        <span className="text-sm font-semibold text-slate-700">{safe.toFixed(1)}</span>
      )}
      <span className="sr-only">{safe.toFixed(1)} out of 5</span>
    </span>
  );
}
