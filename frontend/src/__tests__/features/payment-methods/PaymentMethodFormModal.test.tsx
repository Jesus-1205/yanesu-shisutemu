import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PaymentMethodFormModal } from "@/features/payment-methods/components/PaymentMethodFormModal";
import type { PaymentMethod } from "@/features/payment-methods/types";

describe("PaymentMethodFormModal", () => {
  it("renderiza modal para crear cuando no hay initialData", () => {
    render(
      <PaymentMethodFormModal
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Nuevo Método de Pago" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: TRANSFERENCIA")).toHaveValue("");
    expect(screen.getByText("Crear método")).toBeInTheDocument();
  });

  it("renderiza modal para editar con datos prellenados", () => {
    const editingMethod: PaymentMethod = {
      id: 1,
      nombre: "ZELLE",
      moneda_default: "USD",
      acepta_referencia: true,
      activo: false,
    };

    render(
      <PaymentMethodFormModal
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={editingMethod}
      />
    );

    expect(screen.getByRole("heading", { name: "Editar Método de Pago" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: TRANSFERENCIA")).toHaveValue("ZELLE");
    expect(screen.getByText("Guardar cambios")).toBeInTheDocument();
  });

  it("envía los datos del formulario al guardar", async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();

    render(
      <PaymentMethodFormModal
        open={true}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    const input = screen.getByPlaceholderText("Ej: TRANSFERENCIA");
    await user.type(input, "PUNTO DE VENTA");

    await user.click(screen.getByText("Crear método"));

    expect(handleSave).toHaveBeenCalledWith({
      nombre: "PUNTO DE VENTA",
      moneda_default: "VES",
      acepta_referencia: false,
      activo: true,
    });
  });

  it("llama a onClose al presionar cancelar", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <PaymentMethodFormModal
        open={true}
        onClose={handleClose}
        onSave={vi.fn()}
      />
    );

    await user.click(screen.getByText("Cancelar"));
    expect(handleClose).toHaveBeenCalled();
  });
});
