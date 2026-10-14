import type { SalesSummaryItem, ProductMatrixItem, PaymentMethodSummaryItem, CategoryReportItemOut } from "@/types/api";

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

export type ProductChartMode = "matrix" | "top10";
export type ProductTableTab = "todos" | "mas_vendidos" | "mayor_margen" | "menor_margen" | "sin_rotacion";

export interface ProductKpis {
  totalUnidades: number;
  lider: ProductMatrixItem | null;
  margenPromedio: number;
  sinRotacion: number;
}

export interface ProductTableRow {
  id: number;
  nombre: string;
  total_vendido: number;
  ingresos: number;
  costos: number;
  margen: number;
  rentabilidad_pct: number;
  stock_unidades: number;
}

export interface UseProductsReportParams {
  from: string;
  to: string;
  currency: "USD" | "VES";
  tableTab: ProductTableTab;
  page: number;
  pageSize: number;
}

export interface UseProductsReportReturn {
  rawData: ProductMatrixItem[];
  kpis: ProductKpis;
  tableData: ProductTableRow[];
  paginatedData: ProductTableRow[];
  totalPages: number;
  totalRows: number;
  conversionRate: number;
  currSymbol: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export type PaymentChartMode = "donut" | "bars";
export type PaymentTableTab = "todos" | "divisas" | "bolivares";

export interface PaymentKpis {
  totalUsd: number;
  totalVes: number;
  totalTransacciones: number;
  totalEquivUsd: number;
  totalRecaudado: number;
  lider: PaymentMethodSummaryItem | null;
  ventaPromedio: number;
}

export interface PaymentTableRow {
  id: number;
  nombre: string;
  nombreFormatted: string;
  monedaDefault: "USD" | "VES";
  cantidadPagos: number;
  totalUsd: number;
  totalVes: number;
  totalEquiv: number;
  participacionPct: number;
  participacionFormatted: string;
}

export interface UsePaymentsReportParams {
  from: string;
  to: string;
  currency: "USD" | "VES";
  tableTab: PaymentTableTab;
  page: number;
  pageSize: number;
}

export interface UsePaymentsReportReturn {
  rawData: PaymentMethodSummaryItem[];
  kpis: PaymentKpis;
  tableData: PaymentTableRow[];
  paginatedData: PaymentTableRow[];
  totalPages: number;
  totalRows: number;
  conversionRate: number;
  currSymbol: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export type CategoryChartMode = "donut" | "bars";
export type CategoryTableTab = "todos" | "mas_vendidas" | "mayor_margen" | "menor_margen";

export interface CategoryKpis {
  totalIngresos: number;
  lider: CategoryReportItemOut | null;
  liderParticipacion?: number;
  totalUnidades: number;
  margenPromedio: number;
}

export interface CategoryTableRow {
  id: number;
  nombre: string;
  total_productos: number;
  stock_total: number;
  stock_valorado: number;
  total_ordenes: number;
  unidades_vendidas: number;
  ingresos: number;
  costos: number;
  margen: number;
  rentabilidad_pct: number;
  participacion_pct: number;
}

export interface UseCategoriesReportParams {
  from: string;
  to: string;
  currency: "USD" | "VES";
  tableTab: CategoryTableTab;
  page: number;
  pageSize: number;
}

export interface UseCategoriesReportReturn {
  rawData: CategoryReportItemOut[];
  kpis: CategoryKpis;
  tableData: CategoryTableRow[];
  paginatedData: CategoryTableRow[];
  totalPages: number;
  totalRows: number;
  conversionRate: number;
  currSymbol: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

