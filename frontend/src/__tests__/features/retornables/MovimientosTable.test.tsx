import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MovimientosTable } from "../../../features/retornables/components/MovimientosTable";
import type { RetornableMovimientoOut } from "@/types/api";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

const movimientosBase: RetornableMovimientoOut[] = [
  {
    id: 1,
    fecha: "2026-01-15T10:30:00",
    presentacion: "222",
    estado: "LLENO",
    delta_botellas: -10,
    tipo_movimiento: "VENTA",
    referencia_id: 5,
    referencia_tipo: "VENTA",
    usuario_id: 1,
    usuario_nombre: "Admin Test",
    observaciones: null,
  },
  {
    id: 2,
    fecha: "2026-01-15T11:00:00",
    presentacion: "333",
    estado: "VACIO",
    delta_botellas: 24,
    tipo_movimiento: "COMPRA",
    referencia_id: 3,
    referencia_tipo: "FACTURA",
    usuario_id: 1,
    usuario_nombre: "Admin Test",
    observaciones: null,
  },
  {
    id: 3,
    fecha: "2026-01-15T12:00:00",
    presentacion: "222",
    estado: "CASILLERO",
    delta_botellas: 5,
    tipo_movimiento: "AJUSTE_MANUAL",
    referencia_id: null,
    referencia_tipo: null,
    usuario_id: 1,
    usuario_nombre: "Admin Test",
    observaciones: "Ajuste por merma",
  },
];

describe("MovimientosTable", () => {
  it("shows loading spinner", () => {
    render(<MovimientosTable movimientos={[]} loading={true} />, { wrapper });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<MovimientosTable movimientos={[]} loading={false} />, { wrapper });
    expect(screen.getByText("No hay movimientos registrados")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<MovimientosTable movimientos={movimientosBase} loading={false} />, { wrapper });
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Present.")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Delta")).toBeInTheDocument();
    expect(screen.getByText("Tipo")).toBeInTheDocument();
    expect(screen.getByText("Detalle")).toBeInTheDocument();
    expect(screen.getByText("Usuario")).toBeInTheDocument();
  });

  it("renders movimientos data", () => {
    render(<MovimientosTable movimientos={movimientosBase} loading={false} />, { wrapper });
    expect(screen.getAllByText("222").length).toBeGreaterThan(0);
    expect(screen.getByText("333")).toBeInTheDocument();
    expect(screen.getAllByText("LLENO").length).toBeGreaterThan(0);
    expect(screen.getByText("VACIO")).toBeInTheDocument();
    expect(screen.getByText("CASILLERO")).toBeInTheDocument();
  });

  it("shows negative delta in red", () => {
    render(<MovimientosTable movimientos={[movimientosBase[0]]} loading={false} />, { wrapper });
    const delta = screen.getByText("-10");
    expect(delta).toHaveClass("text-red-600");
  });

  it("shows positive delta in green", () => {
    render(<MovimientosTable movimientos={[movimientosBase[1]]} loading={false} />, { wrapper });
    const delta = screen.getByText("+24");
    expect(delta).toHaveClass("text-emerald-600");
  });

  it("shows VENTA badge in red", () => {
    render(<MovimientosTable movimientos={[movimientosBase[0]]} loading={false} />, { wrapper });
    const badge = screen.getByText("VENTA");
    expect(badge).toHaveClass("bg-red-100");
  });

  it("shows COMPRA badge in green", () => {
    render(<MovimientosTable movimientos={[movimientosBase[1]]} loading={false} />, { wrapper });
    const badge = screen.getByText("COMPRA");
    expect(badge).toHaveClass("bg-emerald-100");
  });

  it("shows AJUSTE_MANUAL badge in amber", () => {
    render(<MovimientosTable movimientos={[movimientosBase[2]]} loading={false} />, { wrapper });
    const badge = screen.getByText("AJUSTE_MANUAL");
    expect(badge).toHaveClass("bg-amber-100");
  });

  it("renders link for VENTA reference", () => {
    render(<MovimientosTable movimientos={[movimientosBase[0]]} loading={false} />, { wrapper });
    const link = screen.getByText("VENTA #5");
    expect(link).toHaveAttribute("href", "/sales/5");
  });

  it("renders link for FACTURA reference", () => {
    render(<MovimientosTable movimientos={[movimientosBase[1]]} loading={false} />, { wrapper });
    const link = screen.getByText("FACTURA #3");
    expect(link).toHaveAttribute("href", "/invoices/3");
  });

  it("shows observaciones when no reference", () => {
    render(<MovimientosTable movimientos={[movimientosBase[2]]} loading={false} />, { wrapper });
    expect(screen.getByText("Ajuste por merma")).toBeInTheDocument();
  });

  it("renders usuario_nombre", () => {
    render(<MovimientosTable movimientos={movimientosBase} loading={false} />, { wrapper });
    expect(screen.getAllByText("Admin Test").length).toBe(3);
  });
});
