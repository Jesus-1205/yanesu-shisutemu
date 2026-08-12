import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductGrid from "../../../../features/sales/components/ProductGrid";
import type { ProductOut } from "../../../../types/api";

interface MockCardProps {
  product: ProductOut;
  tasa: number;
  isOperator: boolean;
  onAddUnit: () => void;
  onAddBox: () => void;
}

vi.mock("../../../../features/sales/components/ProductCard", () => ({
  default: ({ product, tasa, isOperator, onAddUnit, onAddBox }: MockCardProps) => (
    <div data-testid={`product-card-${product.id}`} data-tasa={tasa} data-is-operator={String(isOperator)}>
      <span>{product.nombre}</span>
      <button onClick={onAddUnit}>add-unit</button>
      <button onClick={onAddBox}>add-box</button>
    </div>
  ),
}));

const baseProduct: ProductOut = {
  id: 1,
  codigo_barra: "7791234567890",
  nombre: "Whisky X 750ml",
  categories: [],
  unidades_por_caja: 12,
  stock_cajas: 2,
  stock_unidades: 5,
  stock_minimo: 5,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: null,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

const products: ProductOut[] = [
  baseProduct,
  { ...baseProduct, id: 2, nombre: "Ron X 1L" },
  { ...baseProduct, id: 3, nombre: "Gin X 700ml" },
];

describe("ProductGrid", () => {
  it("muestra skeletons cuando loading es true", () => {
    const { container } = render(
      <ProductGrid products={products} tasa={0} isOperator={false} loading onAddUnit={vi.fn()} onAddBox={vi.fn()} />
    );
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid!.children.length).toBe(8);
    expect(screen.queryByText("Whisky X 750ml")).not.toBeInTheDocument();
    expect(screen.queryByText("No se encontraron productos")).not.toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay productos", () => {
    render(
      <ProductGrid products={[]} tasa={0} isOperator={false} loading={false} onAddUnit={vi.fn()} onAddBox={vi.fn()} />
    );
    expect(screen.getByText("No se encontraron productos")).toBeInTheDocument();
    expect(screen.getByText("Intenta con otra búsqueda")).toBeInTheDocument();
  });

  it("renderiza una ProductCard por producto", () => {
    render(
      <ProductGrid products={products} tasa={45.5} isOperator={false} loading={false} onAddUnit={vi.fn()} onAddBox={vi.fn()} />
    );
    expect(screen.getAllByTestId(/^product-card-/)).toHaveLength(3);
    expect(screen.getByText("Whisky X 750ml")).toBeInTheDocument();
    expect(screen.getByText("Ron X 1L")).toBeInTheDocument();
    expect(screen.getByText("Gin X 700ml")).toBeInTheDocument();
  });

  it("pasa tasa e isOperator a las cards", () => {
    render(
      <ProductGrid products={products} tasa={45.5} isOperator loading={false} onAddUnit={vi.fn()} onAddBox={vi.fn()} />
    );
    expect(screen.getByTestId("product-card-1")).toHaveAttribute("data-tasa", "45.5");
    expect(screen.getByTestId("product-card-1")).toHaveAttribute("data-is-operator", "true");
  });

  it("delega onAddUnit a la card del producto correcto", async () => {
    const onAddUnit = vi.fn();
    render(
      <ProductGrid products={products} tasa={0} isOperator={false} loading={false} onAddUnit={onAddUnit} onAddBox={vi.fn()} />
    );
    const card = screen.getByTestId("product-card-2");
    await userEvent.click(card.querySelector("button")!);
    expect(onAddUnit).toHaveBeenCalledTimes(1);
    expect(onAddUnit).toHaveBeenCalledWith(products[1]);
  });

  it("delega onAddBox a la card del producto correcto", async () => {
    const onAddBox = vi.fn();
    render(
      <ProductGrid products={products} tasa={0} isOperator={false} loading={false} onAddUnit={vi.fn()} onAddBox={onAddBox} />
    );
    const card = screen.getByTestId("product-card-3");
    const buttons = card.querySelectorAll("button");
    await userEvent.click(buttons[1]);
    expect(onAddBox).toHaveBeenCalledTimes(1);
    expect(onAddBox).toHaveBeenCalledWith(products[2]);
  });
});
