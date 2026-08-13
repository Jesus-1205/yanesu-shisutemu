import { api } from "@/services/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import PaymentMethodsPage from "@/features/payment-methods/pages/PaymentMethodsPage";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/services/api", () => ({
  api: {
    getPaymentMethods: vi.fn(),
    createPaymentMethod: vi.fn(),
    updatePaymentMethod: vi.fn(),
    deletePaymentMethod: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockMethods = [
  { id: 1, nombre: "EFECTIVO", activo: true, moneda_default: "USD" as const, acepta_referencia: false },
  { id: 2, nombre: "TRANSFERENCIA", activo: false, moneda_default: "USD" as const, acepta_referencia: true },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PaymentMethodsPage />
    </MemoryRouter>
  );
}

describe("PaymentMethodsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getPaymentMethods.mockResolvedValue(mockMethods);
  });

  it("muestra loading inicial", () => {
    mockApi.getPaymentMethods.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
    expect(screen.queryByText("EFECTIVO")).not.toBeInTheDocument();
  });

  it("renderiza tabla con métodos de pago", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("EFECTIVO")).toBeInTheDocument();
    });
    expect(screen.getByText("TRANSFERENCIA")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("muestra mensaje vacío", async () => {
    mockApi.getPaymentMethods.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay métodos de pago registrados")).toBeInTheDocument();
    });
  });

  it("abre modal para crear nuevo método", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("EFECTIVO")).toBeInTheDocument());

    await user.click(screen.getByText("Nuevo Método"));
    expect(screen.getByRole("heading", { name: "Nuevo Método de Pago" })).toBeInTheDocument();
  });

  it("crea un método de pago", async () => {
    const user = userEvent.setup();
    mockApi.createPaymentMethod.mockResolvedValue({ id: 3, nombre: "ZELLE", activo: true, moneda_default: "USD", acepta_referencia: false });
    renderPage();
    await waitFor(() => expect(screen.getByText("EFECTIVO")).toBeInTheDocument());

    await user.click(screen.getByText("Nuevo Método"));
    const input = screen.getByLabelText("Nombre del método");
    await user.type(input, "ZELLE");
    await user.click(screen.getByText("Crear método"));

    await waitFor(() => {
      expect(mockApi.createPaymentMethod).toHaveBeenCalledWith({
        nombre: "ZELLE",
        moneda_default: "VES",
        acepta_referencia: false,
        activo: true,
      });
    });
    expect(mockToast).toHaveBeenCalledWith("Método de pago creado", "success");
  });

  it("abre modal para editar método", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("EFECTIVO")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button");
    const pencilButton = buttons.find(
      (btn) => btn.querySelector("svg") && !btn.textContent?.includes("Nuevo Método"),
    );
    if (pencilButton) await user.click(pencilButton);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Editar Método de Pago" })).toBeInTheDocument();
    });
  });

  it("edita un método de pago", async () => {
    const user = userEvent.setup();
    mockApi.updatePaymentMethod.mockResolvedValue({ id: 1, nombre: "EFECTIVO USD", activo: true, moneda_default: "USD", acepta_referencia: false });
    renderPage();
    await waitFor(() => expect(screen.getByText("EFECTIVO")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button");
    const pencilButton = buttons.find(
      (btn) => btn.querySelector("svg") && !btn.textContent?.includes("Nuevo Método"),
    );
    if (pencilButton) await user.click(pencilButton);

    const input = screen.getByLabelText("Nombre del método");
    await user.clear(input);
    await user.type(input, "EFECTIVO USD");
    await user.click(screen.getByText("Guardar cambios"));

    await waitFor(() => {
      expect(mockApi.updatePaymentMethod).toHaveBeenCalledWith(1, {
        nombre: "EFECTIVO USD",
        moneda_default: "USD",
        acepta_referencia: false,
        activo: true,
      });
    });
    expect(mockToast).toHaveBeenCalledWith("Método de pago actualizado", "success");
  });

  it("elimina un método de pago", async () => {
    const user = userEvent.setup();
    mockApi.deletePaymentMethod.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("EFECTIVO")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button");
    const trashButton = buttons.find((btn) => {
      const svg = btn.querySelector("svg");
      return svg && svg.classList.contains("text-danger");
    });
    if (trashButton) await user.click(trashButton);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Eliminar método de pago/i })).toBeInTheDocument();
    });

    await user.click(screen.getByText("Eliminar"));
    await waitFor(() => {
      expect(mockApi.deletePaymentMethod).toHaveBeenCalledWith(1);
    });
    expect(mockToast).toHaveBeenCalledWith("Método de pago eliminado", "success");
  });

  it("muestra error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockApi.getPaymentMethods.mockRejectedValue(new Error("Error de red"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error de red")).toBeInTheDocument();
    });

    mockApi.getPaymentMethods.mockResolvedValue(mockMethods);
    await user.click(screen.getByText("Reintentar"));

    await waitFor(() => {
      expect(screen.getByText("EFECTIVO")).toBeInTheDocument();
    });
  });
});