import { lazy, Suspense } from "react";
import type { ProductMatrixItem } from "@/types/api";
import type { ProductChartMode } from "../types";
import ProductsTop10Chart from "./ProductsTop10Chart";

const RentabilityScatterChart = lazy(() => import("./RentabilityScatterChart"));

export interface ProductsChartSectionProps {
  chartMode: ProductChartMode;
  data: ProductMatrixItem[];
  currency: "USD" | "VES";
  currSymbol: string;
  vesRate: number;
}

export default function ProductsChartSection({
  chartMode,
  data,
  currency,
  currSymbol,
  vesRate,
}: ProductsChartSectionProps) {
  return (
    <div className="min-h-80 w-full">
      {chartMode === "matrix" ? (
        <Suspense
          fallback={
            <div className="flex h-80 items-center justify-center">
              <span className="text-sm text-slate-400">Cargando gráfico...</span>
            </div>
          }
        >
          <RentabilityScatterChart data={data} />
        </Suspense>
      ) : (
        <ProductsTop10Chart
          data={data}
          currency={currency}
          currSymbol={currSymbol}
          vesRate={vesRate}
        />
      )}
    </div>
  );
}
