import { Package, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/ui-components/Skeleton";
import type { ProductKpis } from "../types";

export interface ProductsKpiCardsProps {
  kpis: ProductKpis;
  loading: boolean;
}

export default function ProductsKpiCards({ kpis, loading }: ProductsKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Unidades Vendidas */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Unidades Vendidas</span>
          <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
            <Package className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.totalUnidades.toLocaleString("es-VE")}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Total rotado en el período</p>
        </div>
      </div>

      {/* Producto Líder */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Producto Líder</span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
            <Trophy className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : kpis.lider ? (
            <>
              <div className="truncate text-xl font-bold tracking-tight text-slate-900" title={kpis.lider.nombre}>
                {kpis.lider.nombre}
              </div>
              <p className="mt-1 text-xs text-amber-600 font-medium">{kpis.lider.total_vendido} unidades vendidas</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Sin ventas en el período</p>
          )}
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
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600">
                {kpis.margenPromedio.toFixed(1)}%
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Rentabilidad del catálogo</p>
        </div>
      </div>

      {/* Sin Rotación */}
      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Sin Rotación</span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-500">
            <AlertTriangle className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {kpis.sinRotacion}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">Productos sin mov. en el período</p>
        </div>
      </div>
    </div>
  );
}
