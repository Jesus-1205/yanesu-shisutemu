import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInvoiceData } from "@/features/invoices/hooks/useInvoiceData";
import { api } from "@/services/api";
import type { FacturaOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getInvoice: vi.fn(),
    getInvoicePayments: vi.fn(),
  },
}));

const mockInvoiceData: FacturaOut = {
  id: 42,
  proveedor_id: 2,
  numero_factura: "INV-4200",
  tipo_documento: "FACTURA",
  fecha_factura: "2026-08-01",
  image_path: "path/to/img.jpg",
  usuario_id: 1,
  observaciones: "Nota de prueba",
  moneda_principal: "USD",
  tasa_bs: 750,
  total_usd: 200,
  total_bs: 150000,
  aplica_iva: true,
  estado_pago: "PENDIENTE",
  created_at: "2026-08-01T10:00:00",
  procesada_por_ia: false,
  raw_json_ia: null,
  total_pagado_usd: 50,
  total_pagado_bs: 37500,
  saldo_pendiente_usd: 150,
  saldo_pendiente_bs: 112500,
  porcentaje_pagado: 25,
  supplier: { id: 2, nombre: "Proveedor Central", telefono: null, email: null },
  detalles: [
    {
      id: 1,
      factura_id: 42,
      producto_id: 10,
      tipo_empaque: "UNIDAD",
      cantidad: 2,
      costo_unitario_usd: 50,
      costo_unitario_bs: 37500,
      tipo_iva: "GRAVADO",
      product: null,
    },
    {
      id: 2,
      factura_id: 42,
      producto_id: 11,
      tipo_empaque: "UNIDAD",
      cantidad: 1,
      costo_unitario_usd: 100,
      costo_unitario_bs: 75000,
      tipo_iva: "EXENTO",
      product: null,
    },
  ],
  obsequios: [],
  fecha_limite_pago: "2026-08-30",
};

describe("useInvoiceData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles empty id gracefully without fetching", () => {
    const { result } = renderHook(() => useInvoiceData(undefined));
    expect(result.current.loading).toBe(true);
    expect(result.current.invoice).toBeNull();
    expect(api.getInvoice).not.toHaveBeenCalled();
  });

  it("fetches invoice and payments, and computes fiscal summary and secondary totals", async () => {
    vi.mocked(api.getInvoice).mockResolvedValue(mockInvoiceData);
    vi.mocked(api.getInvoicePayments).mockResolvedValue({
      pagos: [],
      resumen: {
        total_factura_usd: 200,
        total_factura_bs: 150000,
        total_pagado_usd: 50,
        total_pagado_bs: 37500,
        total_mora_bs: 0,
        diferencia_cambiaria_bs: 0,
        saldo_pendiente_usd: 150,
        saldo_pendiente_bs: 112500,
        porcentaje_pagado: 25,
        estado_pago: "PARCIALMENTE_PAGADA",
        cantidad_pagos: 1,
      },
    });

    const { result } = renderHook(() => useInvoiceData("42"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.invoice).toEqual(mockInvoiceData);
    expect(result.current.error).toBeNull();
    expect(result.current.paymentSummary?.cantidad_pagos).toBe(1);

    // Fiscal summary in USD (moneda_principal="USD", so IVA is 0, exento = 200)
    expect(result.current.resumen).not.toBeNull();
    expect(result.current.resumen?.total).toBe(200);
    expect(result.current.totalPrincipal).toBe(200);
    expect(result.current.nTasa).toBe(750);
    // Secondary total in BS = 200 * 750 = 150000
    expect(result.current.totalSecundario).toBe(150000);
  });

  it("sets error when fetching invoice fails", async () => {
    vi.mocked(api.getInvoice).mockRejectedValue(new Error("Factura no encontrada"));
    vi.mocked(api.getInvoicePayments).mockResolvedValue({ pagos: [], resumen: {} as any });

    const { result } = renderHook(() => useInvoiceData("999"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Factura no encontrada");
    expect(result.current.invoice).toBeNull();
  });
});
