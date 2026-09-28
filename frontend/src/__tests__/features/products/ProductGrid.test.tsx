import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProductGrid from "@/features/products/components/ProductGrid";
import type { ProductOut as Product } from "@/types/api";

describe("ProductGrid", () => {
  const products: Product[] = [
    {
      id: 1,
      nombre: "Producto 1",
      codigo_barra: "111",
      categories: [{ id: 1, nombre: "Cat 1", descripcion: null }],
      unidades_por_caja: 12,
      stock_unidades: 20,
      stock_cajas: 1,
      stock_minimo: 5,
      precio_costo_caja_usd: 10.0,
      precio_costo_usd: 0.83,
      precio_unidad_usd: 1.5,
      precio_caja_usd: 15.0,
      proveedor_id: 1,
      tipo_iva: "GRAVADO",
      es_favorito: false,
      precio_sugerido_unidad_usd: 1.19,
      precio_sugerido_caja_usd: 14.29,
      precio_divisas_unidad: null,
      precio_divisas_caja: null,
    },
    {
      id: 2,
      nombre: "Producto 2",
      codigo_barra: "222",
      categories: [{ id: 2, nombre: "Cat 2", descripcion: null }],
      unidades_por_caja: 24,
      stock_unidades: 50,
      stock_cajas: 2,
      stock_minimo: 10,
      precio_costo_caja_usd: 20.0,
      precio_costo_usd: 0.83,
      precio_unidad_usd: 2.0,
      precio_caja_usd: 30.0,
      proveedor_id: 2,
      tipo_iva: "EXENTO",
      es_favorito: true,
      precio_sugerido_unidad_usd: 1.19,
      precio_sugerido_caja_usd: 28.57,
      precio_divisas_unidad: null,
      precio_divisas_caja: null,
    },
  ];

  it("renders a card for each product in the grid", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onToggleFavorite = vi.fn();

    render(
      <ProductGrid
        products={products}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleFavorite={onToggleFavorite}
      />
    );

    expect(screen.getByText("Producto 1")).toBeInTheDocument();
    expect(screen.getByText("Producto 2")).toBeInTheDocument();

    const editButtons = screen.getAllByRole("button", { name: /editar/i });
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(products[0]);
  });
});
