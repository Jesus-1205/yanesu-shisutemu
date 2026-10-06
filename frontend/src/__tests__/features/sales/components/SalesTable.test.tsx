import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SalesTable from "../../../../features/sales/components/SalesTable";
import type { SaleListItem } from "../../../../features/sales/types";

const mockSales: SaleListItem[] = [
  {
    id: 1,
    fecha_venta: "2025-01-15T14:30:00",
    usuario_id: 1,
    usuario_nombre: "Admin",
    tasa_bcv_aplicada: 45,
    historico_tasa_id: 1,
    observaciones: null,
    monto_exento_usd: 0,
    base_imponible_usd: 100,
    monto_iva_usd: 16,
    total_usd: 100,
    monto_exento_ves: 0,
    base_imponible_ves: 4500,
    monto_iva_ves: 720,
    total_ves: 4500,
    metodo_pago: "EFECTIVO",
    items_count: 1,
  },
];

describe("SalesTable", () => {
  it("renders sales table columns and rows", () => {
    const onViewSale = vi.fn();
    render(<SalesTable sales={mockSales} loading={false} onViewSale={onViewSale} />);

    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Total USD")).toBeInTheDocument();
    expect(screen.getByText("$100,00")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
  });

  it("calls onViewSale when clicking Ver button", async () => {
    const onViewSale = vi.fn();
    render(<SalesTable sales={mockSales} loading={false} onViewSale={onViewSale} />);

    const viewButton = screen.getByRole("button", { name: "Ver" });
    await userEvent.click(viewButton);

    expect(onViewSale).toHaveBeenCalledWith(1);
  });

  it("displays empty message when no sales", () => {
    render(<SalesTable sales={[]} loading={false} onViewSale={vi.fn()} />);

    expect(screen.getByText("No hay ventas registradas")).toBeInTheDocument();
  });
});
