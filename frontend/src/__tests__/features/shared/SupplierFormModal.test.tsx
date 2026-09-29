import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SupplierFormModal from "@/features/shared/components/SupplierFormModal";
import { api } from "@/services/api";

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

describe("SupplierFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <SupplierFormModal
        open={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.queryByText("Nuevo Proveedor")).not.toBeInTheDocument();
  });

  it("renders create form when open in create mode", () => {
    render(
      <SupplierFormModal
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(screen.getByText("Nuevo Proveedor")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Teléfono")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("Crear proveedor")).toBeInTheDocument();
  });

  it("renders edit form and loads supplier data when supplierId is provided", async () => {
    mockApi.getSupplier.mockResolvedValueOnce(mockSupplier);

    render(
      <SupplierFormModal
        open={true}
        supplierId={1}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText("Editar Proveedor")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.getSupplier).toHaveBeenCalledWith(1);
      expect(screen.getByLabelText("Nombre")).toHaveValue("Distribuidora ABC");
      expect(screen.getByLabelText("Teléfono")).toHaveValue("+58 412 123 4567");
      expect(screen.getByLabelText("Email")).toHaveValue("contacto@distribuidora.com");
    });
    expect(screen.getByText("Guardar cambios")).toBeInTheDocument();
  });

  it("submits create form and invokes onSuccess and onCreated", async () => {
    mockApi.createSupplier.mockResolvedValueOnce(mockSupplier);
    const onSuccess = vi.fn();
    const onCreated = vi.fn();
    const user = userEvent.setup();

    render(
      <SupplierFormModal
        open={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        onCreated={onCreated}
      />,
    );

    await user.type(screen.getByLabelText("Nombre"), "distribuidora abc");
    await user.type(screen.getByLabelText("Teléfono"), "+58 412 123 4567");
    await user.type(screen.getByLabelText("Email"), "contacto@distribuidora.com");
    await user.click(screen.getByText("Crear proveedor"));

    await waitFor(() => {
      expect(mockApi.createSupplier).toHaveBeenCalledWith({
        nombre: "Distribuidora Abc",
        telefono: "+58 412 123 4567",
        email: "contacto@distribuidora.com",
      });
      expect(onSuccess).toHaveBeenCalledWith(mockSupplier);
      expect(onCreated).toHaveBeenCalledWith(mockSupplier);
    });
  });

  it("submits edit form and invokes updateSupplier", async () => {
    mockApi.getSupplier.mockResolvedValueOnce(mockSupplier);
    mockApi.updateSupplier.mockResolvedValueOnce({
      ...mockSupplier,
      nombre: "Distribuidora Actualizada",
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(
      <SupplierFormModal
        open={true}
        supplierId={1}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Nombre")).toHaveValue("Distribuidora ABC");
    });

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Distribuidora Actualizada");
    await user.click(screen.getByText("Guardar cambios"));

    await waitFor(() => {
      expect(mockApi.updateSupplier).toHaveBeenCalledWith(1, {
        nombre: "Distribuidora Actualizada",
        telefono: "+58 412 123 4567",
        email: "contacto@distribuidora.com",
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("calls onClose when Cancelar is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <SupplierFormModal
        open={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});
