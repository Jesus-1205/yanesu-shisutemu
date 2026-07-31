import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "../../ui-components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders message and title", () => {
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete?"
        message="Are you sure?"
      />,
    );
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("renders custom confirm text", () => {
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message="Sure?"
        confirmText="Yes, delete"
      />,
    );
    expect(screen.getByText("Yes, delete")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
        message="Sure?"
      />,
    );
    await userEvent.click(screen.getByText("Confirmar"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button clicked", async () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        message="Sure?"
      />,
    );
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables action buttons when loading", () => {
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message="Sure?"
        loading
      />,
    );
    expect(screen.getByText("Confirmar").closest("button")).toBeDisabled();
    expect(screen.getByText("Cancelar").closest("button")).toBeDisabled();
  });
});