import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SalesPage from "../../../features/sales/pages/SalesPage";
import { ToastProvider } from "../../../ui-components/Toast";
import type { ReactNode } from "react";

const mockGetSales = vi.fn();
const mockGetSalesPaginated = vi.fn();

vi.mock("../../../services/api", () => ({
  api: {
    getSales: (...args: unknown[]) => mockGetSales(...args),
    getSalesPaginated: (...args: unknown[]) => mockGetSalesPaginated(...args),
  },
}));

vi.mock("../../../features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, rol_nombre: "ADMINISTRADOR" },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("../../../lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

import { exportToExcel } from "../../../lib/exportToExcel";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <ToastProvider>{children}</ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSalesPaginated.mockResolvedValue({ items: [], pages: 1 });
});

describe("SalesPage", () => {
  it("renders the page header", async () => {
    render(<SalesPage />, { wrapper });
    expect(screen.getByText("Ventas")).toBeInTheDocument();
  });

  it("shows error banner on fetch failure", async () => {
    mockGetSalesPaginated.mockRejectedValue(new Error("Network error"));
    render(<SalesPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("renders download excel button", async () => {
    render(<SalesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
  });

  it("exports filtered sales to excel on button click", async () => {
    const mockSales = [
      { id: 1, fecha_venta: "2025-01-15", total_usd: 100, total_ves: 4500, metodo_pago: "Efectivo", tasa_bcv_aplicada: 45, items: [{ id: 1 }], usuario_nombre: "Admin", observaciones: null },
    ];
    mockGetSalesPaginated.mockResolvedValue({ items: mockSales, pages: 1 });
    mockGetSales.mockResolvedValue(mockSales);
    render(<SalesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(mockGetSales).toHaveBeenCalledWith(expect.objectContaining({ limit: 999999 }));
      expect(exportToExcel).toHaveBeenCalledWith({
        data: mockSales,
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "ID" }),
          expect.objectContaining({ header: "Fecha" }),
          expect.objectContaining({ header: "Total USD" }),
          expect.objectContaining({ header: "Total VES" }),
        ]),
        filename: "Ventas",
      });
    });
  });
});
