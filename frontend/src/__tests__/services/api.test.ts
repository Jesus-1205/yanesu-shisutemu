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
    const result = await api.deleteRole(1);
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

  it("deleteRole sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(mock204());
    await api.deleteRole(3);
    expect(mockFetch).toHaveBeenCalledWith("/api/roles/3", expect.objectContaining({ method: "DELETE" }));
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