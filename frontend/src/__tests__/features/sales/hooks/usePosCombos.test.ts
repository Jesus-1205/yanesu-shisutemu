import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePosCombos } from "../../../../features/sales/hooks/usePosCombos";
import { api } from "../../../../services/api";
import type { ComboActiveOut } from "../../../../types/api";

const mockCombos: ComboActiveOut[] = [
  {
    id: 1,
    nombre: "Combo Fiesta",
    precio_total_usd: 20,
    metodo_pago_ids: [1],
    groups: [],
  },
];

describe("usePosCombos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads active combos on mount", async () => {
    vi.spyOn(api, "getActiveCombos").mockResolvedValueOnce(mockCombos);
    const { result } = renderHook(() => usePosCombos());

    await waitFor(() => {
      expect(result.current.combos).toHaveLength(1);
    });

    expect(result.current.combos[0].nombre).toBe("Combo Fiesta");
    expect(result.current.showPromos).toBe(false);
  });

  it("allows toggling showPromos and setting customizingCombo", async () => {
    vi.spyOn(api, "getActiveCombos").mockResolvedValueOnce(mockCombos);
    const { result } = renderHook(() => usePosCombos());

    await waitFor(() => {
      expect(result.current.combos).toHaveLength(1);
    });

    act(() => {
      result.current.setShowPromos(true);
      result.current.setCustomizingCombo(mockCombos[0]);
    });

    expect(result.current.showPromos).toBe(true);
    expect(result.current.customizingCombo?.id).toBe(1);
  });
});
