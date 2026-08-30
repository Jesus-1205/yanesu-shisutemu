import type {
  ApiKeyPayload,
  ApiKeyStatusResponse,
  CalculateRequest,
  CalculateResponse,
  CategoryAnalyticsResponse,
  CategoryCreate,
  CategoryDetailAnalytics,
  CategoryOut,
  CategoryPaginationOut,
  CategoryUpdate,
  ComboActiveOut,
  ComboCreate,
  ComboOut,
  ComboUpdate,
  DailyStatusResponse,
  ExchangeRateOut,
  ExchangeRatePaginationOut,
  ExchangeRatesResponse,
  FacturaCreate,
  FacturaOut,
  FacturaPaginationOut,
  InvoiceAnalysisOut,
  InvoicePaymentCreate,
  InvoicePaymentOut,
  InvoicePaymentSummary,
  InvoicePendingSummaryOut,
  InvoiceStatsOut,
  TopSupplier,
  PaymentMethodCreate,
  PaymentMethodOut,
  PaymentMethodUpdate,
  PaymentMethodSummaryItem,
  PriceRuleCreate,
  PriceRuleOut,
  PriceRuleUpdate,
  ProductCreate,
  ProductMatrixItem,
  ProductOut,
  ProductPaginationOut,
  ProductUpdate,
  RoleCreate,
  RoleOut,
  SaleCreate,
  SaleOut,
  SalesSummaryItem,
  SetupStatusResponse,
  SupplierAnalyticsResponse,
  SupplierCreate,
  SupplierDetailAnalytics,
  SupplierOut,
  SupplierPaginationOut,
  SupplierUpdate,
  SalePaginationOut,
  TestConnectionResponse,
  TopWeekOut,
  UserCreate,
  UserOut,
  UserUpdate,
} from "@/types/api";
import { normalizeDecimals } from "@/lib/normalizeDecimals";

const API_BASE = "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err.detail === "string" ? err.detail
      : err.detail?.[0]?.msg ? err.detail[0].msg
      : err.error || err.message || "Error en la petición";
    if (res.status === 401 && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json();
  return normalizeDecimals(data) as T;
}

export const api = {
  getSetupStatus: () =>
    request<SetupStatusResponse>("/auth/setup-status"),

  setupAdmin: (data: {
    username: string;
    email: string;
    password: string;
    nombre_completo: string;
  }) =>
    request<UserOut>("/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        rol_id: 1,
      }),
    }),

  login: (username: string, password: string) =>
    request<UserOut>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  me: () =>
    request<UserOut>("/auth/me"),

  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),

  // ── Usuarios ──
  getUsers: () =>
    request<UserOut[]>("/users"),

  getUser: (id: number) =>
    request<UserOut>(`/users/${id}`),

  createUser: (data: UserCreate) =>
    request<UserOut>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateUser: (id: number, data: UserUpdate) =>
    request<UserOut>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  toggleUserActive: (id: number) =>
    request<UserOut>(`/users/${id}/toggle-active`, { method: "PATCH" }),

  deleteUser: (id: number) =>
    request<void>(`/users/${id}`, { method: "DELETE" }),

  // ── Roles ──
  getRoles: () =>
    request<RoleOut[]>("/roles"),

  getRole: (id: number) =>
    request<RoleOut>(`/roles/${id}`),

  createRole: (data: RoleCreate) =>
    request<RoleOut>("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRole: (id: number, data: RoleCreate) =>
    request<RoleOut>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteRole: (id: number) =>
    request<void>(`/roles/${id}`, { method: "DELETE" }),

  // ── Categorías ──
  getCategories: () =>
    request<CategoryOut[]>("/categories"),

  getCategoriesPaginated: (params: { page: number; page_size: number; search?: string }) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("page_size", String(params.page_size));
    if (params.search) qs.set("search", params.search);
    return request<CategoryPaginationOut>(`/categories?${qs.toString()}`);
  },

  getCategory: (id: number) =>
    request<CategoryOut>(`/categories/${id}`),

  createCategory: (data: CategoryCreate) =>
    request<CategoryOut>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCategory: (id: number, data: CategoryUpdate) =>
    request<CategoryOut>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: number) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),

  // ── Proveedores ──
  getSuppliers: (params?: { search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    const q = qs.toString();
    return request<SupplierOut[]>(`/suppliers${q ? `?${q}` : ""}`);
  },

  getSuppliersPaginated: (params: { page: number; page_size: number }) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("page_size", String(params.page_size));
    return request<SupplierPaginationOut>(`/suppliers?${qs.toString()}`);
  },

  getSupplier: (id: number) =>
    request<SupplierOut>(`/suppliers/${id}`),

  createSupplier: (data: SupplierCreate) =>
    request<SupplierOut>("/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSupplier: (id: number, data: SupplierUpdate) =>
    request<SupplierOut>(`/suppliers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteSupplier: (id: number) =>
    request<void>(`/suppliers/${id}`, { method: "DELETE" }),

  // ── Métodos de Pago ──
  getPaymentMethods: (soloActivos = false) =>
    request<PaymentMethodOut[]>(`/payment-methods?solo_activos=${soloActivos}`),

  getPaymentMethod: (id: number) =>
    request<PaymentMethodOut>(`/payment-methods/${id}`),

  createPaymentMethod: (data: PaymentMethodCreate) =>
    request<PaymentMethodOut>("/payment-methods", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePaymentMethod: (id: number, data: PaymentMethodUpdate) =>
    request<PaymentMethodOut>(`/payment-methods/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePaymentMethod: (id: number) =>
    request<void>(`/payment-methods/${id}`, { method: "DELETE" }),

  // ── Reglas de Precio (Divisas) ──
  getPriceRules: (params?: { activo?: boolean }) => {
    const qs = params?.activo !== undefined ? `?activo=${params.activo}` : "";
    return request<PriceRuleOut[]>(`/price-rules${qs}`);
  },

  getPriceRule: (id: number) =>
    request<PriceRuleOut>(`/price-rules/${id}`),

  createPriceRule: (data: PriceRuleCreate) =>
    request<PriceRuleOut>("/price-rules", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePriceRule: (id: number, data: PriceRuleUpdate) =>
    request<PriceRuleOut>(`/price-rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePriceRule: (id: number) =>
    request<void>(`/price-rules/${id}`, { method: "DELETE" }),

  // ── Combos ──
  getActiveCombos: () =>
    request<ComboActiveOut[]>("/combos/active"),

  getCombos: (params?: { activo?: boolean }) => {
    const qs = params?.activo !== undefined ? `?activo=${params.activo}` : "";
    return request<ComboOut[]>(`/combos${qs}`);
  },

  getCombo: (id: number) =>
    request<ComboOut>(`/combos/${id}`),

  createCombo: (data: ComboCreate) =>
    request<ComboOut>("/combos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCombo: (id: number, data: ComboUpdate) =>
    request<ComboOut>(`/combos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCombo: (id: number) =>
    request<void>(`/combos/${id}`, { method: "DELETE" }),

  // ── Tasas de Cambio ──
  getLatestRates: () =>
    request<ExchangeRatesResponse>("/exchange-rates/latest"),

  getBcvRates: () =>
    request<ExchangeRatesResponse>("/exchange-rates/bcv"),

  getRateHistory: (params?: { days?: number }) => {
    const qs = params?.days ? `?days=${params.days}` : "";
    return request<{ history: ExchangeRateOut[] }>(`/exchange-rates/history${qs}`);
  },

  getRateHistoryPaginated: (params: { page: number; page_size: number }) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("page_size", String(params.page_size));
    return request<ExchangeRatePaginationOut>(`/exchange-rates/history?${qs.toString()}`);
  },

  saveBulkRates: (data: { usd: string; eur: string }) =>
    request<ExchangeRateOut>("/exchange-rates/save-rates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getDailyStatus: () =>
    request<DailyStatusResponse>("/exchange-rates/daily-status"),

  // ── Productos ──
  getProducts: (params?: {
    categoria_ids?: number[];
    proveedor_id?: number;
    precio_min?: number;
    precio_max?: number;
    sin_stock?: boolean;
    search?: string;
    stock_status?: "disponible" | "bajo" | "agotado";
    sort_by?: "nombre" | "stock" | "precio" | "margen";
    order?: "asc" | "desc";
    tipo_iva?: "GRAVADO" | "EXENTO";
    es_favorito?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.categoria_ids?.length) {
      params.categoria_ids.forEach((id) => qs.append("categoria_ids", String(id)));
    }
    if (params?.proveedor_id) qs.set("proveedor_id", String(params.proveedor_id));
    if (params?.precio_min) qs.set("precio_min", String(params.precio_min));
    if (params?.precio_max) qs.set("precio_max", String(params.precio_max));
    if (params?.sin_stock) qs.set("sin_stock", "true");
    if (params?.search) qs.set("search", params.search);
    if (params?.stock_status) qs.set("stock_status", params.stock_status);
    if (params?.sort_by) qs.set("sort_by", params.sort_by);
    if (params?.order) qs.set("order", params.order);
    if (params?.tipo_iva) qs.set("tipo_iva", params.tipo_iva);
    if (params?.es_favorito !== undefined) qs.set("es_favorito", String(params.es_favorito));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return request<ProductPaginationOut>(`/products${q ? `?${q}` : ""}`);
  },

  getProduct: (id: number) =>
    request<ProductOut>(`/products/${id}`),

  createProduct: (data: ProductCreate) =>
    request<ProductOut>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id: number, data: ProductUpdate) =>
    request<ProductOut>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: number) =>
    request<void>(`/products/${id}`, { method: "DELETE" }),

  getFavoriteProducts: (limit = 10) =>
    request<ProductPaginationOut>(`/products/favorites?limit=${limit}`),

  toggleProductFavorite: (id: number) =>
    request<ProductOut>(`/products/${id}/toggle-favorite`, { method: "PATCH" }),

  // ── Ventas ──
  getSales: (params?: { fecha_desde?: string; fecha_hasta?: string; metodo_pago_ids?: number[]; hora_desde?: string; hora_hasta?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.fecha_desde) qs.set("fecha_desde", params.fecha_desde);
    if (params?.fecha_hasta) qs.set("fecha_hasta", params.fecha_hasta);
    if (params?.metodo_pago_ids && params.metodo_pago_ids.length > 0) qs.set("metodo_pago_ids", params.metodo_pago_ids.join(","));
    if (params?.hora_desde) qs.set("hora_desde", params.hora_desde);
    if (params?.hora_hasta) qs.set("hora_hasta", params.hora_hasta);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return request<SaleOut[]>(`/sales${q ? `?${q}` : ""}`);
  },

  getSalesPaginated: (params: { fecha_desde?: string; fecha_hasta?: string; metodo_pago_ids?: number[]; hora_desde?: string; hora_hasta?: string; page: number; page_size: number }) => {
    const qs = new URLSearchParams();
    if (params.fecha_desde) qs.set("fecha_desde", params.fecha_desde);
    if (params.fecha_hasta) qs.set("fecha_hasta", params.fecha_hasta);
    if (params.metodo_pago_ids && params.metodo_pago_ids.length > 0) qs.set("metodo_pago_ids", params.metodo_pago_ids.join(","));
    if (params.hora_desde) qs.set("hora_desde", params.hora_desde);
    if (params.hora_hasta) qs.set("hora_hasta", params.hora_hasta);
    qs.set("page", String(params.page));
    qs.set("page_size", String(params.page_size));
    return request<SalePaginationOut>(`/sales?${qs.toString()}`);
  },

  getSale: (id: number) =>
    request<SaleOut>(`/sales/${id}`),

  createSale: (data: SaleCreate) =>
    request<SaleOut>("/sales", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  calculateSale: (data: CalculateRequest) =>
    request<CalculateResponse>("/sales/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getSalesSummary: (params?: { rango?: string; fecha_desde?: string; fecha_hasta?: string }) => {
    const qs = new URLSearchParams();
    if (params?.rango) qs.set("rango", params.rango);
    if (params?.fecha_desde) qs.set("fecha_desde", params.fecha_desde);
    if (params?.fecha_hasta) qs.set("fecha_hasta", params.fecha_hasta);
    const q = qs.toString();
    return request<SalesSummaryItem[]>(`/sales/summary${q ? `?${q}` : ""}`);
  },

  getTopWeek: (rango?: string) => {
    const qs = rango ? `?rango=${encodeURIComponent(rango)}` : "";
    return request<TopWeekOut>(`/sales/top-week${qs}`);
  },

  // ── Analytics ──
  getCategoryAnalytics: () =>
    request<CategoryAnalyticsResponse>("/categories/analytics"),

  getCategoryDetailAnalytics: (categoryId: number) =>
    request<CategoryDetailAnalytics>(`/categories/${categoryId}/analytics`),

  getSupplierAnalytics: () =>
    request<SupplierAnalyticsResponse>("/suppliers/analytics"),

  getSupplierDetailAnalytics: (supplierId: number) =>
    request<SupplierDetailAnalytics>(`/suppliers/${supplierId}/analytics`),

  getTopSellingProducts: (limit = 5) =>
    request<{ producto: ProductOut; total_vendido: number }[]>(
      `/products/top-selling?limit=${limit}`,
    ),

  getProductsMatrix: (params: { fecha_desde?: string; fecha_hasta?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.fecha_desde) qs.set("fecha_desde", params.fecha_desde);
    if (params.fecha_hasta) qs.set("fecha_hasta", params.fecha_hasta);
    if (params.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return request<ProductMatrixItem[]>(`/reports/products-matrix${q ? `?${q}` : ""}`);
  },

  getPaymentMethodSummary: (params?: { fecha_desde?: string; fecha_hasta?: string }) => {
    const qs = new URLSearchParams();
    if (params?.fecha_desde) qs.set("fecha_desde", params.fecha_desde);
    if (params?.fecha_hasta) qs.set("fecha_hasta", params.fecha_hasta);
    const q = qs.toString();
    return request<PaymentMethodSummaryItem[]>(`/reports/payment-methods${q ? `?${q}` : ""}`);
  },

  getTopMarginProducts: (limit = 5) =>
    request<ProductOut[]>(`/products/top-margin?limit=${limit}`),

  getLowestMarginProducts: (limit = 5) =>
    request<ProductOut[]>(`/products/lowest-margin?limit=${limit}`),

  getLowRotationProducts: (limit = 5) =>
    request<{ producto: ProductOut; total_vendido: number }[]>(
      `/products/low-rotation?limit=${limit}`,
    ),

  getTopSellingCategories: (limit = 5) =>
    request<{ categoria: CategoryOut; total_vendido: number }[]>(
      `/categories/top-selling?limit=${limit}`,
    ),

  getLowRotationCategories: (limit = 5) =>
    request<{ categoria: CategoryOut; total_vendido: number }[]>(
      `/categories/low-rotation?limit=${limit}`,
    ),

  // ── Facturas ──
  getInvoices: (params?: {
    proveedor_id?: number;
    tipo_documento?: string;
    estado_pago?: string;
    search?: string;
    sort_by?: string;
    page?: number;
    page_size?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.proveedor_id) qs.set("proveedor_id", String(params.proveedor_id));
    if (params?.tipo_documento) qs.set("tipo_documento", params.tipo_documento);
    if (params?.estado_pago) qs.set("estado_pago", params.estado_pago);
    if (params?.search) qs.set("search", params.search);
    if (params?.sort_by) qs.set("sort_by", params.sort_by);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return request<FacturaPaginationOut>(`/invoices${q ? `?${q}` : ""}`);
  },

  getInvoice: (id: number) =>
    request<FacturaOut>(`/invoices/${id}`),

  getInvoiceStats: () =>
    request<InvoiceStatsOut>("/invoices/stats"),

  getInvoicePendingSummary: () =>
    request<InvoicePendingSummaryOut>("/invoices/pending-summary"),

  getTopSuppliers: () =>
    request<TopSupplier[]>("/invoices/top-suppliers"),

  createInvoice: (
    data: FacturaCreate,
    image?: File,
    options?: { procesada_por_ia?: boolean; raw_json_ia?: Record<string, unknown> },
  ) => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (image) formData.append("image", image);
    if (options?.procesada_por_ia) formData.append("procesada_por_ia", "true");
    if (options?.raw_json_ia) formData.append("raw_json_ia", JSON.stringify(options.raw_json_ia));

    return request<FacturaOut>("/invoices", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

  analyzeInvoice: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    return request<InvoiceAnalysisOut>("/invoices/analyze", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

  getInvoiceImageUrl: (id: number) =>
    `${API_BASE}/invoices/${id}/image`,

  downloadInvoiceImage: async (id: number): Promise<string> => {
    const res = await fetch(`${API_BASE}/invoices/${id}/image`, {
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error("Error al descargar la imagen");
    }
    const blob = await res.blob();
    const ext = (res.headers.get("Content-Type") || "").includes("png")
      ? "png"
      : "jpg";
    const filename = `factura_${id}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return filename;
  },

  // ── Pagos de Factura ──
  registerInvoicePayment: (
    invoiceId: number,
    data: InvoicePaymentCreate,
    comprobantes?: File[],
  ) => {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (comprobantes) {
      comprobantes.forEach((f) => formData.append("comprobantes", f));
    }
    return request<InvoicePaymentOut>(`/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

  getInvoicePayments: (invoiceId: number) =>
    request<{ pagos: InvoicePaymentOut[]; resumen: InvoicePaymentSummary }>(
      `/invoices/${invoiceId}/payments`,
    ),

  deleteInvoicePayment: (invoiceId: number, paymentId: number) =>
    request<void>(`/invoices/${invoiceId}/payments/${paymentId}`, {
      method: "DELETE",
    }),

  getInvoicePaymentSummary: (invoiceId: number) =>
    request<InvoicePaymentSummary>(`/invoices/${invoiceId}/payments/summary`),

  getPaymentReceiptUrl: (invoiceId: number, paymentId: number, receiptId: number) =>
    `${API_BASE}/invoices/${invoiceId}/payments/${paymentId}/receipts/${receiptId}`,

  // ── System Settings ──
  getApiKeyStatus: (clave: string) =>
    request<ApiKeyStatusResponse>(`/settings/api-key/${clave}`),

  saveApiKey: (data: ApiKeyPayload) =>
    request<{ message: string }>("/settings/api-key", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteApiKey: (clave: string) =>
    request<{ message: string }>(`/settings/api-key/${clave}`, {
      method: "DELETE",
    }),

  testGeminiConnection: (data: ApiKeyPayload) =>
    request<TestConnectionResponse>("/settings/api-key/test", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
