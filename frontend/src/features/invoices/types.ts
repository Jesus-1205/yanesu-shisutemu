import type { TipoEmpaque, MonedaEnum } from "@/types/api";

export type { FacturaOut as Invoice, FacturaCreate as CreateInvoiceData, DetalleFacturaCreate as CreateInvoiceDetailData, FacturaPaginationOut as InvoicePagination, InvoiceStatsOut } from "@/types/api";

export interface LineItem {
  key: string;
  producto_id: number;
  nombre: string;
  codigo_barra: string | null;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  costo_unitario_usd: number;
  costo_unitario_bs: number;
  subtotal_usd: number;
  subtotal_bs: number;
  unidades_por_caja: number;
  tipo_iva: "GRAVADO" | "EXENTO";
  costo_ingresado: number;
  moneda_ingreso: MonedaEnum;
}

export interface ObsequioItem {
  key: string;
  producto_id: number;
  nombre: string;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  unidades_por_caja: number;
  justificacion: string;
}
