import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportesTable } from "../../../features/retornables/components/ReportesTable";
import type { RetornableReporteOut } from "@/types/api";

const mockGetRetornableDetalleReporte = vi.fn();

vi.mock("../../../services/api", () => ({
  api: {
    getRetornableDetalleReporte: (...args: unknown[]) => mockGetRetornableDetalleReporte(...args),
  },
}));

const reportesBase: RetornableReporteOut[] = [
  { id: 2, fecha: "2026-01-15T10:00:00", realizado_por: "Admin", usuario_id: 1, observaciones: "Segundo reporte", es_actual: true },
  { id: 1, fecha: "2026-01-14T10:00:00", realizado_por: "Operator", usuario_id: 2, observaciones: null, es_actual: false },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportesTable", () => {
  it("shows loading spinner", () => {
    render(<ReportesTable reportes={[]} loading={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<ReportesTable reportes={[]} loading={false} />);
    expect(screen.getByText("No hay reportes registrados")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<ReportesTable reportes={reportesBase} loading={false} />);
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Realizado por")).toBeInTheDocument();
    expect(screen.getByText("Observaciones")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
  });

  it("renders report data", () => {
    render(<ReportesTable reportes={reportesBase} loading={false} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(screen.getByText("Segundo reporte")).toBeInTheDocument();
  });

  it("shows 'Actual' badge for es_actual=true", () => {
    render(<ReportesTable reportes={reportesBase} loading={false} />);
    const badges = screen.getAllByText("Actual");
    expect(badges.length).toBe(1);
    expect(badges[0]).toHaveClass("bg-emerald-100");
  });

  it("shows 'Anterior' badge for es_actual=false", () => {
    render(<ReportesTable reportes={reportesBase} loading={false} />);
    const badge = screen.getByText("Anterior");
    expect(badge).toHaveClass("bg-slate-100");
  });

  it("shows '—' for null observaciones", () => {
    render(<ReportesTable reportes={reportesBase} loading={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("opens modal on row click", async () => {
    mockGetRetornableDetalleReporte.mockResolvedValue({
      reporte: { id: 2, fecha: "2026-01-15T10:00:00", realizado_por: "Admin", usuario_id: 1, observaciones: "Test", es_actual: true },
      detalles: [],
      reporte_anterior_id: null,
      reporte_anterior_fecha: null,
    });

    render(<ReportesTable reportes={reportesBase} loading={false} />);
    const row = screen.getByText("Admin").closest("tr")!;
    await userEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText(/Reporte #2/)).toBeInTheDocument();
    });
  });

  it("shows detalle loading in modal", async () => {
    mockGetRetornableDetalleReporte.mockReturnValue(new Promise(() => {})); // never resolves

    render(<ReportesTable reportes={reportesBase} loading={false} />);
    const row = screen.getByText("Admin").closest("tr")!;
    await userEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText("Detalle del reporte")).toBeInTheDocument();
    });
  });
});
