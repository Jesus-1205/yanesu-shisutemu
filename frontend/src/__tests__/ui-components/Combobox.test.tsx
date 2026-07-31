import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Combobox from "../../ui-components/Combobox";

const options = [
  { value: 1, label: "Proveedor A" },
  { value: 2, label: "Proveedor B" },
];

describe("Combobox", () => {
  it("renders input with placeholder", () => {
    render(<Combobox value={null} options={options} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Combobox label="Proveedor" value={null} options={options} onChange={vi.fn()} />);
    expect(screen.getByText("Proveedor")).toBeInTheDocument();
  });

  it("shows options on focus", async () => {
    render(<Combobox value={null} options={options} onChange={vi.fn()} />);
    await userEvent.click(screen.getByPlaceholderText("Buscar..."));
    expect(screen.getByText("Proveedor A")).toBeInTheDocument();
    expect(screen.getByText("Proveedor B")).toBeInTheDocument();
  });

  it("filters options when typing", async () => {
    render(<Combobox value={null} options={options} onChange={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("Buscar..."), "A");
    expect(screen.getByText("Proveedor A")).toBeInTheDocument();
    expect(screen.queryByText("Proveedor B")).not.toBeInTheDocument();
  });

  it("calls onChange when option selected", async () => {
    const onChange = vi.fn();
    render(<Combobox value={null} options={options} onChange={onChange} />);
    await userEvent.click(screen.getByPlaceholderText("Buscar..."));
    await userEvent.click(screen.getByText("Proveedor A"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("shows clear option when allowClear is true", async () => {
    render(<Combobox value={1} options={options} onChange={vi.fn()} allowClear clearLabel="Ninguno" />);
    await userEvent.click(screen.getByPlaceholderText("Buscar..."));
    expect(screen.getByText("Ninguno")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<Combobox value={null} options={options} onChange={vi.fn()} error="Campo requerido" />);
    expect(screen.getByText("Campo requerido")).toBeInTheDocument();
  });

  it("does not open dropdown when disabled", async () => {
    render(<Combobox value={null} options={options} onChange={vi.fn()} disabled />);
    await userEvent.click(screen.getByPlaceholderText("Buscar..."));
    expect(screen.queryByText("Proveedor A")).not.toBeInTheDocument();
  });
});
