import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { formatRate } from "@/lib/utils";

export default function TasaBcvIndicator() {
  const tasa = useExchangeRateStore((s) => s.tasa);
  const tasaEUR = useExchangeRateStore((s) => s.tasaEUR);
  const loading = useExchangeRateStore((s) => s.loading);
  const needsUpdate = useExchangeRateStore((s) => s.needsUpdate);

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

  const borderClass = needsUpdate
    ? "divide-red-300 border border-red-400 bg-red-50"
    : "divide-slate-200 border border-slate-200 bg-surface/80";

  return (
    <div
      title={needsUpdate ? "Las tasas no se han actualizado hoy. Ve a Tasas de Cambio para actualizar." : undefined}
      className={`flex items-center divide-x rounded-lg text-sm transition-all ${borderClass}`}
    >
      {/* BCV label - always visible */}
      <span className={`px-2 py-1.5 text-xs font-semibold tracking-wide uppercase sm:px-3 sm:text-sm ${
        needsUpdate ? "text-red-600" : "text-slate-400"
      }`}>
        {needsUpdate ? "BCV !" : "BCV"}
      </span>

      {/* USD - always visible */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3">
        <span className={`text-xs font-medium sm:text-sm ${needsUpdate ? "text-red-500" : "text-slate-500"}`}>USD</span>
        <span className={`text-xs font-semibold tabular-nums sm:text-sm ${needsUpdate ? "text-red-600" : "text-text-main"}`}>
          {formatRate(tasa)}
        </span>
      </div>

      {/* EUR - hidden on mobile, visible on sm+ */}
      <div className="hidden items-center gap-2 px-3 py-1.5 sm:flex">
        <span className={`font-medium ${needsUpdate ? "text-red-500" : "text-slate-500"}`}>EUR</span>
        <span className={`font-semibold tabular-nums ${needsUpdate ? "text-red-600" : "text-text-main"}`}>
          {formatRate(tasaEUR)}
        </span>
      </div>
    </div>
  );
}
