import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/services/api";
import { useUserForm } from "@/features/users/hooks/useUserForm";
import type { UserOut as User } from "@/types/api";

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getRoles: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const mockRoles = [
  { id: 1, nombre: "ADMIN" },
  { id: 2, nombre: "VENDEDOR" },
];

const mockUser: User = {
  id: 5,
  username: "jperez",
  email: "jperez@correo.com",
  nombre_completo: "Juan Pérez",
  rol_id: 2,
  rol_nombre: "VENDEDOR",
  is_active: true,
  created_at: "2024-01-15T10:00:00Z",
};

describe("useUserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getRoles.mockResolvedValue(mockRoles);
  });

  it("inicializa en modo nuevo cuando no hay id", async () => {
    mockUseParams.mockReturnValue({});

    const { result } = renderHook(() => useUserForm());

    expect(result.current.isNew).toBe(true);
    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(result.current.roles).toEqual(mockRoles);
    });
  });

  it("inicializa en modo edición y carga el usuario cuando hay id", async () => {
    mockUseParams.mockReturnValue({ id: "5" });
    mockApi.getUser.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useUserForm());

    expect(result.current.isNew).toBe(false);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.form.username).toBe("jperez");
    expect(result.current.form.email).toBe("jperez@correo.com");
    expect(result.current.form.nombre_completo).toBe("Juan Pérez");
    expect(result.current.form.rol_id).toBe("2");
  });

  it("maneja error al cargar roles y muestra toast", async () => {
    mockUseParams.mockReturnValue({});
    mockApi.getRoles.mockRejectedValueOnce(new Error("Error de red"));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Error de red", "error");
    });

    expect(result.current.roles).toEqual([]);
  });

  it("actualiza los campos del formulario con handleChange", async () => {
    mockUseParams.mockReturnValue({});

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.roles).toEqual(mockRoles);
    });

    act(() => {
      result.current.handleChange("username", "nuevousuario");
      result.current.handleChange("email", "nuevo@correo.com");
    });

    expect(result.current.form.username).toBe("nuevousuario");
    expect(result.current.form.email).toBe("nuevo@correo.com");
  });

  it("crea un nuevo usuario exitosamente en modo nuevo", async () => {
    mockUseParams.mockReturnValue({});
    mockApi.createUser.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.roles).toEqual(mockRoles);
    });

    act(() => {
      result.current.handleChange("username", "jperez");
      result.current.handleChange("email", "jperez@correo.com");
      result.current.handleChange("password", "pass123");
      result.current.handleChange("nombre_completo", "Juan Pérez");
      result.current.handleChange("rol_id", "2");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockApi.createUser).toHaveBeenCalledWith({
      username: "jperez",
      email: "jperez@correo.com",
      password: "pass123",
      nombre_completo: "Juan Pérez",
      rol_id: 2,
    });
    expect(mockToast).toHaveBeenCalledWith("Usuario creado", "success");
    expect(mockNavigate).toHaveBeenCalledWith("/users");
  });

  it("actualiza un usuario exitosamente en modo edición", async () => {
    mockUseParams.mockReturnValue({ id: "5" });
    mockApi.getUser.mockResolvedValueOnce(mockUser);
    mockApi.updateUser.mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.roles).toEqual(mockRoles);
    });

    act(() => {
      result.current.handleChange("nombre_completo", "Juan Carlos Pérez");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockApi.updateUser).toHaveBeenCalledWith(5, {
      username: "jperez",
      email: "jperez@correo.com",
      password: undefined,
      nombre_completo: "Juan Carlos Pérez",
      rol_id: 2,
    });
    expect(mockToast).toHaveBeenCalledWith("Usuario actualizado", "success");
    expect(mockNavigate).toHaveBeenCalledWith("/users");
  });

  it("maneja error en createUser", async () => {
    mockUseParams.mockReturnValue({});
    mockApi.createUser.mockRejectedValueOnce(new Error("Usuario duplicado"));

    const { result } = renderHook(() => useUserForm());

    await waitFor(() => {
      expect(result.current.roles).toEqual(mockRoles);
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockToast).toHaveBeenCalledWith("Usuario duplicado", "error");
    expect(result.current.saving).toBe(false);
  });
});
