import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutOverlay } from "../../layout/components/LayoutOverlay";

describe("LayoutOverlay", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(<LayoutOverlay open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders overlay backdrop when open is true", () => {
    render(<LayoutOverlay open={true} onClose={vi.fn()} />);
    const overlay = screen.getByTestId("layout-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay.className).toContain("fixed inset-0");
  });

  it("calls onClose when overlay is clicked", async () => {
    const onClose = vi.fn();
    render(<LayoutOverlay open={true} onClose={onClose} />);
    await userEvent.click(screen.getByTestId("layout-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
