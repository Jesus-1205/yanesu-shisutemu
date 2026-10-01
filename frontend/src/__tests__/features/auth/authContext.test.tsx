import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/features/auth/context/AuthContext";
import type { ReactNode } from "react";

vi.mock("@/services/api", () => {
  const me = vi.fn().mockRejectedValue(new Error("not-called"));
  const login = vi.fn();
  const logout = vi.fn();
  const getSetupStatus = vi.fn().mockResolvedValue({ needs_setup: false });
  return {
    api: { me, login, logout, getSetupStatus },
  };
});

import { api } from "@/services/api";

beforeEach(() => {
  vi.clearAllMocks();
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

describe("AuthContext - Provider integration", () => {
  it("provides auth context to consumer components", async () => {
    const mockUser = {
      id: 1,
      username: "admin",
      email: "a@b.com",
      nombre_completo: "Admin",
      rol_id: 1,
      rol_nombre: "Admin",
      is_active: true,
      created_at: "2025-01-01",
    };
    (api.me as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));
    expect(result.current.loading).toBe(false);
  });

  it("renders children properly", async () => {
    (api.me as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("no-user"));
    render(
      <AuthProvider>
        <div data-testid="child-element">child content</div>
      </AuthProvider>,
    );
    expect(screen.getByTestId("child-element")).toBeInTheDocument();
    await waitFor(() => expect(api.getSetupStatus).toHaveBeenCalled());
  });
});
