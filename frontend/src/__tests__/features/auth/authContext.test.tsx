import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../../features/auth/context/AuthContext";
import type { ReactNode } from "react";

vi.mock("../../../services/api", () => {
  const me = vi.fn().mockRejectedValue(new Error("not-called"));
  const login = vi.fn();
  const logout = vi.fn();
  const getSetupStatus = vi.fn().mockResolvedValue({ needs_setup: false });
  return {
    api: { me, login, logout, getSetupStatus },
  };
});

import { api } from "../../../services/api";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem("skip-auth");
  (api.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not-called"));
});

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext - useAuth throws outside provider", () => {
  it("throws when useAuth is called without AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth debe usarse dentro de <AuthProvider>",
    );
  });
});

describe("AuthContext - normal mode", () => {
  it("loads user from api.me() on mount", async () => {
    const mockUser = { id: 1, username: "admin", email: "a@b.com", nombre_completo: "Admin", rol_id: 1, rol_nombre: "Admin", is_active: true, created_at: "2025-01-01" };
    (api.me as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));
    expect(result.current.loading).toBe(false);
  });

  it("sets user to null when api.me() fails", async () => {
    (api.me as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("login calls api.login and sets user", async () => {
    const mockUser = { id: 2, username: "user", email: "u@b.com", nombre_completo: "User", rol_id: 2, rol_nombre: "User", is_active: true, created_at: "2025-01-01" };
    (api.me as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (api.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.login("user", "pass");
    expect(api.login).toHaveBeenCalledWith("user", "pass");
    await waitFor(() => expect(result.current.user).toEqual(mockUser));
  });

  it("logout calls api.logout and clears user", async () => {
    const mockUser = { id: 1, username: "admin", email: "a@b.com", nombre_completo: "Admin", rol_id: 1, rol_nombre: "Admin", is_active: true, created_at: "2025-01-01" };
    (api.me as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);
    (api.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ message: "ok" });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    await result.current.logout();
    expect(api.logout).toHaveBeenCalled();
    await waitFor(() => expect(result.current.user).toBeNull());
  });
});

describe("AuthContext - children render", () => {
  it("renders children", async () => {
    (api.me as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("no-user"));
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});