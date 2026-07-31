import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Textarea from "../../ui-components/Textarea";

describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Descripción" />);
    expect(screen.getByPlaceholderText("Descripción")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Textarea label="Descripción" />);
    expect(screen.getByText("Descripción")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<Textarea error="Campo requerido" />);
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
  });

  it("shows hint message", () => {
    render(<Textarea hint="Máximo 500 caracteres" />);
    expect(screen.getByText("Máximo 500 caracteres")).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "Hola");
    expect(onChange).toHaveBeenCalled();
  });

  it("sets aria-invalid when error is present", () => {
    render(<Textarea error="Error" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});
