import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { Skeleton } from "@/ui-components/Skeleton";
import type { Column } from "@/ui-components/Table";
import type {
  ReportViewMode,
  CategoryChartMode,
  CategoryTableTab,
  CategoryTableRow,
} from "../types";
import { useCategoriesReport } from "../hooks/useCategoriesReport";
import CategoriesKpiCards from "../components/CategoriesKpiCards";
import CategoriesToolbar from "../components/CategoriesToolbar";
import CategoriesChartSection from "../components/CategoriesChartSection";
import CategoriesTable from "../components/CategoriesTable";

export default function ReportsCategoriesPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [viewMode, setViewMode] = useState<ReportViewMode>("chart");
  const [chartMode, setChartMode] = useState<CategoryChartMode>("donut");
  const [tableTab, setTableTab] = useState<CategoryTableTab>("todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page when filtering or date changes
  useEffect(() => {
    setPage(1);
  }, [tableTab, from, to]);

  const {
    rawData,
    kpis,
    tableData,
    paginatedData,
    totalPages,
    totalRows,
    conversionRate,
    currSymbol,
    loading,
    error,
    retry,
  } = useCategoriesReport({
    from,
    to,
    currency,
    tableTab,
    page,
    pageSize,
  });

  const handleExport = () => {
    const currKey = currency.toLowerCase();
    const columns: Column<CategoryTableRow>[] = [
      { key: "nombre", header: "Categoría" },
      { key: "total_productos", header: "Cant. Productos" },
      { key: "stock_total", header: "Stock Total" },
      {
        key: "stock_valorado",
        header: `Valor Inventario (${currency})`,
        exportValue: (r) => r.stock_valorado,
      },
      { key: "total_ordenes", header: "Transacciones" },
      { key: "unidades_vendidas", header: "Unidades Vendidas" },
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
      {
        key: "rentabilidad_pct",
        header: "Rentabilidad %",
        exportValue: (r) => r.rentabilidad_pct,
      },
      {
        key: "participacion_pct",
        header: "Participación %",
        exportValue: (r) => r.participacion_pct,
      },
    ];

    exportToExcel({
      data: tableData,
      columns,
      filename: `reporte_categorias_${tableTab}_${currKey}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={retry}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <CategoriesKpiCards
        kpis={kpis}
        loading={loading}
        currency={currency}
        currSymbol={currSymbol}
      />

      <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 shadow-xs min-w-0 max-w-full">
        <CategoriesToolbar
          viewMode={viewMode}
          chartMode={chartMode}
          onViewModeChange={setViewMode}
          onChartModeChange={setChartMode}
          onExport={handleExport}
        />

        {loading ? (
          <div className="flex h-75 items-center justify-center">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : viewMode === "chart" ? (
          <CategoriesChartSection
            chartMode={chartMode}
            data={rawData}
            currency={currency}
            currSymbol={currSymbol}
            conversionRate={conversionRate}
          />
        ) : (
          <CategoriesTable
            data={paginatedData}
            totalRows={totalRows}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            tableTab={tableTab}
            currency={currency}
            currSymbol={currSymbol}
            onTabChange={(tab) => {
              setTableTab(tab);
              setPage(1);
            }}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
