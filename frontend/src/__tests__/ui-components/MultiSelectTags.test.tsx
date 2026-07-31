import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MultiSelectTags from "../../ui-components/MultiSelectTags";

const options = [
  { value: 1, label: "Licores" },
  { value: 2, label: "Vinos" },
  { value: 3, label: "Cervezas" },
];

describe("MultiSelectTags", () => {
  it("renders placeholder when no selection", () => {
    render(<MultiSelectTags selected={[]} options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Seleccionar...")).toBeInTheDocument();
  });

  it("shows selected items as tags", () => {
    render(<MultiSelectTags selected={[1, 3]} options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Licores")).toBeInTheDocument();
    expect(screen.getByText("Cervezas")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<MultiSelectTags label="Categorías" selected={[]} options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Categorías")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    render(<MultiSelectTags selected={[]} options={options} onChange={vi.fn()} />);
    await userEvent.click(screen.getByText("Seleccionar..."));
    expect(screen.getByText("Licores")).toBeInTheDocument();
    expect(screen.getByText("Vinos")).toBeInTheDocument();
  });

  it("calls onChange when option toggled", async () => {
    const onChange = vi.fn();
    render(<MultiSelectTags selected={[]} options={options} onChange={onChange} />);
    await userEvent.click(screen.getByText("Seleccionar..."));
    await userEvent.click(screen.getByText("Licores"));
    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it("shows error message", () => {
    render(<MultiSelectTags selected={[]} options={options} onChange={vi.fn()} error="Campo requerido" />);
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
  });
});
