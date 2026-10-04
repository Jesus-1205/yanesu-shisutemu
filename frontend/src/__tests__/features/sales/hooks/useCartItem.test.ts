import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCartItem } from "../../../../features/sales/hooks/useCartItem";
import { useCartStore } from "../../../../features/sales/store/cartStore";
import type { CartItem } from "../../../../features/sales/store/cartStore";

vi.mock("../../../../services/api", () => ({ api: {} }));

const baseItem: CartItem = {
  cartItemId: "item_1",
  producto_id: 1,
  nombre: "Vodka Premium",
  tipo_empaque: "UNIDAD",
  cantidad: 3,
  unidades_por_caja: 12,
  unidades_descontadas: 3,
  precio_unidad_usd: 20,
  precio_caja_usd: 200,
  precio_unitario_usd: 20,
  iva_porcentaje: 16,
  tipo_iva: "GRAVADO",
  usaPrecioDivisas: false,
  precioDivisasUnidad: 18,
  precioDivisasCaja: 180,
  combo_id: null,
  comboDetalle: null,
};

const comboItem: CartItem = {
  cartItemId: "combo_1",
  producto_id: 0,
  nombre: "Combo Fiesta",
  tipo_empaque: "UNIDAD",
  cantidad: 2,
  unidades_por_caja: 1,
  unidades_descontadas: 2,
  precio_unidad_usd: 35,
  precio_caja_usd: 35,
  precio_unitario_usd: 35,
  iva_porcentaje: 0,
  tipo_iva: "EXENTO",
  usaPrecioDivisas: false,
  precioDivisasUnidad: null,
  precioDivisasCaja: null,
  combo_id: 10,
  comboDetalle: {
    nombre: "Combo Fiesta",
    metodo_pago_ids: [1, 2],
    productos: [
      {
        producto_id: 1,
        nombre: "Ron Añejo",
        tipo_iva: "GRAVADO",
        cantidad: 1,
        precio_unitario: 25,
      },
      {
        producto_id: 2,
        nombre: "Refresco Cola",
        tipo_iva: "GRAVADO",
        cantidad: 2,
        precio_unitario: 5,
      },
    ],
  },
};

describe("useCartItem", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: {
        item_1: baseItem,
        combo_1: comboItem,
      },
      snapshotTasa: 50,
    });
  });

  it("calculates regular product values correctly", () => {
    const { result } = renderHook(() => useCartItem(baseItem));

    expect(result.current.isCombo).toBe(false);
    expect(result.current.subtotalUsd).toBe(60);
    expect(result.current.precioUnitarioVes).toBe(1000);
    expect(result.current.subtotalVes).toBe(3000);
    expect(result.current.hasDivisas).toBe(true);
    expect(result.current.precioDivisasActual).toBe(18);
  });

  it("calculates combo values and variant names correctly", () => {
    const { result } = renderHook(() => useCartItem(comboItem));

    expect(result.current.isCombo).toBe(true);
    expect(result.current.subtotalUsd).toBe(70);
    expect(result.current.variantNames).toBe("Ron Añejo + Refresco Cola");
    expect(result.current.hasDivisas).toBe(false);
    expect(result.current.precioDivisasActual).toBeNull();
  });

  it("triggers store actions correctly", () => {
    const updateQuantitySpy = vi.spyOn(useCartStore.getState(), "updateQuantity");
    const updateEmpaqueSpy = vi.spyOn(useCartStore.getState(), "updateEmpaque");
    const removeItemSpy = vi.spyOn(useCartStore.getState(), "removeItem");
    const toggleDivisasSpy = vi.spyOn(useCartStore.getState(), "toggleDivisas");

    const { result } = renderHook(() => useCartItem(baseItem));

    act(() => {
      result.current.onIncrement();
    });
    expect(updateQuantitySpy).toHaveBeenCalledWith("item_1", 4);

    act(() => {
      result.current.onDecrement();
    });
    expect(updateQuantitySpy).toHaveBeenCalledWith("item_1", 2);

    act(() => {
      result.current.onQuantityChange(5);
    });
    expect(updateQuantitySpy).toHaveBeenCalledWith("item_1", 5);

    act(() => {
      result.current.onEmpaqueChange("CAJA");
    });
    expect(updateEmpaqueSpy).toHaveBeenCalledWith("item_1", "CAJA");

    act(() => {
      result.current.onToggleDivisas();
    });
    expect(toggleDivisasSpy).toHaveBeenCalledWith("item_1");

    act(() => {
      result.current.onRemove();
    });
    expect(removeItemSpy).toHaveBeenCalledWith("item_1");
  });
});
