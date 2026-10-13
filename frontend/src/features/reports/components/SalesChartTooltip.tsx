import { formatCurrency } from "@/lib/utils";

export interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

export interface SalesChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  currSymbol: string;
}

export default function SalesChartTooltip({
  active,
  payload,
  label,
  currSymbol,
}: SalesChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-slate-800 border-b border-slate-100 pb-1">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}:
          </span>
          <span className="font-bold text-slate-900">
            {formatCurrency(entry.value, currSymbol)}
          </span>
        </div>
      ))}
    </div>
  );
}
