export type {
  SaleOut as Sale,
  SaleOut as SaleDetail,
  SaleListOut as SaleListItem,
  SalePaginationListOut as SalePagination,
  SalePaginationOut,
  SaleCreate as CreateSaleData,
  SaleItemOut as SaleItem,
  SaleItemCreate as CreateSaleItemData,
  SalePaymentOut as SalePayment,
  SalePaymentCreate as CreateSalePaymentData,
  PaymentMethodOut as PaymentMethod,
  TopWeekOut,
  SalesSummaryItem,
} from "@/types/api";

export interface SalesKpisData {
  totalVentas: number;
  totalUsd: number;
  totalVes: number;
  ticketPromedioUsd: number;
}

export type SalesDatePreset = "today" | "7d" | "this_month" | "all" | "custom";

