export interface SalesSummary {
  total_ventas: number;
  total_ingresos_bs: number;
  total_ingresos_usd: number;
  promedio_por_venta: number;
}

export interface TopProduct {
  producto_id: number;
  nombre: string;
  cantidad_vendida: number;
  total_bs: number;
}
