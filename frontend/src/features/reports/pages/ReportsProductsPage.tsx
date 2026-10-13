import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Package } from "lucide-react";
import { getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import ErrorBanner from "@/ui-components/ErrorBanner";
import type { Column } from "@/ui-components/Table";
import type { ReportViewMode, ProductChartMode, ProductTableTab, ProductTableRow } from "../types";
import { useProductsReport } from "../hooks/useProductsReport";
import ProductsKpiCards from "../components/ProductsKpiCards";
import ProductsToolbar from "../components/ProductsToolbar";
import ProductsChartSection from "../components/ProductsChartSection";
import ProductsTable from "../components/ProductsTable";

export default function ReportsProductsPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [viewMode, setViewMode] = useState<ReportViewMode>("chart");
  const [chartMode, setChartMode] = useState<ProductChartMode>("matrix");
  const [tableTab, setTableTab] = useState<ProductTableTab>("todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page on filter changes
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
  } = useProductsReport({
    from,
    to,
    currency,
    tableTab,
    page,
    pageSize,
  });

  const handleExport = () => {
    const currKey = currency.toLowerCase();
    const columns: Column<ProductTableRow>[] = [
      { key: "nombre", header: "Producto" },
      { key: "total_vendido", header: "Vendidos" },
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
      { key: "stock_unidades", header: "Stock" },
    ];

    exportToExcel({
      data: tableData,
      columns,
      filename: `reporte_productos_${tableTab}_${currKey}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={retry}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <ProductsKpiCards kpis={kpis} loading={loading} />

      <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 shadow-xs min-w-0 max-w-full">
        <ProductsToolbar
          viewMode={viewMode}
          chartMode={chartMode}
          onViewModeChange={setViewMode}
          onChartModeChange={setChartMode}
          onExport={handleExport}
        />

        {loading ? (
          <div className="h-80 w-full animate-pulse rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            Cargando analíticas...
          </div>
        ) : rawData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Package className="size-10 stroke-1 mb-2" />
            <p className="text-sm">No hay datos de productos para el rango seleccionado</p>
          </div>
        ) : viewMode === "chart" ? (
          <ProductsChartSection
            chartMode={chartMode}
            data={rawData}
            currency={currency}
            currSymbol={currSymbol}
            vesRate={conversionRate}
          />
        ) : (
          <ProductsTable
            data={paginatedData}
            totalRows={totalRows}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            tableTab={tableTab}
            sinRotacionCount={kpis.sinRotacion}
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
