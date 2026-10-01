import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HoldCartModal from "../../../../features/sales/components/HoldCartModal";

describe("HoldCartModal", () => {
  it("renders when open and handles confirm with input label", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <HoldCartModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText("Guardar venta")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Cliente");

    fireEvent.change(input, { target: { value: "Mesa 5" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onConfirm).toHaveBeenCalledWith("Mesa 5");
  });

  it("calls onClose when Cancelar is clicked", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <HoldCartModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms on Enter key in input", () => {
    const onConfirm = vi.fn();

    render(
      <HoldCartModal
        open={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const input = screen.getByPlaceholderText("Cliente");
    fireEvent.change(input, { target: { value: "Mesa 10" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onConfirm).toHaveBeenCalledWith("Mesa 10");
  });
});
