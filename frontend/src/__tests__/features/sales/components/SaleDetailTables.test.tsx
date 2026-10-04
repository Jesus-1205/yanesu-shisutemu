import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SaleDetailItemsTable from "../../../../features/sales/components/SaleDetailItemsTable";
import SaleDetailPaymentsTable from "../../../../features/sales/components/SaleDetailPaymentsTable";
import type { SaleItem, SalePayment } from "../../../../features/sales/types";

const mockItems: SaleItem[] = [
  {
    id: 1,
    venta_id: 42,
    producto_id: 1,
    producto_nombre: "Cerveza Polar",
    tipo_empaque: "UNIDAD",
    cantidad: 2,
    unidades_descontadas: 2,
    precio_unitario_usd: 10,
    subtotal_usd: 20,
    iva_porcentaje: 16,
    combo_id: 5,
    combo_nombre: "Combo Fiesta",
  },
  {
    id: 2,
    venta_id: 42,
    producto_id: 2,
    producto_nombre: "Ron Santa Teresa",
    tipo_empaque: "UNIDAD",
    cantidad: 1,
    unidades_descontadas: 1,
    precio_unitario_usd: 15,
    subtotal_usd: 15,
    iva_porcentaje: 16,
    usa_precio_divisas: true,
  },
];

const mockPayments: SalePayment[] = [
  {
    id: 1,
    venta_id: 42,
    metodo_pago_id: 1,
    metodo_pago_nombre: "PAGO_MOVIL",
    referencia: "REF-12345",
    monto_usd: 20,
    monto_ves: 1000,
  },
];

describe("SaleDetailItemsTable", () => {
  it("renders items with combo badge and divisa badge", () => {
    render(<SaleDetailItemsTable items={mockItems} />);

    expect(screen.getByText("Cerveza Polar")).toBeInTheDocument();
    expect(screen.getByText("Combo Fiesta")).toBeInTheDocument();
    expect(screen.getByText("Ron Santa Teresa")).toBeInTheDocument();
    expect(screen.getByText("DIV")).toBeInTheDocument();
    expect(screen.getByText("$20,00")).toBeInTheDocument();
  });

  it("renders empty message when no items", () => {
    render(<SaleDetailItemsTable items={[]} />);
    expect(screen.getByText("Sin items")).toBeInTheDocument();
  });
});

describe("SaleDetailPaymentsTable", () => {
  it("renders payments correctly", () => {
    render(<SaleDetailPaymentsTable pagos={mockPayments} />);

    expect(screen.getByText("Pagos")).toBeInTheDocument();
    expect(screen.getByText("Pago Movil")).toBeInTheDocument();
    expect(screen.getByText("REF-12345")).toBeInTheDocument();
    expect(screen.getByText("$20,00")).toBeInTheDocument();
    expect(screen.getByText("Bs 1.000,00")).toBeInTheDocument();
  });

  it("renders empty message when no payments", () => {
    render(<SaleDetailPaymentsTable pagos={[]} />);
    expect(screen.getByText("Sin pagos registrados")).toBeInTheDocument();
  });
});
