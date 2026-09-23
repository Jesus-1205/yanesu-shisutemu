import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComboForm } from "@/features/combos/hooks/useComboForm";
import { api } from "@/services/api";
import type { ComboOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getProducts: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useComboForm", () => {
  const mockCombo: ComboOut = {
    id: 1,
    nombre: "Combo Fiesta",
    descripcion: "Pack especial",
    precio_total_usd: 19.99,
    activo: true,
    metodo_pago_ids: [1, 2],
    groups: [
      {
        id: 10,
        nombre: "Licores",
        min_cantidad: 1,
        max_cantidad: 2,
        products: [
          { id: 101, producto_id: 5, producto_nombre: "Ron Cacique" },
        ],
      },
    ],
  };

  it("initializes with empty default values", () => {
    const { result } = renderHook(() => useComboForm());

    expect(result.current.formName).toBe("");
    expect(result.current.formDesc).toBe("");
    expect(result.current.formPrecio).toBe("");
    expect(result.current.formGroups).toEqual([]);
    expect(result.current.formMethodIds).toEqual([]);
  });

  it("populates state when resetForm is called with a combo", () => {
    const { result } = renderHook(() => useComboForm());

    act(() => {
      result.current.resetForm(mockCombo);
    });

    expect(result.current.formName).toBe("Combo Fiesta");
    expect(result.current.formDesc).toBe("Pack especial");
    expect(result.current.formPrecio).toBe("19.99");
    expect(result.current.formMethodIds).toEqual([1, 2]);
    expect(result.current.formGroups).toEqual([
      {
        nombre: "Licores",
        min_cantidad: 1,
        max_cantidad: 2,
        productos: [{ producto_id: 5, _nombre: "Ron Cacique" }],
      },
    ]);
  });

  it("clears state when resetForm is called with null", () => {
    const { result } = renderHook(() => useComboForm());

    act(() => {
      result.current.resetForm(mockCombo);
      result.current.resetForm(null);
    });

    expect(result.current.formName).toBe("");
    expect(result.current.formDesc).toBe("");
    expect(result.current.formPrecio).toBe("");
    expect(result.current.formGroups).toEqual([]);
    expect(result.current.formMethodIds).toEqual([]);
  });

  it("handles adding, updating, and removing groups", () => {
    const { result } = renderHook(() => useComboForm());

    act(() => {
      result.current.addGroup();
    });

    expect(result.current.formGroups).toHaveLength(1);
    expect(result.current.formGroups[0]).toEqual({
      nombre: "",
      min_cantidad: 0,
      max_cantidad: 8,
      productos: [],
    });

    act(() => {
      result.current.updateGroup(0, "nombre", "Refrescos");
      result.current.updateGroup(0, "min_cantidad", 2);
      result.current.updateGroup(0, "max_cantidad", 4);
    });

    expect(result.current.formGroups[0].nombre).toBe("Refrescos");
    expect(result.current.formGroups[0].min_cantidad).toBe(2);
    expect(result.current.formGroups[0].max_cantidad).toBe(4);

    act(() => {
      result.current.removeGroup(0);
    });

    expect(result.current.formGroups).toHaveLength(0);
  });

  it("handles adding, updating, and removing products within a group", () => {
    const { result } = renderHook(() => useComboForm());

    act(() => {
      result.current.addGroup();
      result.current.addProductToGroup(0);
    });

    expect(result.current.formGroups[0].productos).toEqual([{ producto_id: 0 }]);

    act(() => {
      result.current.updateProductInGroup(0, 0, 42);
    });

    expect(result.current.formGroups[0].productos[0].producto_id).toBe(42);

    act(() => {
      result.current.removeProductFromGroup(0, 0);
    });

    expect(result.current.formGroups[0].productos).toEqual([]);
  });

  it("toggles payment method IDs correctly", () => {
    const { result } = renderHook(() => useComboForm());

    act(() => {
      result.current.toggleMethod(1);
      result.current.toggleMethod(2);
    });

    expect(result.current.formMethodIds).toEqual([1, 2]);

    act(() => {
      result.current.toggleMethod(1);
    });

    expect(result.current.formMethodIds).toEqual([2]);
  });

  it("searches products successfully via api and maps options", async () => {
    (api.getProducts as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      items: [
        { id: 10, nombre: "Coca Cola 2L", codigo_barra: "75912345" },
        { id: 11, nombre: "Pepsi 2L", codigo_barra: null },
      ],
    });

    const { result } = renderHook(() => useComboForm());

    let options: unknown;
    await act(async () => {
      options = await result.current.handleProductSearch("cola");
    });

    expect(api.getProducts).toHaveBeenCalledWith({ search: "cola" });
    expect(options).toEqual([
      { value: 10, label: "Coca Cola 2L", subtitle: "75912345" },
      { value: 11, label: "Pepsi 2L", subtitle: undefined },
    ]);
  });

  it("catches api error during product search and returns empty array", async () => {
    (api.getProducts as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useComboForm());

    let options: unknown;
    await act(async () => {
      options = await result.current.handleProductSearch("error");
    });

    expect(options).toEqual([]);
  });

  describe("validateAndBuildPayload validations", () => {
    it("fails when required root fields are missing or invalid", () => {
      const { result } = renderHook(() => useComboForm());

      // Empty initial state
      expect(result.current.validateAndBuildPayload()).toEqual({ valid: false, payload: null });

      // Missing name
      act(() => {
        result.current.setFormPrecio("10");
        result.current.toggleMethod(1);
        result.current.addGroup();
        result.current.updateGroup(0, "nombre", "Grupo 1");
        result.current.addProductToGroup(0);
        result.current.updateProductInGroup(0, 0, 1);
      });
      expect(result.current.validateAndBuildPayload().valid).toBe(false);

      // Non-numeric price
      act(() => {
        result.current.setFormName("Combo Test");
        result.current.setFormPrecio("abc");
      });
      expect(result.current.validateAndBuildPayload().valid).toBe(false);

      // Negative or zero price
      act(() => {
        result.current.setFormPrecio("0");
      });
      expect(result.current.validateAndBuildPayload().valid).toBe(false);

      // No payment methods
      act(() => {
        result.current.setFormPrecio("15.50");
        result.current.toggleMethod(1); // unchecks method 1
      });
      expect(result.current.validateAndBuildPayload().valid).toBe(false);
    });

    it("fails when group configuration is invalid", () => {
      const { result } = renderHook(() => useComboForm());

      act(() => {
        result.current.setFormName("Combo 1");
        result.current.setFormPrecio("12");
        result.current.toggleMethod(1);
        result.current.addGroup();
      });

      // Group name is empty
      expect(result.current.validateAndBuildPayload().valid).toBe(false);

      // Group min > max
      act(() => {
        result.current.updateGroup(0, "nombre", "Snacks");
        result.current.updateGroup(0, "min_cantidad", 5);
        result.current.updateGroup(0, "max_cantidad", 2);
        result.current.addProductToGroup(0);
        result.current.updateProductInGroup(0, 0, 1);
      });
      expect(result.current.validateAndBuildPayload().valid).toBe(false);

      // Group max_cantidad < 1
      act(() => {
        result.current.updateGroup(0, "min_cantidad", 0);
        result.current.updateGroup(0, "max_cantidad", 0);
      });
      expect(result.current.validateAndBuildPayload().valid).toBe(false);
    });

    it("succeeds and builds payload when all data is valid", () => {
      const { result } = renderHook(() => useComboForm());

      act(() => {
        result.current.setFormName("  Combo Fin de Semana  ");
        result.current.setFormDesc("  Incluye hielo y vasos  ");
        result.current.setFormPrecio("25.999");
        result.current.toggleMethod(1);
        result.current.addGroup();
        result.current.updateGroup(0, "nombre", "  Bebidas  ");
        result.current.updateGroup(0, "min_cantidad", 1);
        result.current.updateGroup(0, "max_cantidad", 2);
        result.current.addProductToGroup(0);
        result.current.updateProductInGroup(0, 0, 100);
      });

      const { valid, payload } = result.current.validateAndBuildPayload();

      expect(valid).toBe(true);
      expect(payload).toEqual({
        nombre: "Combo Fin de Semana",
        descripcion: "Incluye hielo y vasos",
        precio_total_usd: 26,
        metodo_pago_ids: [1],
        grupos: [
          {
            nombre: "Bebidas",
            min_cantidad: 1,
            max_cantidad: 2,
            productos: [{ producto_id: 100 }],
          },
        ],
      });
    });
  });
});
