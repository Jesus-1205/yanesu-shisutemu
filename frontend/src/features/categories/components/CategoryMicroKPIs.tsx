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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-surface p-5 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
            <div className="h-7 bg-slate-200 rounded w-20" />
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard
        label="Categoría Líder"
        value={lider ? lider.nombre : "—"}
        icon={<Crown className="w-5 h-5" />}
        variant="info"
      />
      <StatCard
        label="Mayor Margen"
        value={mayorMargen ? `${Number(mayorMargen.margen_promedio).toFixed(1)}%` : "—"}
        icon={<TrendingUp className="w-5 h-5" />}
        variant="success"
      />
      <StatCard
        label="Total Ítems"
        value={String(data.total_productos)}
        icon={<Package className="w-5 h-5" />}
      />
    </div>
  );
}
