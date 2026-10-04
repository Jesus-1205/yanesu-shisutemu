import { Suspense, lazy } from "react";
import type { ProductOut, SalesSummaryItem } from "@/types/api";
import ChartContainer from "@/ui-components/charts/ChartContainer";
import ChartSkeleton from "@/ui-components/charts/ChartSkeleton";

const SalesTrendChart = lazy(() => import("./SalesTrendChart"));
const TopProductsBarChart = lazy(() => import("./TopProductsBarChart"));

interface DashboardChartsProps {
  salesSummary: SalesSummaryItem[];
  topProducts: { producto: ProductOut; total_vendido: number }[];
}

export default function DashboardCharts({
  salesSummary,
  topProducts,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <ChartContainer title="Ventas Semanales — Últimas 5 Semanas">
          <Suspense fallback={<ChartSkeleton />}>
            <SalesTrendChart data={salesSummary} />
          </Suspense>
        </ChartContainer>
      </div>
      <div className="lg:col-span-5">
        <ChartContainer title="Top 5 Más Vendidos — Histórico">
          <Suspense fallback={<ChartSkeleton />}>
            <TopProductsBarChart data={topProducts} />
          </Suspense>
        </ChartContainer>
      </div>
    </div>
  );
}
