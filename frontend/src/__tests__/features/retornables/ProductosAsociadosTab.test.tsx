import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductosAsociadosTab } from "../../../features/retornables/components/ProductosAsociadosTab";
import type { RetornableProductoOut } from "@/types/api";

vi.mock("../../../services/api", () => ({
  api: {
    getProducts: vi.fn().mockResolvedValue({ items: [] }),
    asociarRetornableProducto: vi.fn(),
    desasociarRetornableProducto: vi.fn(),
  },
}));

vi.mock("../../../ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const productosBase: RetornableProductoOut[] = [
  { id: 1, producto_id: 1, presentacion: "222", producto_nombre: "Polar 222ml", stock_cajas: 10, stock_unidades: 18 },
  { id: 2, producto_id: 2, presentacion: "222", producto_nombre: "Polar 222ml Extra", stock_cajas: 5, stock_unidades: 0 },
  { id: 3, producto_id: 3, presentacion: "333", producto_nombre: "Polar 333ml", stock_cajas: 8, stock_unidades: 12 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProductosAsociadosTab", () => {
  it("shows loading spinner", () => {
    render(<ProductosAsociadosTab productos={[]} loading={true} onRefresh={vi.fn()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders both presentation sections", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText(/Presentación 222ml/)).toBeInTheDocument();
    expect(screen.getByText(/Presentación 333ml/)).toBeInTheDocument();
  });

  it("shows botellas por caja for 222", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText(/36 botellas\/caja/)).toBeInTheDocument();
  });

  it("shows botellas por caja for 333", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText(/24 botellas\/caja/)).toBeInTheDocument();
  });

  it("renders product names", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText("Polar 222ml")).toBeInTheDocument();
    expect(screen.getByText("Polar 222ml Extra")).toBeInTheDocument();
    expect(screen.getByText("Polar 333ml")).toBeInTheDocument();
  });

  it("renders stock cajas", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("calculates total botellas for 222 (cajas*36 + unidades)", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    // 10*36 + 18 = 378
    expect(screen.getByText("378")).toBeInTheDocument();
  });

  it("calculates total botellas for 333 (cajas*24 + unidades)", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    // 8*24 + 12 = 204
    expect(screen.getByText("204")).toBeInTheDocument();
  });

  it("shows empty state for section with no products", () => {
    render(<ProductosAsociadosTab productos={[productosBase[2]]} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText("No hay productos asociados a esta presentación")).toBeInTheDocument();
  });

  it("renders Asociar button", () => {
    render(<ProductosAsociadosTab productos={[]} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getAllByText("Asociar").length).toBe(2);
  });

  it("renders search input placeholder", () => {
    render(<ProductosAsociadosTab productos={[]} loading={false} onRefresh={vi.fn()} />);
    expect(screen.getAllByPlaceholderText("Buscar producto por nombre...").length).toBe(2);
  });

  it("filters products by presentation", () => {
    render(<ProductosAsociadosTab productos={productosBase} loading={false} onRefresh={vi.fn()} />);
    // 222 section should have 2 products, 333 should have 1
    const rows222 = screen.getAllByText(/Polar 222/);
    expect(rows222.length).toBe(2);
    const rows333 = screen.getAllByText(/Polar 333/);
    expect(rows333.length).toBe(1);
  });
});
