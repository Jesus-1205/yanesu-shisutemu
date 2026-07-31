import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../../ui-components/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders content when open", () => {
    render(
      <Modal open onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(
      <Modal open onClose={vi.fn()} title="My Title">
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("calls onClose when clicking backdrop", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    const backdrop = container.firstChild as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when pressing Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside modal", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    const dialogContent = screen.getByText("Content");
    await userEvent.click(dialogContent);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("has close button with aria-label", () => {
    render(
      <Modal open onClose={vi.fn()} title="Title">
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByLabelText("Cerrar")).toBeInTheDocument();
  });
});