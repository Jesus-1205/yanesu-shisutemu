import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditCategoryModal from "@/features/categories/components/EditCategoryModal";

const mockUpdateCategory = vi.fn();
vi.mock("@/services/api", () => ({
  api: {
    updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditCategoryModal", () => {
  const category = {
    id: 1,
    nombre: "Licores",
    descripcion: "Bebidas",
  };

  it("renders nothing when category is null", () => {
    render(
      <EditCategoryModal
        category={null}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.queryByText("Editar Categoría")).not.toBeInTheDocument();
  });

  it("renders form populated with category data when open", () => {
    render(
      <EditCategoryModal
        category={category}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText("Editar Categoría")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Licores");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Bebidas");
    expect(screen.getByText("Guardar cambios")).toBeInTheDocument();
  });

  it("calls api.updateCategory on submit and triggers onUpdated", async () => {
    const updated = {
      id: 1,
      nombre: "Licores VIP",
      descripcion: "Bebidas Premium",
    };
    mockUpdateCategory.mockResolvedValueOnce(updated);
    const onUpdated = vi.fn();
    const onClose = vi.fn();

    render(
      <EditCategoryModal
        category={category}
        onClose={onClose}
        onUpdated={onUpdated}
      />,
    );

    const nameInput = screen.getByLabelText("Nombre");
    const descInput = screen.getByLabelText("Descripción");

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Licores VIP");
    await userEvent.clear(descInput);
    await userEvent.type(descInput, "Bebidas Premium");

    await userEvent.click(screen.getByText("Guardar cambios"));

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith(1, {
        nombre: "Licores VIP",
        descripcion: "Bebidas Premium",
      });
    });

    expect(onUpdated).toHaveBeenCalledWith(updated);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error on update failure", async () => {
    mockUpdateCategory.mockRejectedValueOnce(
      new Error("Error al actualizar categoría"),
    );

    render(
      <EditCategoryModal
        category={category}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText("Guardar cambios"));

    await waitFor(() => {
      expect(
        screen.getByText("Error al actualizar categoría"),
      ).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancelar clicked", async () => {
    const onClose = vi.fn();
    render(
      <EditCategoryModal
        category={category}
        onClose={onClose}
        onUpdated={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});
