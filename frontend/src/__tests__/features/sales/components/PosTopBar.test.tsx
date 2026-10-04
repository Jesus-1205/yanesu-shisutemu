import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PosTopBar from "../../../../features/sales/components/PosTopBar";

describe("PosTopBar", () => {
  it("renders search input and responds to change", () => {
    const onSearchChange = vi.fn();
    const onToggleHideNoStock = vi.fn();

    render(
      <PosTopBar
        search="ron"
        hideNoStock={false}
        onSearchChange={onSearchChange}
        onToggleHideNoStock={onToggleHideNoStock}
      />
    );

    const input = screen.getByPlaceholderText(/Buscar productos/);
    expect(input).toHaveValue("ron");

    fireEvent.change(input, { target: { value: "vodka" } });
    expect(onSearchChange).toHaveBeenCalled();
  });

  it("toggles hideNoStock switch", () => {
    const onToggleHideNoStock = vi.fn();

    render(
      <PosTopBar
        search=""
        hideNoStock={false}
        onSearchChange={vi.fn()}
        onToggleHideNoStock={onToggleHideNoStock}
      />
    );

    const toggle = screen.getByLabelText("Ocultar sin stock");
    fireEvent.click(toggle);
    expect(onToggleHideNoStock).toHaveBeenCalledWith(true);
  });
});
