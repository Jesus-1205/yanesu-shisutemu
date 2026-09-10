import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMarginInput } from "@/features/products/hooks/useMarginInput";
import { calcMargin } from "@/features/products/types";

// ── calcMargin (función pura) ─────────────────────────────────────────────────

describe("calcMargin - colores de semáforo", () => {
  it("margen >= 30% → color success", () => {
    const r = calcMargin(7, 10);
    // (10-7)/10 * 100 = 30%
    expect(r.margen).toBe(30);
    expect(r.color).toBe("success");
    expect(r.label).toBe("30.0%");
  });

  it("margen >= 10% y < 30% → color warning", () => {
    const r = calcMargin(9, 10);
    // (10-9)/10 * 100 = 10%
    expect(r.margen).toBe(10);
    expect(r.color).toBe("warning");
    expect(r.label).toBe("10.0%");
  });

  it("margen < 10% → color danger", () => {
    const r = calcMargin(9.5, 10);
    // (10-9.5)/10 * 100 = 5%
    expect(r.margen).toBe(5);
    expect(r.color).toBe("danger");
    expect(r.label).toBe("5.0%");
  });

  it("margen negativo (precio < costo) → color danger", () => {
    const r = calcMargin(12, 10);
    // (10-12)/10 * 100 = -20%
    expect(r.margen).toBe(-20);
    expect(r.color).toBe("danger");
  });

  it("precio = 0 → retorna neutral sin calcular", () => {
    const r = calcMargin(10, 0);
    expect(r.margen).toBe(0);
    expect(r.color).toBe("neutral");
    expect(r.label).toBe("—");
  });

  it("precio negativo → retorna neutral sin calcular", () => {
    const r = calcMargin(10, -5);
    expect(r.margen).toBe(0);
    expect(r.color).toBe("neutral");
  });

  it("costo = 0 → margen 100% (precio = ganancia pura)", () => {
    const r = calcMargin(0, 10);
    // (10-0)/10 * 100 = 100%
    expect(r.margen).toBe(100);
    expect(r.color).toBe("success");
  });

  it("costo = precio → margen 0% → danger (divisor 0 en % → 0)", () => {
    const r = calcMargin(10, 10);
    expect(r.margen).toBe(0);
    expect(r.color).toBe("danger");
  });

  it("margen exactamente en la frontera 29.9% → warning", () => {
    // precio = 10, costo tal que margen = 29.9%
    // margen = (p-c)/p * 100 → c = p * (1 - 29.9/100) = 10 * 0.701 = 7.01
    const r = calcMargin(7.01, 10);
    expect(r.margen).toBeCloseTo(29.9, 1);
    expect(r.color).toBe("warning");
  });

  it("el label siempre muestra 1 decimal", () => {
    const r = calcMargin(8.333, 10);
    expect(r.label).toMatch(/^\d+\.\d%$/);
  });
});

// ── useMarginInput - gaps de cobertura ───────────────────────────────────────

describe("useMarginInput - sincronización input/precio externo", () => {
  const onPriceChange = vi.fn();

  beforeEach(() => {
    onPriceChange.mockClear();
  });

  it("al montar con precio válido, el input muestra el margen con 1 decimal", () => {
    // costo=7, precio=10 → margen = 30%
    const { result } = renderHook(() => useMarginInput(7, 10, onPriceChange));
    expect(result.current.input).toBe("30.0");
  });

  it("cuando el precio externo cambia (rerrender), el input se actualiza si no está en foco", () => {
    let precio = 10;
    const { result, rerender } = renderHook(() =>
      useMarginInput(7, precio, onPriceChange),
    );
    expect(result.current.input).toBe("30.0");

    // precio cambia externamente a 14 → margen = (14-7)/14 * 100 = 50%
    precio = 14;
    rerender();
    expect(result.current.input).toBe("50.0");
  });

  it("mientras está en foco, el precio externo NO actualiza el input", () => {
    let precio = 10;
    const { result, rerender } = renderHook(() =>
      useMarginInput(7, precio, onPriceChange),
    );

    act(() => { result.current.onFocus(); });
    act(() => { result.current.onChange("25"); });

    precio = 14;
    rerender();
    // El usuario está escribiendo "25", no debe ser sobreescrito
    expect(result.current.input).toBe("25");
  });

  it("onBlur restaura el input al margen calculado del precio actualizado", () => {
    const { result } = renderHook(() => useMarginInput(7, 10, onPriceChange));

    act(() => { result.current.onFocus(); });
    act(() => { result.current.onChange("25"); });
    act(() => { result.current.onBlur(); });

    // costo=7, margen=25% → precio = 7/(1-0.25) = 9.33
    expect(onPriceChange).toHaveBeenLastCalledWith(9.33);
  });

  it("onChange con margen 0% llama onPriceChange con el costo (precio = costo)", () => {
    const { result } = renderHook(() => useMarginInput(10, 20, onPriceChange));
    act(() => { result.current.onChange("0"); });
    // precio = 10 / (1 - 0/100) = 10 / 1 = 10
    expect(onPriceChange).toHaveBeenCalledWith(10);
  });

  it("onChange con margen 50% → precio = 2 × costo", () => {
    const { result } = renderHook(() => useMarginInput(50, 100, onPriceChange));
    act(() => { result.current.onChange("50"); });
    // precio = 50 / (1 - 0.5) = 100
    expect(onPriceChange).toHaveBeenCalledWith(100);
  });

  it("onChange con margen 99% precio = costo / 0.01", () => {
    const { result } = renderHook(() => useMarginInput(1, 100, onPriceChange));
    act(() => { result.current.onChange("99"); });
    // precio = 1 / (1 - 0.99) = 1 / 0.01 = 100
    expect(onPriceChange).toHaveBeenCalledWith(100);
  });

  it("margen con decimales: 33.3% → precio redondeado a 2 decimales", () => {
    const { result } = renderHook(() => useMarginInput(10, 15, onPriceChange));
    act(() => { result.current.onChange("33.3"); });
    // precio = 10 / (1 - 0.333) = 10 / 0.667 ≈ 14.99
    expect(onPriceChange).toHaveBeenCalledWith(14.99);
  });

  it("onBlur sin cambio previo no llama onPriceChange cuando input no es numérico", () => {
    const { result } = renderHook(() => useMarginInput(10, 20, onPriceChange));
    act(() => { result.current.onFocus(); });
    act(() => { result.current.onChange("abc"); });
    act(() => { result.current.onBlur(); });
    // "abc" no es numérico → no calcula
    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it("onBlur con margen 100% no llama onPriceChange (divisor sería 0)", () => {
    const { result } = renderHook(() => useMarginInput(10, 20, onPriceChange));
    act(() => { result.current.onFocus(); });
    act(() => { result.current.onChange("100"); });
    act(() => { result.current.onBlur(); });
    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it("onFocus marca el campo como activo sin disparar callbacks", () => {
    const { result } = renderHook(() => useMarginInput(10, 20, onPriceChange));
    act(() => { result.current.onFocus(); });
    expect(onPriceChange).not.toHaveBeenCalled();
    // El input conserva el valor previo al enfocar
    expect(result.current.input).toBe("50.0");
  });
});

// ── Integración calcMargin + useMarginInput (datos crudos) ───────────────────

describe("integración: precio crudo → margen → precio recalculado", () => {
  it("ciclo completo: calcMargin ↔ useMarginInput son consistentes", () => {
    const onPriceChange = vi.fn();
    const costo = 45;
    const precioInicial = 60;

    // 1. Margen inicial del precio dado
    const margenInicial = calcMargin(costo, precioInicial);
    // (60-45)/60 * 100 = 25%
    expect(margenInicial.margen).toBeCloseTo(25, 1);

    // 2. Si el usuario escribe ese margen de vuelta, el precio recalculado
    //    debe coincidir con el precio original
    const { result } = renderHook(() =>
      useMarginInput(costo, precioInicial, onPriceChange),
    );
    act(() => { result.current.onChange(margenInicial.margen.toFixed(1)); });

    // precio = 45 / (1 - 0.25) = 45 / 0.75 = 60
    expect(onPriceChange).toHaveBeenCalledWith(60);
  });

  it("tabla de precios sugeridos para distribuidora: 5 ítems con márgenes distintos", () => {
    const items = [
      { costo: 5,   precio: 8,    expectedMargen: 37.5,  expectedColor: "success" },
      { costo: 8,   precio: 10,   expectedMargen: 20,    expectedColor: "warning" },
      { costo: 9.5, precio: 10,   expectedMargen: 5,     expectedColor: "danger"  },
      { costo: 10,  precio: 10,   expectedMargen: 0,     expectedColor: "danger"  },
      { costo: 12,  precio: 10,   expectedMargen: -20,   expectedColor: "danger"  },
    ];

    for (const { costo, precio, expectedMargen, expectedColor } of items) {
      const r = calcMargin(costo, precio);
      expect(r.margen).toBeCloseTo(expectedMargen, 5);
      expect(r.color).toBe(expectedColor);
    }
  });
});
