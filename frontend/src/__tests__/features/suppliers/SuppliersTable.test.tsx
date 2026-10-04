import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SuppliersTable from "@/features/suppliers/components/SuppliersTable";
import type { Supplier } from "@/features/suppliers/types";

describe("SuppliersTable", () => {
  const mockSuppliers: Supplier[] = [
    { id: 1, nombre: "Distribuidora Polar", telefono: "04141234567", email: "polar@polar.com" },
    { id: 2, nombre: "Santa Teresa", telefono: null, email: null },
  ];

  it("renders supplier rows with details and fallback dashes", () => {
    render(
      <SuppliersTable
        suppliers={mockSuppliers}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Distribuidora Polar")).toBeInTheDocument();
    expect(screen.getByText("04141234567")).toBeInTheDocument();
    expect(screen.getByText("polar@polar.com")).toBeInTheDocument();

    expect(screen.getByText("Santa Teresa")).toBeInTheDocument();
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onEdit and onDelete handlers when action buttons are clicked", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <SuppliersTable
        suppliers={mockSuppliers}
        loading={false}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const editButtons = screen.getAllByRole("button", { name: /editar proveedor/i });
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockSuppliers[0]);

    const deleteButtons = screen.getAllByRole("button", { name: /eliminar proveedor/i });
    fireEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith(mockSuppliers[1]);
  });

  it("calls onRowClick when clicking on a row", () => {
    const onRowClick = vi.fn();

    render(
      <SuppliersTable
        suppliers={mockSuppliers}
        loading={false}
        onRowClick={onRowClick}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Distribuidora Polar"));
    expect(onRowClick).toHaveBeenCalledWith(mockSuppliers[0]);
  });
});
