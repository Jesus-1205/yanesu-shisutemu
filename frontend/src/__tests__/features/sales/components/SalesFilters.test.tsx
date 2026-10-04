import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SalesFilters from "@/features/sales/components/SalesFilters";
import { useSalesFiltersStore } from "@/features/sales/store/salesFiltersStore";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
  },
}));

describe("SalesFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSalesFiltersStore.getState().clearAll();
  });

  it("renders all filter fields and handles input changes", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPaymentMethods).mockResolvedValue([
      { id: 1, nombre: "Efectivo USD", moneda_default: "USD", activo: true, acepta_referencia: false },
    ]);

    render(<SalesFilters />);

    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora hasta")).toBeInTheDocument();
    expect(screen.getByText("Método de pago")).toBeInTheDocument();

    const desdeInput = screen.getByLabelText("Desde");
    await user.type(desdeInput, "2025-05-01");

    expect(useSalesFiltersStore.getState().fechaDesde).toBe("2025-05-01");
    expect(useSalesFiltersStore.getState().page).toBe(1);
  });

  it("shows Limpiar button when filters are active and clears on click", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);

    useSalesFiltersStore.getState().setField("fechaDesde", "2025-05-01");

    render(<SalesFilters />);

    const clearButton = screen.getByRole("button", { name: /limpiar/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(useSalesFiltersStore.getState().fechaDesde).toBe("");
    expect(screen.queryByRole("button", { name: /limpiar/i })).not.toBeInTheDocument();
  });
});
