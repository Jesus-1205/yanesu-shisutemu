import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCombosTableColumns } from "@/features/combos/hooks/useCombosTableColumns";
import type { ComboOut, PaymentMethodOut } from "@/types/api";

describe("useCombosTableColumns", () => {
  const mockPaymentMethods: PaymentMethodOut[] = [
    { id: 1, nombre: "Efectivo USD", moneda_default: "USD", acepta_referencia: false, activo: true },
    { id: 2, nombre: "Punto de Venta", moneda_default: "VES", acepta_referencia: true, activo: true },
  ];

  const mockCombo: ComboOut = {
    id: 10,
    nombre: "Combo Fiesta",
    descripcion: "Para compartir",
    precio_total_usd: 25.5,
    activo: true,
    metodo_pago_ids: [1, 99],
    groups: [
      {
        id: 101,
        nombre: "Licores",
        min_cantidad: 1,
        max_cantidad: 2,
        products: [{ id: 1, producto_id: 10, producto_nombre: "Ron" }],
      },
    ],
  };

  it("returns 6 configured table columns", () => {
    const { result } = renderHook(() =>
      useCombosTableColumns({
        paymentMethods: mockPaymentMethods,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    expect(result.current).toHaveLength(6);
    expect(result.current.map((c) => c.key)).toEqual([
      "nombre",
      "precio_total_usd",
      "grupos",
      "metodos",
      "activo",
      "acciones",
    ]);
  });

  it("calculates exportValue accurately across columns", () => {
    const { result } = renderHook(() =>
      useCombosTableColumns({
        paymentMethods: mockPaymentMethods,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    const columns = result.current;
    const nombreCol = columns.find((c) => c.key === "nombre");
    const precioCol = columns.find((c) => c.key === "precio_total_usd");
    const gruposCol = columns.find((c) => c.key === "grupos");
    const metodosCol = columns.find((c) => c.key === "metodos");
    const activoCol = columns.find((c) => c.key === "activo");

    expect(nombreCol?.exportValue?.(mockCombo)).toBe("Combo Fiesta");
    expect(precioCol?.exportValue?.(mockCombo)).toBe(25.5);
    expect(gruposCol?.exportValue?.(mockCombo)).toBe("Licores (1-2 uds)");
    expect(metodosCol?.exportValue?.(mockCombo)).toBe("Efectivo USD, #99");
    expect(activoCol?.exportValue?.(mockCombo)).toBe("Activo");
  });
});
