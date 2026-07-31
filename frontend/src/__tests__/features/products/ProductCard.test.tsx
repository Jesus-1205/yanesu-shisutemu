import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductCard from "../../../features/products/components/ProductCard";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import type { Product } from "../../../types/api";

vi.mock("../../../services/api", () => ({ api: {} }));

const baseProduct: Product = {
  id: 1,
  codigo_barra: "ABC123",
  nombre: "Whisky Premium",
  categories: [{ id: 1, nombre: "Licores", descripcion: null }],
  unidades_por_caja: 12,
  stock_unidades: 50,
  stock_minimo: 5,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: null,
  tipo_iva: "GRAVADO",
};

beforeEach(() => {
  useExchangeRateStore.setState({ tasa: 0, loading: false });
});

describe("ProductCard", () => {
  it("renders product name and barcode", () => {
    render(<ProductCard product={baseProduct} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Whisky Premium")).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("renders categories as badges", () => {
    render(<ProductCard product={baseProduct} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Licores")).toBeInTheDocument();
  });

  it("shows units per case", () => {
    render(<ProductCard product={baseProduct} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/12\s*uds\/caja/)).toBeInTheDocument();
  });

  it("shows stock count", () => {
    render(<ProductCard product={baseProduct} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/50\s*uds/)).toBeInTheDocument();
  });

  it("shows formatted price in USD", () => {
    render(<ProductCard product={baseProduct} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("$15,00")).toBeInTheDocument();
  });

  it("shows VES price when tasa > 0", () => {
    useExchangeRateStore.setState({ tasa: 45.5, loading: false });
    render(<ProductCard product={baseProduct} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Bs\s+682[,.]50/)).toBeInTheDocument();
  });

  it("shows danger stock badge when out of stock", () => {
    const p = { ...baseProduct, stock_unidades: 0 };
    render(<ProductCard product={p} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByText("0 uds");
    expect(badge.className).toMatch(/bg-danger|text-danger/);
  });

  it("shows warning stock badge when low stock", () => {
    const p = { ...baseProduct, stock_unidades: 3, stock_minimo: 5 };
    render(<ProductCard product={p} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByText("3 uds");
    expect(badge.className).toMatch(/bg-orange-50|text-accent-orange/);
  });

  it("calls onEdit when edit button clicked", async () => {
    const onEdit = vi.fn();
    render(<ProductCard product={baseProduct} onEdit={onEdit} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Editar"));
    expect(onEdit).toHaveBeenCalledWith(baseProduct);
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    render(<ProductCard product={baseProduct} onEdit={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByLabelText("Eliminar"));
    expect(onDelete).toHaveBeenCalledWith(baseProduct);
  });

  it("does not render barcode section when null", () => {
    const p = { ...baseProduct, codigo_barra: null };
    render(<ProductCard product={p} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText("ABC123")).not.toBeInTheDocument();
  });
});