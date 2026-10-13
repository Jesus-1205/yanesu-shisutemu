import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { Skeleton } from "@/ui-components/Skeleton";
import type { Column } from "@/ui-components/Table";
import type {
  ReportViewMode,
  PaymentChartMode,
  PaymentTableTab,
  PaymentTableRow,
} from "../types";
import { usePaymentsReport } from "../hooks/usePaymentsReport";
import PaymentsKpiCards from "../components/PaymentsKpiCards";
import PaymentsToolbar from "../components/PaymentsToolbar";
import PaymentsChartSection from "../components/PaymentsChartSection";
import PaymentsTable from "../components/PaymentsTable";

export default function ReportsPaymentsPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const [viewMode, setViewMode] = useState<ReportViewMode>("chart");
  const [chartMode, setChartMode] = useState<PaymentChartMode>("donut");
  const [tableTab, setTableTab] = useState<PaymentTableTab>("todos");
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
  } = usePaymentsReport({
    from,
    to,
    currency,
    tableTab,
    page,
    pageSize,
  });

  const handleExport = () => {
    const currKey = currency.toLowerCase();
    const columns: Column<PaymentTableRow>[] = [
      { key: "nombreFormatted", header: "Método de Pago" },
      { key: "monedaDefault", header: "Moneda Origen" },
      { key: "cantidadPagos", header: "Transacciones" },
      {
        key: "totalUsd",
        header: "Total Cobrado USD",
        exportValue: (r) => r.totalUsd,
      },
      {
        key: "totalVes",
        header: "Total Cobrado VES",
        exportValue: (r) => r.totalVes,
      },
      {
        key: "totalEquiv",
        header: `Total Equiv. (${currency})`,
        exportValue: (r) => r.totalEquiv,
      },
      {
        key: "participacionPct",
        header: "Participación %",
        exportValue: (r) => r.participacionPct,
      },
    ];

    exportToExcel({
      data: tableData,
      columns,
      filename: `reporte_metodos_pago_${tableTab}_${currKey}`,
    });
  };

  if (error) {
    return <ErrorBanner onRetry={retry}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      <PaymentsKpiCards
        kpis={kpis}
        loading={loading}
        currency={currency}
        currSymbol={currSymbol}
      />

      <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 shadow-xs min-w-0 max-w-full">
        <PaymentsToolbar
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
          <PaymentsChartSection
            chartMode={chartMode}
            data={rawData}
            currency={currency}
            currSymbol={currSymbol}
            conversionRate={conversionRate}
          />
        ) : (
          <PaymentsTable
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
