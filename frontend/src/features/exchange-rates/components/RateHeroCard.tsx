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
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
        <p
          key={value ?? "empty"}
          className="mt-1.5 truncate text-3xl font-bold text-text-main tabular-nums sm:text-4xl"
          style={{ animation: "fadeIn 0.35s ease" }}
        >
          {value ? `Bs ${formatRateFull(value)}` : "—"}
        </p>
      </div>
      {variationPct !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold tabular-nums ${
            variationPct >= 0 ? "bg-green-50 text-success" : "bg-red-50 text-danger"
          }`}
        >
          {variationPct >= 0 ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
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
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand-blue via-sky-400 to-accent-orange" />
      <div className="p-6 sm:p-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Tasas oficiales BCV
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              needsUpdate
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-green-200 bg-green-50 text-success"
            }`}
          >
            {needsUpdate ? (
              <>
                <AlarmClock className="size-3.5" />
                Pendiente de actualización
              </>
            ) : (
              <>
                <BadgeCheck className="size-3.5" />
                Al día
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
          <RateFigure label="Dólar (USD)" value={usd} variationPct={usdVar} />
          <div className="md:border-l md:border-slate-100 md:pl-10">
            <RateFigure label="Euro (EUR)" value={eur} variationPct={eurVar} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="size-3.5" />
            {loading
              ? "Cargando..."
              : fechaActualizacion
                ? `Última actualización: ${formatDateTimeVE(fechaActualizacion)}`
                : "Aún no se han registrado tasas"}
          </p>
          <Button variant="outline" size="sm" onClick={onOpenPanel}>
            <RefreshCw className="size-4" />
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
