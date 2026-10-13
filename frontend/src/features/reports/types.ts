import type { SalesSummaryItem } from "@/types/api";

export type SalesGrouping = "diario" | "semanal" | "mensual";
export type ReportViewMode = "chart" | "table";

export interface SalesChartRow {
  periodoRaw: string;
  periodoFormatted: string;
  ventas: number;
  ingresos: number;
  costos: number;
  margen: number;
}

export interface SalesKpis {
  totalVentas: number;
  ingresos: number;
  costos: number;
  margen: number;
  margenPct: number;
}

export interface UseSalesSummaryParams {
  grouping: SalesGrouping;
  from: string;
  to: string;
  currency: "USD" | "VES";
  page: number;
  pageSize: number;
}

export interface UseSalesSummaryReturn {
  rawData: SalesSummaryItem[];
  chartData: SalesChartRow[];
  paginatedData: SalesChartRow[];
  tableData: SalesChartRow[];
  totals: SalesKpis;
  totalPages: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
}
