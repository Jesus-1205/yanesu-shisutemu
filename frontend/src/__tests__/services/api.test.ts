import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../../services/api";

const mockFetch = vi.fn();
window.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: { href: "http://localhost/login", pathname: "/login" },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockResponse(data: unknown, status = 200, statusText = "OK") {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(data),
  } as Response);
}

function mock204() {
  return Promise.resolve({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
  } as Response);
}

describe("api - core request", () => {
  it("calls fetch with correct URL and headers", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 1 }));
    await api.me();
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/me", {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("parses error detail string", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ detail: "Usuario inactivo" }, 401),
    );
    await expect(api.me()).rejects.toThrow("Usuario inactivo");
  });

  it("parses error detail array (Pydantic style)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ detail: [{ msg: "field required" }] }, 422),
    );
    await expect(api.me()).rejects.toThrow("field required");
  });

  it("falls back to error or message fields", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: "Server error" }, 400),
    );
    await expect(api.me()).rejects.toThrow("Server error");

    mockFetch.mockResolvedValueOnce(
      mockResponse({ message: "Not found" }, 404),
    );
    await expect(api.me()).rejects.toThrow("Not found");
  });

  it("returns undefined for 204", async () => {
    mockFetch.mockResolvedValueOnce(mock204());
    const result = await api.deleteUser(1);
    expect(result).toBeUndefined();
  });
});

describe("api - auth endpoints", () => {
  it("login sends POST with credentials", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 1, username: "admin" }));
    const user = await api.login("admin", "secret");
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "secret" }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    expect(user.username).toBe("admin");
  });

  it("logout sends POST", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: "ok" }));
    const res = await api.logout();
    expect(res.message).toBe("ok");
  });
});

describe("api - CRUD endpoints", () => {
  it("getUsers fetches array", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ id: 1 }]));
    const users = await api.getUsers();
    expect(users).toHaveLength(1);
  });

  it("getUser fetches single by id", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 5 }));
    const user = await api.getUser(5);
    expect(user.id).toBe(5);
    expect(mockFetch).toHaveBeenCalledWith("/api/users/5", expect.anything());
  });

  it("createUser sends POST with body", async () => {
    const data = { username: "new", password: "pass", email: "a@b.com", nombre_completo: "New User", rol_id: 1 };
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 2, ...data }));
    const result = await api.createUser(data);
    expect(result.id).toBe(2);
    expect(mockFetch).toHaveBeenCalledWith("/api/users", expect.objectContaining({ method: "POST" }));
  });

  it("updateUser sends PUT", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 1 }));
    await api.updateUser(1, { email: "new@b.com" });
    expect(mockFetch).toHaveBeenCalledWith("/api/users/1", expect.objectContaining({ method: "PUT" }));
  });

  it("getRoles sends GET", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([{ id: 1, nombre: "ADMINISTRADOR" }]));
    const result = await api.getRoles();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/roles", expect.any(Object));
  });
});

describe("api - query params", () => {
  it("getProducts builds query string", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ items: [], total: 0 }));
    await api.getProducts({
      search: "whisky",
      categoria_ids: [1, 2],
      proveedor_id: 5,
      precio_min: 10,
      precio_max: 100,
      page: 2,
      page_size: 20,
    });
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("search=whisky");
    expect(url).toContain("categoria_ids=1&categoria_ids=2");
    expect(url).toContain("proveedor_id=5");
    expect(url).toContain("precio_min=10");
    expect(url).toContain("precio_max=100");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=20");
  });

  it("getSales builds query string", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]));
    await api.getSales({ fecha_desde: "2025-01-01", fecha_hasta: "2025-01-31", limit: 50 });
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("fecha_desde=2025-01-01");
    expect(url).toContain("fecha_hasta=2025-01-31");
    expect(url).toContain("limit=50");
  });
});

describe("api - decimal normalization", () => {
  it("converts decimal-string fields to numbers at the API boundary", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        id: 1,
        total_usd: "23.20",
        monto_iva_usd: "3.20",
        items: [{ precio_unitario_usd: "10.50", subtotal_usd: "21.00" }],
        observaciones: null,
      }),
    );
    const result = await api.getSale(1);
    expect(result.total_usd).toBe(23.2);
    expect(result.monto_iva_usd).toBe(3.2);
    expect(result.items[0].precio_unitario_usd).toBe(10.5);
    expect(result.items[0].subtotal_usd).toBe(21);
    expect(result.observaciones).toBeNull();
  });
});

describe("api - invoice with FormData", () => {
  it("createInvoice sends FormData when image provided", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 1 }));
    const data = { proveedor_id: 1, numero_factura: "F001", fecha: "2025-01-01", detalles: [], moneda: "USD", monto_total_usd: 100, moneda_principal: "USD" as const, tasa_bs: 45.5 };
    const file = new File(["dummy"], "invoice.jpg", { type: "image/jpeg" });
    const result = await api.createInvoice(data, file);
    expect(result.id).toBe(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe("/api/invoices");
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].body).toBeInstanceOf(FormData);
    expect(callArgs[1].headers).toEqual({});
  });
});

describe("api - exchange rates & BCV", () => {
  it("getBcvRates sends GET request for BCV rates", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ rates: { USD: "45.5" }, fecha_ultima_actualizacion: "2025-01-15" }),
    );
    const result = await api.getBcvRates();
    expect(result.rates.USD).toBe("45.5");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exchange-rates/bcv",
      expect.anything(),
    );
  });

  it("getLatestRates fetches current active rates", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ rates: { USD: "45.0", EUR: "48.0" } }),
    );
    const rates = await api.getLatestRates();
    expect(rates.rates.USD).toBe("45.0");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exchange-rates/latest",
      expect.anything(),
    );
  });

  it("saveBulkRates sends POST with updated rate payload", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ id: 2, tasa_usd: 46.2, tasa_eur: 48.0 }),
    );
    const result = await api.saveBulkRates({ usd: "46.2", eur: "48.0" });
    expect(result.tasa_usd).toBe(46.2);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/exchange-rates/save-rates",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ usd: "46.2", eur: "48.0" }),
      }),
    );
  });
});

describe("api - retornables endpoints", () => {
  it("getRetornableResumen fetches summary", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        ultimo_reporte_fecha: "2025-01-15",
        ultimo_reporte_realizado_por: "Admin",
        presentaciones: [],
      }),
    );
    const result = await api.getRetornableResumen();
    expect(result.ultimo_reporte_realizado_por).toBe("Admin");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/retornable/resumen",
      expect.anything(),
    );
  });

  it("asociarRetornableProducto sends POST with payload", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ detail: "Asociado", id: 1 }),
    );
    const result = await api.asociarRetornableProducto({
      producto_id: 10,
      presentacion: "222",
    });
    expect(result.detail).toBe("Asociado");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/retornable/productos",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("desasociarRetornableProducto sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(mock204());
    const result = await api.desasociarRetornableProducto(5);
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/retornable/productos/5",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("api - combos & price rules", () => {
  it("getCombos fetches combos list", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse([{ id: 1, nombre: "Combo Fiesta", precio_combo_usd: 25.0 }]),
    );
    const combos = await api.getCombos();
    expect(combos).toHaveLength(1);
    expect(combos[0].nombre).toBe("Combo Fiesta");
  });

  it("getPriceRules fetches price rules list", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse([{ id: 1, nombre: "Descuento 10%", porcentaje_ajuste: 10 }]),
    );
    const rules = await api.getPriceRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].nombre).toBe("Descuento 10%");
  });

  it("createPriceRule sends POST with payload", async () => {
    const payload = {
      nombre: "Promo Verano",
      tipo_regla: "DESCUENTO" as const,
      porcentaje_ajuste: 15,
      es_general: true,
      tipo_alcance: "GLOBAL" as const,
      productos: [],
      metodo_pago_ids: [],
    };
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 2, ...payload }));
    const result = await api.createPriceRule(payload);
    expect(result.id).toBe(2);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/price-rules",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("api - system & setup", () => {
  it("getSetupStatus fetches setup status", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ needs_setup: false }));
    const result = await api.getSetupStatus();
    expect(result.needs_setup).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/setup-status",
      expect.anything(),
    );
  });

  it("setupAdmin sends POST with admin initial data", async () => {
    const adminData = {
      username: "admin",
      password: "password123",
      email: "admin@test.com",
      nombre_completo: "Super Admin",
    };
    mockFetch.mockResolvedValueOnce(
      mockResponse({ id: 1, username: "admin" }),
    );
    const result = await api.setupAdmin(adminData);
    expect(result.username).toBe("admin");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/setup",
      expect.objectContaining({ method: "POST" }),
    );
  });
});