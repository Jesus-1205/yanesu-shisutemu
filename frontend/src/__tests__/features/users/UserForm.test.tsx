import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserForm } from "@/features/users/components/UserForm";
import type { RoleOut as Role } from "@/types/api";

const mockRoles: Role[] = [
  { id: 1, nombre: "ADMIN" },
  { id: 2, nombre: "VENDEDOR" },
];

describe("UserForm", () => {
  const defaultProps = {
    form: {
      username: "jperez",
      email: "jperez@correo.com",
      password: "password123",
      nombre_completo: "Juan Pérez",
      rol_id: "2",
    },
    roles: mockRoles,
    isNew: true,
    saving: false,
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renderiza todos los campos del formulario", () => {
    render(<UserForm {...defaultProps} />);

    expect(screen.getByLabelText("Nombre de usuario")).toHaveValue("jperez");
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Juan Pérez");
    expect(screen.getByLabelText("Email")).toHaveValue("jperez@correo.com");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("password123");
  });

  it("cambia los labels y validación según isNew", () => {
    const { rerender } = render(<UserForm {...defaultProps} isNew={true} />);
    expect(screen.getByLabelText("Contraseña")).toBeRequired();

    rerender(<UserForm {...defaultProps} isNew={false} />);
    expect(
      screen.getByLabelText("Nueva contraseña (dejar vacío para mantener)"),
    ).not.toBeRequired();
  });

  it("llama a onChange al modificar campos", () => {
    render(<UserForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Nombre de usuario"), {
      target: { value: "nuevouser" },
    });
    expect(defaultProps.onChange).toHaveBeenCalledWith("username", "nuevouser");
  });

  it("llama a onCancel al pulsar Cancelar", () => {
    render(<UserForm {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("llama a onSubmit al enviar el formulario", () => {
    render(<UserForm {...defaultProps} />);

    fireEvent.submit(screen.getByRole("button", { name: /Crear usuario/i }));
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });
});
