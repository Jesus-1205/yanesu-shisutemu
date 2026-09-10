import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SettingsLayout from "@/features/settings/components/SettingsLayout";
import SettingsNav from "@/features/settings/components/SettingsNav";
import SettingsPage from "@/features/settings/pages/SettingsPage";
import SettingsPaymentMethodsPage from "@/features/settings/pages/SettingsPaymentMethodsPage";
import SettingsSystemPage from "@/features/settings/pages/SettingsSystemPage";
import SettingsUsersPage from "@/features/settings/pages/SettingsUsersPage";
import SystemSettingsPage from "@/features/system-settings/pages/SystemSettingsPage";
import { api } from "@/services/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/services/api", () => ({
  api: {
    getApiKeyStatus: vi.fn(),
    saveApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    testGeminiConnection: vi.fn(),
    getUsers: vi.fn().mockResolvedValue([]),
    getRoles: vi.fn().mockResolvedValue([]),
    getPaymentMethods: vi.fn().mockResolvedValue([]),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── SettingsLayout y SettingsNav ──────────────────────────────────────────────

describe("SettingsLayout y SettingsNav", () => {
  it("renderiza el título principal y los enlaces de navegación", () => {
    render(
      <MemoryRouter initialEntries={["/settings/users"]}>
        <Routes>
          <Route path="/settings" element={<SettingsLayout />}>
            <Route path="users" element={<div>Contenido Usuarios</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByText("Administra los ajustes del sistema")).toBeInTheDocument();
    expect(screen.getByText("Usuarios y Roles")).toBeInTheDocument();
    expect(screen.getByText("Métodos de Pago")).toBeInTheDocument();
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("Contenido Usuarios")).toBeInTheDocument();
  });

  it("SettingsNav resalta el enlace activo según la ruta actual", () => {
    render(
      <MemoryRouter initialEntries={["/settings/system"]}>
        <SettingsNav />
      </MemoryRouter>,
    );

    const activeLink = screen.getByRole("link", { name: /API Keys/i });
    expect(activeLink.className).toContain("bg-brand-blue/10");
  });
});

// ── SettingsPage (Redirección) ────────────────────────────────────────────────

describe("SettingsPage", () => {
  it("redirige automáticamente a /settings/users", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/users" element={<div>Destino Redirección</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Destino Redirección")).toBeInTheDocument();
  });
});

// ── Wrappers de páginas delegadas ─────────────────────────────────────────────

describe("Settings Sub-páginas wrappers", () => {
  it("SettingsUsersPage monta sin error", () => {
    render(
      <MemoryRouter>
        <SettingsUsersPage />
      </MemoryRouter>,
    );
    expect(document.body).toBeDefined();
  });

  it("SettingsPaymentMethodsPage monta sin error", () => {
    render(
      <MemoryRouter>
        <SettingsPaymentMethodsPage />
      </MemoryRouter>,
    );
    expect(document.body).toBeDefined();
  });

  it("SettingsSystemPage monta el componente SystemSettingsPage", async () => {
    vi.mocked(api.getApiKeyStatus).mockResolvedValueOnce({ configured: false });
    render(
      <MemoryRouter>
        <SettingsSystemPage />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Google Gemini API Key")).toBeInTheDocument();
    });
  });
});

// ── SystemSettingsPage (Lógica interactiva de API Keys) ────────────────────────

describe("SystemSettingsPage", () => {
  it("muestra estado de carga inicial y luego badge 'No configurada'", async () => {
    vi.mocked(api.getApiKeyStatus).mockResolvedValueOnce({ configured: false });

    render(
      <MemoryRouter>
        <SystemSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No configurada")).toBeInTheDocument();
    });

    expect(api.getApiKeyStatus).toHaveBeenCalledWith("GEMINI_API_KEY");
  });

  it("muestra badge 'Configurada' y botón 'Eliminar' si ya existe key", async () => {
    vi.mocked(api.getApiKeyStatus).mockResolvedValueOnce({ configured: true });

    render(
      <MemoryRouter>
        <SystemSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Configurada")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Eliminar/i })).toBeInTheDocument();
    });
  });

  it("permite guardar una nueva API Key y muestra toast de éxito", async () => {
    vi.mocked(api.getApiKeyStatus).mockResolvedValueOnce({ configured: false });
    vi.mocked(api.saveApiKey).mockResolvedValueOnce({ message: "Guardado" });

    render(
      <MemoryRouter>
        <SystemSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("AIza...")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("AIza...");
    fireEvent.change(input, { target: { value: "AIzaSySecretKey123" } });

    const saveBtn = screen.getByRole("button", { name: /Guardar API Key/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.saveApiKey).toHaveBeenCalledWith({
        clave: "GEMINI_API_KEY",
        valor: "AIzaSySecretKey123",
        descripcion: "API Key de Google Gemini para análisis de facturas",
      });
      expect(mockToast).toHaveBeenCalledWith("API key guardada correctamente", "success");
      expect(screen.getByText("Configurada")).toBeInTheDocument();
    });
  });

  it("permite probar la conexión con Gemini y muestra resultado exitoso", async () => {
    vi.mocked(api.getApiKeyStatus).mockResolvedValueOnce({ configured: false });
    vi.mocked(api.testGeminiConnection).mockResolvedValueOnce({
      success: true,
      message: "Modelos disponibles: gemini-1.5-flash",
    });

    render(
      <MemoryRouter>
        <SystemSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("AIza...")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("AIza...");
    fireEvent.change(input, { target: { value: "AIzaSyValidKey" } });

    const testBtn = screen.getByRole("button", { name: /Probar Conexión/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(api.testGeminiConnection).toHaveBeenCalledWith({
        clave: "GEMINI_API_KEY",
        valor: "AIzaSyValidKey",
      });
      expect(screen.getByText("Modelos disponibles: gemini-1.5-flash")).toBeInTheDocument();
      expect(mockToast).toHaveBeenCalledWith("Conexión exitosa con Gemini", "success");
    });
  });

  it("elimina la API Key y actualiza el estado a no configurada", async () => {
    vi.mocked(api.getApiKeyStatus).mockResolvedValueOnce({ configured: true });
    vi.mocked(api.deleteApiKey).mockResolvedValueOnce({ message: "Eliminado" });

    render(
      <MemoryRouter>
        <SystemSettingsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Eliminar/i })).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /Eliminar/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.deleteApiKey).toHaveBeenCalledWith("GEMINI_API_KEY");
      expect(mockToast).toHaveBeenCalledWith("API key eliminada", "success");
      expect(screen.getByText("No configurada")).toBeInTheDocument();
    });
  });
});
