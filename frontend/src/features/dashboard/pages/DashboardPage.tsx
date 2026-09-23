import { useDashboardData } from "../hooks/useDashboardData";
import Spinner from "@/ui-components/Spinner";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-responsive-h1 text-text-main">Dashboard</h1>

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
  );
}
