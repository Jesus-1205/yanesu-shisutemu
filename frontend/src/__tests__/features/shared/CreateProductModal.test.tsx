import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateProductModal from "../../../features/shared/components/CreateProductModal";

const mockGetCategories = vi.fn();
const mockGetSuppliers = vi.fn();
const mockCreateProduct = vi.fn();

vi.mock("../../../services/api", () => ({
  api: {
    getCategories: (...args: unknown[]) => mockGetCategories(...args),
    getSuppliers: (...args: unknown[]) => mockGetSuppliers(...args),
    createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  },
}));

vi.mock("../../../features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, rol_nombre: "ADMINISTRADOR", nombre_completo: "Admin Test" },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCategories.mockResolvedValue([]);
  mockGetSuppliers.mockResolvedValue([]);
});

describe("CreateProductModal", () => {
  it("renders nothing when closed", () => {
    render(<CreateProductModal open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByText("Nuevo Producto")).not.toBeInTheDocument();
  });

  it("renders form when open", async () => {
    render(<CreateProductModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Nuevo Producto")).toBeInTheDocument());
    expect(screen.getByText("Información General")).toBeInTheDocument();
    expect(screen.getByText("Precios y Finanzas")).toBeInTheDocument();
  });

  it("loads categories and suppliers on open", async () => {
    mockGetCategories.mockResolvedValue([{ id: 1, nombre: "Licores", descripcion: null }]);
    mockGetSuppliers.mockResolvedValue([{ id: 1, nombre: "Dist ABC", telefono: null, email: null }]);
    render(<CreateProductModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    await waitFor(() => {
      expect(mockGetCategories).toHaveBeenCalled();
      expect(mockGetSuppliers).toHaveBeenCalled();
    });
  });

  it("shows Crear producto button", async () => {
    render(<CreateProductModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText("Crear producto")).toBeInTheDocument();
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalled());
  });

  it("shows Cancelar button", async () => {
    render(<CreateProductModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalled());
  });

  it("calls onClose when Cancelar clicked", async () => {
    const onClose = vi.fn();
    render(<CreateProductModal open onClose={onClose} onCreated={vi.fn()} />);
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalled());
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});