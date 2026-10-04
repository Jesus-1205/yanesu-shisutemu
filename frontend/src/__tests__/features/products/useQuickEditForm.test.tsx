import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuickEditForm } from "@/features/products/hooks/useQuickEditForm";
import type { Product } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    updateProduct: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockProduct: Product = {
  id: 1,
  codigo_barra: "ABC123",
  nombre: "Whisky Premium",
  categories: [{ id: 1, nombre: "Licores", descripcion: null }],
  unidades_por_caja: 12,
  stock_cajas: 0,
  stock_unidades: 50,
  stock_minimo: 5,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: null,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

describe("useQuickEditForm", () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes form with product values", () => {
    const { result } = renderHook(() =>
      useQuickEditForm({
        product: mockProduct,
        open: true,
        onClose,
        onSaved,
      }),
    );

    expect(result.current.form.stock_unidades).toBe(50);
    expect(result.current.form.precio_costo_caja_usd).toBe(96);
    expect(result.current.form.precio_unidad_usd).toBe(15);
    expect(result.current.form.precio_caja_usd).toBe(150);
    expect(result.current.precioCostoUnitario).toBe(8);
  });

  it("calculates unit and box margins correctly", () => {
    const { result } = renderHook(() =>
      useQuickEditForm({
        product: mockProduct,
        open: true,
        onClose,
        onSaved,
      }),
    );

    expect(result.current.unitMargin.input).toBe("46.7");
    expect(result.current.boxMargin.input).toBe("36.0");
  });

  it("submits changes when values are updated", async () => {
    const { api } = await import("@/services/api");
    const { result } = renderHook(() =>
      useQuickEditForm({
        product: mockProduct,
        open: true,
        onClose,
        onSaved,
      }),
    );

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        precio_caja_usd: 200,
      }));
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(api.updateProduct).toHaveBeenCalledWith(1, { precio_caja_usd: 200 });
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without API call when no values changed", async () => {
    const { api } = await import("@/services/api");
    const { result } = renderHook(() =>
      useQuickEditForm({
        product: mockProduct,
        open: true,
        onClose,
        onSaved,
      }),
    );

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(api.updateProduct).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
