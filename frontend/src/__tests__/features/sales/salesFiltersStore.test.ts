import { describe, it, expect, beforeEach } from "vitest";
import { useSalesFiltersStore } from "../../../features/sales/store/salesFiltersStore";

describe("useSalesFiltersStore", () => {
  beforeEach(() => {
    useSalesFiltersStore.getState().clearAll();
  });

  it("initializes with default values", () => {
    const state = useSalesFiltersStore.getState();
    expect(state.page).toBe(1);
    expect(state.metodoPagoIds).toEqual([]);
    expect(state.fechaDesde).toBe("");
  });

  it("updates fields correctly", () => {
    useSalesFiltersStore.getState().setField("page", 2);
    expect(useSalesFiltersStore.getState().page).toBe(2);
  });

  it("clears all fields", () => {
    useSalesFiltersStore.getState().setField("fechaDesde", "2024-01-01");
    useSalesFiltersStore.getState().clearAll();
    expect(useSalesFiltersStore.getState().fechaDesde).toBe("");
    expect(useSalesFiltersStore.getState().page).toBe(1);
  });
});
