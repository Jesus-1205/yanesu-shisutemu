import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUsers } from "@/features/users/hooks/useUsers";
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

const mockApi = vi.hoisted(() => ({
  getUsers: vi.fn(),
  toggleUserActive: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  api: {
    getUsers: mockApi.getUsers,
    toggleUserActive: mockApi.toggleUserActive,
    deleteUser: mockApi.deleteUser,
  },
}));

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("useUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga la lista de usuarios correctamente", async () => {
    mockApi.getUsers.mockResolvedValueOnce(mockUsers);

    const { result } = renderHook(() => useUsers());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
  });

  it("maneja error al cargar usuarios", async () => {
    mockApi.getUsers.mockRejectedValueOnce(new Error("Error del servidor"));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBe("Error del servidor");
  });

  it("activa/desactiva un usuario exitosamente", async () => {
    mockApi.getUsers.mockResolvedValueOnce(mockUsers);
    const updatedUser = { ...mockUsers[0], is_active: false };
    mockApi.toggleUserActive.mockResolvedValueOnce(updatedUser);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleToggleActive(mockUsers[0]);
    });

    expect(mockApi.toggleUserActive).toHaveBeenCalledWith(1);
    expect(result.current.users[0].is_active).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      'Usuario "admin" desactivado',
      "success",
    );
  });

  it("maneja error al cambiar estado de usuario", async () => {
    mockApi.getUsers.mockResolvedValueOnce(mockUsers);
    mockApi.toggleUserActive.mockRejectedValueOnce(new Error("Fallo al actualizar"));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleToggleActive(mockUsers[0]);
    });

    expect(mockToast).toHaveBeenCalledWith("Fallo al actualizar", "error");
    expect(result.current.togglingIds.has(1)).toBe(false);
  });

  it("elimina un usuario exitosamente", async () => {
    mockApi.getUsers.mockResolvedValueOnce(mockUsers);
    mockApi.deleteUser.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setDeleteTarget(mockUsers[0]);
    });

    expect(result.current.deleteTarget).toEqual(mockUsers[0]);

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockApi.deleteUser).toHaveBeenCalledWith(1);
    expect(result.current.users.length).toBe(1);
    expect(result.current.users[0].id).toBe(2);
    expect(result.current.deleteTarget).toBeNull();
    expect(mockToast).toHaveBeenCalledWith(
      'Usuario "admin" eliminado',
      "success",
    );
  });

  it("maneja error al eliminar usuario", async () => {
    mockApi.getUsers.mockResolvedValueOnce(mockUsers);
    mockApi.deleteUser.mockRejectedValueOnce(new Error("No se puede eliminar"));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setDeleteTarget(mockUsers[0]);
    });

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockToast).toHaveBeenCalledWith("No se puede eliminar", "error");
    expect(result.current.deleting).toBe(false);
  });

  it("no hace nada en handleDelete si deleteTarget es null", async () => {
    const { result } = renderHook(() => useUsers());

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockApi.deleteUser).not.toHaveBeenCalled();
  });
});
