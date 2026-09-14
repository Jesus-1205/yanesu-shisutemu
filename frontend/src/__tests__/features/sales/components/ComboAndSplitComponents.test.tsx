import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ComboCard from "../../../../features/sales/components/ComboCard";
import ComboSelectorModal from "../../../../features/sales/components/ComboSelectorModal";
import SplitAddButton from "../../../../features/sales/components/SplitAddButton";
import type { ComboActiveOut } from "../../../../types/api";

const mockCombo: ComboActiveOut = {
  id: 1,
  nombre: "Combo Pack Verano",
  precio_total_usd: 20,
  metodo_pago_ids: [1],
  groups: [
    {
      id: 10,
      nombre: "Bebidas a elegir",
      min_cantidad: 2,
      max_cantidad: 4,
      productos: [
        { producto_id: 101, nombre: "Refresco Cola", precio_unidad_usd: 5 },
        { producto_id: 102, nombre: "Jugo Naranja", precio_unidad_usd: 6 },
      ],
    },
  ],
};

describe("ComboCard", () => {
  it("renders combo details and triggers quick add and customize", () => {
    const onQuickAdd = vi.fn();
    const onCustomize = vi.fn();

    render(
      <ComboCard
        combo={mockCombo}
        onQuickAdd={onQuickAdd}
        onCustomize={onCustomize}
      />,
    );

    expect(screen.getByText("Combo Pack Verano")).toBeInTheDocument();
    expect(screen.getByText(/Refresco Cola, Jugo Naranja/)).toBeInTheDocument();
    expect(screen.getByText(/\$20[.,]00/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Combo Pack Verano"));
    expect(onQuickAdd).toHaveBeenCalledTimes(1);

    const customizeBtn = screen.getByTitle("Personalizar cantidades");
    fireEvent.click(customizeBtn);
    expect(onCustomize).toHaveBeenCalledTimes(1);
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
  });
});

describe("ComboSelectorModal", () => {
  it("allows incrementing, decrementing and confirms valid selections", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ComboSelectorModal
        combo={mockCombo}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Combo Pack Verano")).toBeInTheDocument();
    expect(screen.getByText("Grupo: Bebidas a elegir")).toBeInTheDocument();

    const submitBtn = screen.getByText("Agregar combo");
    expect(submitBtn).toBeDisabled();

    const plusButtons = screen.getAllByText("+");
    fireEvent.click(plusButtons[0]);
    fireEvent.click(plusButtons[0]);

    expect(screen.getByText("Total: 2/4")).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(plusButtons[1]);
    expect(screen.getByText("Total: 3/4")).toBeInTheDocument();

    const minusButtons = screen.getAllByText("-");
    fireEvent.click(minusButtons[0]);
    expect(screen.getByText("Total: 2/4")).toBeInTheDocument();

    fireEvent.click(submitBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const selections: Map<number, number> = onConfirm.mock.calls[0][0];
    expect(selections.get(101)).toBe(1);
    expect(selections.get(102)).toBe(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancelar is clicked", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ComboSelectorModal
        combo={mockCombo}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("SplitAddButton", () => {
  it("renders unit and box add buttons and triggers callbacks", () => {
    const onAddUnit = vi.fn();
    const onAddBox = vi.fn();

    render(
      <SplitAddButton
        onAddUnit={onAddUnit}
        onAddBox={onAddBox}
      />,
    );

    fireEvent.click(screen.getByText("+"));
    expect(onAddUnit).toHaveBeenCalledTimes(1);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(onAddBox).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons when disabled is true", () => {
    render(
      <SplitAddButton
        onAddUnit={vi.fn()}
        onAddBox={vi.fn()}
        disabled
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });
});
