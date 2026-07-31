import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../../ui-components/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders all variants without error", () => {
    const variants = ["success", "danger", "info", "warning", "neutral"] as const;
    for (const v of variants) {
      const { container } = render(<Badge variant={v}>{v}</Badge>);
      expect(container.firstChild).toBeInTheDocument();
    }
  });

  it("applies custom className", () => {
    render(<Badge className="custom-class">Badge</Badge>);
    expect(screen.getByText("Badge").className).toContain("custom-class");
  });
});