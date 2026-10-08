import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type {
  DashboardStatsOut,
  InvoicePendingSummaryOut,
  InvoiceStatsOut,
  ProductRankingItem,
  SalesSummaryItem,
} from "@/types/api";

export interface TopProductItem {
  producto: ProductRankingItem;
  total_vendido: number;
}

export interface DashboardDataState {
  stats: DashboardStatsOut | null;
  ventasSemana: SalesSummaryItem | null;
  salesSummary: SalesSummaryItem[];
  topProducts: TopProductItem[];
  invoiceStats: InvoiceStatsOut | null;
  pendingSummary: InvoicePendingSummaryOut | null;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDashboardWeeklyDateRange(referenceDate: Date = new Date()) {
  const lastSunday = new Date(referenceDate);
  lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay());

  const sixWeeksBefore = new Date(lastSunday);
  sixWeeksBefore.setDate(sixWeeksBefore.getDate() - 41);

  return {
    fechaDesde: formatLocalDate(sixWeeksBefore),
    fechaHasta: formatLocalDate(lastSunday),
  };
}

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardDataState>({
    stats: null,
    ventasSemana: null,
    salesSummary: [],
    topProducts: [],
    invoiceStats: null,
    pendingSummary: null,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { fechaDesde, fechaHasta } = getDashboardWeeklyDateRange();

    const [
      statsRes,
      salesSummaryRes,
      topProductsRes,
      invoiceStatsRes,
      pendingSummaryRes,
    ] = await Promise.allSettled([
      api.getDashboardStats(),
      api.getSalesSummary({ rango: "semanal", fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      api.getTopSellingProducts(5),
      api.getInvoiceStats(),
      api.getInvoicePendingSummary(),
    ]);

    setData((prev) => {
      let nextSalesSummary = prev.salesSummary;
      let nextVentasSemana = prev.ventasSemana;

      if (salesSummaryRes.status === "fulfilled") {
        const salesData = salesSummaryRes.value;
        nextSalesSummary = salesData.slice(-5);
        nextVentasSemana = salesData.length > 0 ? salesData[salesData.length - 1] : null;
      }

      return {
        stats: statsRes.status === "fulfilled" ? statsRes.value : prev.stats,
        salesSummary: nextSalesSummary,
        ventasSemana: nextVentasSemana,
        topProducts: topProductsRes.status === "fulfilled" ? topProductsRes.value : prev.topProducts,
        invoiceStats: invoiceStatsRes.status === "fulfilled" ? invoiceStatsRes.value : prev.invoiceStats,
        pendingSummary: pendingSummaryRes.status === "fulfilled" ? pendingSummaryRes.value : prev.pendingSummary,
      };
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingCount = (data.invoiceStats?.pendientes ?? 0) + (data.invoiceStats?.parciales ?? 0);

  return {
    loading,
    ...data,
    pendingCount,
    refetch: fetchData,
  };
}
