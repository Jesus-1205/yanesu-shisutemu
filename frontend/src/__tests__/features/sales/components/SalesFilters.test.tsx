import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SalesFilters from "@/features/sales/components/SalesFilters";
import { useSalesFiltersStore } from "@/features/sales/store/salesFiltersStore";
import { api } from "@/services/api";
import { getReportPresetDates, getTodayInCaracas } from "@/lib/utils";

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

  it("renders preset buttons and highlights Todos by default", async () => {
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);
    render(<SalesFilters />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Hoy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Últimos 7 días" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Este mes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Personalizado" })).toBeInTheDocument();

    const todosBtn = screen.getByRole("button", { name: "Todos" });
    expect(todosBtn.className).toContain("bg-brand-blue");
  });

  it("clicking Últimos 7 días updates fechaDesde and fechaHasta in the store and calls onPresetChange", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);
    const onPresetChange = vi.fn();

    render(<SalesFilters onPresetChange={onPresetChange} />);

    const btn7d = screen.getByRole("button", { name: "Últimos 7 días" });
    await user.click(btn7d);

    const expected7d = getReportPresetDates("7d");
    expect(useSalesFiltersStore.getState().fechaDesde).toBe(expected7d.from);
    expect(useSalesFiltersStore.getState().fechaHasta).toBe(expected7d.to);
    expect(useSalesFiltersStore.getState().page).toBe(1);
    expect(onPresetChange).toHaveBeenCalledWith("7d");
    expect(btn7d.className).toContain("bg-brand-blue");
  });

  it("clicking Todos clears dates and resets active preset to Todos", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);
    const onPresetChange = vi.fn();

    useSalesFiltersStore.getState().setField("fechaDesde", "2025-05-01");
    useSalesFiltersStore.getState().setField("fechaHasta", "2025-05-05");

    render(<SalesFilters onPresetChange={onPresetChange} />);

    const todosBtn = screen.getByRole("button", { name: "Todos" });
    await user.click(todosBtn);

    expect(useSalesFiltersStore.getState().fechaDesde).toBe("");
    expect(useSalesFiltersStore.getState().fechaHasta).toBe("");
    expect(useSalesFiltersStore.getState().page).toBe(1);
    expect(onPresetChange).toHaveBeenCalledWith("all");
    expect(todosBtn.className).toContain("bg-brand-blue");
  });

  it("clicking Hoy updates fechaDesde and fechaHasta to today in the store", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);
    const onPresetChange = vi.fn();

    render(<SalesFilters onPresetChange={onPresetChange} />);

    const hoyBtn = screen.getByRole("button", { name: "Hoy" });
    await user.click(hoyBtn);

    const today = getTodayInCaracas();
    expect(useSalesFiltersStore.getState().fechaDesde).toBe(today);
    expect(useSalesFiltersStore.getState().fechaHasta).toBe(today);
    expect(onPresetChange).toHaveBeenCalledWith("today");
    expect(hoyBtn.className).toContain("bg-brand-blue");
  });

  it("clicking Este mes updates fechaDesde and fechaHasta to current month range", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);
    const onPresetChange = vi.fn();

    render(<SalesFilters onPresetChange={onPresetChange} />);

    const mesBtn = screen.getByRole("button", { name: "Este mes" });
    await user.click(mesBtn);

    const expectedMonth = getReportPresetDates("this_month");
    expect(useSalesFiltersStore.getState().fechaDesde).toBe(expectedMonth.from);
    expect(useSalesFiltersStore.getState().fechaHasta).toBe(expectedMonth.to);
    expect(onPresetChange).toHaveBeenCalledWith("this_month");
    expect(mesBtn.className).toContain("bg-brand-blue");
  });

  it("clicking Personalizado activates custom preset and notifies callback", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);
    const onPresetChange = vi.fn();

    render(<SalesFilters onPresetChange={onPresetChange} />);

    const customBtn = screen.getByRole("button", { name: "Personalizado" });
    await user.click(customBtn);

    expect(onPresetChange).toHaveBeenCalledWith("custom");
    expect(customBtn.className).toContain("bg-brand-blue");
  });

  it("automatically detects custom preset when manual dates do not match presets", async () => {
    vi.mocked(api.getPaymentMethods).mockResolvedValue([]);
    useSalesFiltersStore.getState().setField("fechaDesde", "2024-01-15");
    useSalesFiltersStore.getState().setField("fechaHasta", "2024-02-20");

    render(<SalesFilters />);

    await waitFor(() => {
      const customBtn = screen.getByRole("button", { name: "Personalizado" });
      expect(customBtn.className).toContain("bg-brand-blue");
    });
  });
});
