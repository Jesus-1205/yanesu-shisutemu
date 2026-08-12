import { Clock, RefreshCw, TrendingUp, TrendingDown, BadgeCheck, AlarmClock } from "lucide-react";
import Button from "@/ui-components/Button";
import { formatRateFull, formatDateTimeVE } from "@/lib/utils";

interface RateHeroCardProps {
  usd?: string | null;
  eur?: string | null;
  fechaActualizacion?: string | null;
  previousUsd?: string | number | null;
  previousEur?: string | number | null;
  needsUpdate: boolean;
  loading: boolean;
  onOpenPanel: () => void;
}

function variation(after?: string | null, before?: string | number | null): number | null {
  if (!after || before === null || before === undefined) return null;
  const prev = Number(before);
  if (!Number.isFinite(prev) || prev === 0) return null;
  return ((Number(after) - prev) / prev) * 100;
}

function RateFigure({
  label,
  value,
  variationPct,
}: {
  label: string;
  value?: string | null;
  variationPct: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p
          key={value ?? "empty"}
          className="mt-1.5 text-3xl sm:text-4xl font-bold tabular-nums text-text-main truncate"
          style={{ animation: "fadeIn 0.35s ease" }}
        >
          {value ? `Bs ${formatRateFull(value)}` : "—"}
        </p>
      </div>
      {variationPct !== null && (
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums px-2 py-1 rounded-lg ${
            variationPct >= 0 ? "bg-green-50 text-success" : "bg-red-50 text-danger"
          }`}
        >
          {variationPct >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          {variationPct > 0 ? "+" : ""}
          {variationPct.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export default function RateHeroCard({
  usd,
  eur,
  fechaActualizacion,
  previousUsd,
  previousEur,
  needsUpdate,
  loading,
  onOpenPanel,
}: RateHeroCardProps) {
  const usdVar = variation(usd, previousUsd);
  const eurVar = variation(eur, previousEur);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-sky-400 to-accent-orange" />
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Tasas oficiales BCV
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              needsUpdate
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-green-50 text-success border-green-200"
            }`}
          >
            {needsUpdate ? (
              <>
                <AlarmClock className="w-3.5 h-3.5" />
                Pendiente de actualización
              </>
            ) : (
              <>
                <BadgeCheck className="w-3.5 h-3.5" />
                Al día
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <RateFigure label="Dólar (USD)" value={usd} variationPct={usdVar} />
          <div className="md:border-l md:border-slate-100 md:pl-10">
            <RateFigure label="Euro (EUR)" value={eur} variationPct={eurVar} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            {loading
              ? "Cargando..."
              : fechaActualizacion
                ? `Última actualización: ${formatDateTimeVE(fechaActualizacion)}`
                : "Aún no se han registrado tasas"}
          </p>
          <Button variant="outline" size="sm" onClick={onOpenPanel}>
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
