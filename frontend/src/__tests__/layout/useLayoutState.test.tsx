import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useLayoutState } from "../../layout/hooks/useLayoutState";
import { useRateStream } from "../../hooks/useRateStream";

const mockNavigate = vi.fn();
const mockLogout = vi.fn();
const mockToast = vi.fn();
const mockLoadTasa = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, username: "admin", email: "admin@test.com", rol_nombre: "ADMINISTRADOR" },
    logout: mockLogout,
    loading: false,
  }),
}));

vi.mock("../../ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("../../stores/exchangeRateStore", () => ({
  useExchangeRateStore: (selector: (s: any) => any) =>
    selector({
      loadTasa: mockLoadTasa,
    }),
}));

vi.mock("../../hooks/useRateStream", () => ({
  useRateStream: vi.fn(),
}));

function createWrapper(initialPath = "/") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

describe("useLayoutState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes layout state and calls loadTasa", () => {
    const { result } = renderHook(() => useLayoutState(), {
      wrapper: createWrapper("/dashboard"),
    });

    expect(result.current.collapsed).toBe(false);
    expect(result.current.mobileOpen).toBe(false);
    expect(result.current.isOperator).toBe(false);
    expect(result.current.sidebarItems.length).toBeGreaterThan(0);
    expect(mockLoadTasa).toHaveBeenCalledTimes(1);
  });

  it("handles logout successfully and navigates to /login", async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLayoutState(), {
      wrapper: createWrapper("/dashboard"),
    });

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("shows error toast if logout fails", async () => {
    mockLogout.mockRejectedValueOnce(new Error("Logout error"));
    const { result } = renderHook(() => useLayoutState(), {
      wrapper: createWrapper("/dashboard"),
    });

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockToast).toHaveBeenCalledWith("Error al cerrar sesión", "error");
  });

  it("detects mobile view on innerWidth < 1024 and responds to resize", () => {
    const originalInnerWidth = window.innerWidth;
    try {
      window.innerWidth = 800;
      const { result } = renderHook(() => useLayoutState(), {
        wrapper: createWrapper("/dashboard"),
      });
      expect(result.current.isMobile).toBe(true);

      act(() => {
        window.innerWidth = 1200;
        window.dispatchEvent(new Event("resize"));
      });
      expect(result.current.isMobile).toBe(false);
    } finally {
      window.innerWidth = originalInnerWidth;
    }
  });

  it("subscribes to rate stream and displays toast on new rate", () => {
    let capturedCallback: ((usd: number, eur: number) => void) | undefined;
    vi.mocked(useRateStream).mockImplementation((cb) => {
      capturedCallback = cb;
    });

    renderHook(() => useLayoutState(), {
      wrapper: createWrapper("/dashboard"),
    });

    expect(useRateStream).toHaveBeenCalled();
    act(() => {
      capturedCallback?.(36.5, 39.2);
    });
    expect(mockToast).toHaveBeenCalledWith("Nueva tasa BCV sincronizada: 36,50 Bs/USD", "info");
  });
});
