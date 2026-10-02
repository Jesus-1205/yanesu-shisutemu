import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceInfoCard from "@/features/invoices/components/InvoiceInfoCard";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getRateHistory: vi.fn().mockResolvedValue({
      history: [
        {
          id: 1,
          tasa_usd: "36.50",
          tasa_eur: "39.50",
          fecha_registro: "2025-01-01T12:00:00Z",
        },
      ],
    }),
  },
}));

vi.mock("@/ui-components/AsyncCombobox", () => ({
  default: ({ placeholder }: { placeholder: string }) => (
    <div data-testid="async-combobox">{placeholder}</div>
  ),
}));

vi.mock("@/features/shared/components/CreateSupplierModal", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="supplier-modal">
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    ) : null,
}));

describe("InvoiceInfoCard", () => {
  const onSearchSuppliers = vi.fn().mockResolvedValue([]);
  const onAnalyzeImage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
    useExchangeRateStore.setState({ tasa: 40.0, fechaUltimaActualizacion: "2025-01-01T10:00:00Z" });
  });

  it("renders all sections properly", async () => {
    await waitFor(() => {
      render(
        <InvoiceInfoCard
          onSearchSuppliers={onSearchSuppliers}
          onAnalyzeImage={onAnalyzeImage}
          aiLoading={false}
          aiState="idle"
        />
      );
    });

    expect(screen.getByText("Información de la Factura")).toBeInTheDocument();
    expect(screen.getByText("Tipo de Documento")).toBeInTheDocument();
    expect(screen.getByText("Moneda Principal")).toBeInTheDocument();
    expect(screen.getByLabelText(/Número de Factura/i)).toBeInTheDocument();
  });

  it("updates document type when clicked", async () => {
    render(
      <InvoiceInfoCard
        onSearchSuppliers={onSearchSuppliers}
        onAnalyzeImage={onAnalyzeImage}
        aiLoading={false}
        aiState="idle"
      />
    );

    const notaEntregaBtn = screen.getByRole("button", { name: "Nota de Entrega" });
    await userEvent.click(notaEntregaBtn);
    expect(useInvoiceFormStore.getState().tipoDocumento).toBe("NOTA_ENTREGA");
  });

  it("opens supplier creation modal when 'Nuevo' button is clicked", async () => {
    render(
      <InvoiceInfoCard
        onSearchSuppliers={onSearchSuppliers}
        onAnalyzeImage={onAnalyzeImage}
        aiLoading={false}
        aiState="idle"
      />
    );

    const newBtn = screen.getByTitle("Crear nuevo proveedor");
    await userEvent.click(newBtn);

    expect(screen.getByTestId("supplier-modal")).toBeInTheDocument();
  });

  it("triggers onAnalyzeImage when AI button is clicked", async () => {
    render(
      <InvoiceInfoCard
        onSearchSuppliers={onSearchSuppliers}
        onAnalyzeImage={onAnalyzeImage}
        aiLoading={false}
        aiState="idle"
      />
    );

    const fileListInput = document.querySelector('input[type="file"]');
    expect(fileListInput).toBeDefined();

    const file = new File(["test"], "invoice.png", { type: "image/png" });
    Object.defineProperty(fileListInput!, "files", { value: [file] });
    fireEvent.change(fileListInput!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Leer con IA/i })).toBeInTheDocument();
    });

    const aiBtn = screen.getByRole("button", { name: /Leer con IA/i });
    await userEvent.click(aiBtn);

    expect(onAnalyzeImage).toHaveBeenCalledTimes(1);
  });

  it("toggles rate history popover and allows selecting a historical rate", async () => {
    render(
      <InvoiceInfoCard
        onSearchSuppliers={onSearchSuppliers}
        onAnalyzeImage={onAnalyzeImage}
        aiLoading={false}
        aiState="idle"
      />
    );

    const clockBtn = screen.getByTitle("Historial de tasas");
    await userEvent.click(clockBtn);

    await waitFor(() => {
      expect(screen.getByText(/Últimas tasas/i)).toBeInTheDocument();
    });

    const rateBtn = screen.getByText(/USD 36.50/i);
    await userEvent.click(rateBtn);

    expect(useInvoiceFormStore.getState().tasa).toBe("36.5");
  });
});
