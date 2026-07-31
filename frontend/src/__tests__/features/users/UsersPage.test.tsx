import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@/ui-components/Toast";
import UsersPage from "@/features/users/pages/UsersPage";
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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderUsersPage = () => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <UsersPage />
      </ToastProvider>
    </BrowserRouter>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockClear();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("UsersPage", () => {
  describe("Loading state", () => {
    it("shows table headers while fetching users", () => {
      mockApi.getUsers.mockImplementation(() => new Promise(() => {}));

      renderUsersPage();

      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("Usuario")).toBeInTheDocument();
      expect(screen.getByText("Nombre")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Rol")).toBeInTheDocument();
      expect(screen.getByText("Estado")).toBeInTheDocument();
      expect(screen.getByText("Acciones")).toBeInTheDocument();
      expect(screen.queryByText("No hay usuarios registrados")).not.toBeInTheDocument();
    });
  });

  describe("Renders users table with data", () => {
    it("renders table headers", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);

      renderUsersPage();

      await waitFor(() => expect(screen.getByText("ID")).toBeInTheDocument());
      expect(screen.getByText("Usuario")).toBeInTheDocument();
      expect(screen.getByText("Nombre")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Rol")).toBeInTheDocument();
      expect(screen.getByText("Estado")).toBeInTheDocument();
      expect(screen.getByText("Acciones")).toBeInTheDocument();
    });

    it("renders user rows with correct data", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);

      renderUsersPage();

      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      // nombre_completo and rol_nombre are both "Administrador" for first user
      const administradorElements = screen.getAllByText("Administrador");
      expect(administradorElements.length).toBe(2);
      expect(screen.getByText("Vendedor")).toBeInTheDocument();
    });
  });

  describe("Badge shows Activo/Inactivo with correct variants", () => {
    it("shows 'Activo' badge with success variant for active users", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);

      renderUsersPage();

      await waitFor(() => {
        const activeBadge = screen.getByText("Activo");
        expect(activeBadge).toBeInTheDocument();
        expect(activeBadge).toHaveClass("bg-green-50");
        expect(activeBadge).toHaveClass("text-success");
      });
    });

    it("shows 'Inactivo' badge with danger variant for inactive users", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);

      renderUsersPage();

      await waitFor(() => {
        const inactiveBadge = screen.getByText("Inactivo");
        expect(inactiveBadge).toBeInTheDocument();
        expect(inactiveBadge).toHaveClass("bg-red-50");
        expect(inactiveBadge).toHaveClass("text-danger");
      });
    });
  });

  describe("Navigate to new user", () => {
    it("navigates to /users/new when 'Nuevo Usuario' button clicked", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);

      renderUsersPage();

      await waitFor(() => expect(screen.getByRole("button", { name: /nuevo usuario/i })).toBeInTheDocument());

      const newUserBtn = screen.getByRole("button", { name: /nuevo usuario/i });
      await userEvent.click(newUserBtn);

      expect(mockNavigate).toHaveBeenCalledWith("/users/new");
    });
  });

  describe("Navigate to edit user", () => {
    it("navigates to /users/:id when pencil button clicked", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);

      renderUsersPage();

      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());

      // Find the edit button (pencil icon) - first action button in first row
      const buttons = screen.getAllByRole("button");
      // Find the button with pencil SVG (not the trash, not the Nuevo Usuario)
      const editButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg && !svg.classList.contains("text-danger") && !btn.textContent?.includes("Nuevo Usuario");
      });
      if (editButton) await userEvent.click(editButton);

      expect(mockNavigate).toHaveBeenCalledWith("/users/1");
    });
  });

  describe("Toggle active -> calls api.toggleUserActive, updates local state, shows toast", () => {
    it("activates inactive user, updates table, shows success toast", async () => {
      const updatedUser: User = { ...mockUsers[1], is_active: true };
      mockApi.getUsers.mockResolvedValue(mockUsers);
      mockApi.toggleUserActive.mockResolvedValue(updatedUser);

      renderUsersPage();

      await waitFor(() => expect(screen.getByText("Inactivo")).toBeInTheDocument());

      // Find toggle button for second user (inactive) - it has Power icon (text-success)
      const buttons = screen.getAllByRole("button");
      const toggleButtons = buttons.filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && (svg.classList.contains("text-success") || svg.classList.contains("text-danger"));
      });
      await userEvent.click(toggleButtons[1]); // second user (inactive)

      await waitFor(() => expect(mockApi.toggleUserActive).toHaveBeenCalledWith(2));

      // Check the specific badge in the table row (not toast)
      await waitFor(() => {
        const activeBadges = screen.getAllByText("Activo");
        expect(activeBadges.length).toBe(2); // both users now active
      });

      await waitFor(() => {
        expect(screen.getByText(/usuario "vendedor" activado/i)).toBeInTheDocument();
      });
    });
  });

  describe("Toggle inactive -> calls api, updates state, shows toast", () => {
    it("deactivates active user, updates table, shows success toast", async () => {
      const updatedUser: User = { ...mockUsers[0], is_active: false };
      mockApi.getUsers.mockResolvedValue(mockUsers);
      mockApi.toggleUserActive.mockResolvedValue(updatedUser);

      renderUsersPage();

      await waitFor(() => expect(screen.getByText("Activo")).toBeInTheDocument());

      const buttons = screen.getAllByRole("button");
      const toggleButtons = buttons.filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && (svg.classList.contains("text-success") || svg.classList.contains("text-danger"));
      });
      await userEvent.click(toggleButtons[0]); // first user (active)

      await waitFor(() => expect(mockApi.toggleUserActive).toHaveBeenCalledWith(1));

      // Check the specific badge in the table row (not toast)
      await waitFor(() => {
        const inactiveBadges = screen.getAllByText("Inactivo");
        expect(inactiveBadges.length).toBe(2); // both users now inactive
      });

      await waitFor(() => {
        expect(screen.getByText(/usuario "admin" desactivado/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error state with retry", () => {
    it("shows error banner with retry button on fetch error", async () => {
      mockApi.getUsers.mockRejectedValueOnce(new Error("Error de red"));

      renderUsersPage();

      await waitFor(() => expect(screen.getByText("Error de red")).toBeInTheDocument());
      expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    });

    it("retries fetch when retry button clicked", async () => {
      mockApi.getUsers.mockRejectedValueOnce(new Error("Error de red"));
      mockApi.getUsers.mockResolvedValueOnce(mockUsers);

      renderUsersPage();

      await waitFor(() => expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument());

      await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));

      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
      expect(mockApi.getUsers).toHaveBeenCalledTimes(2);
    });
  });

  describe("Empty state", () => {
    it("shows 'No hay usuarios registrados' when no users", async () => {
      mockApi.getUsers.mockResolvedValue([]);

      renderUsersPage();

      await waitFor(() => expect(screen.getByText("No hay usuarios registrados")).toBeInTheDocument());
    });
  });

  describe("Delete user", () => {
    it("shows trash button for each user", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);
      renderUsersPage();
      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
      const trashButtons = screen.getAllByRole("button").filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && svg.classList.contains("lucide-trash-2");
      });
      expect(trashButtons.length).toBe(2);
    });

    it("opens confirm dialog when trash button clicked", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);
      renderUsersPage();
      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
      const trashButtons = screen.getAllByRole("button").filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && svg.classList.contains("lucide-trash-2");
      });
      await userEvent.click(trashButtons[0]);
      await waitFor(() => {
        expect(screen.getByText(/¿Estás seguro de eliminar "admin"?/)).toBeInTheDocument();
      });
    });

    it("calls deleteUser and removes user from table on confirm", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);
      mockApi.deleteUser.mockResolvedValue(undefined);
      renderUsersPage();
      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
      const trashButtons = screen.getAllByRole("button").filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && svg.classList.contains("lucide-trash-2");
      });
      await userEvent.click(trashButtons[0]);
      await waitFor(() => expect(screen.getByText(/¿Estás seguro de eliminar "admin"?/)).toBeInTheDocument());
      await userEvent.click(screen.getByRole("button", { name: /eliminar/i }));
      await waitFor(() => {
        expect(mockApi.deleteUser).toHaveBeenCalledWith(1);
        expect(screen.queryByText("admin")).not.toBeInTheDocument();
      });
    });

    it("shows error toast when deleteUser fails", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);
      mockApi.deleteUser.mockRejectedValue(new Error("No se puede eliminar: el usuario tiene ventas registradas"));
      renderUsersPage();
      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
      const trashButtons = screen.getAllByRole("button").filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && svg.classList.contains("lucide-trash-2");
      });
      await userEvent.click(trashButtons[0]);
      await waitFor(() => expect(screen.getByText(/¿Estás seguro de eliminar "admin"?/)).toBeInTheDocument());
      await userEvent.click(screen.getByRole("button", { name: /eliminar/i }));
      await waitFor(() => {
        expect(screen.getByText(/No se puede eliminar/)).toBeInTheDocument();
      });
    });

    it("closes dialog when cancel clicked", async () => {
      mockApi.getUsers.mockResolvedValue(mockUsers);
      renderUsersPage();
      await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
      const trashButtons = screen.getAllByRole("button").filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && svg.classList.contains("lucide-trash-2");
      });
      await userEvent.click(trashButtons[0]);
      await waitFor(() => expect(screen.getByText(/¿Estás seguro de eliminar "admin"?/)).toBeInTheDocument());
      await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
      await waitFor(() => {
        expect(screen.queryByText(/¿Estás seguro de eliminar "admin"?/)).not.toBeInTheDocument();
      });
    });
  });
});