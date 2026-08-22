import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AsyncCombobox from "../../ui-components/AsyncCombobox";

const buildOptions = () => [
  { value: 1, label: "Pepsi 2L", subtitle: "7590001" },
  { value: 2, label: "Coca Cola 1.5L", subtitle: "7590002" },
];

describe("AsyncCombobox", () => {
  it("renders input with placeholder", () => {
    render(
      <AsyncCombobox
        value={null}
        onSearch={vi.fn().mockResolvedValue([])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(
      <AsyncCombobox
        label="Producto"
        value={null}
        onSearch={vi.fn().mockResolvedValue([])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Producto")).toBeInTheDocument();
  });

  it("calls onSearch with debounce when typing", async () => {
    const onSearch = vi.fn().mockResolvedValue(buildOptions());
    render(
      <AsyncCombobox
        value={null}
        onSearch={onSearch}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByPlaceholderText("Buscar...");
    await userEvent.click(input);
    await userEvent.type(input, "Pepsi");
    await waitFor(() => expect(onSearch).toHaveBeenCalled(), { timeout: 1500 });
  });

  it("calls onChange with selected option value", async () => {
    const onChange = vi.fn();
    render(
      <AsyncCombobox
        value={null}
        onSearch={vi.fn().mockResolvedValue(buildOptions())}
        onChange={onChange}
        initialOptions={buildOptions()}
      />,
    );
    await userEvent.click(screen.getByPlaceholderText("Buscar..."));
    await userEvent.click(await screen.findByText("Pepsi 2L"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("shows clear option and triggers onChange(null) when clicked", async () => {
    const onChange = vi.fn();
    render(
      <AsyncCombobox
        value={1}
        onSearch={vi.fn().mockResolvedValue(buildOptions())}
        onChange={onChange}
        initialOptions={buildOptions()}
        allowClear
        clearLabel="Limpiar"
      />,
    );
    await userEvent.click(screen.getByPlaceholderText("Buscar..."));
    await userEvent.click(screen.getByText("Limpiar"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("clears input and triggers onChange(null) when user empties the text", async () => {
    const onChange = vi.fn();
    render(
      <AsyncCombobox
        value={1}
        onSearch={vi.fn().mockResolvedValue(buildOptions())}
        onChange={onChange}
        initialOptions={buildOptions()}
      />,
    );
    const input = screen.getByPlaceholderText("Buscar...");
    expect(input).toHaveValue("Pepsi 2L");
    await userEvent.clear(input);
    expect(input).toHaveValue("");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("clears the input when parent resets value externally (regression bug fix)", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AsyncCombobox
        value={1}
        onSearch={vi.fn().mockResolvedValue(buildOptions())}
        onChange={onChange}
        initialOptions={buildOptions()}
      />,
    );
    const input = screen.getByPlaceholderText("Buscar...");
    expect(input).toHaveValue("Pepsi 2L");

    rerender(
      <AsyncCombobox
        value={null}
        onSearch={vi.fn().mockResolvedValue(buildOptions())}
        onChange={onChange}
        initialOptions={buildOptions()}
      />,
    );
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("shows error message when error prop is set", () => {
    render(
      <AsyncCombobox
        value={null}
        onSearch={vi.fn().mockResolvedValue([])}
        onChange={vi.fn()}
        error="Producto requerido"
      />,
    );
    expect(screen.getByText("Producto requerido")).toBeInTheDocument();
  });

  it("does not open dropdown when disabled", async () => {
    render(
      <AsyncCombobox
        value={null}
        onSearch={vi.fn().mockResolvedValue(buildOptions())}
        onChange={vi.fn()}
        disabled
        initialOptions={buildOptions()}
      />,
    );
    await userEvent.click(screen.getByPlaceholderText("Buscar..."));
    expect(screen.queryByText("Pepsi 2L")).not.toBeInTheDocument();
  });
});