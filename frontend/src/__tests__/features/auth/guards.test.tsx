import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivateRoute from "../../../features/auth/components/PrivateRoute";
import RoleGuard from "../../../features/auth/components/RoleGuard";
import { AuthProvider } from "../../../features/auth/context/AuthContext";

const { mockMe } = vi.hoisted(() => ({
  mockMe: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { me: mockMe, getSetupStatus: vi.fn().mockResolvedValue({ needs_setup: false }) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem("skip-auth");
});

describe("PrivateRoute", () => {
  it("shows Spinner while loading", () => {
    mockMe.mockReturnValueOnce(new Promise(() => {}));

    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <PrivateRoute />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(container.querySelector(".dot-spinner__dot")).toBeInTheDocument();
  });

  it("navigates to /login when user is null", async () => {
    mockMe.mockRejectedValueOnce(new Error("no-auth"));

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <PrivateRoute />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      const outlet = screen.queryByTestId("outlet");
      expect(outlet).not.toBeInTheDocument();
    });
  });
});

describe("RoleGuard", () => {
  it("renders children when user has allowed role", async () => {
    mockMe.mockResolvedValueOnce({
      id: 1, username: "admin", email: "a@b.com", nombre_completo: "Admin",
      rol_id: 1, rol_nombre: "Admin", is_active: true, created_at: "2025-01-01",
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <RoleGuard allowedRoles={["Admin"]}>
            <div data-testid="guarded">Admin Content</div>
          </RoleGuard>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("guarded")).toBeInTheDocument();
    });
  });

  it("navigates to / when user role is not allowed", async () => {
    mockMe.mockResolvedValueOnce({
      id: 2, username: "user", email: "u@b.com", nombre_completo: "User",
      rol_id: 2, rol_nombre: "User", is_active: true, created_at: "2025-01-01",
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AuthProvider>
          <RoleGuard allowedRoles={["Admin"]}>
            <div data-testid="guarded">Admin Content</div>
          </RoleGuard>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      const guarded = screen.queryByTestId("guarded");
      expect(guarded).not.toBeInTheDocument();
    });
  });
});