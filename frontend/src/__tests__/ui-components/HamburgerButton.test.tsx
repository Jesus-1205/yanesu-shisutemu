import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HamburgerButton from "../../ui-components/HamburgerButton";

describe("HamburgerButton", () => {
  it("renders with open=false", () => {
    render(<HamburgerButton open={false} onClick={vi.fn()} />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("renders with open=true", () => {
    render(<HamburgerButton open onClick={vi.fn()} />);
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<HamburgerButton open={false} onClick={onClick} />);
    await userEvent.click(screen.getByLabelText("Open menu"));
    expect(onClick).toHaveBeenCalled();
  });
});
