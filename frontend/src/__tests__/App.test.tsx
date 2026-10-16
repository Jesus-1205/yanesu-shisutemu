import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import AppLayout from "../App";
import type { ReactNode } from "react";

vi.mock("../features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, username: "admin", email: "admin@test.com", rol_nombre: "ADMINISTRADOR" },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("../stores/exchangeRateStore", () => ({
  useExchangeRateStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      tasa: 0,
      tasaEUR: 0,
      loading: false,
      loadTasa: vi.fn(),
    }),
}));

function TestOutlet() {
  return (
    <div>
      <Link to="/sales">Go Sales</Link>
      <Link to="/sales/new">Go POS</Link>
    </div>
  );
}

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<TestOutlet />} />
          <Route path="sales" element={<TestOutlet />} />
          <Route path="sales/new" element={<TestOutlet />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function sidebarClass(container: HTMLElement): string {
  const aside = container.querySelector("aside");
  expect(aside).toBeTruthy();
  return aside!.className;
}

const COLLAPSED = "w-[4.94rem]";
const EXPANDED = "w-60";

describe("AppLayout", () => {
  it("collapses the sidebar by default when entering POS", () => {
    const { container } = renderApp("/sales/new");
    expect(sidebarClass(container)).toContain(COLLAPSED);
  });

  it("keeps the sidebar expanded on non-POS pages", () => {
    const { container } = renderApp("/sales");
    expect(sidebarClass(container)).toContain(EXPANDED);
  });

  it("collapses on navigation to POS and restores previous state on leaving", async () => {
    const { container } = renderApp("/sales");
    expect(sidebarClass(container)).toContain(EXPANDED);

    await userEvent.click(screen.getByText("Go POS"));
    await waitFor(() => {
      expect(sidebarClass(container)).toContain(COLLAPSED);
    });

    await userEvent.click(screen.getByText("Go Sales"));
    await waitFor(() => {
      expect(sidebarClass(container)).toContain(EXPANDED);
    });
  });

  it("does not force-collapse again when the user manually expands while on POS", async () => {
    const { container } = renderApp("/sales");
    await userEvent.click(screen.getByText("Go POS"));
    await waitFor(() => {
      expect(sidebarClass(container)).toContain(COLLAPSED);
    });

    await userEvent.click(screen.getByLabelText("Expand sidebar"));
    expect(sidebarClass(container)).toContain(EXPANDED);

    // Re-render on the same route must not re-collapse (manual preference wins)
    await userEvent.click(screen.getByText("Go POS"));
    expect(sidebarClass(container)).toContain(EXPANDED);
  });

  it("renders the BrandLogo and grouped navigation menus for admin", async () => {
    renderApp("/sales");

    expect(screen.getByText("Yanesu Shisutemu")).toBeInTheDocument();
    expect(screen.getByText("Control de Inventario")).toBeInTheDocument();

    const inventarioBtn = screen.getByRole("button", { name: /INVENTARIO/i });
    expect(inventarioBtn).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /REPORTES Y CONTROL/i })).toBeInTheDocument();

    // Expand INVENTARIO dropdown and check sub-items
    await userEvent.click(inventarioBtn);
    expect(screen.getByRole("link", { name: "Productos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Categorías" })).toBeInTheDocument();

    // Expand REPORTES Y CONTROL dropdown and check sub-items
    const reportesBtn = screen.getByRole("button", { name: /REPORTES Y CONTROL/i });
    await userEvent.click(reportesBtn);
    expect(screen.getByRole("link", { name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retornables" })).toBeInTheDocument();
  });
});
