import { api } from "@/services/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import SuppliersPage from "@/features/suppliers/pages/SuppliersPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

vi.mock("@/features/suppliers/hooks/useSupplierAnalytics", () => ({
  useSupplierAnalytics: () => ({ data: null, loading: false }),
}));

vi.mock("@/features/suppliers/components/SupplierMicroKPIs", () => ({
  default: () => null,
}));

vi.mock("@/features/suppliers/components/SupplierAnalyticsDrawer", () => ({
  default: () => null,
}));

vi.mock("@/features/shared/components/CreateSupplierModal", () => ({
  default: ({ open, onCreated }: { open: boolean; onCreated: () => void }) =>
    open ? (
      <div>
        <span>Crear proveedor</span>
        <button onClick={onCreated}>Crear</button>
      </div>
    ) : null,
}));

vi.mock("@/ui-components/Pagination", () => ({
  default: () => null,
}));

const mockSuppliers = [
  { id: 1, nombre: "Distribuidora ABC", telefono: "04121234567", email: "abc@correo.com" },
  { id: 2, nombre: "Proveedor XYZ", telefono: null, email: null },
];

const mockPaginatedResponse = { items: mockSuppliers, total: 2, page: 1, page_size: 20, pages: 1 };

vi.mock("@/services/api", () => ({
  api: {
    getSuppliers: vi.fn(),
    getSuppliersPaginated: vi.fn(),
    deleteSupplier: vi.fn(),
  },
}));

import { exportToExcel } from "@/lib/exportToExcel";

const mockApi = vi.mocked(api);

function renderPage() {
  return render(
    <MemoryRouter>
      <SuppliersPage />
    </MemoryRouter>
  );
}

describe("SuppliersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getSuppliersPaginated.mockResolvedValue(mockPaginatedResponse);
    mockApi.getSuppliers.mockResolvedValue(mockSuppliers);
  });

  it("muestra loading inicial", () => {
    mockApi.getSuppliers.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
  });

  it("renderiza tabla con proveedores", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Distribuidora ABC")).toBeInTheDocument();
    });
    expect(screen.getByText("04121234567")).toBeInTheDocument();
    expect(screen.getByText("abc@correo.com")).toBeInTheDocument();
    expect(screen.getByText("Proveedor XYZ")).toBeInTheDocument();
  });

  it("muestra '—' para teléfono y email nulos", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Proveedor XYZ")).toBeInTheDocument();
    });
    const emDash = screen.getAllByText("—");
    expect(emDash.length).toBeGreaterThanOrEqual(2);
  });

  it("abre modal de nuevo proveedor", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Distribuidora ABC")).toBeInTheDocument());

    await user.click(screen.getByText("Nuevo Proveedor"));
    await waitFor(() => {
      expect(screen.getByText("Crear proveedor")).toBeInTheDocument();
    });
  });

  it("navega a editar proveedor", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Distribuidora ABC")).toBeInTheDocument());

    const pencilBtn = screen.getAllByRole("button", { name: "Editar proveedor" })[0];
    await user.click(pencilBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/suppliers/1");
  });

  it("elimina un proveedor", async () => {
    const user = userEvent.setup();
    mockApi.deleteSupplier.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("Distribuidora ABC")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button");
    const trashBtn = buttons.find((btn) => {
      const svg = btn.querySelector("svg");
      return svg && svg.classList.contains("text-danger");
    });
    if (trashBtn) await user.click(trashBtn);

    await waitFor(() => {
      expect(screen.getByText(/Eliminar proveedor/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText("Eliminar"));
    await waitFor(() => {
      expect(mockApi.deleteSupplier).toHaveBeenCalledWith(1);
    });
    expect(mockToast).toHaveBeenCalled();
  });

  it("muestra error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockApi.getSuppliersPaginated.mockRejectedValue(new Error("Error de conexión"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error de conexión")).toBeInTheDocument();
    });

    mockApi.getSuppliersPaginated.mockResolvedValue(mockPaginatedResponse);
    await user.click(screen.getByText("Reintentar"));

    await waitFor(() => {
      expect(screen.getByText("Distribuidora ABC")).toBeInTheDocument();
    });
  });

  it("muestra mensaje vacío", async () => {
    mockApi.getSuppliersPaginated.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, pages: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay proveedores registrados")).toBeInTheDocument();
    });
  });

  it("muestra boton de descargar excel", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Descargar Excel")).toBeInTheDocument();
    });
  });

  it("exporta todos los proveedores a excel", async () => {
    mockApi.getSuppliersPaginated.mockResolvedValue({ items: mockSuppliers, total: 2, page: 1, page_size: 20, pages: 1 });
    mockApi.getSuppliers.mockResolvedValue(mockSuppliers);
    renderPage();
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(mockApi.getSuppliers).toHaveBeenCalled();
      expect(exportToExcel).toHaveBeenCalledWith({
        data: mockSuppliers,
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "ID" }),
          expect.objectContaining({ header: "Nombre" }),
          expect.objectContaining({ header: "Telefono" }),
          expect.objectContaining({ header: "Email" }),
        ]),
        filename: "Proveedores",
      });
    });
  });
});
