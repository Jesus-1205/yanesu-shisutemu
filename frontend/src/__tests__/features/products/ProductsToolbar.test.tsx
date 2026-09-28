import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import ProductsToolbar from "@/features/products/components/ProductsToolbar";
import { useProductsStore } from "@/features/products/stores/useProductsStore";

describe("ProductsToolbar", () => {
  beforeEach(() => {
    useProductsStore.getState().resetAll();
  });

  const renderWithRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  it("renders search input, buttons and updates store", () => {
    const handleOpenCreate = vi.fn();
    renderWithRouter(
      <ProductsToolbar isOperator={false} onOpenCreate={handleOpenCreate} />,
    );

    const searchInput = screen.getByPlaceholderText(/Buscar nombre o código/i);
    fireEvent.change(searchInput, { target: { value: "Cerveza" } });
    expect(useProductsStore.getState().filters.search).toBe("Cerveza");

    const favButton = screen.getByTitle("Mostrar solo favoritos");
    fireEvent.click(favButton);
    expect(useProductsStore.getState().showFavoritesOnly).toBe(true);

    const filtersButton = screen.getByRole("button", { name: /Filtros/i });
    fireEvent.click(filtersButton);
    expect(useProductsStore.getState().drawerOpen).toBe(true);

    const newButton = screen.getByRole("button", { name: /Nuevo/i });
    fireEvent.click(newButton);
    expect(handleOpenCreate).toHaveBeenCalled();
  });

  it("shows active filters badge when store has active filters", () => {
    useProductsStore.getState().updateDraftFilters((prev) => ({
      ...prev,
      categoria_ids: [1, 2],
      stockStatus: "bajo",
    }));
    useProductsStore.getState().applyDraftFilters();

    renderWithRouter(<ProductsToolbar isOperator={false} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("hides admin controls when isOperator is true", () => {
    renderWithRouter(<ProductsToolbar isOperator={true} />);
    expect(screen.queryByTitle("Gestión de Catálogo")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
