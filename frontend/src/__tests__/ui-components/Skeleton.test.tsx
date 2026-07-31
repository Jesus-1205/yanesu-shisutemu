import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonText, SkeletonCard } from "../../ui-components/Skeleton";

describe("Skeleton", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("applies className and style", () => {
    const { container } = render(<Skeleton className="h-4 w-1/2" />);
    expect(container.firstChild).toHaveClass("h-4", "w-1/2");
  });
});

describe("SkeletonText", () => {
  it("renders specified number of lines", () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".animate-pulse").length).toBe(4);
  });

  it("applies lastWidth to last line", () => {
    const { container } = render(<SkeletonText lines={2} lastWidth="50%" />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines[1]).toHaveStyle({ width: "50%" });
  });
});

describe("SkeletonCard", () => {
  it("renders with default skeleton content", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders children when provided", () => {
    render(
      <SkeletonCard>
        <div data-testid="custom">Custom</div>
      </SkeletonCard>,
    );
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });
});