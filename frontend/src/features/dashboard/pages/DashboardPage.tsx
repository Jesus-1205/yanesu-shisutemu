import { useDashboardData } from "../hooks/useDashboardData";
import DashboardSkeleton from "../components/DashboardSkeleton";
import DashboardShortcuts from "../components/DashboardShortcuts";
import DashboardKpis from "../components/DashboardKpis";
import DashboardCharts from "../components/DashboardCharts";

export default function DashboardPage() {
  const {
    loading,
    stats,
    ventasSemana,
    salesSummary,
    topProducts,
    pendingSummary,
    pendingCount,
  } = useDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-responsive-h1 text-text-main">Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Resumen general y métricas clave del negocio
        </p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6 motion-safe:animate-[fadeIn_250ms_ease-out]">
          <DashboardShortcuts />
          <DashboardKpis
            stats={stats}
            ventasSemana={ventasSemana}
            pendingSummary={pendingSummary}
            pendingCount={pendingCount}
          />
          <DashboardCharts
            salesSummary={salesSummary}
            topProducts={topProducts}
          />
        </div>
      )}
    </div>
  );
}
