import { api } from "@/services/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import RolesPage from "@/features/roles/pages/RolesPage";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRoles = [
  { id: 1, nombre: "ADMIN" },
  { id: 2, nombre: "VENDEDOR" },
];

vi.mock("@/services/api", () => ({
  api: {
    getRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

function renderPage() {
  return render(
    <MemoryRouter>
      <RolesPage />
    </MemoryRouter>
  );
}

describe("RolesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getRoles.mockResolvedValue(mockRoles);
  });

  it("muestra loading inicial", () => {
    mockApi.getRoles.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN")).not.toBeInTheDocument();
  });

  it("renderiza tabla con roles", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ADMIN")).toBeInTheDocument();
    });
    expect(screen.getByText("VENDEDOR")).toBeInTheDocument();
  });

  it("abre modal para crear nuevo rol", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("ADMIN")).toBeInTheDocument());

    await user.click(screen.getByText("Nuevo Rol"));
    expect(screen.getByLabelText("Nombre del rol")).toBeInTheDocument();
  });

  it("crea un rol", async () => {
    const user = userEvent.setup();
    mockApi.createRole.mockResolvedValue({ id: 3, nombre: "GERENTE" });
    renderPage();
    await waitFor(() => expect(screen.getByText("ADMIN")).toBeInTheDocument());

    await user.click(screen.getByText("Nuevo Rol"));
    const input = screen.getByLabelText("Nombre del rol");
    await user.type(input, "GERENTE");
    await user.click(screen.getByText("Crear rol"));

    await waitFor(() => {
      expect(mockApi.createRole).toHaveBeenCalledWith({ nombre: "GERENTE" });
    });
    expect(mockToast).toHaveBeenCalledWith("Rol creado", "success");
  });

  it("abre modal para editar rol", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("ADMIN")).toBeInTheDocument());

    const editButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg") && btn.textContent?.trim() !== "Nuevo Rol",
    );
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Editar Rol" })).toBeInTheDocument();
    });
  });

  it("edita un rol", async () => {
    const user = userEvent.setup();
    mockApi.updateRole.mockResolvedValue({ id: 1, nombre: "SUPER_ADMIN" });
    renderPage();
    await waitFor(() => expect(screen.getByText("ADMIN")).toBeInTheDocument());

    const editButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("svg") && btn.textContent?.trim() !== "Nuevo Rol",
    );
    await user.click(editButtons[0]);

    const input = screen.getByLabelText("Nombre del rol");
    await user.clear(input);
    await user.type(input, "SUPER_ADMIN");
    await user.click(screen.getByText("Guardar cambios"));

    await waitFor(() => {
      expect(mockApi.updateRole).toHaveBeenCalledWith(1, { nombre: "SUPER_ADMIN" });
    });
    expect(mockToast).toHaveBeenCalledWith("Rol actualizado", "success");
  });

  it("elimina un rol", async () => {
    const user = userEvent.setup();
    mockApi.deleteRole.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByText("ADMIN")).toBeInTheDocument());

    const buttons = screen.getAllByRole("button");
    const trashButton = buttons.find((btn) => {
      const svg = btn.querySelector("svg");
      return svg && svg.classList.contains("text-danger");
    });
    if (trashButton) await user.click(trashButton);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Eliminar rol/i })).toBeInTheDocument();
    });

    await user.click(screen.getByText("Eliminar"));
    await waitFor(() => {
      expect(mockApi.deleteRole).toHaveBeenCalledWith(1);
    });
    expect(mockToast).toHaveBeenCalledWith("Rol eliminado", "success");
  });

  it("muestra error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockApi.getRoles.mockRejectedValue(new Error("Error de red"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Error de red")).toBeInTheDocument();
    });

    mockApi.getRoles.mockResolvedValue(mockRoles);
    await user.click(screen.getByText("Reintentar"));

    await waitFor(() => {
      expect(screen.getByText("ADMIN")).toBeInTheDocument();
    });
  });

  it("muestra mensaje vacío", async () => {
    mockApi.getRoles.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay roles registrados")).toBeInTheDocument();
    });
  });
});
