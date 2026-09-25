import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInvoiceFormCalculations } from "@/features/invoices/hooks/useInvoiceFormCalculations";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";

describe("useInvoiceFormCalculations", () => {
  beforeEach(() => {
    useInvoiceFormStore.getState().reset();
  });

  it("computes USD and BS totals correctly with USD currency", () => {
    const { result } = renderHook(() => useInvoiceFormCalculations());

    act(() => {
      useInvoiceFormStore.getState().setField("tasa", "750");
      useInvoiceFormStore.getState().setField("moneda", "USD");
      useInvoiceFormStore.getState().addLineItem({
        producto_id: 1,
        nombre: "Ron Santa Teresa",
        codigo_barra: null,
        tipo_empaque: "UNIDAD",
        cantidad: 2,
        unidades_por_caja: 1,
        costo_ingresado: 10,
        moneda_ingreso: "USD",
        tipo_iva: "GRAVADO",
      });
    });

    expect(result.current.esBs).toBe(false);
    expect(result.current.nTasa).toBe(750);
    expect(result.current.totalUsd).toBe(20);
    expect(result.current.totalBs).toBe(15000);
    expect(result.current.ivaBreakdown.totalUnidades).toBe(2);
  });

  it("computes USD and BS totals correctly with BS currency", () => {
    const { result } = renderHook(() => useInvoiceFormCalculations());

    act(() => {
      useInvoiceFormStore.getState().setField("tasa", "750");
      useInvoiceFormStore.getState().setField("moneda", "BS");
      useInvoiceFormStore.getState().addLineItem({
        producto_id: 1,
        nombre: "Cerveza Polar",
        codigo_barra: null,
        tipo_empaque: "CAJA",
        cantidad: 2,
        unidades_por_caja: 24,
        costo_ingresado: 7500,
        moneda_ingreso: "BS",
        tipo_iva: "GRAVADO",
      });
    });

    expect(result.current.esBs).toBe(true);
    expect(result.current.totalBs).toBe(15000);
    expect(result.current.totalUsd).toBe(20);
    expect(result.current.ivaBreakdown.totalUnidades).toBe(48);
  });
});
