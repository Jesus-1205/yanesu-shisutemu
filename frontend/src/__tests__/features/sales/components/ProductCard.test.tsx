import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductCard from "../../../../features/sales/components/ProductCard";
import type { ProductOut } from "../../../../types/api";

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

interface RenderCardOptions {
  tasa?: number;
  isOperator?: boolean;
  onAddUnit?: () => void;
  onAddBox?: () => void;
}

function renderCard(overrides: Partial<ProductOut> = {}, options: RenderCardOptions = {}) {
  const onAddUnit = options.onAddUnit ?? vi.fn();
  const onAddBox = options.onAddBox ?? vi.fn();
  const { container } = render(
    <ProductCard
      product={{ ...baseProduct, ...overrides }}
      tasa={options.tasa ?? 0}
      isOperator={options.isOperator ?? false}
      onAddUnit={onAddUnit}
      onAddBox={onAddBox}
    />
  );
  return { container, onAddUnit, onAddBox };
}

describe("ProductCard (sales)", () => {
  it("muestra el nombre del producto", () => {
    renderCard();
    expect(screen.getByText("Whisky X 750ml")).toBeInTheDocument();
  });

  it("llama onAddUnit al hacer click en la tarjeta", async () => {
    const { onAddUnit, onAddBox } = renderCard({}, { tasa: 45.5 });
    await userEvent.click(screen.getByText("Whisky X 750ml"));
    expect(onAddUnit).toHaveBeenCalledTimes(1);
    expect(onAddBox).not.toHaveBeenCalled();
  });

  it("no llama onAddUnit cuando el precio unitario es 0", async () => {
    const { onAddUnit } = renderCard({ precio_unidad_usd: 0 });
    await userEvent.click(screen.getByText("Whisky X 750ml"));
    expect(onAddUnit).not.toHaveBeenCalled();
  });

  it("muestra stock combinado 'X cj | Y und' cuando hay cajas", () => {
    renderCard();
    expect(screen.getByText("2 cj | 5 und")).toBeInTheDocument();
  });

  it("muestra stock solo en unidades cuando stock_cajas es 0", () => {
    renderCard({ stock_cajas: 0, stock_unidades: 50 });
    expect(screen.getByText("50 und")).toBeInTheDocument();
  });

  it("muestra etiqueta de operador en vez de unidades", () => {
    renderCard({}, { isOperator: true });
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.queryByText("2 cj | 5 und")).not.toBeInTheDocument();
  });

  it("muestra precio USD y precio en Bs calculado con la tasa", () => {
    renderCard({}, { tasa: 45.5 });
    expect(screen.getByText("$15,00")).toBeInTheDocument();
    // 15 * 45.5 = 682.5 → "Bs 682,50" (formato es-VE)
    expect(screen.getByText("Bs 682,50")).toBeInTheDocument();
  });

  it("no muestra precio en Bs cuando la tasa es 0", () => {
    renderCard({}, { tasa: 0 });
    expect(screen.queryByText(/^Bs /)).not.toBeInTheDocument();
  });

  it("muestra overlay AGOTADO y no agrega al hacer click cuando está agotado", async () => {
    const { onAddUnit } = renderCard({ stock_cajas: 0, stock_unidades: 0 });
    expect(screen.getByText("AGOTADO")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Whisky X 750ml"));
    expect(onAddUnit).not.toHaveBeenCalled();
  });

  it("muestra el botón CAJA y al hacer click llama onAddBox sin disparar onAddUnit", async () => {
    const { onAddBox, onAddUnit } = renderCard({}, { tasa: 45.5 });
    const boxButton = screen.getByRole("button", { name: "CAJA" });
    expect(boxButton).toBeInTheDocument();
    await userEvent.click(boxButton);
    expect(onAddBox).toHaveBeenCalledTimes(1);
    expect(onAddUnit).not.toHaveBeenCalled();
  });

  it("no renderiza el botón CAJA cuando unidades_por_caja <= 1", () => {
    renderCard({ unidades_por_caja: 1 });
    expect(screen.queryByRole("button", { name: "CAJA" })).not.toBeInTheDocument();
  });

  it("deshabilita el botón CAJA cuando el producto está agotado", () => {
    renderCard({ stock_cajas: 0, stock_unidades: 0 });
    expect(screen.getByRole("button", { name: "CAJA" })).toBeDisabled();
  });

  it("muestra estrella para producto favorito", () => {
    const { container } = renderCard({ es_favorito: true });
    expect(container.querySelector(".lucide-star")).not.toBeNull();
  });

  it("no muestra estrella para producto no favorito", () => {
    const { container } = renderCard({ es_favorito: false });
    expect(container.querySelector(".lucide-star")).toBeNull();
  });
});
