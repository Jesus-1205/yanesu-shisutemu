import {
  PieChart as PieChartIcon,
  BarChart2,
  Table as TableIcon,
  Download,
} from "lucide-react";
import Button from "@/ui-components/Button";
import type { ReportViewMode, CategoryChartMode } from "../types";

export interface CategoriesToolbarProps {
  viewMode: ReportViewMode;
  chartMode: CategoryChartMode;
  onViewModeChange: (v: ReportViewMode) => void;
  onChartModeChange: (c: CategoryChartMode) => void;
  onExport: () => void;
}

export default function CategoriesToolbar({
  viewMode,
  chartMode,
  onViewModeChange,
  onChartModeChange,
  onExport,
}: CategoriesToolbarProps) {
  const chartTitle =
    chartMode === "donut"
      ? "Distribución por Categoría"
      : "Comparativa de Categorías";

  const viewModeTitle =
    viewMode === "chart" ? chartTitle : "Tabla de Rendimiento de Categorías";

  const subtitle =
    viewMode === "chart"
      ? chartMode === "donut"
        ? "Participación porcentual sobre las ventas del período"
        : "Ingresos y costos por categoría"
      : "Haz clic en las pestañas para ordenar por rendimiento";

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">{viewModeTitle}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Chart mode toggle (only when chart view) */}
        {viewMode === "chart" && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => onChartModeChange("donut")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                chartMode === "donut"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PieChartIcon className="size-3.5" />
              Distribución
            </button>
            <button
              type="button"
              onClick={() => onChartModeChange("bars")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                chartMode === "bars"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart2 className="size-3.5" />
              Comparativa
            </button>
          </div>
        )}

        {/* View mode toggle: Gráfico vs Tabla */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange("chart")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "chart"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="size-3.5" />
            Gráfico
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="size-3.5" />
            Tabla
          </button>
        </div>

        {/* Export button (only table mode) */}
        {viewMode === "table" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-1.5 text-xs text-slate-700"
          >
            <Download className="size-3.5" />
            Exportar Excel
          </Button>
        )}
      </div>
    </div>
  );
}
