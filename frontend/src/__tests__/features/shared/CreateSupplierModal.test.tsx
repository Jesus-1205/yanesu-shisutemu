import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateSupplierModal from "../../../features/shared/components/CreateSupplierModal";

const mockCreateSupplier = vi.fn();
vi.mock("../../../services/api", () => ({
  api: { createSupplier: (...args: unknown[]) => mockCreateSupplier(...args) },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("CreateSupplierModal", () => {
  it("renders nothing when closed", () => {
    render(<CreateSupplierModal open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByText("Nuevo Proveedor")).not.toBeInTheDocument();
  });

  it("renders form when open", () => {
    render(<CreateSupplierModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText("Nuevo Proveedor")).toBeInTheDocument();
    expect(screen.getByText("Teléfono")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Crear proveedor")).toBeInTheDocument();
  });

  it("calls api.createSupplier on submit", async () => {
    mockCreateSupplier.mockResolvedValueOnce({ id: 1, nombre: "Dist Abc", telefono: null, email: null });
    const onCreated = vi.fn();
    render(<CreateSupplierModal open onClose={vi.fn()} onCreated={onCreated} />);
    await userEvent.type(screen.getByPlaceholderText(/Distribuidora/), "Dist ABC");
    await userEvent.type(screen.getByPlaceholderText(/\+58/), "+584121234567");
    await userEvent.click(screen.getByText("Crear proveedor"));
    await waitFor(() => {
      expect(mockCreateSupplier).toHaveBeenCalledWith({
        nombre: "Dist Abc",
        telefono: "+584121234567",
        email: null,
      });
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it("shows error on failure", async () => {
    mockCreateSupplier.mockRejectedValueOnce(new Error("Error de red"));
    render(<CreateSupplierModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/Distribuidora/), "Test");
    await userEvent.click(screen.getByText("Crear proveedor"));
    await waitFor(() => expect(screen.getByText("Error de red")).toBeInTheDocument());
  });

  it("calls onClose when Cancelar clicked", async () => {
    const onClose = vi.fn();
    render(<CreateSupplierModal open onClose={onClose} onCreated={vi.fn()} />);
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});