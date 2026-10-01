import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SaleFiscalSummary from "../../../../features/sales/components/SaleFiscalSummary";
import type { Sale } from "../../../../features/sales/types";

const mockSale: Sale = {
  id: 42,
  fecha_venta: "2026-07-25T10:00:00",
  usuario_id: 1,
  usuario_nombre: "Admin",
  tasa_bcv_aplicada: 50,
  historico_tasa_id: null,
  observaciones: null,
  monto_exento_usd: 10,
  base_imponible_usd: 20,
  monto_iva_usd: 3.2,
  total_usd: 33.2,
  monto_exento_ves: 500,
  base_imponible_ves: 1000,
  monto_iva_ves: 160,
  total_ves: 1660,
  metodo_pago: "EFECTIVO",
  items: [],
  pagos: [],
};

describe("SaleFiscalSummary", () => {
  it("renders fiscal totals correctly", () => {
    render(<SaleFiscalSummary sale={mockSale} />);

    expect(screen.getByText("Monto exento USD")).toBeInTheDocument();
    expect(screen.getByText("$10,00")).toBeInTheDocument();
    expect(screen.getByText("Base imponible USD")).toBeInTheDocument();
    expect(screen.getByText("$20,00")).toBeInTheDocument();
    expect(screen.getByText("IVA USD")).toBeInTheDocument();
    expect(screen.getByText("$3,20")).toBeInTheDocument();
    expect(screen.getByText("Total USD")).toBeInTheDocument();
    expect(screen.getByText("$33,20")).toBeInTheDocument();
    expect(screen.getByText("Total VES")).toBeInTheDocument();
    expect(screen.getByText("Bs 1.660,00")).toBeInTheDocument();
  });
});
