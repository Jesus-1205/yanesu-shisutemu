import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuthLogic } from "@/features/auth/hooks/useAuthLogic";
import { api } from "@/services/api";

vi.mock("@/services/api", () => {
  const me = vi.fn().mockRejectedValue(new Error("not-called"));
  const login = vi.fn();
  const logout = vi.fn();
  const setupAdmin = vi.fn();
  const getSetupStatus = vi.fn().mockResolvedValue({ needs_setup: false });
  return {
    api: { me, login, logout, setupAdmin, getSetupStatus },
  };
});

describe("useAuthLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getSetupStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ needs_setup: false });
    (api.me as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not-called"));
  });

  it("loads user from api.me() on mount when needs_setup is false", async () => {
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

    const { result } = renderHook(() => useAuthLogic());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.user).toEqual(mockUser));
    expect(result.current.loading).toBe(false);
    expect(result.current.needsSetup).toBe(false);
  });

  it("sets needsSetup to true when getSetupStatus returns needs_setup: true", async () => {
    (api.getSetupStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ needs_setup: true });

    const { result } = renderHook(() => useAuthLogic());

    await waitFor(() => {
      expect(result.current.needsSetup).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  it("sets user to null when api.me() fails", async () => {
    (api.me as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuthLogic());

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles getSetupStatus error gracefully and tries api.me()", async () => {
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
    (api.getSetupStatus as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network Error"));
    (api.me as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuthLogic());

    await waitFor(() => expect(result.current.user).toEqual(mockUser));
    expect(result.current.loading).toBe(false);
  });

  it("login calls api.login and updates user and resets needsSetup", async () => {
    const mockUser = {
      id: 2,
      username: "user",
      email: "u@b.com",
      nombre_completo: "User",
      rol_id: 2,
      rol_nombre: "User",
      is_active: true,
      created_at: "2025-01-01",
    };
    (api.me as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (api.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuthLogic());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login("user", "pass");
    });

    expect(api.login).toHaveBeenCalledWith("user", "pass");
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.needsSetup).toBe(false);
  });

  it("logout calls api.logout and clears user", async () => {
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
    (api.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ message: "ok" });

    const { result } = renderHook(() => useAuthLogic());
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    await act(async () => {
      await result.current.logout();
    });

    expect(api.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it("setupAdmin calls api.setupAdmin and updates user and resets needsSetup", async () => {
    const setupData = {
      username: "admin",
      email: "admin@yanesu.com",
      password: "password123",
      nombre_completo: "Admin Yanesu",
    };
    const mockUser = {
      id: 1,
      username: "admin",
      email: "admin@yanesu.com",
      nombre_completo: "Admin Yanesu",
      rol_id: 1,
      rol_nombre: "ADMINISTRADOR",
      is_active: true,
      created_at: "2025-01-01",
    };
    (api.setupAdmin as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuthLogic());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setupAdmin(setupData);
    });

    expect(api.setupAdmin).toHaveBeenCalledWith(setupData);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.needsSetup).toBe(false);
  });
});
