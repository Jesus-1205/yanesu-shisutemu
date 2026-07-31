import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Spinner from "../../ui-components/Spinner";

describe("Spinner", () => {
  it("renders with default size", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".dot-spinner__dot")).toBeInTheDocument();
  });

  it("renders with different sizes", () => {
    const { container: sm } = render(<Spinner size="sm" />);
    expect(sm.querySelector(".dot-spinner__dot")).toBeInTheDocument();

    const { container: lg } = render(<Spinner size="lg" />);
    expect(lg.querySelector(".dot-spinner__dot")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="custom" />);
    expect(container.firstChild).toHaveClass("custom");
  });

  it("renders 8 dots", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelectorAll(".dot-spinner__dot").length).toBe(8);
  });
});