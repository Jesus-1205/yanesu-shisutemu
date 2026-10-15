import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SalesPage from "../../../features/sales/pages/SalesPage";
import { ToastProvider } from "../../../ui-components/Toast";
import type { ReactNode } from "react";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockGetSales = vi.fn();
const mockGetSalesPaginated = vi.fn();
const mockGetPaymentMethods = vi.fn();

vi.mock("../../../services/api", () => ({
  api: {
    getSales: (...args: unknown[]) => mockGetSales(...args),
    getSalesPaginated: (...args: unknown[]) => mockGetSalesPaginated(...args),
    getPaymentMethods: (...args: unknown[]) => mockGetPaymentMethods(...args),
  },
}));

let mockUserRole = "ADMINISTRADOR";
vi.mock("../../../features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, rol_nombre: mockUserRole },
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

const sampleSales = [
  {
    id: 1,
    fecha_venta: "2025-01-15T14:30:00",
    total_usd: 100,
    total_ves: 4500,
    metodo_pago: "Efectivo",
    tasa_bcv_aplicada: 45,
    items_count: 1,
    items: [{ id: 1, producto_nombre: "Ron", cantidad: 2 }],
    usuario_nombre: "Admin",
    observaciones: null,
  },
];

describe("SalesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "ADMINISTRADOR";
    mockGetSalesPaginated.mockResolvedValue({
      items: sampleSales,
      total: 1,
      page: 1,
      page_size: 20,
      pages: 1,
    });
    mockGetPaymentMethods.mockResolvedValue([]);
  });

  it("renders the page header and data", async () => {
    render(<SalesPage />, { wrapper });
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("$100,00")).toBeInTheDocument();
    });
  });

  it("renders KPI summary cards with aggregate metrics", async () => {
    mockGetSalesPaginated.mockResolvedValue({
      items: sampleSales,
      total: 1,
      total_usd: 100,
      total_ves: 4500,
      page: 1,
      page_size: 20,
      pages: 1,
    });
    render(<SalesPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Ingresos (USD)")).toBeInTheDocument();
      expect(screen.getByText("Total Bolívares")).toBeInTheDocument();
      expect(screen.getByText("N° de Ventas")).toBeInTheDocument();
      expect(screen.getByText("Venta Promedio")).toBeInTheDocument();
    });
  });

  it("shows error banner on fetch failure and retries", async () => {
    mockGetSalesPaginated
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ items: sampleSales, total: 1, page: 1, page_size: 20, pages: 1 });

    render(<SalesPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Reintentar");
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("$100,00")).toBeInTheDocument();
    });
  });

  it("renders download excel button and exports data", async () => {
    render(<SalesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(exportToExcel).toHaveBeenCalledWith({
        data: sampleSales,
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "Fecha" }),
          expect.objectContaining({ header: "Total USD" }),
          expect.objectContaining({ header: "Total VES" }),
        ]),
        filename: "Ventas",
      });
    });
  });

  it("pagina todas las paginas de ventas al exportar", async () => {
    const saleA = { id: 1, fecha_venta: "2025-01-15", total_usd: 100, total_ves: 4500, metodo_pago: "Efectivo", tasa_bcv_aplicada: 45, items: [{ id: 1 }], usuario_nombre: "Admin", observaciones: null };
    const saleB = { id: 2, fecha_venta: "2025-01-16", total_usd: 200, total_ves: 9000, metodo_pago: "Efectivo", tasa_bcv_aplicada: 45, items: [{ id: 2 }], usuario_nombre: "Admin", observaciones: null };
    mockGetSalesPaginated
      .mockResolvedValueOnce({ items: [], total: 2, page: 1, page_size: 20, pages: 2 })
      .mockResolvedValueOnce({ items: [saleA], total: 2, page: 1, page_size: 200, pages: 2 })
      .mockResolvedValueOnce({ items: [saleB], total: 2, page: 2, page_size: 200, pages: 2 });
    render(<SalesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(mockGetSalesPaginated).toHaveBeenCalledWith(expect.objectContaining({ page: 2, page_size: 200 }));
      expect(exportToExcel).toHaveBeenCalledWith({
        data: [saleA, saleB],
        columns: expect.arrayContaining([expect.objectContaining({ header: "Fecha" })]),
        filename: "Ventas",
      });
    });
  });

  it("renders payment method filter dropdown for admin and filters on change", async () => {
    mockGetPaymentMethods.mockResolvedValue([
      { id: 1, nombre: "DIVISAS", moneda_default: "USD", activo: true, acepta_referencia: false },
      { id: 2, nombre: "EFECTIVO", moneda_default: "VES", activo: true, acepta_referencia: false },
    ]);
    render(<SalesPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Método de pago")).toBeInTheDocument();
    });
  });

  it("filters sales by time range and applies it to the export", async () => {
    mockGetSalesPaginated.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200, pages: 1 });
    const { container } = render(<SalesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Hora desde")).toBeInTheDocument());

    const timeInputs = container.querySelectorAll('input[type="time"]');
    expect(timeInputs.length).toBe(2);
    fireEvent.change(timeInputs[0], { target: { value: "12:00" } });
    fireEvent.change(timeInputs[1], { target: { value: "18:00" } });

    await waitFor(() => {
      expect(mockGetSalesPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ hora_desde: "12:00", hora_hasta: "18:00" }),
      );
    });

    mockGetSales.mockClear();
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(mockGetSalesPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ hora_desde: "12:00", hora_hasta: "18:00", page_size: 200 }),
      );
    });
  });

  it("navigates to new sale when clicking Nueva Venta", async () => {
    render(<SalesPage />, { wrapper });
    const newBtn = screen.getByRole("button", { name: /Nueva Venta/i });
    await userEvent.click(newBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/sales/new");
  });

  it("navigates to sale detail when clicking Ver in table row", async () => {
    render(<SalesPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("$100,00")).toBeInTheDocument();
    });

    const detailBtn = screen.getByRole("button", { name: /^Ver$/i });
    await userEvent.click(detailBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/sales/1");
  });

  it("filters sales by date inputs and clears them", async () => {
    const { container } = render(<SalesPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Desde")).toBeInTheDocument());

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);

    fireEvent.change(dateInputs[0], { target: { value: "2025-01-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2025-01-31" } });

    await waitFor(() => {
      expect(mockGetSalesPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_desde: "2025-01-01", fecha_hasta: "2025-01-31" }),
      );
    });

    const limpiarBtn = screen.getByText("Limpiar");
    await userEvent.click(limpiarBtn);

    await waitFor(() => {
      expect(mockGetSalesPaginated).toHaveBeenCalledWith(
        expect.not.objectContaining({ fecha_desde: "2025-01-01" }),
      );
    });
  });

  it("adapts correctly for operator role", async () => {
    mockUserRole = "OPERADOR";
    render(<SalesPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Mostrando ventas del día de hoy")).toBeInTheDocument();
    });

    expect(screen.queryByText("Método de pago")).not.toBeInTheDocument();
  });
});
