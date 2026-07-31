import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductFilters from "../../../features/products/components/ProductFilters";
import type { ProductFiltersState } from "../../../features/products/types";

const defaultFilters: ProductFiltersState = {
  search: "",
  categoria_ids: [],
  proveedor_id: null,
  stockStatus: "todos",
  sortField: "nombre",
  sortOrder: "asc",
  precio_min: "",
  precio_max: "",
  tipo_iva: "",
};

const mockCategories = [
  { id: 1, nombre: "Licores", descripcion: null },
  { id: 2, nombre: "Vinos", descripcion: null },
];

const mockSuppliers = [
  { id: 1, nombre: "Distribuidora X", telefono: null, email: null },
];

describe("ProductFilters", () => {
  it("renders search input", () => {
    render(<ProductFilters filters={defaultFilters} onChange={vi.fn()} categories={[]} suppliers={[]} />);
    expect(screen.getByPlaceholderText(/Buscar/)).toBeInTheDocument();
  });

  it("renders stock status select", () => {
    render(<ProductFilters filters={defaultFilters} onChange={vi.fn()} categories={[]} suppliers={[]} />);
    expect(screen.getByText("Todos")).toBeInTheDocument();
  });

  it("renders sort select with options", () => {
    render(<ProductFilters filters={defaultFilters} onChange={vi.fn()} categories={[]} suppliers={[]} />);
    expect(screen.getByText("Nombre (A-Z)")).toBeInTheDocument();
  });

  it("renders category options", () => {
    render(<ProductFilters filters={defaultFilters} onChange={vi.fn()} categories={mockCategories} suppliers={[]} />);
    expect(screen.getByText("Todas las cat.")).toBeInTheDocument();
    expect(screen.getByText("Licores")).toBeInTheDocument();
  });

  it("renders supplier options", () => {
    render(<ProductFilters filters={defaultFilters} onChange={vi.fn()} categories={[]} suppliers={mockSuppliers} />);
    expect(screen.getByText("Todos proveed.")).toBeInTheDocument();
  });

  it("renders price range inputs", () => {
    render(<ProductFilters filters={defaultFilters} onChange={vi.fn()} categories={[]} suppliers={[]} />);
    expect(screen.getByPlaceholderText("Precio min")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Precio max")).toBeInTheDocument();
  });

  it("calls onChange when search input changes", async () => {
    const onChange = vi.fn();
    render(<ProductFilters filters={defaultFilters} onChange={onChange} categories={[]} suppliers={[]} />);
    const input = screen.getByPlaceholderText(/Buscar/);
    await userEvent.type(input, "whisky");
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onChange when stock status changes", async () => {
    const onChange = vi.fn();
    render(<ProductFilters filters={defaultFilters} onChange={onChange} categories={[]} suppliers={[]} />);
    const select = screen.getAllByRole("combobox")[0];
    await userEvent.selectOptions(select, "agotado");
    expect(onChange).toHaveBeenCalled();
  });
});