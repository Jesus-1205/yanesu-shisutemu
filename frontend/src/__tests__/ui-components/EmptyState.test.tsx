import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmptyState from "../../ui-components/EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No hay productos" />);
    expect(screen.getByText("No hay productos")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Vacío" description="Agrega un producto" />);
    expect(screen.getByText("Agrega un producto")).toBeInTheDocument();
  });

  it("renders action button and calls onAction", async () => {
    const onAction = vi.fn();
    render(<EmptyState title="Vacío" actionLabel="Crear" onAction={onAction} />);
    await userEvent.click(screen.getByText("Crear"));
    expect(onAction).toHaveBeenCalled();
  });

  it("does not render button when actionLabel is missing", () => {
    render(<EmptyState title="Vacío" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
