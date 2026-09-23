import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoriesTable from "@/features/categories/components/CategoriesTable";
import type { Category } from "@/features/categories/types";

describe("CategoriesTable", () => {
  const mockCategories: Category[] = [
    { id: 1, nombre: "Licores", descripcion: "Bebidas alcohólicas" },
    { id: 2, nombre: "Vinos", descripcion: null },
  ];

  it("shows empty state when data is empty and not loading", () => {
    render(
      <CategoriesTable
        categories={[]}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("No hay categorías registradas")).toBeInTheDocument();
  });

  it("renders table rows and category names correctly", () => {
    render(
      <CategoriesTable
        categories={mockCategories}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Licores")).toBeInTheDocument();
    expect(screen.getByText("Bebidas alcohólicas")).toBeInTheDocument();
    expect(screen.getByText("Vinos")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", async () => {
    const handleRowClick = vi.fn();
    render(
      <CategoriesTable
        categories={mockCategories}
        loading={false}
        onRowClick={handleRowClick}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText("Licores"));

    expect(handleRowClick).toHaveBeenCalledWith(mockCategories[0]);
  });

  it("calls onEdit and stops row click propagation when edit button is clicked", async () => {
    const handleRowClick = vi.fn();
    const handleEdit = vi.fn();
    render(
      <CategoriesTable
        categories={mockCategories}
        loading={false}
        onRowClick={handleRowClick}
        onEdit={handleEdit}
        onDelete={vi.fn()}
      />,
    );

    const actionButtons = screen.getAllByRole("button");
    // actionButtons[0] is edit for row 1, actionButtons[1] is delete for row 1
    await userEvent.click(actionButtons[0]);

    expect(handleEdit).toHaveBeenCalledWith(mockCategories[0]);
    expect(handleRowClick).not.toHaveBeenCalled();
  });

  it("calls onDelete and stops row click propagation when delete button is clicked", async () => {
    const handleRowClick = vi.fn();
    const handleDelete = vi.fn();
    render(
      <CategoriesTable
        categories={mockCategories}
        loading={false}
        onRowClick={handleRowClick}
        onEdit={vi.fn()}
        onDelete={handleDelete}
      />,
    );

    const actionButtons = screen.getAllByRole("button");
    // actionButtons[1] is delete for row 1
    await userEvent.click(actionButtons[1]);

    expect(handleDelete).toHaveBeenCalledWith(mockCategories[0]);
    expect(handleRowClick).not.toHaveBeenCalled();
  });
});
