import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CombosTable from "@/features/combos/components/CombosTable";
import { formatCurrency } from "@/lib/utils";
import type { ComboOut, PaymentMethodOut } from "@/types/api";

describe("CombosTable", () => {
  const mockPaymentMethods: PaymentMethodOut[] = [
    { id: 1, nombre: "Efectivo USD", moneda_default: "USD", acepta_referencia: false, activo: true },
    { id: 2, nombre: "Pago Móvil", moneda_default: "VES", acepta_referencia: true, activo: true },
  ];

  const mockCombos: ComboOut[] = [
    {
      id: 1,
      nombre: "Combo Ron + Refresco",
      descripcion: "Incluye hielo",
      precio_total_usd: 15,
      activo: true,
      metodo_pago_ids: [1, 2],
      groups: [
        {
          id: 10,
          nombre: "Ron",
          min_cantidad: 1,
          max_cantidad: 1,
          products: [{ id: 1, producto_id: 100, producto_nombre: "Ron Santa Teresa" }],
        },
      ],
    },
    {
      id: 2,
      nombre: "Combo Cerveza",
      descripcion: null,
      precio_total_usd: 10,
      activo: false,
      metodo_pago_ids: [1],
      groups: [],
    },
  ];

  it("shows empty state when data is empty and not loading", () => {
    render(
      <CombosTable
        combos={[]}
        loading={false}
        paymentMethods={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("No hay combos registrados")).toBeInTheDocument();
  });

  it("renders combo details, badges, and payment methods correctly", () => {
    render(
      <CombosTable
        combos={mockCombos}
        loading={false}
        paymentMethods={mockPaymentMethods}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Combo Ron + Refresco")).toBeInTheDocument();
    expect(screen.getByText("Incluye hielo")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(15))).toBeInTheDocument();
    expect(screen.getByText("Ron")).toBeInTheDocument();
    expect(screen.getByText("1–1 uds")).toBeInTheDocument();
    expect(screen.getByText("(1 opción)")).toBeInTheDocument();
    expect(screen.getAllByText("Efectivo USD")).toHaveLength(2);
    expect(screen.getByText("Pago Móvil")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", async () => {
    const handleRowClick = vi.fn();
    render(
      <CombosTable
        combos={mockCombos}
        loading={false}
        paymentMethods={mockPaymentMethods}
        onRowClick={handleRowClick}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText("Combo Ron + Refresco"));

    expect(handleRowClick).toHaveBeenCalledWith(mockCombos[0]);
  });

  it("calls onEdit and stops propagation when clicking edit button", async () => {
    const handleRowClick = vi.fn();
    const handleEdit = vi.fn();
    render(
      <CombosTable
        combos={mockCombos}
        loading={false}
        paymentMethods={mockPaymentMethods}
        onRowClick={handleRowClick}
        onEdit={handleEdit}
        onDelete={vi.fn()}
      />,
    );

    const editButtons = screen.getAllByLabelText("Editar combo");
    await userEvent.click(editButtons[0]);

    expect(handleEdit).toHaveBeenCalledWith(mockCombos[0]);
    expect(handleRowClick).not.toHaveBeenCalled();
  });

  it("calls onDelete and stops propagation when clicking delete button", async () => {
    const handleRowClick = vi.fn();
    const handleDelete = vi.fn();
    render(
      <CombosTable
        combos={mockCombos}
        loading={false}
        paymentMethods={mockPaymentMethods}
        onRowClick={handleRowClick}
        onEdit={vi.fn()}
        onDelete={handleDelete}
      />,
    );

    const deleteButtons = screen.getAllByLabelText("Eliminar combo");
    await userEvent.click(deleteButtons[0]);

    expect(handleDelete).toHaveBeenCalledWith(mockCombos[0]);
    expect(handleRowClick).not.toHaveBeenCalled();
  });
});
