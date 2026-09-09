import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparacionTabla } from "../../../features/retornables/components/ComparacionTabla";
import type { ComparacionLineaOut } from "@/types/api";

const lineasBase: ComparacionLineaOut[] = [
  { presentacion: "222", estado: "CASILLERO", reporte_cajas: 5, reporte_botellas: 0, comparado_cajas: 5, comparado_botellas: 0, dif_cajas: 0, dif_botellas: 0 },
  { presentacion: "222", estado: "VACIO", reporte_cajas: 2, reporte_botellas: 100, comparado_cajas: 3, comparado_botellas: 110, dif_cajas: 1, dif_botellas: 10 },
  { presentacion: "222", estado: "LLENO", reporte_cajas: 5, reporte_botellas: 200, comparado_cajas: 4, comparado_botellas: 180, dif_cajas: -1, dif_botellas: -20 },
  { presentacion: "333", estado: "CASILLERO", reporte_cajas: 3, reporte_botellas: 0, comparado_cajas: 3, comparado_botellas: 0, dif_cajas: 0, dif_botellas: 0 },
  { presentacion: "333", estado: "VACIO", reporte_cajas: 2, reporte_botellas: 50, comparado_cajas: 2, comparado_botellas: 50, dif_cajas: 0, dif_botellas: 0 },
  { presentacion: "333", estado: "LLENO", reporte_cajas: 4, reporte_botellas: 100, comparado_cajas: 4, comparado_botellas: 100, dif_cajas: 0, dif_botellas: 0 },
];

describe("ComparacionTabla", () => {
  it("shows empty state when no vistas", () => {
    render(<ComparacionTabla vistas={[]} />);
    expect(screen.getByText("No hay datos para comparar")).toBeInTheDocument();
  });

  it("renders vista titles", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Reporte vs Sistema",
            izquierda: { titulo: "Reporte actual", reporte: null, sinReporte: true },
            derecha: { titulo: "Sistema esperado", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getByText("Reporte vs Sistema")).toBeInTheDocument();
  });

  it("renders side titles", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izquierda", reporte: null, sinReporte: true },
            derecha: { titulo: "Derecha", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getByText("Izquierda")).toBeInTheDocument();
    expect(screen.getByText("Derecha")).toBeInTheDocument();
  });

  it("shows 'Sin reporte registrado' when sinReporte is true", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getAllByText("Sin reporte registrado").length).toBe(2);
  });

  it("shows report info when reporte is provided", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: {
              titulo: "Izq",
              reporte: { id: 1, fecha: "2026-01-01T10:00:00", realizado_por: "Admin", usuario_id: 1, observaciones: null, es_actual: true },
            },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getByText("Reporte #1")).toBeInTheDocument();
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it("renders all 6 lineas", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getAllByText("CASILLERO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VACIO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LLENO").length).toBeGreaterThan(0);
  });

  it("renders cajas values", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getAllByText("5 cajas").length).toBeGreaterThan(0);
  });

  it("shows Dif column header", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getByText("Dif")).toBeInTheDocument();
  });

  it("shows zero dif as green", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: [lineasBase[0]], // CASILLERO with 0 dif
          },
        ]}
      />,
    );
    const zeroBadge = screen.getByText("0");
    expect(zeroBadge).toHaveClass("text-emerald-600");
  });

  it("shows positive dif with + sign", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: [lineasBase[1]], // VACIO with +1 caja, +10 botellas
          },
        ]}
      />,
    );
    expect(screen.getByText("+1 c")).toBeInTheDocument();
    expect(screen.getByText("(+10 b)")).toBeInTheDocument();
  });

  it("shows negative dif without + sign", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: [lineasBase[2]], // LLENO with -1 caja, -20 botellas
          },
        ]}
      />,
    );
    expect(screen.getByText("-1 c")).toBeInTheDocument();
    expect(screen.getByText("(-20 b)")).toBeInTheDocument();
  });

  it("hides botellas count for CASILLERO in dif", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Test",
            izquierda: { titulo: "Izq", reporte: null, sinReporte: true },
            derecha: { titulo: "Der", reporte: null, sinReporte: true },
            lineas: [lineasBase[0]], // CASILLERO
          },
        ]}
      />,
    );
    // CASILLERO dif should show "0" without botellas
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText(/b\)/)).not.toBeInTheDocument();
  });

  it("renders multiple vistas", () => {
    render(
      <ComparacionTabla
        vistas={[
          {
            titulo: "Vista 1",
            izquierda: { titulo: "Izq1", reporte: null, sinReporte: true },
            derecha: { titulo: "Der1", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
          {
            titulo: "Vista 2",
            izquierda: { titulo: "Izq2", reporte: null, sinReporte: true },
            derecha: { titulo: "Der2", reporte: null, sinReporte: true },
            lineas: lineasBase,
          },
        ]}
      />,
    );
    expect(screen.getByText("Vista 1")).toBeInTheDocument();
    expect(screen.getByText("Vista 2")).toBeInTheDocument();
  });
});
