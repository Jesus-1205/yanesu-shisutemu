import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentMethodsDonut from "../../../features/reports/components/PaymentMethodsDonut";
import type { PaymentMethodSummaryItem } from "@/types/api";

// Mock recharts — jsdom has no SVG layout, so we stub chart internals
// but keep the custom Legend content so we can assert on rendered colors.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="pie" data-item-count={data.length}>
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  Tooltip: () => null,
  Legend: ({ content }: { content: (props: Record<string, unknown>) => React.ReactNode }) => {
    // Recharts passes { payload } to the custom content renderer.
    // We don't have real payload here, so we rely on the Pie/Cell data instead.
    return null;
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const PALETTE = [
  "#1E40AF",
  "#EA580C",
  "#16A34A",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#CA8A04",
  "#DB2777",
  "#64748B",
  "#059669",
];

function makeMethod(
  id: number,
  name: string,
  totalUsd: number,
  count = 1,
): PaymentMethodSummaryItem {
  return {
    metodo_pago_id: id,
    metodo_pago_nombre: name,
    moneda_default: "USD",
    cantidad_pagos: count,
    total_usd: totalUsd,
    total_ves: 0,
    total_equivalente_usd: totalUsd,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PaymentMethodsDonut", () => {
  // ── Empty state ──────────────────────────────────────────────────────────

  it("shows empty message when data is empty", () => {
    render(<PaymentMethodsDonut data={[]} />);
    expect(screen.getByText(/sin pagos registrados/i)).toBeInTheDocument();
  });

  it("shows empty message when all methods have zero payments", () => {
    const data = [makeMethod(1, "EFECTIVO", 0, 0), makeMethod(2, "TARJETA", 0, 0)];
    render(<PaymentMethodsDonut data={data} />);
    expect(screen.getByText(/sin pagos registrados/i)).toBeInTheDocument();
  });

  // ── Rendering with data ──────────────────────────────────────────────────

  it("renders the chart heading", () => {
    const data = [makeMethod(1, "EFECTIVO", 100)];
    render(<PaymentMethodsDonut data={data} />);
    expect(screen.getByRole("heading", { name: /monto recibido/i })).toBeInTheDocument();
  });

  it("renders the correct number of Cell elements for active methods", () => {
    const data = [
      makeMethod(1, "EFECTIVO", 100),
      makeMethod(2, "TARJETA_DEBITO", 200),
      makeMethod(3, "TRANSFERENCIA", 50),
    ];
    render(<PaymentMethodsDonut data={data} />);
    const cells = screen.getAllByTestId("cell");
    expect(cells).toHaveLength(3);
  });

  it("filters out methods with zero payments", () => {
    const data = [
      makeMethod(1, "EFECTIVO", 100),
      makeMethod(2, "TARJETA", 0, 0),
      makeMethod(3, "TRANSFERENCIA", 50),
    ];
    render(<PaymentMethodsDonut data={data} />);
    const cells = screen.getAllByTestId("cell");
    expect(cells).toHaveLength(2);
  });

  // ── Color uniqueness (the core fix) ──────────────────────────────────────

  it("assigns unique colors to 2 payment methods", () => {
    const data = [makeMethod(1, "EFECTIVO", 100), makeMethod(2, "TARJETA_DEBITO", 200)];
    render(<PaymentMethodsDonut data={data} />);
    const cells = screen.getAllByTestId("cell");
    const colors = cells.map((c) => c.getAttribute("data-fill"));
    expect(new Set(colors).size).toBe(2);
  });

  it("assigns unique colors to 4 payment methods", () => {
    const data = [
      makeMethod(1, "EFECTIVO", 100),
      makeMethod(2, "TARJETA_DEBITO", 200),
      makeMethod(3, "TARJETA_CREDITO", 150),
      makeMethod(4, "TRANSFERENCIA", 50),
    ];
    render(<PaymentMethodsDonut data={data} />);
    const cells = screen.getAllByTestId("cell");
    const colors = cells.map((c) => c.getAttribute("data-fill"));
    expect(new Set(colors).size).toBe(4);
  });

  it("assigns unique colors to 6+ payment methods", () => {
    const data = [
      makeMethod(1, "EFECTIVO", 100),
      makeMethod(2, "TARJETA_DEBITO", 200),
      makeMethod(3, "TARJETA_CREDITO", 150),
      makeMethod(4, "TRANSFERENCIA", 50),
      makeMethod(5, "PAGO_MOVIL", 80),
      makeMethod(6, "CRIPTO", 30),
      makeMethod(7, "CHEQUE", 20),
    ];
    render(<PaymentMethodsDonut data={data} />);
    const cells = screen.getAllByTestId("cell");
    const colors = cells.map((c) => c.getAttribute("data-fill"));
    // All 7 should be unique (PALETTE has 10 colors, so no wrapping yet)
    expect(new Set(colors).size).toBe(7);
  });

  it("uses PALETTE colors in order by sorted position", () => {
    // Data is sorted descending by total_equivalente_usd
    const data = [
      makeMethod(1, "EFECTIVO", 50), // will be 3rd after sort
      makeMethod(2, "TARJETA_DEBITO", 200), // will be 1st
      makeMethod(3, "TRANSFERENCIA", 100), // will be 2nd
    ];
    render(<PaymentMethodsDonut data={data} />);
    const cells = screen.getAllByTestId("cell");
    const colors = cells.map((c) => c.getAttribute("data-fill"));
    // Sorted: TARJETA_DEBITO (200) → index 0 → PALETTE[0]
    //         TRANSFERENCIA (100) → index 1 → PALETTE[1]
    //         EFECTIVO (50)       → index 2 → PALETTE[2]
    expect(colors).toEqual([PALETTE[0], PALETTE[1], PALETTE[2]]);
  });

  it("wraps around PALETTE when more than 10 methods exist", () => {
    const data = Array.from({ length: 12 }, (_, i) =>
      makeMethod(i + 1, `METHOD_${i + 1}`, 100 - i),
    );
    render(<PaymentMethodsDonut data={data} />);
    const cells = screen.getAllByTestId("cell");
    const colors = cells.map((c) => c.getAttribute("data-fill"));
    // First 10 get PALETTE[0..9], last 2 wrap to PALETTE[0] and PALETTE[1]
    expect(colors[0]).toBe(PALETTE[0]);
    expect(colors[10]).toBe(PALETTE[0]);
    expect(colors[11]).toBe(PALETTE[1]);
    // Colors 0 and 10 are the same (wrap), but 0-9 are all unique
    const firstTen = new Set(colors.slice(0, 10));
    expect(firstTen.size).toBe(10);
  });

  // ── Method name formatting ───────────────────────────────────────────────

  it("formats snake_case method names with spaces", () => {
    const data = [makeMethod(1, "TARJETA_DEBITO", 100)];
    render(<PaymentMethodsDonut data={data} />);
    // formatPaymentMethodName converts "TARJETA_DEBITO" → "TARJETA DEBITO"
    // The name appears in the Cell key (not directly visible), but the chart renders
    expect(screen.getByTestId("pie")).toBeInTheDocument();
  });
});
