import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkbox from "../../ui-components/Checkbox";

describe("Checkbox", () => {
  it("renders label when provided", () => {
    render(<Checkbox label="Acepto términos" />);
    expect(screen.getByText("Acepto términos")).toBeInTheDocument();
  });

  it("calls onChange when clicked", async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Acepto" onChange={onChange} />);
    await userEvent.click(screen.getByText("Acepto"));
    expect(onChange).toHaveBeenCalled();
  });

  it("reflects checked state", () => {
    render(<Checkbox label="Acepto" checked onChange={vi.fn()} />);
    const checkbox = screen.getByLabelText("Acepto") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
