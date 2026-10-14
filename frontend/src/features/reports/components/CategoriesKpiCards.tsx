import { DollarSign, Banknote, Trophy, Package, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/ui-components/Skeleton";
import Badge from "@/ui-components/Badge";
import type { CategoryKpis } from "../types";

export interface CategoriesKpiCardsProps {
  kpis: CategoryKpis;
  loading: boolean;
  currency: "USD" | "VES";
  currSymbol: string;
}

export default function CategoriesKpiCards({
  kpis,
  loading,
  currency,
  currSymbol,
}: CategoriesKpiCardsProps) {
  const participacionText =
    kpis.liderParticipacion !== undefined
      ? `${kpis.liderParticipacion.toFixed(1)}% de participación`
      : kpis.totalUnidades > 0 && kpis.lider
        ? `${(((Number(kpis.lider.unidades_vendidas) || 0) / kpis.totalUnidades) * 100).toFixed(1)}% de participación`
        : "—";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Facturado */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Facturado</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            {currency === "USD" ? (
              <DollarSign className="size-4" />
            ) : (
              <Banknote className="size-4" />
            )}
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(kpis.totalIngresos, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Ingresos generados en el período</p>
        </div>
      </div>

      {/* Categoría Principal */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Categoría Principal</span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
            <Trophy className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : kpis.lider ? (
            <>
              <div
                className="truncate text-xl font-bold tracking-tight text-slate-900"
                title={kpis.lider.nombre}
              >
                {kpis.lider.nombre}
              </div>
              <p className="mt-1 text-xs text-amber-600 font-medium">
                {participacionText}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Sin ventas en el período</p>
          )}
        </div>
      </div>

      {/* Unidades Vendidas */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Unidades Vendidas</span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <Package className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.totalUnidades.toLocaleString("es-VE")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Total rotado en el período</p>
        </div>
      </div>

      {/* Margen Promedio */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Margen Promedio</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {kpis.margenPromedio.toFixed(1)}%
              </span>
              <Badge variant="success">Margen</Badge>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Rentabilidad sobre ventas</p>
        </div>
      </div>
    </div>
  );
}
