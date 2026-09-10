import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAnalyticsData } from "@/features/dashboard/hooks/useAnalyticsData";

// ── Estado inicial ────────────────────────────────────────────────────────────

describe("useAnalyticsData - estado inicial", () => {
  it("immediate=true (default): arranca en loading=true, data=null, error=null", () => {
    const fetcher = vi.fn(() => new Promise(() => {}));
    const { result } = renderHook(() => useAnalyticsData(fetcher));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("immediate=false: arranca en loading=false sin llamar al fetcher", () => {
    const fetcher = vi.fn(() => Promise.resolve({ ok: true }));
    const { result } = renderHook(() =>
      useAnalyticsData(fetcher, { immediate: false }),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

// ── Éxito ─────────────────────────────────────────────────────────────────────

describe("useAnalyticsData - respuesta exitosa", () => {
  it("llama al fetcher exactamente una vez al montar", async () => {
    const payload = { total: 42, items: [] };
    const fetcher = vi.fn().mockResolvedValue(payload);
    const { result } = renderHook(() => useAnalyticsData(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(payload);
    expect(result.current.error).toBeNull();
  });

  it("acepta cualquier forma de datos (array, objeto, número)", async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const { result } = renderHook(() => useAnalyticsData(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
  });

  it("expone refetch como función", async () => {
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    const { result } = renderHook(() => useAnalyticsData(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });
});

// ── Error ─────────────────────────────────────────────────────────────────────

describe("useAnalyticsData - manejo de errores", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("captura Error nativo y lo guarda en error string", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Fallo de red"));
    const { result } = renderHook(() => useAnalyticsData(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Fallo de red");
    expect(result.current.data).toBeNull();
  });

  it("captura string thrown y usa el mensaje genérico", async () => {
    const fetcher = vi.fn().mockRejectedValue("error crudo");
    const { result } = renderHook(() => useAnalyticsData(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Error al cargar datos");
    expect(result.current.data).toBeNull();
  });

  it("captura error 401 del api real (Error con mensaje)", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("No autorizado"));
    const { result } = renderHook(() => useAnalyticsData(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("No autorizado");
  });
});

// ── refetch ───────────────────────────────────────────────────────────────────

describe("useAnalyticsData - refetch manual", () => {
  it("refetch vuelve a poner loading=true y llama al fetcher de nuevo", async () => {
    let call = 0;
    const fetcher = vi.fn(async () => {
      call++;
      return { call };
    });

    const { result } = renderHook(() => useAnalyticsData(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ call: 1 });

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual({ call: 2 }));

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("refetch tras error limpia el error anterior", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fallo"))
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useAnalyticsData(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Fallo");

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));

    expect(result.current.error).toBeNull();
  });

  it("immediate=false: refetch manual ejecuta el fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue({ on_demand: true });
    const { result } = renderHook(() =>
      useAnalyticsData(fetcher, { immediate: false }),
    );

    expect(fetcher).not.toHaveBeenCalled();

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual({ on_demand: true }));

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

// ── useCategoryAnalytics (integración con api mock) ───────────────────────────

describe("useCategoryAnalytics - integración", () => {
  it("llama a api.getCategoryAnalytics y expone los datos", async () => {
    const mockApi = await import("@/services/api");
    const payload = {
      total_categorias: 5,
      total_productos: 50,
      stock_total: 200,
      margen_promedio_general: 25.5,
      unidades_vendidas: 1000,
      ingresos_usd: 5000,
      categorias: [
        {
          id: 1,
          nombre: "Licores",
          descripcion: null,
          total_productos: 10,
          stock_total: 40,
          margen_promedio: 30,
          unidades_vendidas: 200,
          ingresos_usd: 2000,
        },
      ],
    };

    vi.spyOn(mockApi.api, "getCategoryAnalytics").mockResolvedValueOnce(payload);

    const { useCategoryAnalytics } = await import(
      "@/features/categories/hooks/useCategoryAnalytics"
    );
    const { result } = renderHook(() => useCategoryAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(payload);
    expect(result.current.error).toBeNull();
    expect(mockApi.api.getCategoryAnalytics).toHaveBeenCalledTimes(1);
  });
});

// ── useCategoryDetailAnalytics ────────────────────────────────────────────────

describe("useCategoryDetailAnalytics", () => {
  it("categoryId=null: NO llama al fetcher (immediate=false)", async () => {
    const mockApi = await import("@/services/api");
    vi.spyOn(mockApi.api, "getCategoryDetailAnalytics").mockResolvedValue({} as never);

    const { useCategoryDetailAnalytics } = await import(
      "@/features/categories/hooks/useCategoryDetailAnalytics"
    );
    const { result } = renderHook(() => useCategoryDetailAnalytics(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(mockApi.api.getCategoryDetailAnalytics).not.toHaveBeenCalled();
  });

  it("categoryId=5: llama al fetcher con ese id y retorna datos", async () => {
    const mockApi = await import("@/services/api");
    const detail = {
      id: 5,
      nombre: "Vinos",
      descripcion: null,
      total_productos: 8,
      stock_total: 32,
      margen_promedio: 22,
      unidades_vendidas: 80,
      ingresos_usd: 800,
      top_productos: [],
      ventas_por_dia: [],
    };

    vi.spyOn(mockApi.api, "getCategoryDetailAnalytics").mockResolvedValueOnce(
      detail as never,
    );

    const { useCategoryDetailAnalytics } = await import(
      "@/features/categories/hooks/useCategoryDetailAnalytics"
    );
    const { result } = renderHook(() => useCategoryDetailAnalytics(5));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApi.api.getCategoryDetailAnalytics).toHaveBeenCalledWith(5);
    expect(result.current.data).toEqual(detail);
  });

  it("error de API queda en result.error", async () => {
    const mockApi = await import("@/services/api");
    vi.spyOn(mockApi.api, "getCategoryDetailAnalytics").mockRejectedValueOnce(
      new Error("404 no encontrado"),
    );

    const { useCategoryDetailAnalytics } = await import(
      "@/features/categories/hooks/useCategoryDetailAnalytics"
    );
    const { result } = renderHook(() => useCategoryDetailAnalytics(99));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("404 no encontrado");
    expect(result.current.data).toBeNull();
  });
});
