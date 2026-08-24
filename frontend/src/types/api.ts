// ============================================================
// Yanesu Shisutemu — Tipos de la API
// Generado a partir de los schemas Pydantic del backend
// ============================================================

// ─── Auth ───────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface SetupStatusResponse {
  needs_setup: boolean;
}

export interface UserOut {
  id: number;
  username: string;
  email: string;
  nombre_completo: string;
  rol_id: number;
  rol_nombre: string;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  nombre_completo: string;
  rol_id: number;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  nombre_completo?: string;
  rol_id?: number;
  is_active?: boolean;
}

// ─── Roles ──────────────────────────────────────────────────
export interface RoleOut {
  id: number;
  nombre: string;
}

export interface RoleCreate {
  nombre: string;
}

// ─── Categorías ─────────────────────────────────────────────
export interface CategoryOut {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface CategoryCreate {
  nombre: string;
  descripcion?: string | null;
}

export interface CategoryUpdate {
  nombre?: string;
  descripcion?: string | null;
}

export interface CategoryPaginationOut {
  items: CategoryOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface CategoryAnalyticsOut {
  id: number;
  nombre: string;
  descripcion: string | null;
  total_productos: number;
  stock_total: number;
  margen_promedio: number;
  unidades_vendidas: number;
  ingresos_usd: number;
}

export interface CategoryAnalyticsResponse {
  total_categorias: number;
  total_productos: number;
  stock_total: number;
  margen_promedio_general: number;
  unidades_vendidas: number;
  ingresos_usd: number;
  categorias: CategoryAnalyticsOut[];
}

export interface CategoryDetailProduct {
  id: number;
  nombre: string;
  codigo_barra: string | null;
  stock_unidades: number;
  precio_unidad_usd: number;
  unidades_vendidas: number;
  ingresos_usd: number;
  margen_porcentaje: number;
}

export interface CategoryDetailAnalytics {
  id: number;
  nombre: string;
  total_productos: number;
  unidades_vendidas: number;
  ingresos_usd: number;
  margen_promedio: number;
  top_productos: CategoryDetailProduct[];
  distribucion_ventas: CategoryDetailProduct[];
}

// ─── Proveedores ────────────────────────────────────────────
export interface SupplierOut {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
}

export interface SupplierCreate {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
}

export interface SupplierUpdate {
  nombre?: string;
  telefono?: string | null;
  email?: string | null;
}

export interface SupplierPaginationOut {
  items: SupplierOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface SupplierAnalyticsOut {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  total_productos: number;
  stock_total: number;
  margen_promedio: number;
  unidades_vendidas: number;
  ingresos_usd: number;
}

export interface SupplierAnalyticsResponse {
  total_proveedores: number;
  total_productos: number;
  stock_total: number;
  margen_promedio_general: number;
  unidades_vendidas: number;
  ingresos_usd: number;
  proveedores: SupplierAnalyticsOut[];
}

export interface SupplierDetailProduct {
  id: number;
  nombre: string;
  codigo_barra: string | null;
  stock_unidades: number;
  precio_unidad_usd: number;
  unidades_vendidas: number;
  ingresos_usd: number;
  margen_porcentaje: number;
}

export interface SupplierDetailAnalytics {
  id: number;
  nombre: string;
  total_productos: number;
  stock_total: number;
  unidades_vendidas: number;
  ingresos_usd: number;
  margen_promedio: number;
  top_productos: SupplierDetailProduct[];
}

// ─── Productos ──────────────────────────────────────────────
export interface ProductOut {
  id: number;
  codigo_barra: string | null;
  nombre: string;
  categories: CategoryOut[];
  unidades_por_caja: number;
  stock_cajas: number;
  stock_unidades: number;
  stock_minimo: number;
  precio_costo_caja_usd: number;
  precio_costo_usd: number;
  precio_unidad_usd: number;
  precio_caja_usd: number;
  precio_sugerido_unidad_usd: number;
  precio_sugerido_caja_usd: number;
  proveedor_id: number | null;
  tipo_iva: "GRAVADO" | "EXENTO";
  es_favorito: boolean;
  precio_divisas_unidad: number | null;
  precio_divisas_caja: number | null;
}

export interface ProductMatrixItem {
  id: number;
  nombre: string;
  total_vendido: number;
  precio_unidad_usd: number;
  precio_costo_usd: number;
  margen_porcentaje: number;
  stock_unidades: number;
}

export interface ProductCreate {
  codigo_barra?: string | null;
  nombre: string;
  categoria_ids?: number[];
  unidades_por_caja?: number;
  stock_cajas?: number;
  stock_unidades?: number;
  stock_minimo?: number;
  precio_costo_caja_usd: number;
  precio_unidad_usd: number;
  precio_caja_usd: number;
  proveedor_id?: number | null;
  tipo_iva?: "GRAVADO" | "EXENTO";
}

export interface ProductUpdate {
  codigo_barra?: string | null;
  nombre?: string;
  categoria_ids?: number[] | null;
  unidades_por_caja?: number;
  stock_unidades?: number;
  stock_minimo?: number;
  precio_costo_caja_usd?: number;
  precio_unidad_usd?: number;
  precio_caja_usd?: number;
  proveedor_id?: number | null;
  tipo_iva?: "GRAVADO" | "EXENTO";
  es_favorito?: boolean;
}

export interface ProductSold {
  producto: ProductOut;
  total_vendido: number;
}

export interface ProductPaginationOut {
  items: ProductOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ─── Tasas de Cambio ────────────────────────────────────────

export interface ExchangeRateOut {
  id: number;
  tasa_usd: number;
  tasa_eur: number;
  fecha_registro: string;
  registrado_por: number | null;
  registrado_por_nombre?: string | null;
}

export interface ExchangeRatePaginationOut {
  items: ExchangeRateOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ExchangeRatesResponse {
  rates: { USD?: string; EUR?: string };
  fecha_ultima_actualizacion?: string | null;
}

export interface DailyStatusResponse {
  needs_update: boolean;
  last_update_today: string | null;
  now: string;
}

// ─── Métodos de Pago ─────────────────────────────────────────
export interface PaymentMethodOut {
  id: number;
  nombre: string;
  moneda_default: "USD" | "VES";
  acepta_referencia: boolean;
  activo: boolean;
}

export interface PaymentMethodCreate {
  nombre: string;
  moneda_default?: "USD" | "VES";
  acepta_referencia?: boolean;
  activo?: boolean;
}

export interface PaymentMethodUpdate {
  nombre?: string;
  moneda_default?: "USD" | "VES";
  acepta_referencia?: boolean;
  activo?: boolean;
}

// ─── Ventas (POS) ───────────────────────────────────────────
export type TipoEmpaque = "UNIDAD" | "CAJA";

export interface SaleItemCreate {
  producto_id: number;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  unidades_descontadas: number;
  precio_unitario_usd: number;
  iva_porcentaje?: number;
  usa_precio_divisas?: boolean;
  combo_id?: number | null;
}

export interface SalePaymentCreate {
  metodo_pago_id: number;
  referencia?: string;
  monto_usd: number;
  monto_ves: number;
}

export interface SaleCreate {
  tasa_bcv_aplicada: number;
  historico_tasa_id?: number | null;
  observaciones?: string | null;
  monto_exento_usd?: number;
  base_imponible_usd?: number;
  monto_iva_usd?: number;
  items: SaleItemCreate[];
  pagos: SalePaymentCreate[];
}

export interface SaleItemOut {
  id: number;
  venta_id: number;
  producto_id: number;
  producto_nombre: string;
  tipo_empaque: string;
  cantidad: number;
  unidades_descontadas: number;
  precio_unitario_usd: number;
  subtotal_usd: number;
  iva_porcentaje: number;
  usa_precio_divisas?: boolean;
  combo_id?: number | null;
  combo_nombre?: string | null;
}

export interface SalePaymentOut {
  id: number;
  venta_id: number;
  metodo_pago_id: number;
  metodo_pago_nombre: string;
  referencia: string | null;
  monto_usd: number;
  monto_ves: number;
}

export interface SaleOut {
  id: number;
  fecha_venta: string;
  usuario_id: number;
  usuario_nombre: string;
  tasa_bcv_aplicada: number;
  historico_tasa_id: number | null;
  observaciones: string | null;
  monto_exento_usd: number;
  base_imponible_usd: number;
  monto_iva_usd: number;
  total_usd: number;
  monto_exento_ves: number;
  base_imponible_ves: number;
  monto_iva_ves: number;
  total_ves: number;
  metodo_pago: string;
  items: SaleItemOut[];
  pagos: SalePaymentOut[];
}

export interface SalesSummaryItem {
  periodo: string;
  total_ventas: number;
  total_usd: number;
  total_ves: number;
  costo_usd: number;
  margen_usd: number;
}

export interface TopWeekOut {
  periodo: string;
  total_ventas: number;
  total_usd: number;
  total_ves: number;
}

export interface PaymentMethodSummaryItem {
  metodo_pago_id: number;
  metodo_pago_nombre: string;
  moneda_default: "USD" | "VES";
  cantidad_pagos: number;
  total_usd: number;
  total_ves: number;
  total_equivalente_usd: number;
}

export interface SalePaginationOut {
  items: SaleOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ─── API Error ──────────────────────────────────────────────
export interface ApiError {
  detail: string | ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

// ─── Facturas de Proveedor ────────────────────────────────────
export type MonedaEnum = "USD" | "BS";
export type TipoDocumento = "FACTURA" | "NOTA_ENTREGA";
export type EstadoPago = "PENDIENTE" | "PARCIALMENTE_PAGADA" | "PAGADA";

export interface DetalleFacturaCreate {
  producto_id: number;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  costo_unitario_usd: number;
  costo_unitario_bs: number;
  unidades_por_caja?: number | null;
  tipo_iva?: "GRAVADO" | "EXENTO";
}

export interface FacturaCreate {
  proveedor_id: number;
  numero_factura: string;
  tipo_documento?: TipoDocumento;
  fecha_factura?: string | null;
  fecha_limite_pago?: string | null;
  observaciones?: string | null;
  moneda_principal: MonedaEnum;
  tasa_bs: number;
  aplica_iva?: boolean;
  detalles: DetalleFacturaCreate[];
  obsequios?: ObsequioFacturaCreate[];
}

export interface DetalleFacturaOut {
  id: number;
  factura_id: number;
  producto_id: number;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  costo_unitario_usd: number;
  costo_unitario_bs: number;
  tipo_iva: "GRAVADO" | "EXENTO";
  product: ProductOut | null;
}

export interface FacturaOut {
  id: number;
  proveedor_id: number;
  numero_factura: string;
  tipo_documento: TipoDocumento;
  fecha_factura: string;
  image_path: string | null;
  usuario_id: number;
  observaciones: string | null;
  moneda_principal: MonedaEnum;
  tasa_bs: number;
  total_usd: number;
  total_bs: number;
  aplica_iva: boolean;
  estado_pago: EstadoPago;
  fecha_limite_pago: string | null;
  created_at: string;
  procesada_por_ia?: boolean;
  raw_json_ia?: Record<string, unknown> | null;
  supplier: SupplierOut | null;
  detalles: DetalleFacturaOut[];
  obsequios: ObsequioFacturaOut[];
}

export interface FacturaPaginationOut {
  items: FacturaOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ─── Pagos de Factura ──────────────────────────────────────────────────────

export interface InvoicePaymentCreate {
  metodo_pago_id: number;
  monto_usd?: number;
  monto_bs?: number;
  referencia?: string | null;
  observaciones?: string | null;
}

export interface InvoicePaymentReceiptOut {
  id: number;
  pago_id: number;
  archivo_path: string;
  nombre_original: string;
  tipo_archivo: string;
  created_at: string;
}

export interface InvoicePaymentOut {
  id: number;
  factura_id: number;
  metodo_pago_id: number;
  metodo_pago_nombre: string;
  monto_usd: number;
  monto_bs: number;
  referencia: string | null;
  observaciones: string | null;
  fecha_pago: string;
  usuario_id: number;
  usuario_nombre?: string | null;
  comprobantes: InvoicePaymentReceiptOut[];
}

export interface InvoicePaymentSummary {
  estado_pago: EstadoPago;
  total_factura_usd: number;
  total_factura_bs: number;
  total_pagado_usd: number;
  total_pagado_bs: number;
  saldo_pendiente_usd: number;
  saldo_pendiente_bs: number;
  cantidad_pagos: number;
  porcentaje_pagado: number;
}

// ─── Obsequios de Factura ──────────────────────────────────────────────────

export interface ObsequioFacturaCreate {
  producto_id: number;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  justificacion: string;
  unidades_por_caja?: number | null;
}

export interface ObsequioFacturaOut {
  id: number;
  factura_id: number;
  producto_id: number;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  justificacion: string;
  product: ProductOut | null;
}

// ─── Análisis de Facturas por IA ──────────────────────────────
export type MatchStatus = "EXACT" | "PARTIAL" | "NOT_FOUND";

export interface MatchedSupplier {
  id: number;
  nombre: string;
  match_status: MatchStatus;
  confidence: number;
}

export interface MatchedProduct {
  producto_id: number | null;
  nombre_extraido: string;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  precio_unitario: number;
  match_status: MatchStatus;
  confidence: number;
  suggestions: ProductOut[];
}

export interface InvoiceAnalysisOut {
  proveedor: MatchedSupplier;
  numero_factura: string;
  fecha_factura: string | null;
  moneda: 'USD' | 'BS';
  productos: MatchedProduct[];
  raw_json_ia: Record<string, unknown>;
}

export type Product = ProductOut;
export type Category = CategoryOut;
export type Supplier = SupplierOut;
export type User = UserOut;

// ─── System Settings ────────────────────────────────────────
export interface ApiKeyStatusResponse {
  configured: boolean;
  clave: string;
  descripcion: string | null;
}

export interface ApiKeyPayload {
  clave: string;
  valor: string;
  descripcion?: string | null;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  models: string[] | null;
}

// ─── Reglas de Precio (Divisas) ─────────────────────────────
export interface PriceRuleProductEntry {
  producto_id: number;
  tipo_empaque: TipoEmpaque;
  precio_usd: number;
}

export interface PriceRuleProductOut {
  id: number;
  producto_id: number;
  producto_nombre: string;
  tipo_empaque: string;
  precio_usd: number;
}

export interface PriceRulePaymentMethodOut {
  id: number;
  metodo_pago_id: number;
  metodo_pago_nombre: string;
}

export interface PriceRuleOut {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  products: PriceRuleProductOut[];
  payment_methods: PriceRulePaymentMethodOut[];
}

export interface PriceRuleCreate {
  nombre: string;
  descripcion?: string | null;
  productos: PriceRuleProductEntry[];
  metodo_pago_ids: number[];
}

export interface PriceRuleUpdate {
  nombre?: string | null;
  descripcion?: string | null;
  activo?: boolean;
  productos?: PriceRuleProductEntry[] | null;
  metodo_pago_ids?: number[] | null;
}

export interface CalculateRequestItem {
  producto_id: number;
  tipo_empaque: TipoEmpaque;
  cantidad: number;
  usa_precio_divisas: boolean;
}

export interface CalculateRequest {
  items: CalculateRequestItem[];
  combos?: CalculateComboRequest[];
  metodo_pago_ids: number[];
}

export interface CalculateComboSelection {
  grupo_id: number;
  productos: number[];
  cantidades: number[];
}

export interface CalculateComboRequest {
  combo_id: number;
  cantidad: number;
  selecciones: CalculateComboSelection[];
}

export interface CalculateResponseItem {
  producto_id: number;
  producto_nombre: string;
  tipo_empaque: string;
  cantidad: number;
  precio_unitario_usd: number;
  precio_original_usd: number;
  usa_precio_divisas: boolean;
}

export interface CalculateResponse {
  items: CalculateResponseItem[];
  total_usd: number;
  total_divisas_usd: number;
  total_normal_usd: number;
  ahorro_usd: number;
  metodos_divisas_disponibles: number[];
  combo_items: CalculateResponseItem[];
}

// ─── Combos ──────────────────────────────────────────────────
export interface ComboGroupProductOut {
  id: number;
  producto_id: number;
  producto_nombre: string;
}

export interface ComboGroupOut {
  id: number;
  nombre: string;
  min_cantidad: number;
  max_cantidad: number;
  products: ComboGroupProductOut[];
}

export interface ComboActiveProduct {
  producto_id: number;
  nombre: string;
  precio_unidad_usd: number;
}

export interface ComboActiveGroup {
  id: number;
  nombre: string;
  min_cantidad: number;
  max_cantidad: number;
  productos: ComboActiveProduct[];
}

export interface ComboActiveOut {
  id: number;
  nombre: string;
  precio_total_usd: number;
  groups: ComboActiveGroup[];
  metodo_pago_ids: number[];
}

export interface ComboOut {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_total_usd: number;
  activo: boolean;
  groups: ComboGroupOut[];
  metodo_pago_ids: number[];
}

export interface ComboGroupProductEntry {
  producto_id: number;
}

export interface ComboGroupEntry {
  nombre: string;
  min_cantidad: number;
  max_cantidad: number;
  productos: ComboGroupProductEntry[];
}

export interface ComboCreate {
  nombre: string;
  descripcion?: string | null;
  precio_total_usd: number;
  grupos: ComboGroupEntry[];
  metodo_pago_ids: number[];
}

export interface ComboUpdate {
  nombre?: string | null;
  descripcion?: string | null;
  precio_total_usd?: number;
  activo?: boolean;
  grupos?: ComboGroupEntry[] | null;
  metodo_pago_ids?: number[] | null;
}

