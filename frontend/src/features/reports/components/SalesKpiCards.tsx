import { DollarSign, Package, TrendingUp, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/ui-components/Skeleton";
import type { SalesKpis } from "../types";

export interface SalesKpiCardsProps {
  totals: SalesKpis;
  loading: boolean;
  currSymbol: string;
}

export default function SalesKpiCards({
  totals,
  loading,
  currSymbol,
}: SalesKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Ingresos */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Ingresos Brutos</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <DollarSign className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.ingresos, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Total facturado en el período</p>
        </div>
      </div>

      {/* Costo de Mercancía */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Costo Mercancía</span>
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            <Package className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.costos, currSymbol)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Costo total de productos vendidos</p>
        </div>
      </div>

      {/* Margen de Ganancia */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Margen de Ganancia</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600">
                {formatCurrency(totals.margen, currSymbol)}
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                {totals.margenPct.toFixed(1)}%
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Ganancia neta libre calculada</p>
        </div>
      </div>

      {/* Total Transacciones */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">N° de Ventas</span>
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <ShoppingCart className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {totals.totalVentas.toLocaleString()}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Transacciones completadas</p>
        </div>
      </div>
    </div>
  );
}
