import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PaymentMethodsTable } from "@/features/payment-methods/components/PaymentMethodsTable";
import type { PaymentMethod } from "@/features/payment-methods/types";

const mockMethods: PaymentMethod[] = [
  { id: 1, nombre: "EFECTIVO", activo: true, moneda_default: "USD", acepta_referencia: false },
  { id: 2, nombre: "TRANSFERENCIA", activo: false, moneda_default: "VES", acepta_referencia: true },
];

describe("PaymentMethodsTable", () => {
  it("renderiza columnas y datos correctamente", () => {
    render(
      <PaymentMethodsTable
        methods={mockMethods}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("EFECTIVO")).toBeInTheDocument();
    expect(screen.getByText("TRANSFERENCIA")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("VES")).toBeInTheDocument();
    expect(screen.getByText("Sí")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("llama a onEdit cuando se hace clic en el botón de editar", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();

    render(
      <PaymentMethodsTable
        methods={mockMethods}
        loading={false}
        onEdit={handleEdit}
        onDelete={vi.fn()}
      />
    );

    const editBtn = screen.getByLabelText("Editar EFECTIVO");
    await user.click(editBtn);

    expect(handleEdit).toHaveBeenCalledWith(mockMethods[0]);
  });

  it("llama a onDelete cuando se hace clic en el botón de eliminar", async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();

    render(
      <PaymentMethodsTable
        methods={mockMethods}
        loading={false}
        onEdit={vi.fn()}
        onDelete={handleDelete}
      />
    );

    const deleteBtn = screen.getByLabelText("Eliminar TRANSFERENCIA");
    await user.click(deleteBtn);

    expect(handleDelete).toHaveBeenCalledWith(mockMethods[1]);
  });
});
