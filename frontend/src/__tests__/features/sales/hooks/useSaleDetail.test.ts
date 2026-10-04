import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSaleDetail } from "../../../../features/sales/hooks/useSaleDetail";
import { ToastProvider } from "../../../../ui-components/Toast";
import { api } from "../../../../services/api";
import type { Sale } from "../../../../features/sales/types";

const mockSale: Sale = {
  id: 42,
  fecha_venta: "2026-07-25T10:00:00",
  usuario_id: 1,
  usuario_nombre: "Admin",
  tasa_bcv_aplicada: 50,
  historico_tasa_id: null,
  observaciones: "Entregar antes de las 5pm",
  monto_exento_usd: 10,
  base_imponible_usd: 20,
  monto_iva_usd: 3.2,
  total_usd: 33.2,
  monto_exento_ves: 500,
  base_imponible_ves: 1000,
  monto_iva_ves: 160,
  total_ves: 1660,
  metodo_pago: "EFECTIVO",
  items: [
    {
      id: 1,
      venta_id: 42,
      producto_id: 1,
      producto_nombre: "Cerveza",
      tipo_empaque: "UNIDAD",
      cantidad: 2,
      unidades_descontadas: 2,
      precio_unitario_usd: 10,
      subtotal_usd: 20,
      iva_porcentaje: 16,
    },
  ],
  pagos: [
    {
      id: 1,
      venta_id: 42,
      metodo_pago_id: 1,
      metodo_pago_nombre: "EFECTIVO",
      referencia: null,
      monto_usd: 33.2,
      monto_ves: 0,
    },
  ],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(ToastProvider, null, children)
);

describe("useSaleDetail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null sale and loading false if id is undefined", async () => {
    const { result } = renderHook(() => useSaleDetail(undefined), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(result.current.sale).toBeNull();
  });

  it("fetches sale details when id is provided", async () => {
    vi.spyOn(api, "getSale").mockResolvedValue(mockSale);
    const { result } = renderHook(() => useSaleDetail("42"), { wrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sale).toEqual(mockSale);
  });

  it("handles fetch error gracefully", async () => {
    vi.spyOn(api, "getSale").mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useSaleDetail("42"), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sale).toBeNull();
  });
});
