import { api } from "@/services/api";
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { usePriceRules } from "@/features/price-rules/hooks/usePriceRules";
import type { PriceRuleOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getPriceRules: vi.fn(),
    deletePriceRule: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockRules: PriceRuleOut[] = [
  {
    id: 1,
    nombre: "Regla 1",
    descripcion: "Desc 1",
    activo: true,
    products: [],
    payment_methods: [],
  },
  {
    id: 2,
    nombre: "Regla 2",
    descripcion: "Desc 2",
    activo: false,
    products: [],
    payment_methods: [],
  },
];

describe("usePriceRules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga reglas de precio y calcula activeRulesCount", async () => {
    mockApi.getPriceRules.mockResolvedValueOnce(mockRules);

    const { result } = renderHook(() => usePriceRules());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rules).toEqual(mockRules);
    expect(result.current.activeRulesCount).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("maneja error de carga", async () => {
    mockApi.getPriceRules.mockRejectedValueOnce(new Error("Error de red"));

    const { result } = renderHook(() => usePriceRules());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Error de red");
    expect(result.current.rules).toEqual([]);
  });

  it("elimina una regla de precio correctamente", async () => {
    mockApi.getPriceRules.mockResolvedValue(mockRules);
    mockApi.deletePriceRule.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePriceRules());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteRule(1);
    });

    expect(success).toBe(true);
    expect(mockApi.deletePriceRule).toHaveBeenCalledWith(1);
    expect(mockToast).toHaveBeenCalledWith("Regla de precio eliminada", "success");
  });

  it("maneja fallo al eliminar regla de precio", async () => {
    mockApi.getPriceRules.mockResolvedValue(mockRules);
    mockApi.deletePriceRule.mockRejectedValueOnce(new Error("No se pudo eliminar"));

    const { result } = renderHook(() => usePriceRules());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success = true;
    await act(async () => {
      success = await result.current.deleteRule(1);
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith("No se pudo eliminar", "error");
  });
});
