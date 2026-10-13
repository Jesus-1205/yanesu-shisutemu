import { BarChart2, Table as TableIcon, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import type { SalesGrouping, ReportViewMode } from "../types";

export interface SalesToolbarProps {
  grouping: SalesGrouping;
  viewMode: ReportViewMode;
  onGroupingChange: (g: SalesGrouping) => void;
  onViewModeChange: (v: ReportViewMode) => void;
  onExport: () => void;
}

const GROUPINGS: SalesGrouping[] = ["diario", "semanal", "mensual"];

export default function SalesToolbar({
  grouping,
  viewMode,
  onGroupingChange,
  onViewModeChange,
  onExport,
}: SalesToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">
          {viewMode === "chart" ? "Evolución de Ventas vs. Costos" : "Tabla de Desglose de Ventas"}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Haz clic en la leyenda para ocultar/mostrar métricas en la gráfica
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Grouping Toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
          {GROUPINGS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGroupingChange(g)}
              className={`cursor-pointer rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                grouping === g
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

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

        {/* Export Button if table mode */}
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
