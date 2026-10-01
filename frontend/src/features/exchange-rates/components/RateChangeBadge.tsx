import { calculateVariation } from "../utils/variations";

interface RateChangeBadgeProps {
  label: string;
  before: string | number | null | undefined;
  after: string | number | null | undefined;
  className?: string;
}

function norm(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : null;
}

export default function RateChangeBadge({
  label,
  before,
  after,
  className = "",
}: RateChangeBadgeProps) {
  const normBefore = norm(before);
  const normAfter = norm(after);
  const variation = calculateVariation(normAfter, normBefore);
  const changed = variation !== null && variation.diff !== 0;

  const tone = !changed
    ? "bg-slate-50 text-slate-500 border-slate-200"
    : variation.up
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border px-3 py-1.5 text-xs ${tone} ${className}`}
    >
      <span className="font-medium">{label}</span>
      <span className="tabular-nums">
        {normBefore !== null ? `${normBefore} → ${normAfter}` : `Nueva: ${normAfter ?? "—"}`}
      </span>
      {changed && variation && (
        <span className="ml-auto font-semibold tabular-nums">
          {variation.up ? "▲" : "▼"} {Math.abs(variation.diff).toFixed(2)} Bs
        </span>
      )}
    </div>
  );
}
