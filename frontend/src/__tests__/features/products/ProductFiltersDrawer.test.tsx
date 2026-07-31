import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductFiltersDrawer from "../../../features/products/components/ProductFiltersDrawer";
import { FILTERS_DEFAULT } from "../../../features/products/types";

const mockCategories = [
  { id: 1, nombre: "Licores", descripcion: null },
  { id: 2, nombre: "Vinos", descripcion: null },
];
const mockSuppliers = [
  { id: 1, nombre: "Distribuidora X", telefono: null, email: null },
];

describe("ProductFiltersDrawer", () => {
  it("renders nothing when closed", () => {
    render(
      <ProductFiltersDrawer
        open={false} onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={vi.fn()} onClear={vi.fn()}
        categories={[]} suppliers={[]}
      />,
    );
    expect(screen.queryByText("Filtros")).not.toBeInTheDocument();
  });

  it("renders filters when open", () => {
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={vi.fn()} onClear={vi.fn()}
        categories={mockCategories} suppliers={mockSuppliers}
      />,
    );
    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByText("Estado de Stock")).toBeInTheDocument();
    expect(screen.getByText("Categorías")).toBeInTheDocument();
  });

  it("shows category label in the UI", () => {
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={vi.fn()} onClear={vi.fn()}
        categories={mockCategories} suppliers={[]}
      />,
    );
    expect(screen.getByText("Categorías")).toBeInTheDocument();
    expect(screen.getByText("Seleccionar categorías...")).toBeInTheDocument();
  });

  it("shows Aplicar Filtros and Limpiar buttons", () => {
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={vi.fn()} onClear={vi.fn()}
        categories={[]} suppliers={[]}
      />,
    );
    expect(screen.getByText("Aplicar Filtros")).toBeInTheDocument();
    expect(screen.getByText("Limpiar")).toBeInTheDocument();
  });

  it("calls onApply when apply button clicked", async () => {
    const onApply = vi.fn();
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={onApply} onClear={vi.fn()}
        categories={[]} suppliers={[]}
      />,
    );
    await userEvent.click(screen.getByText("Aplicar Filtros"));
    expect(onApply).toHaveBeenCalled();
  });

  it("calls onClear when clear button clicked", async () => {
    const onClear = vi.fn();
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={vi.fn()} onClear={onClear}
        categories={[]} suppliers={[]}
      />,
    );
    await userEvent.click(screen.getByText("Limpiar"));
    expect(onClear).toHaveBeenCalled();
  });

  it("calls onDraftChange when stock status changes", async () => {
    const onDraftChange = vi.fn();
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={onDraftChange} onApply={vi.fn()} onClear={vi.fn()}
        categories={[]} suppliers={[]}
      />,
    );
    const select = screen.getAllByRole("combobox")[0];
    await userEvent.selectOptions(select, "agotado");
    expect(onDraftChange).toHaveBeenCalled();
  });

  it("renders price range inputs", () => {
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={vi.fn()} onClear={vi.fn()}
        categories={[]} suppliers={[]}
      />,
    );
    expect(screen.getByPlaceholderText("Mínimo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Máximo")).toBeInTheDocument();
  });

  it("renders IVA type select", () => {
    render(
      <ProductFiltersDrawer
        open onClose={vi.fn()} draft={FILTERS_DEFAULT}
        onDraftChange={vi.fn()} onApply={vi.fn()} onClear={vi.fn()}
        categories={[]} suppliers={[]}
      />,
    );
    expect(screen.getByText("Todo IVA")).toBeInTheDocument();
  });
});