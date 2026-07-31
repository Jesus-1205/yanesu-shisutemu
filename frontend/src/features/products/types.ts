export type {
  ProductOut as Product,
  ProductCreate as CreateProductData,
  ProductUpdate as UpdateProductData,
  ProductSold,
} from "@/types/api";

export type StockStatus = "todos" | "disponible" | "bajo" | "agotado";

export type SortField = "nombre" | "stock" | "precio" | "margen";
export type SortOrder = "asc" | "desc";

export type ViewMode = "grid" | "table";

export interface ProductFiltersState {
  search: string;
  categoria_ids: number[];
  proveedor_id: number | null;
  stockStatus: StockStatus;
  sortField: SortField;
  sortOrder: SortOrder;
  precio_min: number | "";
  precio_max: number | "";
  tipo_iva: "" | "GRAVADO" | "EXENTO";
}

export const FILTERS_DEFAULT: ProductFiltersState = {
  search: "",
  categoria_ids: [],
  proveedor_id: null,
  stockStatus: "todos",
  sortField: "nombre",
  sortOrder: "asc",
  precio_min: "",
  precio_max: "",
  tipo_iva: "",
};

export interface MarginDisplay {
  margen: number;
  label: string;
  color: "success" | "warning" | "danger" | "neutral";
}

export function calcMargin(costo: number, precio: number): MarginDisplay {
  if (!precio || precio <= 0) return { margen: 0, label: "—", color: "neutral" };
  const pct = ((precio - costo) / precio) * 100;
  if (pct >= 30) return { margen: pct, label: `${pct.toFixed(1)}%`, color: "success" };
  if (pct >= 10) return { margen: pct, label: `${pct.toFixed(1)}%`, color: "warning" };
  return { margen: pct, label: `${pct.toFixed(1)}%`, color: "danger" };
}
