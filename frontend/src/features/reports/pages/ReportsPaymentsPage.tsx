import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DollarSign, Banknote, Trophy, Receipt, TrendingUp,
  PieChart as PieChartIcon, BarChart2, Table as TableIcon, Download,
} from "lucide-react";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { PaymentMethodSummaryItem } from "@/types/api";
import { formatCurrency, formatPaymentMethodName, getReportPresetDates } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";
import { Skeleton } from "@/ui-components/Skeleton";
import Button from "@/ui-components/Button";
import ErrorBanner from "@/ui-components/ErrorBanner";
import Pagination from "@/ui-components/Pagination";

const PaymentMethodsDonut = lazy(() => import("../components/PaymentMethodsDonut"));
const PaymentMethodsBarChart = lazy(() => import("../components/PaymentMethodsBarChart"));

type ViewMode = "chart" | "table";
type ChartMode = "donut" | "bars";
type TableTab = "todos" | "divisas" | "bolivares";

const TABLE_TABS: { id: TableTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "divisas", label: "Divisas (USD)" },
  { id: "bolivares", label: "Bolívares (VES)" },
];

export default function ReportsPaymentsPage() {
  const [searchParams] = useSearchParams();
  const currency = (searchParams.get("currency") as "USD" | "VES") || "USD";
  const defaultDates = useMemo(() => getReportPresetDates("30d"), []);
  const from = searchParams.get("from") || defaultDates.from;
  const to = searchParams.get("to") || defaultDates.to;

  const tasaBCV = useExchangeRateStore((s) => s.tasa);
  const conversionRate = currency === "VES" && tasaBCV > 0 ? tasaBCV : 1;
  const currSymbol = currency === "USD" ? "$" : "Bs ";

  const [data, setData] = useState<PaymentMethodSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [chartMode, setChartMode] = useState<ChartMode>("donut");
  const [tableTab, setTableTab] = useState<TableTab>("todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Reset page when filtering or date changes
  useEffect(() => {
    setPage(1);
  }, [tableTab, from, to]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getPaymentMethodSummary({
          fecha_desde: from,
          fecha_hasta: to,
        });
        if (!cancelled) {
          setData(res || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar reporte de métodos de pago");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to, retryCount]);

  // ────────────────────── Calculations & KPIs ──────────────────────
  const kpis = useMemo(() => {
    let totalUsd = 0;
    let totalVes = 0;
    let totalTransacciones = 0;
    let totalEquivUsd = 0;

    for (const m of data) {
      totalUsd = Math.round((totalUsd + (Number(m.total_usd) || 0)) * 100) / 100;
      totalVes = Math.round((totalVes + (Number(m.total_ves) || 0)) * 100) / 100;
      totalTransacciones += m.cantidad_pagos || 0;
      totalEquivUsd = Math.round((totalEquivUsd + (Number(m.total_equivalente_usd) || 0)) * 100) / 100;
    }

    const conPagos = data.filter((m) => (m.cantidad_pagos || 0) > 0);
    const lider = conPagos.length > 0
      ? conPagos.reduce(
          (best, m) =>
            (Number(m.total_equivalente_usd) || 0) > (Number(best.total_equivalente_usd) || 0)
              ? m
              : best,
          conPagos[0],
        )
      : null;

    const totalRecaudado = currency === "USD"
      ? totalEquivUsd
      : Math.round(totalEquivUsd * conversionRate * 100) / 100;
    const ventaPromedio = totalTransacciones > 0
      ? Math.round((totalRecaudado / totalTransacciones) * 100) / 100
      : 0;

    return {
      totalUsd,
      totalVes,
      totalTransacciones,
      totalEquivUsd,
      totalRecaudado,
      lider,
      ventaPromedio,
    };
  }, [data, currency, conversionRate]);

  // ────────────────────── Table data per tab ──────────────────────
  const filteredTableData = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => (Number(b.total_equivalente_usd) || 0) - (Number(a.total_equivalente_usd) || 0),
    );
    switch (tableTab) {
      case "divisas":
        return sorted.filter((m) => m.moneda_default === "USD");
      case "bolivares":
        return sorted.filter((m) => m.moneda_default === "VES");
      default:
        return sorted;
    }
  }, [data, tableTab]);

  const totalPages = Math.ceil(filteredTableData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTableData.slice(start, start + pageSize);
  }, [filteredTableData, page]);

  // ────────────────────── Excel Export ──────────────────────
  const handleExport = () => {
    const currKey = currency.toLowerCase();
    exportToExcel({
      data: filteredTableData.map((m) => {
        const equiv = Number(m.total_equivalente_usd) || 0;
        const equivConverted = currency === "USD" ? equiv : Math.round(equiv * conversionRate * 100) / 100;
        const pct = kpis.totalEquivUsd > 0 ? ((equiv / kpis.totalEquivUsd) * 100).toFixed(1) : "0.0";
        return {
          metodo_pago: formatPaymentMethodName(m.metodo_pago_nombre),
          moneda_origen: m.moneda_default,
          transacciones: m.cantidad_pagos,
          total_usd: Number(m.total_usd) || 0,
          total_ves: Number(m.total_ves) || 0,
          [`total_equivalente_${currKey}`]: equivConverted,
          participacion_pct: Number(pct),
        };
      }),
      columns: [
        { key: "metodo_pago", header: "Método de Pago" },
        { key: "moneda_origen", header: "Moneda Origen" },
        { key: "transacciones", header: "Transacciones" },
        { key: "total_usd", header: "Total Cobrado USD" },
        { key: "total_ves", header: "Total Cobrado VES" },
        { key: `total_equivalente_${currKey}`, header: `Total Equiv. (${currency})` },
        { key: "participacion_pct", header: "Participación %" },
      ],
      filename: `reporte_metodos_pago_${tableTab}_${currKey}`,
    });
  };

  // ────────────────────── Dynamic Header Titles ──────────────────────
  const chartTitle = chartMode === "donut"
    ? "Distribución por Método de Pago"
    : "Comparativa de Recaudación";

  const viewModeTitle = viewMode === "chart" ? chartTitle : "Tabla de Desglose de Pagos";

  if (error) {
    return <ErrorBanner onRetry={() => setRetryCount((c) => c + 1)}>{error}</ErrorBanner>;
  }

  return (
    <div className="space-y-6">
      {/* ── Micro-KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Recaudado */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Recaudado</span>
            <div className="rounded-lg bg-blue-50 p-2 text-brand-blue">
              {currency === "USD" ? (
                <DollarSign className="size-4" />
              ) : (
                <Banknote className="size-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(kpis.totalRecaudado, currSymbol)}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Equivalente total recibido</p>
          </div>
        </div>

        {/* Método Principal */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Método Principal</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-500">
              <Trophy className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : kpis.lider ? (
              <>
                <div
                  className="truncate text-xl font-bold tracking-tight text-slate-900"
                  title={formatPaymentMethodName(kpis.lider.metodo_pago_nombre)}
                >
                  {formatPaymentMethodName(kpis.lider.metodo_pago_nombre)}
                </div>
                <p className="mt-1 text-xs text-amber-600 font-medium">
                  {kpis.totalEquivUsd > 0
                    ? `${(
                        ((Number(kpis.lider.total_equivalente_usd) || 0) / kpis.totalEquivUsd) *
                        100
                      ).toFixed(1)}% del total recibido`
                    : `${kpis.lider.cantidad_pagos} pagos`}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Sin pagos en el período</p>
            )}
          </div>
        </div>

        {/* Total Transacciones */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Ventas</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Receipt className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {kpis.totalTransacciones.toLocaleString("es-VE")}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Operaciones completadas</p>
          </div>
        </div>

        {/* Venta Promedio */}
        <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Venta Promedio</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold tracking-tight text-emerald-600">
                {formatCurrency(kpis.ventaPromedio, currSymbol)}
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">Promedio por transacción</p>
          </div>
        </div>
      </div>

      {/* ── Main Interactive Container ── */}
      <div className="rounded-xl border border-slate-200 bg-surface p-4 sm:p-5 shadow-xs min-w-0 max-w-full">
        {/* Controls Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{viewModeTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === "chart"
                ? chartMode === "donut"
                  ? "Participación porcentual y monto equivalente recibido por método"
                  : "Monto total equivalente recibido por cada método de pago"
                : "Haz clic en las pestañas para filtrar por tipo de moneda"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart mode toggle (only when chart view) */}
            {viewMode === "chart" && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setChartMode("donut")}
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
                  onClick={() => setChartMode("bars")}
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
                onClick={() => setViewMode("chart")}
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
                onClick={() => setViewMode("table")}
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
                onClick={handleExport}
                className="gap-1.5 text-xs text-slate-700"
              >
                <Download className="size-3.5" />
                Exportar Excel
              </Button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex h-75 items-center justify-center">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : viewMode === "chart" ? (
          /* ── CHART MODE ── */
          <div>
            <Suspense fallback={<Skeleton className="h-75 w-full" />}>
              {chartMode === "donut" ? (
                <PaymentMethodsDonut
                  data={data}
                  currency={currency}
                  currSymbol={currSymbol}
                  conversionRate={conversionRate}
                />
              ) : (
                <PaymentMethodsBarChart
                  data={data}
                  currency={currency}
                  currSymbol={currSymbol}
                  conversionRate={conversionRate}
                />
              )}
            </Suspense>
          </div>
        ) : (
          /* ── TABLE MODE ── */
          <div className="space-y-4">
            {/* Sub-tabs with horizontal scroll for mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-100 pb-3 -mx-1 px-1 flex-nowrap">
              {TABLE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setTableTab(tab.id);
                    setPage(1);
                  }}
                  className={`cursor-pointer shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tableTab === tab.id
                      ? "bg-brand-blue text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Método de Pago</th>
                    <th className="py-3 px-4 text-center">Transacciones</th>
                    <th className="py-3 px-4 text-right">Total USD</th>
                    <th className="py-3 px-4 text-right">Total VES</th>
                    <th className="py-3 px-4 text-right">Equiv. ({currency})</th>
                    <th className="py-3 px-4 text-right">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                        No hay métodos de pago registrados en este filtro
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((m) => {
                      const equiv = Number(m.total_equivalente_usd) || 0;
                      const equivConverted =
                        currency === "USD" ? equiv : equiv * conversionRate;
                      const pct =
                        kpis.totalEquivUsd > 0
                          ? ((equiv / kpis.totalEquivUsd) * 100).toFixed(1)
                          : "0.0";
                      const isUsd = m.moneda_default === "USD";

                      return (
                        <tr
                          key={m.metodo_pago_id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {formatPaymentMethodName(m.metodo_pago_nombre)}
                              </span>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                                  isUsd
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                              >
                                {m.moneda_default}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700">
                            {m.cantidad_pagos}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900">
                            {formatCurrency(m.total_usd, "$")}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900">
                            {formatCurrency(m.total_ves, "Bs ")}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-brand-blue">
                            {formatCurrency(equivConverted, currSymbol)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-brand-blue rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, Number(pct)))}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination + count (responsive stacked on mobile) */}
            {filteredTableData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500 text-center sm:text-left">
                  Mostrando{" "}
                  <span className="font-medium text-slate-700">
                    {(page - 1) * pageSize + 1} a{" "}
                    {Math.min(page * pageSize, filteredTableData.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-slate-700">
                    {filteredTableData.length}
                  </span>{" "}
                  métodos
                </p>
                {totalPages > 1 && (
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
