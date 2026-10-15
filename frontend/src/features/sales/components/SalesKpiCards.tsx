import { DollarSign, Banknote, ShoppingCart, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/ui-components/Skeleton";
import type { SalesKpisData } from "../types";

export interface SalesKpiCardsProps {
  totals: SalesKpisData;
  loading: boolean;
}

export default function SalesKpiCards({ totals, loading }: SalesKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total USD */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Ingresos (USD)</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <DollarSign className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.totalUsd)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Total facturado en el período</p>
        </div>
      </div>

      {/* Total VES */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Bolívares</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <Banknote className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.totalVes, "Bs ")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Equivalente BS</p>
        </div>
      </div>

      {/* N° Transacciones */}
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
              {totals.totalVentas.toLocaleString("es-VE")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Transacciones completadas</p>
        </div>
      </div>

      {/* Venta Promedio */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Venta Promedio</span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(totals.ticketPromedioUsd)}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Promedio facturado por venta</p>
        </div>
      </div>
    </div>
  );
}
