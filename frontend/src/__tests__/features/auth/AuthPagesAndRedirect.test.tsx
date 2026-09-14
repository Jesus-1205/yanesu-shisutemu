import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SetupPage from "@/features/auth/pages/SetupPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import RoleRedirect from "@/features/auth/components/RoleRedirect";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { UserOut } from "@/types/api";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockSetupAdmin = vi.fn();

describe("SetupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      needsSetup: true,
      login: vi.fn(),
      logout: vi.fn(),
      setupAdmin: mockSetupAdmin,
    });
  });

  it("renderiza el formulario de configuración inicial correctamente", () => {
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Configuración Inicial")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Crear Administrador" }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tu nombre")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin@yanesu.test")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear Administrador" }),
    ).toBeInTheDocument();
  });

  it("muestra error si los campos están vacíos al enviar", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Crear Administrador" }));
    expect(screen.getByText("Completa todos los campos")).toBeInTheDocument();
    expect(mockSetupAdmin).not.toHaveBeenCalled();
  });

  it("muestra error si las contraseñas no coinciden", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText("admin"), "admin");
    await user.type(screen.getByPlaceholderText("Tu nombre"), "Admin Principal");
    await user.type(screen.getByPlaceholderText("admin@yanesu.test"), "admin@test.com");
    const passwords = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwords[0], "123456");
    await user.type(passwords[1], "654321");

    await user.click(screen.getByRole("button", { name: "Crear Administrador" }));
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(mockSetupAdmin).not.toHaveBeenCalled();
  });

  it("muestra error si la contraseña tiene menos de 6 caracteres", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText("admin"), "admin");
    await user.type(screen.getByPlaceholderText("Tu nombre"), "Admin Principal");
    await user.type(screen.getByPlaceholderText("admin@yanesu.test"), "admin@test.com");
    const passwords = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwords[0], "12345");
    await user.type(passwords[1], "12345");

    await user.click(screen.getByRole("button", { name: "Crear Administrador" }));
    expect(
      screen.getByText("La contraseña debe tener al menos 6 caracteres"),
    ).toBeInTheDocument();
    expect(mockSetupAdmin).not.toHaveBeenCalled();
  });

  it("completa setup exitoso y llama a setupAdmin", async () => {
    const user = userEvent.setup();
    mockSetupAdmin.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={["/setup"]}>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/dashboard" element={<div>Dashboard Destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText("admin"), "superadmin");
    await user.type(screen.getByPlaceholderText("Tu nombre"), "Super Administrador");
    await user.type(screen.getByPlaceholderText("admin@yanesu.test"), "super@yanesu.test");
    const passwords = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwords[0], "password123");
    await user.type(passwords[1], "password123");

    await user.click(screen.getByRole("button", { name: "Crear Administrador" }));

    await waitFor(() => {
      expect(mockSetupAdmin).toHaveBeenCalledWith({
        username: "superadmin",
        email: "super@yanesu.test",
        password: "password123",
        nombre_completo: "Super Administrador",
      });
      expect(screen.getByText("Dashboard Destination")).toBeInTheDocument();
    });
  });

  it("maneja error devuelto por la API al configurar", async () => {
    const user = userEvent.setup();
    mockSetupAdmin.mockRejectedValueOnce(new Error("Usuario ya registrado"));

    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText("admin"), "admin");
    await user.type(screen.getByPlaceholderText("Tu nombre"), "Admin");
    await user.type(screen.getByPlaceholderText("admin@yanesu.test"), "admin@test.com");
    const passwords = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwords[0], "password123");
    await user.type(passwords[1], "password123");

    await user.click(screen.getByRole("button", { name: "Crear Administrador" }));

    await waitFor(() => {
      expect(screen.getByText("Usuario ya registrado")).toBeInTheDocument();
    });
  });
});

describe("RegisterPage", () => {
  it("renderiza el texto de registro", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Register")).toBeInTheDocument();
  });
});

describe("RoleRedirect", () => {
  const adminUser: UserOut = {
    id: 1,
    username: "admin",
    email: "admin@test.com",
    nombre_completo: "Admin User",
    rol_id: 1,
    rol_nombre: "ADMINISTRADOR",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const cajeroUser: UserOut = {
    id: 2,
    username: "cajero",
    email: "cajero@test.com",
    nombre_completo: "Cajero User",
    rol_id: 2,
    rol_nombre: "CAJERO",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  it("no renderiza nada mientras loading es true", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      needsSetup: false,
      login: vi.fn(),
      logout: vi.fn(),
      setupAdmin: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <RoleRedirect />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("redirige a /dashboard si el rol es ADMINISTRADOR", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: adminUser,
      loading: false,
      needsSetup: false,
      login: vi.fn(),
      logout: vi.fn(),
      setupAdmin: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/dashboard" element={<div>Dashboard Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard Target")).toBeInTheDocument();
  });

  it("redirige a /sales/new si el rol NO es ADMINISTRADOR (ej. CAJERO)", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: cajeroUser,
      loading: false,
      needsSetup: false,
      login: vi.fn(),
      logout: vi.fn(),
      setupAdmin: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/sales/new" element={<div>POS Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("POS Target")).toBeInTheDocument();
  });
});
