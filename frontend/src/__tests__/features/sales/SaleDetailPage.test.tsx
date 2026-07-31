import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SaleDetailPage from "../../../features/sales/pages/SaleDetailPage";
import { ToastProvider } from "../../../ui-components/Toast";
import type { ReactNode } from "react";

const mockGetSale = vi.fn();

vi.mock("../../../services/api", () => ({
  api: {
    getSale: (...args: unknown[]) => mockGetSale(...args),
  },
}));

const mockSale = {
  id: 42,
  fecha_venta: "2026-07-25T10:00:00",
  usuario_id: 1,
  tasa_bcv_aplicada: 50,
  historico_tasa_id: null,
  observaciones: "Entregar antes de las 5pm",
  monto_exento_usd: 10,
  base_imponible_usd: 20,
  monto_iva_usd: 3.2,
  total_usd: 33.2,
  monto_exento_ves: 500,
  base_imponible_ves: 1000,
  monto_iva_ves: 160,
  total_ves: 1660,
  metodo_pago: "EFECTIVO",
  items: [{ id: 1, venta_id: 42, producto_id: 1, tipo_empaque: "UNIDAD", cantidad: 2, unidades_descontadas: 2, precio_unitario_usd: 10, subtotal_usd: 20, iva_porcentaje: 16 }],
  pagos: [{ id: 1, venta_id: 42, metodo_pago_id: 1, metodo_pago_nombre: "EFECTIVO", referencia: null, monto_usd: 33.2, monto_ves: 0 }],
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/sales/42"]}>
      <ToastProvider>
        <Routes>
          <Route path="/sales/:id" element={children} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SaleDetailPage", () => {
  it("shows loading spinner initially", () => {
    mockGetSale.mockReturnValue(new Promise(() => {}));
    const { container } = render(<SaleDetailPage />, { wrapper });
    expect(container.querySelector(".dot-spinner__dot")).toBeInTheDocument();
  });

  it("renders sale header with id", async () => {
    mockGetSale.mockResolvedValue(mockSale);
    render(<SaleDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Venta #42")).toBeInTheDocument();
    });
  });

  it("displays observaciones when present", async () => {
    mockGetSale.mockResolvedValue(mockSale);
    render(<SaleDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Observaciones")).toBeInTheDocument();
      expect(screen.getByText("Entregar antes de las 5pm")).toBeInTheDocument();
    });
  });

  it("hides observaciones section when null", async () => {
    mockGetSale.mockResolvedValue({ ...mockSale, observaciones: null });
    render(<SaleDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Venta #42")).toBeInTheDocument();
    });
    expect(screen.queryByText("Observaciones")).not.toBeInTheDocument();
  });

  it("shows not found message when sale is null", async () => {
    mockGetSale.mockRejectedValue(new Error("Not found"));
    render(<SaleDetailPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Venta no encontrada")).toBeInTheDocument();
    });
  });
});
