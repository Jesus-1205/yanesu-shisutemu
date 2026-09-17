import { Clock, RefreshCw, TrendingUp, TrendingDown, BadgeCheck } from "lucide-react";
import Button from "@/ui-components/Button";
import { formatRateFull, formatDateTimeVE } from "@/lib/utils";

interface RateHeroCardProps {
  usd?: string | null;
  eur?: string | null;
  fechaActualizacion?: string | null;
  previousUsd?: string | number | null;
  previousEur?: string | number | null;
  loading: boolean;
  canUpdate?: boolean;
  onOpenPanel: () => void;
}

interface VariationResult {
  pct: number;
  abs: number;
}

function variation(after?: string | null, before?: string | number | null): VariationResult | null {
  if (!after || before === null || before === undefined) return null;
  const prev = Number(before);
  const current = Number(after);
  if (!Number.isFinite(prev) || prev === 0 || !Number.isFinite(current)) return null;
  return {
    pct: ((current - prev) / prev) * 100,
    abs: current - prev,
  };
}

function RateFigure({
  label,
  value,
  variation,
}: {
  label: string;
  value?: string | null;
  variation: VariationResult | null;
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
      {variation !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${
            variation.pct >= 0 ? "bg-green-50 text-success" : "bg-red-50 text-danger"
          }`}
        >
          {variation.pct >= 0 ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
          )}
          {variation.pct > 0 ? "+" : ""}
          {variation.pct.toFixed(2)}% ({variation.abs > 0 ? "+" : ""}
          {variation.abs.toFixed(4)} Bs)
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
  loading,
  canUpdate = true,
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-success">
            <BadgeCheck className="size-3.5" />
            Tasas activas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
          <RateFigure label="Dólar (USD)" value={usd} variation={usdVar} />
          <div className="md:border-l md:border-slate-100 md:pl-10">
            <RateFigure label="Euro (EUR)" value={eur} variation={eurVar} />
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
          {canUpdate && (
            <Button variant="outline" size="sm" onClick={onOpenPanel}>
              <RefreshCw className="size-4" />
              Actualizar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
