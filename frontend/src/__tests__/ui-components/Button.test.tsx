import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../../ui-components/Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders different variants", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders different sizes", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows spinner when loading", () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("disables button when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when loading", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Styled</Button>);
    expect(screen.getByRole("button").className).toContain("custom-class");
  });
});