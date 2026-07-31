import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateCategoryModal from "../../../features/shared/components/CreateCategoryModal";

const mockCreateCategory = vi.fn();
vi.mock("../../../services/api", () => ({
  api: { createCategory: (...args: unknown[]) => mockCreateCategory(...args) },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("CreateCategoryModal", () => {
  it("renders nothing when closed", () => {
    render(<CreateCategoryModal open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByText("Nueva Categoría")).not.toBeInTheDocument();
  });

  it("renders form when open", () => {
    render(<CreateCategoryModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText("Nueva Categoría")).toBeInTheDocument();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Descripción")).toBeInTheDocument();
    expect(screen.getByText("Crear categoría")).toBeInTheDocument();
  });

  it("calls api.createCategory on submit", async () => {
    mockCreateCategory.mockResolvedValueOnce({ id: 1, nombre: "Licores", descripcion: null });
    const onCreated = vi.fn();
    render(<CreateCategoryModal open onClose={vi.fn()} onCreated={onCreated} />);
    await userEvent.type(screen.getByPlaceholderText(/Licores/), "Licores Premium");
    await userEvent.type(screen.getByPlaceholderText(/descripción/), "Bebidas finas");
    await userEvent.click(screen.getByText("Crear categoría"));
    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith({
        nombre: "Licores Premium",
        descripcion: "Bebidas finas",
      });
    });
    expect(onCreated).toHaveBeenCalledWith({ id: 1, nombre: "Licores", descripcion: null });
  });

  it("shows error on failure", async () => {
    mockCreateCategory.mockRejectedValueOnce(new Error("Network error"));
    render(<CreateCategoryModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/Licores/), "Test");
    await userEvent.click(screen.getByText("Crear categoría"));
    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
  });

  it("calls onClose when Cancelar clicked", async () => {
    const onClose = vi.fn();
    render(<CreateCategoryModal open onClose={onClose} onCreated={vi.fn()} />);
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});