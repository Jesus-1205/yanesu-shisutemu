import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart2 } from "lucide-react";
import { getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import ErrorBanner from "@/ui-components/ErrorBanner";
import type { Column } from "@/ui-components/Table";
import type { SalesGrouping, ReportViewMode, SalesChartRow } from "../types";
import { useSalesSummary } from "../hooks/useSalesSummary";
import SalesKpiCards from "../components/SalesKpiCards";
import SalesChart from "../components/SalesChart";
import SalesTable from "../components/SalesTable";
import SalesToolbar from "../components/SalesToolbar";

export default function ReportsSalesPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [grouping, setGrouping] = useState<SalesGrouping>("diario");
  const [viewMode, setViewMode] = useState<ReportViewMode>("chart");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page when grouping or dates change
  useEffect(() => {
    setPage(1);
  }, [grouping, from, to]);

  const {
    chartData,
    paginatedData,
    tableData,
    totals,
    totalPages,
    loading,
    error,
    retry,
  } = useSalesSummary({
    grouping,
    from,
    to,
    currency,
    page,
    pageSize,
  });

  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const handleExport = () => {
    const columns: Column<SalesChartRow>[] = [
      { key: "periodoFormatted", header: "Período" },
      { key: "ventas", header: "N° de Ventas" },
      {
        key: "ingresos",
        header: `Ingresos (${currency})`,
        exportValue: (r) => r.ingresos,
      },
      {
        key: "costos",
        header: `Costos (${currency})`,
        exportValue: (r) => r.costos,
      },
      {
        key: "margen",
        header: `Margen (${currency})`,
        exportValue: (r) => r.margen,
      },
    ];

    exportToExcel({
      data: tableData,
      columns,
      filename: `reporte_ventas_${grouping}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={retry}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <SalesKpiCards totals={totals} loading={loading} currSymbol={currSymbol} />

      <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs">
        <SalesToolbar
          grouping={grouping}
          viewMode={viewMode}
          onGroupingChange={setGrouping}
          onViewModeChange={setViewMode}
          onExport={handleExport}
        />

        {loading ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            Cargando analíticas...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <BarChart2 className="size-10 stroke-1 mb-2" />
            <p className="text-sm">No hay registros de ventas para el rango seleccionado</p>
          </div>
        ) : viewMode === "chart" ? (
          <SalesChart data={chartData} currSymbol={currSymbol} />
        ) : (
          <SalesTable
            data={paginatedData}
            totalRows={tableData.length}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            currency={currency}
            currSymbol={currSymbol}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
