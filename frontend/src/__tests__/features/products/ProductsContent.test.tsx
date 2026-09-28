import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import ProductsContent from "@/features/products/components/ProductsContent";
import { useProductsStore } from "@/features/products/stores/useProductsStore";
import type { ProductOut as Product } from "@/types/api";

describe("ProductsContent", () => {
  beforeEach(() => {
    useProductsStore.getState().resetAll();
  });

  const renderWithRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  const defaultProps = {
    loading: false,
    products: [] as Product[],
    totalPages: 3,
    isOperator: false,
    onPageChange: vi.fn(),
    onOpenCreate: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleFavorite: vi.fn(),
  };

  const sampleProducts: Product[] = [
    {
      id: 1,
      nombre: "Ron Cacique",
      codigo_barra: "123",
      categories: [],
      unidades_por_caja: 12,
      stock_unidades: 10,
      stock_cajas: 0,
      stock_minimo: 2,
      precio_costo_caja_usd: 10.0,
      precio_costo_usd: 0.83,
      precio_unidad_usd: 1.5,
      precio_caja_usd: 15.0,
      proveedor_id: null,
      tipo_iva: "GRAVADO",
      es_favorito: false,
      precio_sugerido_unidad_usd: 1.19,
      precio_sugerido_caja_usd: 14.29,
      precio_divisas_unidad: null,
      precio_divisas_caja: null,
    },
  ];

  it("renders spinner when loading is true", () => {
    renderWithRouter(<ProductsContent {...defaultProps} loading={true} />);
    expect(screen.queryByText("No hay productos")).not.toBeInTheDocument();
  });

  it("renders empty state when products array is empty", () => {
    renderWithRouter(<ProductsContent {...defaultProps} products={[]} />);
    expect(screen.getByText("No hay productos")).toBeInTheDocument();
    expect(screen.getByText("Registra tu primer producto")).toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: "Nuevo Producto" });
    fireEvent.click(createBtn);
    expect(defaultProps.onOpenCreate).toHaveBeenCalled();
  });

  it("renders ProductGrid when view is grid and not operator", () => {
    useProductsStore.getState().setView("grid");
    renderWithRouter(
      <ProductsContent
        {...defaultProps}
        products={sampleProducts}
        isOperator={false}
      />,
    );
    expect(screen.getByText("Ron Cacique")).toBeInTheDocument();
  });

  it("renders ProductTable when view is table or isOperator is true", () => {
    useProductsStore.getState().setView("table");
    renderWithRouter(
      <ProductsContent
        {...defaultProps}
        products={sampleProducts}
        isOperator={false}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
