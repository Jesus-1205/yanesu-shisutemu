import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Drawer from "../../ui-components/Drawer";

describe("Drawer", () => {
  it("renders nothing when closed", () => {
    render(
      <Drawer open={false} onClose={vi.fn()}>
        <div>Content</div>
      </Drawer>,
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders content when open", () => {
    render(
      <Drawer open onClose={vi.fn()}>
        <div>Content</div>
      </Drawer>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <Drawer open onClose={vi.fn()} title="My Drawer">
        <div>Content</div>
      </Drawer>,
    );
    expect(screen.getByText("My Drawer")).toBeInTheDocument();
  });

  it("calls onClose when clicking backdrop", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose}>
        <div>Content</div>
      </Drawer>,
    );
    const backdrop = screen.getByText("Content").parentElement!.parentElement!.previousElementSibling!;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when pressing Escape", async () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose}>
        <div>Content</div>
      </Drawer>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has close button with aria-label", () => {
    render(
      <Drawer open onClose={vi.fn()} title="Title">
        <div>Content</div>
      </Drawer>,
    );
    expect(screen.getByLabelText("Cerrar")).toBeInTheDocument();
  });
});