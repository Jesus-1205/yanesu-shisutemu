import { Crown, TrendingUp, Package } from "lucide-react";
import StatCard from "@/ui-components/StatCard";
import type { CategoryAnalyticsResponse } from "@/types/api";

interface CategoryMicroKPIsProps {
  data: CategoryAnalyticsResponse | null;
  loading: boolean;
}

export default function CategoryMicroKPIs({ data, loading }: CategoryMicroKPIsProps) {
  if (loading || !data) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-surface p-5">
            <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
            <div className="h-7 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  const lider = data.categorias.length > 0
    ? data.categorias.reduce((a, b) => a.ingresos_usd > b.ingresos_usd ? a : b)
    : null;

  const mayorMargen = data.categorias.length > 0
    ? data.categorias.reduce((a, b) => a.margen_promedio > b.margen_promedio ? a : b)
    : null;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Categoría Líder"
        value={lider ? lider.nombre : "—"}
        icon={<Crown className="size-5" />}
        variant="info"
      />
      <StatCard
        label="Mayor Margen"
        value={mayorMargen ? `${Number(mayorMargen.margen_promedio).toFixed(1)}%` : "—"}
        icon={<TrendingUp className="size-5" />}
        variant="success"
      />
      <StatCard
        label="Total Ítems"
        value={String(data.total_productos)}
        icon={<Package className="size-5" />}
      />
    </div>
  );
}
