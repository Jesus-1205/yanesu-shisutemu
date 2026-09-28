import { api } from "@/services/api";
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { usePriceRuleForm } from "@/features/price-rules/hooks/usePriceRuleForm";
import type { PaymentMethodOut, PriceRuleOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
    getProducts: vi.fn(),
    createPriceRule: vi.fn(),
    updatePriceRule: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockMethods: PaymentMethodOut[] = [
  { id: 1, nombre: "Dólares Efectivo", moneda_default: "USD", acepta_referencia: false, activo: true },
  { id: 2, nombre: "Zelle", moneda_default: "USD", acepta_referencia: true, activo: true },
];

const mockRule: PriceRuleOut = {
  id: 10,
  nombre: "Oferta Ron",
  descripcion: "Desc",
  activo: true,
  products: [
    { id: 1, producto_id: 101, producto_nombre: "Ron 1L", tipo_empaque: "UNIDAD", precio_usd: 15 },
  ],
  payment_methods: [
    { id: 1, metodo_pago_id: 1, metodo_pago_nombre: "Dólares Efectivo" },
  ],
};

describe("usePriceRuleForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicializa correctamente con una regla existente", () => {
    const { result } = renderHook(() => usePriceRuleForm(mockRule));

    expect(result.current.formName).toBe("Oferta Ron");
    expect(result.current.formDesc).toBe("Desc");
    expect(result.current.formProductEntries).toEqual([
      { producto_id: 101, tipo_empaque: "UNIDAD", precio_usd: 15, _nombre: "Ron 1L" },
    ]);
    expect(result.current.formMethodIds).toEqual([1]);
    expect(result.current.isFormValid).toBe(true);
  });

  it("permite agregar, actualizar y remover entradas de productos", () => {
    const { result } = renderHook(() => usePriceRuleForm());

    act(() => {
      result.current.addProductEntry();
    });

    expect(result.current.formProductEntries.length).toBe(1);
    expect(result.current.formProductEntries[0].producto_id).toBe(0);

    act(() => {
      result.current.updateProductEntry(0, "producto_id", 202);
      result.current.updateProductEntry(0, "precio_usd", 9.99);
    });

    expect(result.current.formProductEntries[0].producto_id).toBe(202);
    expect(result.current.formProductEntries[0].precio_usd).toBe(9.99);

    act(() => {
      result.current.removeProductEntry(0);
    });

    expect(result.current.formProductEntries.length).toBe(0);
  });

  it("permite alternar métodos de pago (toggleMethod)", () => {
    const { result } = renderHook(() => usePriceRuleForm());

    act(() => {
      result.current.toggleMethod(1);
    });
    expect(result.current.formMethodIds).toEqual([1]);

    act(() => {
      result.current.toggleMethod(2);
    });
    expect(result.current.formMethodIds).toEqual([1, 2]);

    act(() => {
      result.current.toggleMethod(1);
    });
    expect(result.current.formMethodIds).toEqual([2]);
  });

  it("carga métodos de pago", async () => {
    mockApi.getPaymentMethods.mockResolvedValueOnce(mockMethods);

    const { result } = renderHook(() => usePriceRuleForm());

    await act(async () => {
      await result.current.loadPaymentMethods();
    });

    expect(result.current.paymentMethods).toEqual(mockMethods);
  });

  it("crea una regla si el formulario es válido", async () => {
    mockApi.createPriceRule.mockResolvedValueOnce(mockRule);

    const { result } = renderHook(() => usePriceRuleForm());

    act(() => {
      result.current.setFormName("Nueva Regla");
      result.current.addProductEntry();
      result.current.updateProductEntry(0, "producto_id", 101);
      result.current.updateProductEntry(0, "precio_usd", 12.5);
      result.current.toggleMethod(1);
    });

    expect(result.current.isFormValid).toBe(true);

    let success = false;
    await act(async () => {
      success = await result.current.saveRule();
    });

    expect(success).toBe(true);
    expect(mockApi.createPriceRule).toHaveBeenCalledWith({
      nombre: "Nueva Regla",
      descripcion: null,
      productos: [{ producto_id: 101, tipo_empaque: "UNIDAD", precio_usd: 12.5 }],
      metodo_pago_ids: [1],
    });
    expect(mockToast).toHaveBeenCalledWith("Regla de precio creada", "success");
  });

  it("actualiza una regla si se pasa el ID", async () => {
    mockApi.updatePriceRule.mockResolvedValueOnce(mockRule);

    const { result } = renderHook(() => usePriceRuleForm(mockRule));

    act(() => {
      result.current.setFormName("Regla Modificada");
    });

    let success = false;
    await act(async () => {
      success = await result.current.saveRule(mockRule.id);
    });

    expect(success).toBe(true);
    expect(mockApi.updatePriceRule).toHaveBeenCalledWith(10, {
      nombre: "Regla Modificada",
      descripcion: "Desc",
      productos: [{ producto_id: 101, tipo_empaque: "UNIDAD", precio_usd: 15 }],
      metodo_pago_ids: [1],
    });
    expect(mockToast).toHaveBeenCalledWith("Regla de precio actualizada", "success");
  });
});
