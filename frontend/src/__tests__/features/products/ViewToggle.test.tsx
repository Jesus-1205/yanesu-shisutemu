import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ViewToggle from "../../../features/products/components/ViewToggle";

describe("ViewToggle", () => {
  it("renders both buttons", () => {
    render(<ViewToggle view="grid" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Vista cuadrícula")).toBeInTheDocument();
    expect(screen.getByLabelText("Vista tabla")).toBeInTheDocument();
  });

  it("highlights grid when active", () => {
    render(<ViewToggle view="grid" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Vista cuadrícula")).toHaveClass("bg-brand-blue");
    expect(screen.getByLabelText("Vista tabla")).not.toHaveClass("bg-brand-blue");
  });

  it("highlights table when active", () => {
    render(<ViewToggle view="table" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Vista tabla")).toHaveClass("bg-brand-blue");
    expect(screen.getByLabelText("Vista cuadrícula")).not.toHaveClass("bg-brand-blue");
  });

  it("calls onChange with grid when grid clicked", async () => {
    const onChange = vi.fn();
    render(<ViewToggle view="table" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Vista cuadrícula"));
    expect(onChange).toHaveBeenCalledWith("grid");
  });

  it("calls onChange with table when table clicked", async () => {
    const onChange = vi.fn();
    render(<ViewToggle view="grid" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Vista tabla"));
    expect(onChange).toHaveBeenCalledWith("table");
  });
});