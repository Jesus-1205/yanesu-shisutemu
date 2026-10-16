import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useBreadcrumbs } from "../../layout/hooks/useBreadcrumbs";
import { api } from "../../services/api";

vi.mock("../../services/api", () => ({
  api: {
    getProduct: vi.fn(),
  },
}));

function createWrapper(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

describe("useBreadcrumbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty crumbs on root route", () => {
    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/"),
    });
    expect(result.current).toEqual([]);
  });

  it("maps single segment routes correctly", () => {
    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/sales"),
    });
    expect(result.current).toEqual([{ label: "Ventas" }]);
  });

  it("maps nested segment routes with intermediate href links", () => {
    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/products/new"),
    });
    expect(result.current).toEqual([
      { label: "Productos", href: "/products" },
      { label: "Nuevo" },
    ]);
  });

  it("fetches product name asynchronously for /products/:id/edit", async () => {
    vi.mocked(api.getProduct).mockResolvedValueOnce({
      id: 42,
      nombre: "Ron Santa Teresa 1996",
    } as any);

    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/products/42/edit"),
    });

    await waitFor(() => {
      expect(result.current).toEqual([
        { label: "Productos", href: "/products" },
        { label: "Ron Santa Teresa 1996" },
        { label: "edit" },
      ]);
    });
    expect(api.getProduct).toHaveBeenCalledWith(42);
  });

  it("falls back to #id if api.getProduct fails", async () => {
    vi.mocked(api.getProduct).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useBreadcrumbs(), {
      wrapper: createWrapper("/products/99/edit"),
    });

    await waitFor(() => {
      expect(result.current).toEqual([
        { label: "Productos", href: "/products" },
        { label: "#99" },
        { label: "edit" },
      ]);
    });
  });
});
