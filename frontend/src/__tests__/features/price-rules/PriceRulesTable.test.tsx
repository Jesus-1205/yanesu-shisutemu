import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PriceRulesTable } from "@/features/price-rules/components/PriceRulesTable";
import type { PriceRuleOut } from "@/types/api";

const mockRules: PriceRuleOut[] = [
  {
    id: 1,
    nombre: "Promo Ron",
    descripcion: "Solo efectivo",
    activo: true,
    products: [
      {
        id: 10,
        producto_id: 101,
        producto_nombre: "Ron Carta Roja",
        tipo_empaque: "UNIDAD",
        precio_usd: 8.5,
      },
      {
        id: 11,
        producto_id: 102,
        producto_nombre: "Ron Carta Blanca",
        tipo_empaque: "CAJA",
        precio_usd: 85,
      },
    ],
    payment_methods: [
      { id: 20, metodo_pago_id: 1, metodo_pago_nombre: "Dólares Efectivo" },
    ],
  },
];

describe("PriceRulesTable", () => {
  it("renderiza datos de reglas, productos, empaques y métodos de pago", () => {
    render(
      <PriceRulesTable
        rules={mockRules}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Promo Ron")).toBeInTheDocument();
    expect(screen.getByText("Solo efectivo")).toBeInTheDocument();
    expect(screen.getByText("Ron Carta Roja")).toBeInTheDocument();
    expect(screen.getByText("Ron Carta Blanca")).toBeInTheDocument();
    expect(screen.getByText("Und")).toBeInTheDocument();
    expect(screen.getByText("Caja")).toBeInTheDocument();
    expect(screen.getByText("Dólares Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("llama a onEdit y onDelete al hacer clic en las acciones", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <PriceRulesTable
        rules={mockRules}
        loading={false}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    const editBtn = screen.getByLabelText("Editar regla");
    await user.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockRules[0]);

    const deleteBtn = screen.getByLabelText("Eliminar regla");
    await user.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(mockRules[0]);
  });
});
