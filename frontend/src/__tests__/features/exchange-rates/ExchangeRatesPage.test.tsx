import { api } from "@/services/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ExchangeRatesPage from "@/features/exchange-rates/pages/ExchangeRatesPage";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

let mockAuthUser: { id: number; rol_nombre: string } | null = { id: 1, rol_nombre: "ADMINISTRADOR" };

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

vi.mock("@/features/exchange-rates/components/RateTrendChart", () => ({
  default: ({
    interval,
    onIntervalChange,
  }: {
    interval: string;
    onIntervalChange: (iv: string) => void;
  }) => (
    <div>
      <h2>Evolución de tasas</h2>
      <button onClick={() => onIntervalChange("90D")}>90D</button>
      <span data-testid="interval-selected">{interval}</span>
    </div>
  ),
}));

import { exportToExcel } from "@/lib/exportToExcel";

const mockLatestRates = { USD: "45.1230", EUR: "49.5000" };
const mockHistory = [
  {
    id: 1,
    tasa_usd: 45.123,
    tasa_eur: 49.5,
    fecha_registro: "2026-08-11T10:30:00",
    registrado_por: 1,
    registrado_por_nombre: "admin",
  },
  {
    id: 2,
    tasa_usd: 46.0,
    tasa_eur: 50.25,
    fecha_registro: "2026-08-10T09:15:00",
    registrado_por: 1,
    registrado_por_nombre: "admin",
  },
];

vi.mock("@/services/api", () => ({
  api: {
    getLatestRates: vi.fn(),
    getRateHistory: vi.fn(),
    getRateHistoryPaginated: vi.fn(),
    getBcvRates: vi.fn(),
    saveBulkRates: vi.fn(),
    getDailyStatus: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

function renderPage() {
  return render(
    <MemoryRouter>
      <ExchangeRatesPage />
    </MemoryRouter>
  );
}

describe("ExchangeRatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 1, rol_nombre: "ADMINISTRADOR" };
    useExchangeRateStore.setState({
      tasa: 45.123,
      tasaEUR: 49.5,
      loading: false,
      fechaUltimaActualizacion: null,
    });
    mockApi.getLatestRates.mockResolvedValue({
      rates: mockLatestRates,
      fecha_ultima_actualizacion: "2026-08-11T10:30:00",
    });
    mockApi.getRateHistory.mockResolvedValue({ history: mockHistory });
    mockApi.getRateHistoryPaginated.mockResolvedValue({
      items: mockHistory,
      pages: 1,
      total: 2,
      page: 1,
      page_size: 20,
    });
    mockApi.getDailyStatus.mockResolvedValue({
      needs_update: false,
      last_update_today: null,
      now: new Date().toISOString(),
    });
  });

  it("renders hero card with latest rates", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Dólar (USD)")).toBeInTheDocument();
      expect(screen.getByText("Euro (EUR)")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByText("Bs 45,1230").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Bs 49,5000").length).toBeGreaterThan(0);
    });
  });

  it("renders history, KPIs and trend chart section", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Historial de tasas")).toBeInTheDocument();
    });
    expect(screen.getByText("Evolución de tasas")).toBeInTheDocument();
    expect(screen.getByText("Variación USD (30D)")).toBeInTheDocument();
    expect(screen.getByText("Registrado por")).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
  });

  it("opens quick update panel when clicking Actualizar Tasas", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Actualizar Tasas")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    expect(screen.getByText("Actualizar tasas del día")).toBeInTheDocument();
  });

  it("loads BCV rates into panel and saves sending formatted strings", async () => {
    mockApi.getBcvRates.mockResolvedValue({ rates: { USD: "45.5", EUR: "49.8" } });
    mockApi.saveBulkRates.mockResolvedValue({
      id: 3,
      tasa_usd: 45.5,
      tasa_eur: 49.8,
      fecha_registro: "2026-08-12T10:00:00",
      registrado_por: 1,
      registrado_por_nombre: "Admin",
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Actualizar Tasas")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    await userEvent.click(screen.getByText("Cargar desde BCV"));
    await waitFor(() => {
      expect(screen.getByLabelText("USD / VES")).toHaveValue(45.5);
      expect(screen.getByLabelText("EUR / VES")).toHaveValue(49.8);
    });
    await userEvent.click(screen.getByText("Guardar"));
    await waitFor(() => {
      expect(mockApi.saveBulkRates).toHaveBeenCalledWith({ usd: "45.5000", eur: "49.8000" });
      expect(mockToast).toHaveBeenCalledWith("Tasas guardadas correctamente", "success");
    });
  });

  it("displays BCV error and keeps inputs editable manually", async () => {
    mockApi.getBcvRates.mockRejectedValue(new Error("Timeout"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Actualizar Tasas")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    await userEvent.click(screen.getByText("Cargar desde BCV"));
    await waitFor(() => {
      expect(screen.getByText(/No se pudieron obtener las tasas del BCV/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText("USD / VES")).toBeInTheDocument();
    expect(screen.getByLabelText("EUR / VES")).toBeInTheDocument();
  });

  it("disables save button when rates did not change", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Actualizar Tasas")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    await userEvent.type(screen.getByLabelText("USD / VES"), "45.1230");
    await userEvent.type(screen.getByLabelText("EUR / VES"), "49.5000");
    expect(screen.getByText("Guardar")).toBeDisabled();
  });

  it("changes chart interval and queries corresponding range", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("interval-selected")).toHaveTextContent("30D");
      expect(mockApi.getRateHistory).toHaveBeenCalledWith({ days: 30 });
    });
    await userEvent.click(screen.getByText("90D"));
    await waitFor(() => {
      expect(mockApi.getRateHistory).toHaveBeenCalledWith({ days: 90 });
      expect(screen.getByTestId("interval-selected")).toHaveTextContent("90D");
    });
  });

  it("exports visible table data", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTitle("Exportar a Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByTitle("Exportar a Excel"));
    await userEvent.click(screen.getByText("Datos visibles"));
    await waitFor(() => {
      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "Tasas_cambio",
          data: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 }),
          ]),
        }),
      );
    });
  });

  it("exports all history data by paginating", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTitle("Exportar a Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByTitle("Exportar a Excel"));
    await userEvent.click(screen.getByText("Todos los datos"));
    await waitFor(() => {
      expect(mockApi.getRateHistoryPaginated).toHaveBeenCalledWith({
        page: 1,
        page_size: 200,
      });
      expect(exportToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "Tasas_cambio_completo",
          data: expect.arrayContaining([
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 }),
          ]),
        }),
      );
    });
  });

  it("shows error and allows retrying", async () => {
    mockApi.getLatestRates.mockRejectedValueOnce(new Error("Error de red"));
    mockApi.getRateHistoryPaginated.mockRejectedValueOnce(new Error("Error de red"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error de red")).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Reintentar"));
    await waitFor(() => {
      expect(screen.getAllByText("Bs 45,1230").length).toBeGreaterThan(0);
    });
  });

  it("displays empty state when history is empty", async () => {
    mockApi.getRateHistoryPaginated.mockResolvedValue({
      items: [],
      pages: 0,
      total: 0,
      page: 1,
      page_size: 20,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay tasas registradas")).toBeInTheDocument();
    });
  });

  it("navigates between history pages", async () => {
    mockApi.getRateHistoryPaginated.mockResolvedValue({
      items: mockHistory,
      pages: 3,
      total: 50,
      page: 1,
      page_size: 20,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Siguiente")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Siguiente"));
    await waitFor(() => {
      expect(mockApi.getRateHistoryPaginated).toHaveBeenCalledWith({ page: 2, page_size: 20 });
    });
  });

  it("warns in panel if an update has already occurred today", async () => {
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    mockApi.getLatestRates.mockResolvedValue({
      rates: mockLatestRates,
      fecha_ultima_actualizacion: `${todayKey}T10:30:00`,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Actualizar Tasas")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    await waitFor(() => {
      expect(screen.getByText(/Ya se registró una actualización de tasas hoy/i)).toBeInTheDocument();
    });
  });

  it("hides update action and panel from operator users", async () => {
    mockAuthUser = { id: 2, rol_nombre: "OPERADOR" };
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Tasas de Cambio")).toBeInTheDocument();
    });
    expect(screen.queryByText("Actualizar Tasas")).not.toBeInTheDocument();
    expect(screen.queryByText("Actualizar")).not.toBeInTheDocument();
  });
});
