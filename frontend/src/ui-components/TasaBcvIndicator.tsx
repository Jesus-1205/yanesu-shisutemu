import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { formatRate } from "@/lib/utils";

export default function TasaBcvIndicator() {
  const tasa = useExchangeRateStore((s) => s.tasa);
  const tasaEUR = useExchangeRateStore((s) => s.tasaEUR);
  const loading = useExchangeRateStore((s) => s.loading);

  if (loading) {
    return (
      <div className="flex items-center divide-x divide-slate-200 rounded-lg border border-slate-200 bg-surface/80 text-sm">
        <span className="px-2 py-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase sm:px-3 sm:text-sm">BCV</span>
        <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3">
          <span className="hidden text-xs text-slate-300 sm:inline">Cargando...</span>
        </div>
      </div>
    );
  }

  if (tasa === 0 && tasaEUR === 0) return null;

  return (
    <div className="flex items-center divide-x divide-slate-200 rounded-lg border border-slate-200 bg-surface/80 text-sm transition-all">
      {/* BCV label - always visible */}
      <span className="px-2 py-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase sm:px-3 sm:text-sm">
        BCV
      </span>

      {/* USD - always visible */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3">
        <span className="text-xs font-medium text-slate-500 sm:text-sm">USD</span>
        <span className="text-xs font-semibold text-text-main tabular-nums sm:text-sm">
          {formatRate(tasa)}
        </span>
      </div>

      {/* EUR - hidden on mobile, visible on sm+ */}
      <div className="hidden items-center gap-2 px-3 py-1.5 sm:flex">
        <span className="font-medium text-slate-500">EUR</span>
        <span className="font-semibold text-text-main tabular-nums">
          {formatRate(tasaEUR)}
        </span>
      </div>
    </div>
  );
}
