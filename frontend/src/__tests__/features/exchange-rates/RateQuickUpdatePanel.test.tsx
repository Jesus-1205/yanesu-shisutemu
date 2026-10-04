import { api } from "@/services/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import RateQuickUpdatePanel from "@/features/exchange-rates/components/RateQuickUpdatePanel";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/services/api", () => ({
  api: {
    getBcvRates: vi.fn(),
    saveBulkRates: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockCreatedRate = {
  id: 3,
  tasa_usd: 45.5,
  tasa_eur: 49.8,
  fecha_registro: "2026-08-12T10:00:00",
  registrado_por: 1,
  registrado_por_nombre: "Admin",
};

function renderPanel(props: Partial<React.ComponentProps<typeof RateQuickUpdatePanel>> = {}) {
  const defaultProps = {
    open: true,
    currentUsd: "45.1230",
    currentEur: "49.5000",
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };
  return render(<RateQuickUpdatePanel {...defaultProps} {...props} />);
}

describe("RateQuickUpdatePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when closed", () => {
    renderPanel({ open: false });
    expect(screen.queryByText("Actualizar tasas del día")).not.toBeInTheDocument();
  });

  it("loads BCV rates on button click", async () => {
    mockApi.getBcvRates.mockResolvedValue({ rates: { USD: "45.5", EUR: "49.8" } });
    renderPanel();
    await userEvent.click(screen.getByText("Cargar desde BCV"));
    await waitFor(() => {
      expect(screen.getByLabelText("USD / VES")).toHaveValue(45.5);
      expect(screen.getByLabelText("EUR / VES")).toHaveValue(49.8);
      expect(mockToast).toHaveBeenCalledWith("Tasas del BCV cargadas", "success");
    });
  });

  it("saves rates as formatted strings and notifies success", async () => {
    mockApi.getBcvRates.mockResolvedValue({ rates: { USD: "45.5", EUR: "49.8" } });
    mockApi.saveBulkRates.mockResolvedValue(mockCreatedRate);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderPanel({ onSaved, onClose });
    await userEvent.click(screen.getByText("Cargar desde BCV"));
    await waitFor(() => expect(screen.getByLabelText("USD / VES")).toHaveValue(45.5));
    await userEvent.click(screen.getByText("Guardar"));
    await waitFor(() => {
      expect(mockApi.saveBulkRates).toHaveBeenCalledWith({ usd: "45.5000", eur: "49.8000" });
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("displays BCV error banner while keeping inputs editable", async () => {
    mockApi.getBcvRates.mockRejectedValue(new Error("Sin conexión"));
    renderPanel();
    await userEvent.click(screen.getByText("Cargar desde BCV"));
    await waitFor(() => {
      expect(screen.getByText(/No se pudieron obtener las tasas del BCV/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText("USD / VES")).toBeInTheDocument();
    expect(screen.getByText(/Puede ingresar los valores manualmente/i)).toBeInTheDocument();
  });

  it("disables save button when rates did not change", async () => {
    renderPanel();
    await userEvent.type(screen.getByLabelText("USD / VES"), "45.1230");
    await userEvent.type(screen.getByLabelText("EUR / VES"), "49.5000");
    expect(screen.getByText("Guardar")).toBeDisabled();
    expect(mockApi.saveBulkRates).not.toHaveBeenCalled();
  });

  it("validates non-positive values before saving", async () => {
    renderPanel();
    await userEvent.type(screen.getByLabelText("USD / VES"), "-5");
    await userEvent.type(screen.getByLabelText("EUR / VES"), "10");
    await userEvent.click(screen.getByText("Guardar"));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Ingrese valores válidos para ambas tasas", "error");
      expect(mockApi.saveBulkRates).not.toHaveBeenCalled();
    });
  });

  it("warns if an update already occurred today but allows saving", async () => {
    mockApi.getBcvRates.mockResolvedValue({ rates: { USD: "46.1", EUR: "50.2" } });
    mockApi.saveBulkRates.mockResolvedValue(mockCreatedRate);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderPanel({ updatedToday: true, onSaved, onClose });
    await waitFor(() => {
      expect(screen.getByText(/Ya se registró una actualización de tasas hoy/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Cargar desde BCV"));
    await waitFor(() => expect(screen.getByLabelText("USD / VES")).toHaveValue(46.1));
    expect(screen.getByText("Guardar")).not.toBeDisabled();
    await userEvent.click(screen.getByText("Guardar"));
    await waitFor(() => {
      expect(mockApi.saveBulkRates).toHaveBeenCalledWith({ usd: "46.1000", eur: "50.2000" });
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
