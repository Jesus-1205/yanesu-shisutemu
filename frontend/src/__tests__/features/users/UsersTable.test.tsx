import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UsersTable } from "@/features/users/components/UsersTable";
import type { User } from "@/features/users/types";

const mockUsers: User[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    nombre_completo: "Administrador",
    rol_id: 1,
    rol_nombre: "Administrador",
    is_active: true,
    created_at: "2025-01-01",
  },
  {
    id: 2,
    username: "vendedor",
    email: "vendedor@example.com",
    nombre_completo: "Vendedor Uno",
    rol_id: 2,
    rol_nombre: "Vendedor",
    is_active: false,
    created_at: "2025-01-02",
  },
];

describe("UsersTable", () => {
  const defaultProps = {
    users: mockUsers,
    loading: false,
    togglingIds: new Set<number>(),
    onEdit: vi.fn(),
    onToggleActive: vi.fn(),
    onDelete: vi.fn(),
  };

  it("renderiza columnas y datos de usuarios correctamente", () => {
    render(<UsersTable {...defaultProps} />);

    expect(screen.getByText("Usuario")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Rol")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();

    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("vendedor")).toBeInTheDocument();
    expect(screen.getByText("vendedor@example.com")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("muestra mensaje de tabla vacía", () => {
    render(<UsersTable {...defaultProps} users={[]} />);
    expect(screen.getByText("No hay usuarios registrados")).toBeInTheDocument();
  });

  it("llama a onEdit al hacer click en el botón editar", () => {
    render(<UsersTable {...defaultProps} />);
    const editButtons = screen.getAllByRole("button");
    fireEvent.click(editButtons[0]);
    expect(defaultProps.onEdit).toHaveBeenCalledWith(1);
  });

  it("llama a onToggleActive al hacer click en el botón de toggle", () => {
    render(<UsersTable {...defaultProps} />);
    const toggleButtons = screen.getAllByRole("button");
    fireEvent.click(toggleButtons[1]);
    expect(defaultProps.onToggleActive).toHaveBeenCalledWith(mockUsers[0]);
  });

  it("llama a onDelete al hacer click en el botón eliminar", () => {
    render(<UsersTable {...defaultProps} />);
    const deleteButtons = screen.getAllByRole("button");
    fireEvent.click(deleteButtons[2]);
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockUsers[0]);
  });
});
