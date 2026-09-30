import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateCategoryForm from "@/features/shared/components/CreateCategoryForm";

describe("CreateCategoryForm", () => {
  it("renders form inputs and buttons", () => {
    render(<CreateCategoryForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(screen.getByText("Crear categoría")).toBeInTheDocument();
  });

  it("submits trimmed form values", async () => {
    const onSubmit = vi.fn();
    render(<CreateCategoryForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nombre"), " Ron ");
    await userEvent.type(screen.getByLabelText("Descripción"), " Anejo ");
    await userEvent.click(screen.getByText("Crear categoría"));

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: " Ron ",
      descripcion: "Anejo",
    });
  });

  it("does not submit when nombre is empty or whitespace", async () => {
    const onSubmit = vi.fn();
    render(<CreateCategoryForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nombre"), "   ");
    await userEvent.click(screen.getByText("Crear categoría"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders error message if error prop is provided", () => {
    render(
      <CreateCategoryForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        error="Nombre duplicado"
      />,
    );

    expect(screen.getByText("Nombre duplicado")).toBeInTheDocument();
  });

  it("calls onCancel when clicking Cancelar", async () => {
    const onCancel = vi.fn();
    render(<CreateCategoryForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("populates initial data and displays custom submit label", () => {
    render(
      <CreateCategoryForm
        initialData={{ nombre: "Vodka", descripcion: "Importado" }}
        submitLabel="Guardar cambios"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Nombre")).toHaveValue("Vodka");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Importado");
    expect(screen.getByText("Guardar cambios")).toBeInTheDocument();
  });
});
