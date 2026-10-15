import { Crown, TrendingUp, Package } from "lucide-react";
import type { CategorySummaryResponse } from "@/types/api";

interface CategoryMicroKPIsProps {
  data: CategorySummaryResponse | null;
  loading: boolean;
}

export default function CategoryMicroKPIs({ data, loading }: CategoryMicroKPIsProps) {
  if (loading || !data) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 shrink-0 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-6 w-20 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const liderNombre = data.categoria_lider_nombre || null;
  const mayorMargen =
    data.mayor_margen_porcentaje != null
      ? Number(data.mayor_margen_porcentaje)
      : null;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* KPI 1: Categoría Líder */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
          <Crown className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Categoría Líder
          </p>
          <p
            className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            title={liderNombre ?? undefined}
          >
            {liderNombre || "—"}
          </p>
        </div>
      </div>

      {/* KPI 2: Mayor Margen */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
          <TrendingUp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Mayor Margen
          </p>
          <p className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {mayorMargen !== null ? `${mayorMargen.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* KPI 3: Total Ítems */}
      <div className="group relative flex items-center gap-4 rounded-xl border border-slate-200/90 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-105">
          <Package className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Total Ítems
          </p>
          <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {String(data.total_productos)}
          </p>
        </div>
      </div>
    </div>
  );
}
