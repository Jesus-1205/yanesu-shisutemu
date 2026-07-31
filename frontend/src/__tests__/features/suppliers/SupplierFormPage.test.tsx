import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SupplierFormPage from "@/features/suppliers/pages/SupplierFormPage";
import { api } from "@/services/api";

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockUseParams() };
});

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockSupplier = {
  id: 1,
  nombre: "Distribuidora ABC",
  telefono: "+58 412 123 4567",
  email: "contacto@distribuidora.com",
};

vi.mock("@/services/api", () => ({
  api: {
    getSupplier: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

function renderNewPage() {
  mockUseParams.mockReturnValue({}); // no id = new mode
  return render(
    <MemoryRouter>
      <SupplierFormPage />
    </MemoryRouter>
  );
}

function renderEditPage() {
  mockUseParams.mockReturnValue({ id: "1" }); // has id = edit mode
  return render(
    <MemoryRouter>
      <SupplierFormPage />
    </MemoryRouter>
  );
}

describe("SupplierFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe("New mode", () => {
    it("renders empty form with required fields", () => {
      renderNewPage();
      expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
      expect(screen.getByLabelText("Teléfono")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByText("Crear proveedor")).toBeInTheDocument();
    });

    it("creates supplier and navigates to /suppliers", async () => {
      mockApi.createSupplier.mockResolvedValue({ id: 1, nombre: "Nuevo Proveedor", telefono: "+58 412 123 4567", email: "nuevo@correo.com" });
      const user = userEvent.setup();
      renderNewPage();

      await user.type(screen.getByLabelText("Nombre"), "Nuevo Proveedor");
      await user.type(screen.getByLabelText("Teléfono"), "+58 412 123 4567");
      await user.type(screen.getByLabelText("Email"), "nuevo@correo.com");

      await user.click(screen.getByText("Crear proveedor"));

      await waitFor(() => {
        expect(mockApi.createSupplier).toHaveBeenCalledWith({
          nombre: "Nuevo Proveedor",
          telefono: "+58 412 123 4567",
          email: "nuevo@correo.com",
        });
        expect(mockToast).toHaveBeenCalledWith("Proveedor creado", "success");
        expect(mockNavigate).toHaveBeenCalledWith("/suppliers");
      });
    });

    it("creates supplier with optional fields empty", async () => {
      mockApi.createSupplier.mockResolvedValue({ id: 2, nombre: "Solo Nombre", telefono: null, email: null });
      const user = userEvent.setup();
      renderNewPage();

      await user.type(screen.getByLabelText("Nombre"), "Solo Nombre");
      await user.click(screen.getByText("Crear proveedor"));

      await waitFor(() => {
        expect(mockApi.createSupplier).toHaveBeenCalledWith({
          nombre: "Solo Nombre",
          telefono: null,
          email: null,
        });
      });
    });

    it("shows error when create fails", async () => {
      mockApi.createSupplier.mockRejectedValue(new Error("Error de red"));
      const user = userEvent.setup();
      renderNewPage();

      await user.type(screen.getByLabelText("Nombre"), "Test");
      await user.click(screen.getByText("Crear proveedor"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Error de red", "error");
      });
    });

    it("shows loading state on submit button", async () => {
      let resolveCreate: (value: import("@/types/api").SupplierOut) => void;
      mockApi.createSupplier.mockImplementation(() => new Promise((r) => { resolveCreate = r; }));
      const user = userEvent.setup();
      renderNewPage();

      await user.type(screen.getByLabelText("Nombre"), "Test");
      await user.click(screen.getByText("Crear proveedor"));

      // Button shows spinner when loading (check disabled state)
      expect(screen.getByText("Crear proveedor")).toBeDisabled();

      resolveCreate!({ id: 3, nombre: "Test", telefono: null, email: null });
      await waitFor(() => {
        expect(screen.getByText("Crear proveedor")).not.toBeDisabled();
      });
    });
  });

  describe("Edit mode", () => {
    it("loads supplier data and pre-fills form", async () => {
      mockApi.getSupplier.mockResolvedValue(mockSupplier);
      renderEditPage();

      await waitFor(() => {
        expect(mockApi.getSupplier).toHaveBeenCalledWith(1);
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Nombre")).toHaveValue("Distribuidora ABC");
        expect(screen.getByLabelText("Teléfono")).toHaveValue("+58 412 123 4567");
        expect(screen.getByLabelText("Email")).toHaveValue("contacto@distribuidora.com");
      });
    });

    it("shows loading spinner while fetching", () => {
      mockApi.getSupplier.mockImplementation(() => new Promise(() => {}));
      renderEditPage();
      // Spinner component renders instead of form
      expect(screen.queryByText("Crear proveedor")).not.toBeInTheDocument();
    });

    it("shows error toast when load fails", async () => {
      mockApi.getSupplier.mockRejectedValue(new Error("Error al cargar proveedor"));
      renderEditPage();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Error al cargar proveedor", "error");
      });
    });

    it("shows 'Editar Proveedor' title", async () => {
      mockApi.getSupplier.mockResolvedValue(mockSupplier);
      renderEditPage();

      await waitFor(() => {
        expect(screen.getByText("Editar Proveedor")).toBeInTheDocument();
        expect(screen.getByText("Modifica los datos del proveedor")).toBeInTheDocument();
      });
    });

    it("updates supplier and navigates to /suppliers", async () => {
      mockApi.getSupplier.mockResolvedValue(mockSupplier);
      mockApi.updateSupplier.mockResolvedValue({ id: 1, nombre: "Distribuidora Actualizada", telefono: "+58 412 123 4567", email: "contacto@distribuidora.com" });
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveValue("Distribuidora ABC"));

      await user.clear(screen.getByLabelText("Nombre"));
      await user.type(screen.getByLabelText("Nombre"), "Distribuidora Actualizada");

      await user.click(screen.getByText("Guardar cambios"));

      await waitFor(() => {
        expect(mockApi.updateSupplier).toHaveBeenCalledWith(1, {
          nombre: "Distribuidora Actualizada",
          telefono: "+58 412 123 4567",
          email: "contacto@distribuidora.com",
        });
        expect(mockToast).toHaveBeenCalledWith("Proveedor actualizado", "success");
        expect(mockNavigate).toHaveBeenCalledWith("/suppliers");
      });
    });

    it("updates supplier with partial data (optional fields undefined)", async () => {
      const supplierNoOptional = { ...mockSupplier, telefono: null, email: null };
      mockApi.getSupplier.mockResolvedValue(supplierNoOptional);
      mockApi.updateSupplier.mockResolvedValue({ id: 1, nombre: "Distribuidora ABC", telefono: null, email: null });
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveValue("Distribuidora ABC"));

      await user.click(screen.getByText("Guardar cambios"));

      await waitFor(() => {
        expect(mockApi.updateSupplier).toHaveBeenCalledWith(1, {
          nombre: "Distribuidora ABC",
          telefono: null,
          email: null,
        });
      });
    });

    it("shows error when update fails", async () => {
      mockApi.getSupplier.mockResolvedValue(mockSupplier);
      mockApi.updateSupplier.mockRejectedValue(new Error("Error al actualizar"));
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveValue("Distribuidora ABC"));

      await user.click(screen.getByText("Guardar cambios"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Error al actualizar", "error");
      });
    });
  });

  describe("Navigation", () => {
    it("navigates to /suppliers on Cancelar click in new mode", async () => {
      const user = userEvent.setup();
      renderNewPage();

      await user.click(screen.getByText("Cancelar"));
      expect(mockNavigate).toHaveBeenCalledWith("/suppliers");
    });

    it("navigates to /suppliers on Cancelar click in edit mode", async () => {
      mockApi.getSupplier.mockResolvedValue(mockSupplier);
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveValue("Distribuidora ABC"));

      await user.click(screen.getByText("Cancelar"));
      expect(mockNavigate).toHaveBeenCalledWith("/suppliers");
    });
  });
});