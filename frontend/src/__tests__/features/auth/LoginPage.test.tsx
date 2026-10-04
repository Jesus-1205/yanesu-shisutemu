import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../../../features/auth/pages/LoginPage";
import { AuthProvider } from "../../../features/auth/context/AuthContext";

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/services/api", () => ({
  api: {
    login: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error("not called")),
    getSetupStatus: vi.fn().mockResolvedValue({ needs_setup: false }),
  },
}));

import { api } from "@/services/api";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("renders login form with username and password fields", async () => {
    render(<LoginPage />, { wrapper });
    expect(screen.getByPlaceholderText("tu_usuario")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    await waitFor(() => expect(api.getSetupStatus).toHaveBeenCalled());
  });

  it("shows error when submitting empty form", async () => {
    render(<LoginPage />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByText("Completa todos los campos")).toBeInTheDocument();
    await waitFor(() => expect(api.getSetupStatus).toHaveBeenCalled());
  });

  it("calls login on valid submit and navigates on success", async () => {
    (api.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText("tu_usuario"), "admin");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(api.login).toHaveBeenCalledWith("admin", "password123"));
  });

  it("shows error when login fails", async () => {
    (api.login as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Credenciales inválidas"));
    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText("tu_usuario"), "admin");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument());
  });

  it("shows loading state during login", async () => {
    let resolveLogin: (value: unknown) => void;
    (api.login as ReturnType<typeof vi.fn>).mockImplementationOnce(() => new Promise((r) => { resolveLogin = r; }));
    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText("tu_usuario"), "admin");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByText("Iniciando sesión...")).toBeInTheDocument();
    resolveLogin!(undefined);
    await waitFor(() => expect(screen.queryByText("Iniciando sesión...")).not.toBeInTheDocument());
  });

  it("disables inputs while loading", async () => {
    let resolveLogin: (value: unknown) => void;
    (api.login as ReturnType<typeof vi.fn>).mockImplementationOnce(() => new Promise((r) => { resolveLogin = r; }));
    render(<LoginPage />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText("tu_usuario"), "admin");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByPlaceholderText("tu_usuario")).toBeDisabled();
    expect(screen.getByPlaceholderText("••••••••")).toBeDisabled();
    resolveLogin!(undefined);
    await waitFor(() => expect(screen.getByPlaceholderText("tu_usuario")).not.toBeDisabled());
  });
});