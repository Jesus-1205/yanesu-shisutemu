import { BarChart2, Table as TableIcon, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import type { ReportViewMode, ProductChartMode } from "../types";

export interface ProductsToolbarProps {
  viewMode: ReportViewMode;
  chartMode: ProductChartMode;
  onViewModeChange: (v: ReportViewMode) => void;
  onChartModeChange: (c: ProductChartMode) => void;
  onExport: () => void;
}

export default function ProductsToolbar({
  viewMode,
  chartMode,
  onViewModeChange,
  onChartModeChange,
  onExport,
}: ProductsToolbarProps) {
  const chartTitle =
    chartMode === "matrix"
      ? "Matriz de Rendimiento: Rotación vs. Margen %"
      : "Top 10 Productos Más Vendidos";

  const viewModeTitle = viewMode === "chart" ? chartTitle : "Tabla de Desglose de Productos";

  const subtitle =
    viewMode === "chart"
      ? chartMode === "matrix"
        ? "Cada punto representa un producto; cuadrantes según rotación y margen"
        : "Productos con mayor número de unidades despachadas en el período"
      : "Haz clic en las pestañas para filtrar el catálogo";

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">{viewModeTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Chart mode toggle (only when chart view) */}
        {viewMode === "chart" && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onChartModeChange("matrix")}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
                chartMode === "matrix"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Matriz
            </button>
            <button
              type="button"
              onClick={() => onChartModeChange("top10")}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
                chartMode === "top10"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Top 10
            </button>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onViewModeChange("chart")}
            className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              viewMode === "chart"
                ? "bg-white text-brand-blue shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="size-3.5" />
            Gráfico
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`cursor-pointer inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
              viewMode === "table"
                ? "bg-white text-brand-blue shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="size-3.5" />
            Tabla
          </button>
        </div>

        {/* Export (only table mode) */}
        {viewMode === "table" && (
          <Button variant="outline" size="sm" onClick={onExport} className="text-xs">
            <Download className="size-3.5 mr-1" />
            Exportar Excel
          </Button>
        )}
      </div>
    </div>
  );
}
