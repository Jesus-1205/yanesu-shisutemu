import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Tooltip from "../../ui-components/Tooltip";

describe("Tooltip", () => {
  it("renders children", () => {
    render(<Tooltip content="Info extra"><button>Hover me</button></Tooltip>);
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("renders tooltip content", () => {
    render(<Tooltip content="Info extra"><button>Hover me</button></Tooltip>);
    expect(screen.getByText("Info extra")).toBeInTheDocument();
  });

  it("applies default side class (top)", () => {
    render(<Tooltip content="Info extra"><button>Hover me</button></Tooltip>);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toMatch(/bottom-full/);
  });

  it("applies custom side class", () => {
    render(<Tooltip content="Info" side="right"><button>Hover</button></Tooltip>);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toMatch(/left-full/);
  });
});
