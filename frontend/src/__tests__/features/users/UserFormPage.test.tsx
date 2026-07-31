import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import UserFormPage from "@/features/users/pages/UserFormPage";
import { api } from "@/services/api";

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockRoles = [
  { id: 1, nombre: "ADMIN" },
  { id: 2, nombre: "VENDEDOR" },
];

const mockUser = {
  id: 5,
  username: "jperez",
  email: "jperez@correo.com",
  nombre_completo: "Juan Pérez",
  rol_id: 2,
  rol_nombre: "VENDEDOR",
  is_active: true,
  created_at: "2024-01-15T10:00:00Z",
};

vi.mock("@/services/api", () => ({
  api: {
    getRoles: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

function renderNewPage() {
  mockUseParams.mockReturnValue({}); // no id = new mode
  return render(
    <MemoryRouter>
      <UserFormPage />
    </MemoryRouter>
  );
}

function renderEditPage() {
  mockUseParams.mockReturnValue({ id: "5" }); // has id = edit mode
  return render(
    <MemoryRouter>
      <UserFormPage />
    </MemoryRouter>
  );
}

describe("UserFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getRoles.mockResolvedValue(mockRoles);
    mockNavigate.mockClear();
  });

  describe("New mode", () => {
    it("renders empty form with required fields", () => {
      renderNewPage();
      expect(screen.getByLabelText("Nombre de usuario")).toBeInTheDocument();
      expect(screen.getByLabelText("Nombre completo")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
      // Role select doesn't have proper label association, just check it exists
      expect(screen.getByText("Seleccionar rol")).toBeInTheDocument();
    });

    it("password is required in new mode", () => {
      renderNewPage();
      const passwordInput = screen.getByLabelText("Contraseña");
      expect(passwordInput).toBeRequired();
    });

    it("role select loads options from api.getRoles", async () => {
      renderNewPage();
      await waitFor(() => {
        expect(mockApi.getRoles).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.getByText("ADMIN")).toBeInTheDocument();
        expect(screen.getByText("VENDEDOR")).toBeInTheDocument();
      });
    });

    it("creates user with all fields", async () => {
      mockApi.createUser.mockResolvedValue({ id: 1, username: "newuser", email: "nuevo@correo.com", nombre_completo: "Nuevo Usuario", rol_id: 1, rol_nombre: "ADMIN", is_active: true, created_at: "2025-01-01" });
      const user = userEvent.setup();
      renderNewPage();

      await waitFor(() => expect(screen.getByText("VENDEDOR")).toBeInTheDocument());

      await user.type(screen.getByLabelText("Nombre de usuario"), "newuser");
      await user.type(screen.getByLabelText("Nombre completo"), "Nuevo Usuario");
      await user.type(screen.getByLabelText("Email"), "nuevo@correo.com");
      await user.type(screen.getByLabelText("Contraseña"), "password123");
      await user.selectOptions(screen.getByRole("combobox"), "1");

      await user.click(screen.getByText("Crear usuario"));

      await waitFor(() => {
        expect(mockApi.createUser).toHaveBeenCalledWith({
          username: "newuser",
          email: "nuevo@correo.com",
          password: "password123",
          nombre_completo: "Nuevo Usuario",
          rol_id: 1,
        });
      });
      expect(mockToast).toHaveBeenCalledWith("Usuario creado", "success");
    });

    it("shows error when create fails", async () => {
      mockApi.createUser.mockRejectedValue(new Error("Error al crear usuario"));
      const user = userEvent.setup();
      renderNewPage();

      await waitFor(() => expect(screen.getByText("VENDEDOR")).toBeInTheDocument());

      await user.type(screen.getByLabelText("Nombre de usuario"), "newuser");
      await user.type(screen.getByLabelText("Nombre completo"), "Nuevo Usuario");
      await user.type(screen.getByLabelText("Email"), "nuevo@correo.com");
      await user.type(screen.getByLabelText("Contraseña"), "password123");
      await user.selectOptions(screen.getByRole("combobox"), "1");

      await user.click(screen.getByText("Crear usuario"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Error al crear usuario", "error");
      });
    });
  });

  describe("Edit mode", () => {
    it("loads user data and pre-fills form", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      renderEditPage();

      await waitFor(() => {
        expect(mockApi.getUser).toHaveBeenCalledWith(5);
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Nombre de usuario")).toHaveValue("jperez");
        expect(screen.getByLabelText("Nombre completo")).toHaveValue("Juan Pérez");
        expect(screen.getByLabelText("Email")).toHaveValue("jperez@correo.com");
        // Select value check
        expect(screen.getByRole("combobox")).toHaveValue("2");
      });
    });

    it("password is not required in edit mode and label changes", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nueva contraseña (dejar vacío para mantener)")).toBeInTheDocument());
      const passwordInput = screen.getByLabelText("Nueva contraseña (dejar vacío para mantener)");
      expect(passwordInput).not.toBeRequired();
    });

    it("role select loads options from api.getRoles in edit mode", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      renderEditPage();

      await waitFor(() => {
        expect(mockApi.getRoles).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText("ADMIN")).toBeInTheDocument();
        expect(screen.getByText("VENDEDOR")).toBeInTheDocument();
      });
    });

    it("updates user with partial fields", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      mockApi.updateUser.mockResolvedValue({ id: 5, username: "jperez", email: "jperez@correo.com", nombre_completo: "Juan Pérez Actualizado", rol_id: 1, rol_nombre: "ADMIN", is_active: true, created_at: "2024-01-15T10:00:00Z" });
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre de usuario")).toHaveValue("jperez"));

      await user.clear(screen.getByLabelText("Nombre completo"));
      await user.type(screen.getByLabelText("Nombre completo"), "Juan Pérez Actualizado");
      await user.selectOptions(screen.getByRole("combobox"), "1");

      await user.click(screen.getByText("Guardar cambios"));

      await waitFor(() => {
        expect(mockApi.updateUser).toHaveBeenCalledWith(5, {
          username: "jperez",
          email: "jperez@correo.com",
          nombre_completo: "Juan Pérez Actualizado",
          rol_id: 1,
        });
      });
      expect(mockToast).toHaveBeenCalledWith("Usuario actualizado", "success");
    });

    it("updates password only when provided", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      mockApi.updateUser.mockResolvedValue({ id: 5, username: "jperez", email: "jperez@correo.com", nombre_completo: "Juan Pérez", rol_id: 2, rol_nombre: "VENDEDOR", is_active: true, created_at: "2024-01-15T10:00:00Z" });
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre de usuario")).toHaveValue("jperez"));

      await user.type(screen.getByLabelText("Nueva contraseña (dejar vacío para mantener)"), "nuevapass123");

      await user.click(screen.getByText("Guardar cambios"));

      await waitFor(() => {
        expect(mockApi.updateUser).toHaveBeenCalledWith(5, {
          username: "jperez",
          email: "jperez@correo.com",
          password: "nuevapass123",
          nombre_completo: "Juan Pérez",
          rol_id: 2,
        });
      });
    });

    it("shows error when update fails", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      mockApi.updateUser.mockRejectedValue(new Error("Error al actualizar"));
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre de usuario")).toHaveValue("jperez"));

      await user.click(screen.getByText("Guardar cambios"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Error al actualizar", "error");
      });
    });

    it("shows error when loading user fails", async () => {
      mockApi.getUser.mockRejectedValue(new Error("Error de red"));
      renderEditPage();

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith("Error al cargar usuario", "error");
      });
    });
  });

  describe("Navigation", () => {
    it("navigates to /users on cancel in new mode", async () => {
      const user = userEvent.setup();
      renderNewPage();
      await waitFor(() => expect(screen.getByText("VENDEDOR")).toBeInTheDocument());

      await user.click(screen.getByText("Cancelar"));
      expect(mockNavigate).toHaveBeenCalledWith("/users");
    });

    it("navigates to /users on cancel in edit mode", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre de usuario")).toHaveValue("jperez"));

      await user.click(screen.getByText("Cancelar"));
      expect(mockNavigate).toHaveBeenCalledWith("/users");
    });
  });

describe("Loading states", () => {
    it("shows spinner while loading user in edit mode", () => {
      mockApi.getUser.mockImplementation(() => new Promise(() => {}));
      renderEditPage();
      // Spinner component renders a div with inline style containing --uib-speed
      const spinnerContainer = document.querySelector('[style*="--uib-speed"]');
      expect(spinnerContainer).toBeInTheDocument();
    });

    it("shows saving state during submit", async () => {
      mockApi.getUser.mockResolvedValue(mockUser);
      let resolveUpdate: (value: import("@/types/api").UserOut) => void;
      mockApi.updateUser.mockImplementation(() => new Promise((r) => { resolveUpdate = r; }));
      const user = userEvent.setup();
      renderEditPage();

      await waitFor(() => expect(screen.getByLabelText("Nombre de usuario")).toHaveValue("jperez"));

      const submitBtn = screen.getByText("Guardar cambios");
      await user.click(submitBtn);
      // Check for loading state - button gets disabled or has aria-busy
      expect(submitBtn).toBeDisabled();

      resolveUpdate!({ id: 5, username: "jperez", email: "jperez@correo.com", nombre_completo: "Juan Pérez", rol_id: 2, rol_nombre: "VENDEDOR", is_active: true, created_at: "2024-01-15T10:00:00Z" });
      await waitFor(() => expect(submitBtn).not.toBeDisabled());
    });
  });
});