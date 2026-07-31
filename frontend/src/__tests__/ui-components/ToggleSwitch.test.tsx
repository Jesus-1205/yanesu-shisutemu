import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToggleSwitch from "../../ui-components/ToggleSwitch";

describe("ToggleSwitch", () => {
  it("renders label when provided", () => {
    render(<ToggleSwitch label="Activar" />);
    expect(screen.getByText("Activar")).toBeInTheDocument();
  });

  it("calls onChange when clicked", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Activar" onChange={onChange} />);
    await userEvent.click(screen.getByText("Activar"));
    expect(onChange).toHaveBeenCalled();
  });

  it("reflects checked state", () => {
    render(<ToggleSwitch label="Activar" checked onChange={vi.fn()} />);
    const checkbox = screen.getByLabelText("Activar") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
