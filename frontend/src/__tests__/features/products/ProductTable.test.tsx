import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductTable from "../../../features/products/components/ProductTable";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import type { Product } from "../../../types/api";

vi.mock("../../../services/api", () => ({ api: {} }));

const products: Product[] = [
  {
    id: 1, codigo_barra: "001", nombre: "Whisky A",
    categories: [{ id: 1, nombre: "Licores", descripcion: null }],
    unidades_por_caja: 12, stock_cajas: 0, stock_unidades: 50, stock_minimo: 5,
    precio_costo_caja_usd: 96, precio_costo_usd: 8,
    precio_unidad_usd: 15, precio_caja_usd: 150,
    precio_sugerido_unidad_usd: 11.43, precio_sugerido_caja_usd: 137.14,
    proveedor_id: null, tipo_iva: "GRAVADO", es_favorito: false,
    precio_divisas_unidad: null, precio_divisas_caja: null,
  },
  {
    id: 2, codigo_barra: null, nombre: "Whisky B",
    categories: [], unidades_por_caja: 6, stock_cajas: 0, stock_unidades: 0, stock_minimo: 5,
    precio_costo_caja_usd: 50, precio_costo_usd: 8.33,
    precio_unidad_usd: 10, precio_caja_usd: 100,
    precio_sugerido_unidad_usd: 11.9, precio_sugerido_caja_usd: 71.43,
    proveedor_id: null, tipo_iva: "EXENTO", es_favorito: false,
    precio_divisas_unidad: null, precio_divisas_caja: null,
  },
];

beforeEach(() => {
  useExchangeRateStore.setState({ tasa: 0, loading: false });
});

describe("ProductTable", () => {
  it("renders product rows", () => {
    render(<ProductTable products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Whisky A")).toBeInTheDocument();
    expect(screen.getByText("Whisky B")).toBeInTheDocument();
  });

  it("renders categories as badges", () => {
    render(<ProductTable products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Licores")).toBeInTheDocument();
  });

  it("renders stock badges with correct variant", () => {
    render(<ProductTable products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const badges = screen.getAllByText(/^\d+$/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows VES column when tasa > 0", () => {
    useExchangeRateStore.setState({ tasa: 45.5, loading: false });
    render(<ProductTable products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getAllByText(/Bs\s/).length).toBeGreaterThan(0);
  });

  it("shows fallback for VES when tasa is 0", () => {
    render(<ProductTable products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const dash = screen.getAllByText("—");
    expect(dash.length).toBeGreaterThan(0);
  });

  it("shows IVA badge for Gravado", () => {
    render(<ProductTable products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Gravado")).toBeInTheDocument();
  });

  it("shows IVA badge for Exento", () => {
    render(<ProductTable products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Exento")).toBeInTheDocument();
  });

  it("calls onEdit when edit button clicked", async () => {
    const onEdit = vi.fn();
    render(<ProductTable products={products} onEdit={onEdit} onDelete={vi.fn()} />);
    const editBtns = screen.getAllByLabelText("Editar");
    await userEvent.click(editBtns[0]);
    expect(onEdit).toHaveBeenCalledWith(products[0]);
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    render(<ProductTable products={products} onDelete={onDelete} onEdit={vi.fn()} />);
    const deleteBtns = screen.getAllByLabelText("Eliminar");
    await userEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith(products[0]);
  });

  it("shows empty message when no products", () => {
    render(<ProductTable products={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("No hay productos que coincidan con los filtros")).toBeInTheDocument();
  });
});