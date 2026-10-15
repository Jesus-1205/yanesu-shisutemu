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
    items_count: 3,
  },
  {
    id: 2,
    fecha_venta: "2025-01-16T10:15:00",
    usuario_id: 1,
    usuario_nombre: "Admin",
    tasa_bcv_aplicada: 45,
    historico_tasa_id: 1,
    observaciones: null,
    monto_exento_usd: 0,
    base_imponible_usd: 50,
    monto_iva_usd: 8,
    total_usd: 50,
    monto_exento_ves: 0,
    base_imponible_ves: 2250,
    monto_iva_ves: 360,
    total_ves: 2250,
    metodo_pago: "DIVISAS, PUNTO_DE_VENTA",
    items_count: 1,
  },
  {
    id: 3,
    fecha_venta: "2025-01-17T18:00:00",
    usuario_id: 2,
    usuario_nombre: "Operador",
    tasa_bcv_aplicada: 45,
    historico_tasa_id: 1,
    observaciones: null,
    monto_exento_usd: 0,
    base_imponible_usd: 30,
    monto_iva_usd: 4.8,
    total_usd: 30,
    monto_exento_ves: 0,
    base_imponible_ves: 1350,
    monto_iva_ves: 216,
    total_ves: 1350,
    metodo_pago: "PAGO_MOVIL",
    items_count: 2,
  },
];

describe("SalesTable", () => {
  it("renders sales table columns and rows", () => {
    const onViewSale = vi.fn();
    render(<SalesTable sales={[mockSales[0]]} loading={false} onViewSale={onViewSale} />);

    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Total USD")).toBeInTheDocument();
    expect(screen.getByText("$100,00")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
  });

  it("calls onViewSale when clicking Ver button", async () => {
    const onViewSale = vi.fn();
    render(<SalesTable sales={[mockSales[0]]} loading={false} onViewSale={onViewSale} />);

    const viewButton = screen.getByRole("button", { name: "Ver" });
    await userEvent.click(viewButton);

    expect(onViewSale).toHaveBeenCalledWith(1);
  });

  it("displays empty message when no sales", () => {
    render(<SalesTable sales={[]} loading={false} onViewSale={vi.fn()} />);

    expect(screen.getByText("No hay ventas registradas")).toBeInTheDocument();
  });

  it("renders separate date and time formatted in Fecha column", () => {
    render(<SalesTable sales={[mockSales[0]]} loading={false} onViewSale={vi.fn()} />);

    const d = new Date(mockSales[0].fecha_venta);
    const dateStr = d.toLocaleDateString("es-VE");
    const timeStr = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });

    expect(screen.getByText(dateStr)).toBeInTheDocument();
    const timeEl = screen.getByText(timeStr);
    expect(timeEl).toBeInTheDocument();
    expect(timeEl).toHaveClass("text-xs", "text-slate-400", "font-mono");
  });

  it("renders payment method badges with specific styling classes", () => {
    render(<SalesTable sales={mockSales} loading={false} onViewSale={vi.fn()} />);

    const efectivoBadge = screen.getByText("Efectivo");
    expect(efectivoBadge).toHaveClass("bg-amber-50", "text-amber-700");

    const divisasBadge = screen.getByText("Divisas");
    expect(divisasBadge).toHaveClass("bg-emerald-50", "text-emerald-700");

    const puntoBadge = screen.getByText("Punto De Venta");
    expect(puntoBadge).toHaveClass("bg-blue-50", "text-brand-blue");

    const pagoMovilBadge = screen.getByText("Pago Movil");
    expect(pagoMovilBadge).toHaveClass("bg-purple-50", "text-purple-700");
  });

  it("renders Ver action button with Eye icon and brand styling", () => {
    render(<SalesTable sales={[mockSales[0]]} loading={false} onViewSale={vi.fn()} />);

    const viewButton = screen.getByRole("button", { name: "Ver" });
    expect(viewButton).toBeInTheDocument();
    expect(viewButton).toHaveClass("text-brand-blue");

    const icon = viewButton.querySelector("svg.lucide-eye");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("size-3.5");
  });

  it("renders items count badge with rounded style", () => {
    render(<SalesTable sales={[mockSales[0]]} loading={false} onViewSale={vi.fn()} />);

    const badge = screen.getByText("3");
    expect(badge).toHaveClass("rounded-full", "bg-slate-100", "text-slate-700");
  });

  it("renders Total USD with brand-blue styling", () => {
    render(<SalesTable sales={[mockSales[0]]} loading={false} onViewSale={vi.fn()} />);

    const usdEl = screen.getByText("$100,00");
    expect(usdEl).toHaveClass("font-semibold", "text-brand-blue");
  });

  it("renders integrated pagination footer when pagination props are provided", async () => {
    const onPageChange = vi.fn();
    render(
      <SalesTable
        sales={mockSales}
        loading={false}
        onViewSale={vi.fn()}
        totalRows={68}
        page={1}
        totalPages={4}
        pageSize={20}
        onPageChange={onPageChange}
      />
    );

    const footerText = screen.getByText(/Mostrando/i);
    expect(footerText).toHaveTextContent("Mostrando 1 a 20 de 68 ventas");

    const nextBtn = screen.getByRole("button", { name: "Página siguiente" });
    await userEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("does not render pagination footer when pagination props are omitted", () => {
    render(<SalesTable sales={mockSales} loading={false} onViewSale={vi.fn()} />);

    expect(screen.queryByText(/Mostrando/i)).not.toBeInTheDocument();
  });
});
