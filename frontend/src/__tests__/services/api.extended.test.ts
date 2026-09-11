import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../../services/api";

const mockFetch = vi.fn();
window.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: { href: "http://localhost/dashboard", pathname: "/dashboard" },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockOk(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob()),
  } as Response);
}

function mock204() {
  return Promise.resolve({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
  } as Response);
}

function mockError(data: unknown, status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

// ── Manejo de errores ─────────────────────────────────────────────────────────

describe("api - manejo de errores HTTP", () => {
  it("redirige a /login cuando recibe 401 y el pathname no es /login", async () => {
    mockFetch.mockResolvedValueOnce(mockError({ detail: "No autorizado" }, 401));
    await expect(api.me()).rejects.toThrow("No autorizado");
    expect(window.location.href).toBe("/login");
  });

  it("NO redirige cuando ya está en /login y recibe 401", async () => {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/login", pathname: "/login" },
      writable: true,
    });
    mockFetch.mockResolvedValueOnce(mockError({ detail: "Credenciales inválidas" }, 401));
    await expect(api.me()).rejects.toThrow("Credenciales inválidas");
    expect(window.location.href).toBe("http://localhost/login");
  });

  it("lanza 'Error en la petición' cuando el body de error está vacío", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("invalid json")),
    } as Response);
    await expect(api.me()).rejects.toThrow("Error en la petición");
  });

  it("lanza 403 con message del cuerpo", async () => {
    mockFetch.mockResolvedValueOnce(mockError({ message: "Forbidden" }, 403));
    await expect(api.getUsers()).rejects.toThrow("Forbidden");
  });
});

// ── Ventas ────────────────────────────────────────────────────────────────────

describe("api - ventas (createSale payload completo)", () => {
  it("envía el payload completo de una venta con IVA mixto", async () => {
    const payload = {
      items: [
        {
          producto_id: 1,
          cantidad: 2,
          precio_unitario_usd: 15,
          tipo_empaque: "UNIDAD" as const,
          unidades_descontadas: 2,
          tipo_iva: "GRAVADO" as const,
          iva_porcentaje: 16,
          usaPrecioDivisas: false,
        },
        {
          producto_id: 2,
          cantidad: 1,
          precio_unitario_usd: 5,
          tipo_empaque: "UNIDAD" as const,
          unidades_descontadas: 1,
          tipo_iva: "EXENTO" as const,
          iva_porcentaje: 0,
          usaPrecioDivisas: false,
        },
      ],
      metodo_pago_id: 1,
      monto_pagado_usd: 40.8,
      tasa_bcv: 45.5,
      observaciones: "Venta de prueba",
      combos: [],
    };

    mockFetch.mockResolvedValueOnce(mockOk({ id: 99, total_usd: "40.80" }));
    const result = await api.createSale(payload as unknown as Parameters<typeof api.createSale>[0]);

    expect(result.id).toBe(99);
    expect(result.total_usd).toBe(40.8);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe("/api/sales");
    expect(callArgs[1].method).toBe("POST");
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.items).toHaveLength(2);
    expect(body.monto_pagado_usd).toBe(40.8);
    expect(body.tasa_bcv).toBe(45.5);
  });

  it("calculateSale construye URL y payload correctos", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOk({ items: [], combo_items: [], total_usd: "0.00" }),
    );
    await api.calculateSale({
      items: [{ producto_id: 1, cantidad: 1, tipo_empaque: "UNIDAD", usa_precio_divisas: false }],
      combos: [],
      metodo_pago_ids: [1],
    });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/sales/calculate");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string);
    expect(body.items[0].producto_id).toBe(1);
  });

  it("getSalesPaginated construye query con todos los filtros", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getSalesPaginated({
      fecha_desde: "2025-01-01",
      fecha_hasta: "2025-01-31",
      metodo_pago_ids: [2, 3],
      hora_desde: "08:00",
      hora_hasta: "18:00",
      page: 2,
      page_size: 10,
    });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("fecha_desde=2025-01-01");
    expect(url).toContain("fecha_hasta=2025-01-31");
    expect(url).toContain("metodo_pago_ids=2%2C3");
    expect(url).toContain("hora_desde=08%3A00");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=10");
  });

  it("getTopWeek pasa rango codificado en la URL", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ top: [] }));
    await api.getTopWeek("esta semana");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("rango=esta%20semana");
  });

  it("getSalesSummary sin parámetros no añade query string", async () => {
    mockFetch.mockResolvedValueOnce(mockOk([]));
    await api.getSalesSummary();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/sales/summary");
  });
});

// ── Facturas ──────────────────────────────────────────────────────────────────

describe("api - facturas", () => {
  it("getInvoices construye query completa con todos los filtros", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getInvoices({
      proveedor_id: 3,
      tipo_documento: "FACTURA",
      estado_pago: "PENDIENTE",
      search: "F-001",
      sort_by: "fecha",
      fecha_desde: "2025-01-01",
      fecha_hasta: "2025-03-31",
      page: 1,
      page_size: 20,
    });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("proveedor_id=3");
    expect(url).toContain("tipo_documento=FACTURA");
    expect(url).toContain("estado_pago=PENDIENTE");
    expect(url).toContain("search=F-001");
    expect(url).toContain("sort_by=fecha");
    expect(url).toContain("fecha_desde=2025-01-01");
    expect(url).toContain("fecha_hasta=2025-03-31");
    expect(url).toContain("page=1");
    expect(url).toContain("page_size=20");
  });

  it("getInvoices sin parámetros no añade query string", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getInvoices();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/invoices");
  });

  it("createInvoice sin imagen no adjunta archivo pero sí el JSON de datos", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ id: 5 }));
    const data = {
      proveedor_id: 1,
      numero_factura: "F-002",
      fecha: "2025-02-01",
      detalles: [],
      moneda: "USD",
      monto_total_usd: 200,
      moneda_principal: "USD" as const,
      tasa_bs: 46.0,
    };
    await api.createInvoice(data);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].body).toBeInstanceOf(FormData);
    const fd = callArgs[1].body as FormData;
    const parsedData = JSON.parse(fd.get("data") as string);
    expect(parsedData.numero_factura).toBe("F-002");
    expect(fd.get("image")).toBeNull();
  });

  it("createInvoice con opciones de IA adjunta los flags correspondientes", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ id: 6 }));
    const data = {
      proveedor_id: 1,
      numero_factura: "F-003",
      fecha: "2025-03-01",
      detalles: [],
      moneda: "USD",
      monto_total_usd: 300,
      moneda_principal: "USD" as const,
      tasa_bs: 47.0,
    };
    const rawJson = { modelo: "gemini", confianza: 0.98 };
    await api.createInvoice(data, undefined, { procesada_por_ia: true, raw_json_ia: rawJson });
    const fd = mockFetch.mock.calls[0][1].body as FormData;
    expect(fd.get("procesada_por_ia")).toBe("true");
    expect(JSON.parse(fd.get("raw_json_ia") as string)).toEqual(rawJson);
  });

  it("registerInvoicePayment envía FormData con comprobantes", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ id: 10 }));
    const file = new File(["data"], "comp.jpg", { type: "image/jpeg" });
    await api.registerInvoicePayment(
      1,
      { metodo_pago_id: 2, monto_usd: 50, referencia: "REF-001" } as Parameters<typeof api.registerInvoicePayment>[1],
      [file],
    );
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe("/api/invoices/1/payments");
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].body).toBeInstanceOf(FormData);
  });

  it("getInvoiceImageUrl retorna URL sin hacer fetch", () => {
    const url = api.getInvoiceImageUrl(42);
    expect(url).toBe("/api/invoices/42/image");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("getPaymentReceiptUrl retorna URL sin hacer fetch", () => {
    const url = api.getPaymentReceiptUrl(1, 2, 3);
    expect(url).toBe("/api/invoices/1/payments/2/receipts/3");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("deleteInvoicePayment envía DELETE y retorna undefined (204)", async () => {
    mockFetch.mockResolvedValueOnce(mock204());
    const result = await api.deleteInvoicePayment(1, 5);
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/invoices/1/payments/5",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

// ── Productos ─────────────────────────────────────────────────────────────────

describe("api - productos", () => {
  it("getProducts sin parámetros no añade query string", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getProducts();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/products");
  });

  it("getProducts con sin_stock=true añade el flag", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getProducts({ sin_stock: true, stock_status: "agotado" });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("sin_stock=true");
    expect(url).toContain("stock_status=agotado");
  });

  it("toggleProductFavorite envía PATCH", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ id: 7, es_favorito: true }));
    const result = await api.toggleProductFavorite(7);
    expect(result.es_favorito).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/products/7/toggle-favorite",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("getFavoriteProducts pasa el límite en la URL", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getFavoriteProducts(5);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("limit=5");
  });
});

// ── Tasas de cambio ───────────────────────────────────────────────────────────

describe("api - tasas de cambio", () => {
  it("saveBulkRates envía strings (no números) para usd y eur", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ id: 1, usd: "46.00", eur: "50.00" }));
    await api.saveBulkRates({ usd: "46.00", eur: "50.00" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(typeof body.usd).toBe("string");
    expect(typeof body.eur).toBe("string");
  });

  it("getRateHistory sin parámetros no añade query string", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ history: [] }));
    await api.getRateHistory();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/exchange-rates/history");
  });

  it("getRateHistory con days incluye el parámetro", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ history: [] }));
    await api.getRateHistory({ days: 30 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("days=30");
  });
});

// ── Retornables ───────────────────────────────────────────────────────────────

describe("api - retornables", () => {
  it("getRetornableHistorico construye query con todos los filtros", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getRetornableHistorico(2, 15, {
      presentacion: "CAJA",
      tipo_movimiento: "SALIDA",
      fecha_desde: "2025-01-01",
      fecha_hasta: "2025-06-30",
    });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=15");
    expect(url).toContain("presentacion=CAJA");
    expect(url).toContain("tipo_movimiento=SALIDA");
    expect(url).toContain("fecha_desde=2025-01-01");
  });

  it("getRetornableHistorico sin filtros retorna URL base con paginación", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ items: [], total: 0 }));
    await api.getRetornableHistorico(1, 20);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/retornable/historico");
    expect(url).toContain("page=1");
    expect(url).not.toContain("presentacion");
  });

  it("confirmarRetornableReporte envía PUT", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ detail: "Confirmado" }));
    const result = await api.confirmarRetornableReporte(3);
    expect(result.detail).toBe("Confirmado");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/retornable/reportes/3/confirmar",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("desasociarRetornableProducto envía DELETE y retorna 204", async () => {
    mockFetch.mockResolvedValueOnce(mock204());
    const result = await api.desasociarRetornableProducto(8);
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/retornable/productos/8",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

describe("api - settings / api keys", () => {
  it("saveApiKey envía POST con clave y valor", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ message: "Guardado" }));
    const result = await api.saveApiKey({ clave: "GEMINI_API_KEY", valor: "abc123" });
    expect(result.message).toBe("Guardado");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.clave).toBe("GEMINI_API_KEY");
    expect(body.valor).toBe("abc123");
  });

  it("deleteApiKey envía DELETE a la URL correcta", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ message: "Eliminado" }));
    await api.deleteApiKey("GEMINI_API_KEY");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/settings/api-key/GEMINI_API_KEY",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("testGeminiConnection envía POST y retorna el resultado", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ success: true, message: "Conexión exitosa", models: [] }));
    const result = await api.testGeminiConnection({ clave: "GEMINI_API_KEY", valor: "abc123" });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/settings/api-key/test",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

// ── Normalización de decimales en respuestas complejas ────────────────────────

describe("api - normalización de decimales (responses complejas)", () => {
  it("normaliza campos monetarios anidados en una factura", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOk({
        id: 1,
        total_usd: "1500.75",
        saldo_pendiente_usd: "500.25",
        detalles: [
          { costo_unitario_usd: "10.50", subtotal_usd: "21.00", cantidad: 2 },
        ],
        total_pagado_usd: "1000.50",
      }),
    );
    const result = await api.getInvoice(1);
    expect(result.total_usd).toBe(1500.75);
    expect(result.saldo_pendiente_usd).toBe(500.25);
    expect(result.detalles[0].costo_unitario_usd).toBe(10.5);
    expect(result.total_pagado_usd).toBe(1000.5);
  });

  it("preserva fields de ExchangeRatesResponse (rates como objeto)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockOk({
        rates: { USD: "46.1500", EUR: "50.2300" },
        fecha_ultima_actualizacion: "2025-01-01T00:00:00",
      }),
    );
    const result = await api.getLatestRates();
    expect(result.rates.USD).toBe("46.1500");
    expect(result.rates.EUR).toBe("50.2300");
    expect(result.fecha_ultima_actualizacion).toBe("2025-01-01T00:00:00");
  });
});
