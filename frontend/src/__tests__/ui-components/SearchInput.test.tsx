import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchInput from "../../ui-components/SearchInput";

describe("SearchInput", () => {
  it("renders with placeholder", () => {
    render(<SearchInput placeholder="Buscar..." />);
    expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
  });

  it("displays value", () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("test")).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const onChange = vi.fn();
    render(<SearchInput onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows clear button when value is present", () => {
    render(<SearchInput value="test" onChange={vi.fn()} onClear={vi.fn()} />);
    const clearBtn = screen.getByRole("button");
    expect(clearBtn).toBeInTheDocument();
  });

  it("does not show clear button when value is empty", () => {
    render(<SearchInput value="" onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not show clear button when onClear is not provided", () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onClear when clear button clicked", async () => {
    const onClear = vi.fn();
    render(<SearchInput value="test" onChange={vi.fn()} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});