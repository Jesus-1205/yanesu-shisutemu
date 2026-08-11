import { api } from "@/services/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ExchangeRatesPage from "@/features/exchange-rates/pages/ExchangeRatesPage";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, rol_nombre: "ADMINISTRADOR" },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

import { exportToExcel } from "@/lib/exportToExcel";

const mockLatestRates = { USD: "45.123", EUR: "49.500" };
const mockHistory = [
  { id: 1, moneda: "USD", tasa_ves: 45.123, fecha_registro: "2025-01-15T10:30:00", registrado_por: 1 },
  { id: 2, moneda: "EUR", tasa_ves: 49.5, fecha_registro: "2025-01-14T09:15:00", registrado_por: 1 },
];

const mockBcvRates = { rates: { USD: "45.500", EUR: "49.800" } };
const mockCreatedRate = { id: 3, moneda: "USD", tasa_ves: 46.0, fecha_registro: "2025-01-16T12:00:00", registrado_por: 1 };

vi.mock("@/services/api", () => ({
  api: {
    getLatestRates: vi.fn(),
    getRateHistory: vi.fn(),
    getRateHistoryPaginated: vi.fn(),
    getBcvRates: vi.fn(),
    saveBulkRates: vi.fn(),
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
    vi.resetAllMocks();
    mockApi.getLatestRates.mockResolvedValue({ rates: mockLatestRates });
    mockApi.getRateHistory.mockResolvedValue({ history: mockHistory });
    mockApi.getRateHistoryPaginated.mockResolvedValue({ items: mockHistory, pages: 1, total: 2, page: 1, page_size: 20 });
  });

  it("muestra loading inicial", () => {
    mockApi.getLatestRates.mockImplementation(() => new Promise(() => {}));
    mockApi.getRateHistory.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Tasas de Cambio")).toBeInTheDocument();
  });

  it("renderiza StatCards con tasas más recientes", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("USD / VES")).toBeInTheDocument();
      expect(screen.getByText("EUR / VES")).toBeInTheDocument();
    });
    // formatRate uses comma as decimal separator in Spanish locale, shows 2 decimals
    await waitFor(() => {
      expect(screen.getByText("Bs 45,12")).toBeInTheDocument();
      expect(screen.getByText("Bs 49,50")).toBeInTheDocument();
    });
  });

  it("renderiza tabla de historial con datos", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ID")).toBeInTheDocument();
      // "Moneda" appears only in table header (modal not open yet)
      expect(screen.getByText("Moneda")).toBeInTheDocument();
      expect(screen.getByText("Tasa (Bs)")).toBeInTheDocument();
      expect(screen.getByText("Registrado")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("USD")).toBeInTheDocument();
      // History table uses 4 decimals for precision
      expect(screen.getByText("45,1230")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("EUR")).toBeInTheDocument();
      expect(screen.getByText("49,5000")).toBeInTheDocument();
    });
  });

  it("abre modal y carga tasas del BCV", async () => {
    mockApi.getBcvRates.mockResolvedValue(mockBcvRates);
    renderPage();
    await waitFor(() => expect(screen.getByText("Tasas de Cambio")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    await waitFor(() => {
      expect(screen.getByText("Actualizar Tasas de Cambio")).toBeInTheDocument();
      expect(mockApi.getBcvRates).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByLabelText("USD / VES")).toBeInTheDocument();
      expect(screen.getByLabelText("EUR / VES")).toBeInTheDocument();
    });
  });

  it("guarda tasas correctamente", async () => {
    mockApi.getBcvRates.mockResolvedValue(mockBcvRates);
    mockApi.saveBulkRates.mockResolvedValue([mockCreatedRate]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Tasas de Cambio")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    await waitFor(() => expect(screen.getByLabelText("USD / VES")).toBeInTheDocument());
    const usdInput = screen.getByLabelText("USD / VES");
    const eurInput = screen.getByLabelText("EUR / VES");
    await userEvent.clear(usdInput);
    await userEvent.type(usdInput, "46");
    await userEvent.clear(eurInput);
    await userEvent.type(eurInput, "50");
    await userEvent.click(screen.getByText("Guardar"));
    await waitFor(() => {
      expect(mockApi.saveBulkRates).toHaveBeenCalledWith({ usd: 46, eur: 50 });
      expect(mockToast).toHaveBeenCalledWith("Tasas guardadas correctamente", "success");
    });
    await waitFor(() => expect(screen.queryByText("Actualizar Tasas de Cambio")).not.toBeInTheDocument());
  });

  it("al abrir modal carga tasas del BCV automáticamente", async () => {
    mockApi.getBcvRates.mockResolvedValue(mockBcvRates);
    renderPage();
    await waitFor(() => expect(screen.getByText("Tasas de Cambio")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Actualizar Tasas"));
    await waitFor(() => {
      expect(mockApi.getBcvRates).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith("Tasas del BCV cargadas", "success");
    });
  });

  it("muestra estado vacío cuando no hay historial", async () => {
    mockApi.getRateHistory.mockResolvedValue({ history: [] });
    mockApi.getRateHistoryPaginated.mockResolvedValue({ items: [], pages: 0, total: 0, page: 1, page_size: 20 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay tasas registradas")).toBeInTheDocument();
    });
  });

  it("muestra error y permite reintentar", async () => {
    const error = new Error("Error de red");
    mockApi.getLatestRates.mockRejectedValueOnce(error);
    mockApi.getRateHistory.mockRejectedValueOnce(error);
    mockApi.getRateHistoryPaginated.mockRejectedValueOnce(error);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error de red")).toBeInTheDocument();
      expect(screen.getByText("Reintentar")).toBeInTheDocument();
    });
    vi.clearAllMocks();
    mockApi.getLatestRates.mockResolvedValue({ rates: mockLatestRates });
    mockApi.getRateHistory.mockResolvedValue({ history: mockHistory });
    mockApi.getRateHistoryPaginated.mockResolvedValue({ items: mockHistory, pages: 1, total: 2, page: 1, page_size: 20 });
    await userEvent.click(screen.getByText("Reintentar"));
    // The formatted rate uses comma as decimal separator in Spanish locale with 2 decimals
    await waitFor(() => {
      expect(screen.getByText("Bs 45,12")).toBeInTheDocument();
    });
  });

  it("muestra boton de descargar excel", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Descargar Excel")).toBeInTheDocument();
    });
  });

  it("exporta historial de tasas a excel", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(mockApi.getRateHistory).toHaveBeenCalled();
      expect(exportToExcel).toHaveBeenCalledWith({
        data: mockHistory,
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "ID" }),
          expect.objectContaining({ header: "Moneda" }),
          expect.objectContaining({ header: "Tasa (VES)" }),
          expect.objectContaining({ header: "Fecha Registro" }),
        ]),
        filename: "Tasas_cambio",
      });
    });
  });
});