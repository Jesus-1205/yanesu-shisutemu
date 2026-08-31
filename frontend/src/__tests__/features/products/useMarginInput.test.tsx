import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMarginInput } from "@/features/products/hooks/useMarginInput";

/**
 * Tests de useMarginInput: conversión de margen % → precio.
 *
 * Fórmula inversa: precio = costo / (1 - pct/100)
 * Ejemplo: costo=50, margen deseado=50% → precio = 50/(1-0.5) = 100
 *
 * Principio de transparencia: lo que el usuario ve (input) es el margen,
 * lo que se calcula (precio) es el resultado de la fórmula inversa.
 */

describe("useMarginInput", () => {
  const onPriceChange = vi.fn();

  beforeEach(() => {
    onPriceChange.mockClear();
  });

  it("displays current margin from precio", () => {
    const { result } = renderHook(() => useMarginInput(50, 100, onPriceChange));
    // calcMargin(50, 100) = 50%
    expect(result.current.margin.margen).toBe(50);
    expect(result.current.input).toBe("50.0");
  });

  it("onChange: computes price from margin percentage", () => {
    const { result } = renderHook(() => useMarginInput(50, 100, onPriceChange));

    act(() => {
      result.current.onChange("50");
    });

    // precio = 50 / (1 - 50/100) = 50 / 0.5 = 100
    expect(onPriceChange).toHaveBeenCalledWith(100);
  });

  it("onBlur: commits the price calculation", () => {
    const { result } = renderHook(() => useMarginInput(50, 100, onPriceChange));

    act(() => {
      result.current.onChange("30");
    });

    act(() => {
      result.current.onBlur();
    });

    // precio = 50 / (1 - 30/100) = 50 / 0.7 = 71.43 (rounded)
    expect(onPriceChange).toHaveBeenCalledWith(71.43);
  });

  it("100% margin (divisor=0): does not call onPriceChange", () => {
    const { result } = renderHook(() => useMarginInput(50, 100, onPriceChange));

    act(() => {
      result.current.onChange("100");
    });

    // divisor = 1 - 100/100 = 0, should not compute
    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it(">100% margin (divisor<0): does not call onPriceChange", () => {
    const { result } = renderHook(() => useMarginInput(50, 100, onPriceChange));

    act(() => {
      result.current.onChange("150");
    });

    // divisor = 1 - 150/100 = -0.5, should not compute
    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it("zero costo: does not call onPriceChange", () => {
    const { result } = renderHook(() => useMarginInput(0, 100, onPriceChange));

    act(() => {
      result.current.onChange("50");
    });

    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it("non-numeric input: does not call onPriceChange", () => {
    const { result } = renderHook(() => useMarginInput(50, 100, onPriceChange));

    act(() => {
      result.current.onChange("abc");
    });

    expect(onPriceChange).not.toHaveBeenCalled();
  });

  it("empty input on focus: shows raw value", () => {
    const { result } = renderHook(() => useMarginInput(50, 0, onPriceChange));

    act(() => {
      result.current.onFocus();
    });

    // When precio=0, margin=0, so input shows ""
    expect(result.current.input).toBe("");
  });

  it("negative margin: input is empty (margen <= 0 shows empty)", () => {
    const { result } = renderHook(() => useMarginInput(120, 100, onPriceChange));
    // calcMargin(120, 100) = -20%, but margen <= 0 → input = ""
    expect(result.current.margin.margen).toBe(-20);
    expect(result.current.input).toBe("");
  });
});
