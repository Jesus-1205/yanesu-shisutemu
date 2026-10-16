import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandLogo from "@/ui-components/BrandLogo";

describe("BrandLogo", () => {
  it("renders the brand name when not collapsed", () => {
    render(<BrandLogo collapsed={false} />);
    expect(screen.getByText("Yanesu Shisutemu")).toBeInTheDocument();
  });

  it("hides the brand text when collapsed but renders icon", () => {
    const { container } = render(<BrandLogo collapsed={true} />);
    expect(screen.queryByText("Yanesu Shisutemu")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
