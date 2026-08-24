import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InvoiceDetailPage from "@/features/invoices/pages/InvoiceDetailPage";
import type { FacturaOut, DetalleFacturaOut, InvoicePaymentSummary } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getInvoice: vi.fn(),
    getInvoiceImageUrl: (id: number) => `/api/invoices/${id}/image`,
    downloadInvoiceImage: vi.fn(),
    getInvoicePayments: vi.fn().mockResolvedValue({ pagos: [], resumen: null }),
    getPaymentMethods: vi.fn().mockResolvedValue([]),
    getPaymentReceiptUrl: vi.fn(),
    registerInvoicePayment: vi.fn(),
  },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { api } from "@/services/api";

// ─── Test Data ────────────────────────────────────────────────────────────

const baseInvoice: FacturaOut = {
  id: 26,
  proveedor_id: 1,
  numero_factura: "26662",
  tipo_documento: "FACTURA",
  fecha_factura: "2026-07-14",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  moneda_principal: "USD",
  tasa_bs: 750,
  total_usd: 89.35,
  total_bs: 67018,
  aplica_iva: true,
  estado_pago: "PENDIENTE",
  created_at: "2026-07-14T12:00:00",
  procesada_por_ia: false,
  raw_json_ia: null,
  supplier: { id: 1, nombre: "Inversiones CG, C.A", telefono: null, email: null },
  detalles: [],
  obsequios: [],
  fecha_limite_pago: null,
};

const invoiceWithAI: FacturaOut = {
  ...baseInvoice,
  procesada_por_ia: true,
  raw_json_ia: {
    metadata: {
      moneda: "USD",
      proveedor: { nombre: "Inversiones CG, C.A" },
      fecha_factura: "2026-07-14",
      numero_factura: "26662",
    },
    productos: {
      productos: [
        { nombre: "BELMONT", cantidad: 2, precio_unitario: 18206 },
        { nombre: "CONSUL", cantidad: 2, precio_unitario: 9533 },
      ],
    },
  },
};

function createDetalle(overrides: Partial<DetalleFacturaOut> = {}): DetalleFacturaOut {
  return {
    id: 1,
    factura_id: 26,
    producto_id: 1,
    tipo_empaque: "CAJA",
    cantidad: 2,
    costo_unitario_usd: 20,
    costo_unitario_bs: 15000,
    tipo_iva: "GRAVADO",
    product: {
      id: 1,
      nombre: "Producto A",
      codigo_barra: "123",
      categories: [],
      unidades_por_caja: 36,
      stock_cajas: 10,
      stock_unidades: 360,
      stock_minimo: 5,
      precio_costo_caja_usd: 20,
      precio_costo_usd: 0.56,
      precio_unidad_usd: 1.5,
      precio_caja_usd: 54,
      precio_sugerido_unidad_usd: 2,
      precio_sugerido_caja_usd: 72,
      proveedor_id: 1,
      tipo_iva: "GRAVADO",
      es_favorito: false,
      precio_divisas_unidad: null,
      precio_divisas_caja: null,
    },
    ...overrides,
  };
}

const mockPaymentSummary: InvoicePaymentSummary = {
  estado_pago: "PARCIALMENTE_PAGADA",
  total_factura_usd: 89.35,
  total_factura_bs: 67018,
  total_pagado_usd: 30,
  total_pagado_bs: 22500,
  saldo_pendiente_usd: 59.35,
  saldo_pendiente_bs: 44518,
  cantidad_pagos: 1,
  porcentaje_pagado: 33.57,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderPage(invoiceId = 26) {
  return render(
    <MemoryRouter initialEntries={[`/invoices/${invoiceId}`]}>
      <Routes>
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("InvoiceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getInvoicePayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      pagos: [],
      resumen: null,
    });
  });

  it("muestra loading y luego el detalle", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Inversiones CG, C.A").length).toBeGreaterThanOrEqual(1);
  });

  it("no muestra boton de IA cuando procesada_por_ia es false", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.queryByText("Resultado IA")).not.toBeInTheDocument();
  });

  it("muestra boton de IA cuando procesada_por_ia es true", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoiceWithAI);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Resultado IA")).toBeInTheDocument();
    });
  });

  it("abre modal con datos de IA al hacer clic", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoiceWithAI);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Resultado IA")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Resultado IA"));
    await waitFor(() => {
      expect(screen.getByText("Información escaneada por IA")).toBeInTheDocument();
    });
    expect(screen.getByText("BELMONT")).toBeInTheDocument();
    expect(screen.getByText("CONSUL")).toBeInTheDocument();
  });

  it("cierra modal con el boton cerrar", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoiceWithAI);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Resultado IA")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Resultado IA"));
    await waitFor(() => {
      expect(screen.getByText("Información escaneada por IA")).toBeInTheDocument();
    });
    const closeButton = screen.getByRole("button", { name: /cerrar/i });
    await userEvent.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByText("Información escaneada por IA")).not.toBeInTheDocument();
    });
  });

  it("muestra mensaje cuando raw_json_ia es null", async () => {
    const invoiceAIWithoutData = { ...baseInvoice, procesada_por_ia: true, raw_json_ia: null };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoiceAIWithoutData);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Resultado IA")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText("Resultado IA"));
    await waitFor(() => {
      expect(screen.getByText("No hay datos disponibles.")).toBeInTheDocument();
    });
  });

  it("muestra error si falla la carga", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Error de red"));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error de red")).toBeInTheDocument();
    });
  });

  // ── Fiscal summary with IVA ──────────────────────────────────────

  it("shows Resumen Fiscal with correct IVA when invoice has GRAVADO items (USD)", async () => {
    const detalles = [createDetalle({ cantidad: 2, costo_unitario_usd: 20 })];
    const invoice = {
      ...baseInvoice,
      aplica_iva: true,
      moneda_principal: "USD",
      total_usd: 40,
      total_bs: 30000,
      detalles,
    };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    // Fiscal summary should be present
    expect(screen.getByText("Resumen Fiscal y Total")).toBeInTheDocument();
    expect(screen.getByText("Base imponible")).toBeInTheDocument();
    expect(screen.getByText("IVA (16%)")).toBeInTheDocument();
    expect(screen.getByText("Exento")).toBeInTheDocument();

    // Base imponible = $40.00
    expect(screen.getAllByText("$40,00").length).toBeGreaterThanOrEqual(1);
    // IVA = 40 * 0.16 = $6.40
    expect(screen.getAllByText("$6,40").length).toBeGreaterThanOrEqual(1);
    // Total USD = 40 + 6.40 = $46.40
    expect(screen.getAllByText("$46,40").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Resumen Fiscal with mixed GRAVADO/EXENTO items (BS)", async () => {
    const detalles = [
      createDetalle({ cantidad: 1, costo_unitario_bs: 10000, tipo_iva: "GRAVADO" }),
      createDetalle({ id: 2, cantidad: 1, costo_unitario_bs: 5000, tipo_iva: "EXENTO" }),
    ];
    const invoice = {
      ...baseInvoice,
      aplica_iva: true,
      moneda_principal: "BS",
      total_bs: 17000, // (10000 + 5000) + iva(10000 * 0.16)
      total_usd: 22.67,
      detalles,
    };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    expect(screen.getByText("Resumen Fiscal y Total")).toBeInTheDocument();

    // Exento = Bs. 5.000,00
    expect(screen.getByText("Exento")).toBeInTheDocument();
    // Base imponible = Bs. 10.000,00
    expect(screen.getByText("Base imponible")).toBeInTheDocument();
    // IVA = 10000 * 0.16 = Bs. 1.600,00
    expect(screen.getByText("IVA (16%)")).toBeInTheDocument();
  });

  // ── Currency cards order ─────────────────────────────────────────

  it("shows USD as PRINCIPAL and Bs. as AUTO-CALC for USD invoices", async () => {
    const invoice = {
      ...baseInvoice,
      moneda_principal: "USD",
      total_usd: 100,
      total_bs: 75000,
    };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    // Total USD card should have "PRINCIPAL" badge
    expect(screen.getByText("PRINCIPAL")).toBeInTheDocument();
    expect(screen.getByText("AUTO-CALC")).toBeInTheDocument();

    // Check USD card appears with PRINCIPAL
    const principalEl = screen.getByText("PRINCIPAL");
    const principalCard = principalEl.closest("div")?.closest("div");
    expect(principalCard?.textContent).toContain("Total USD");
  });

  it("shows Bs. as PRINCIPAL and USD as AUTO-CALC for BS invoices", async () => {
    const invoice = {
      ...baseInvoice,
      moneda_principal: "BS",
      total_bs: 112000,
      total_usd: 149.33,
    };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    // Total Bs. card should have "PRINCIPAL" badge
    const principalEl = screen.getByText("PRINCIPAL");
    const principalCard = principalEl.closest("div")?.closest("div");
    expect(principalCard?.textContent).toContain("Total Bs.");
  });

  it("shows Tasa BCV card when tasa_bs > 0", async () => {
    const invoice = { ...baseInvoice, tasa_bs: 750 };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.getByText("Tasa BCV")).toBeInTheDocument();
    expect(screen.getAllByText(/750,00/).length).toBeGreaterThanOrEqual(1);
  });

  // ── fecha_limite_pago with badge ─────────────────────────────────

  it("shows fecha_limite_pago when set", async () => {
    // Use a future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().split("T")[0];

    const invoice = { ...baseInvoice, fecha_limite_pago: dateStr };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    expect(screen.getByText("Límite de pago:")).toBeInTheDocument();
    // Should show the date in es-VE locale
    const limiteLabel = screen.getByText("Límite de pago:");
    const dateContainer = limiteLabel.parentElement;
    expect(dateContainer).toBeInTheDocument();
    // Should show remaining days badge
    expect(screen.getByText(/restante/)).toBeInTheDocument();
  });

  it("shows expired badge when fecha_limite_pago is in the past", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);
    const dateStr = pastDate.toISOString().split("T")[0];

    const invoice = { ...baseInvoice, fecha_limite_pago: dateStr };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    expect(screen.getByText(/Vencida hace/)).toBeInTheDocument();
  });

  it("shows 'Vence hoy' badge when fecha_limite_pago is today", async () => {
    const today = new Date().toISOString().split("T")[0];
    const invoice = { ...baseInvoice, fecha_limite_pago: today };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    expect(screen.getByText("Vence hoy")).toBeInTheDocument();
  });

  it("hides badge when invoice is PAGADA even with fecha_limite_pago", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().split("T")[0];

    const invoice = {
      ...baseInvoice,
      fecha_limite_pago: dateStr,
      estado_pago: "PAGADA" as const,
    };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    // fecha_limite should show, but no badge
    expect(screen.getByText("Límite de pago:")).toBeInTheDocument();
    expect(screen.queryByText(/restante/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vencida/)).not.toBeInTheDocument();
  });

  it("hides fecha_limite_pago when null", async () => {
    const invoice = { ...baseInvoice, fecha_limite_pago: null };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.queryByText("Límite de pago:")).not.toBeInTheDocument();
  });

  // ── Payment summary panel ────────────────────────────────────────

  it("shows payment summary panel when data is available", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    (api.getInvoicePayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      pagos: [],
      resumen: mockPaymentSummary,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Estado de Pago")).toBeInTheDocument();
    });

    expect(screen.getByText("34% pagado")).toBeInTheDocument();
    expect(screen.getByText("Registrar Pago")).toBeInTheDocument();
  });

  it("shows payment summary with correct badges", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    (api.getInvoicePayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      pagos: [],
      resumen: mockPaymentSummary,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Estado de Pago")).toBeInTheDocument();
    });

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Saldo")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Parcial")).toBeInTheDocument();
    });
  });

  it("shows Registrar Pago button when invoice is not PAGADA", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    (api.getInvoicePayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      pagos: [],
      resumen: mockPaymentSummary,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Registrar Pago")).toBeInTheDocument();
    });
  });

  it("hides Registrar Pago button when invoice is PAGADA", async () => {
    const pagadaInvoice = { ...baseInvoice, estado_pago: "PAGADA" as const };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(pagadaInvoice);
    (api.getInvoicePayments as ReturnType<typeof vi.fn>).mockResolvedValue({
      pagos: [],
      resumen: {
        ...mockPaymentSummary,
        estado_pago: "PAGADA" as const,
        porcentaje_pagado: 100,
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Estado de Pago")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Registrar Pago/ })).not.toBeInTheDocument();
  });

  // ── IVA badge ────────────────────────────────────────────────────

  it("shows IVA badge when aplica_iva is true", async () => {
    const invoice = { ...baseInvoice, aplica_iva: true };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.getByText("IVA 16%")).toBeInTheDocument();
  });

  it("hides IVA badge when aplica_iva is false", async () => {
    const invoice = { ...baseInvoice, aplica_iva: false };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.queryByText("IVA 16%")).not.toBeInTheDocument();
  });

  // ── Document type display ────────────────────────────────────────

  it("shows 'Factura' for FACTURA tipo_documento", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    // Metadata shows "Factura"
    expect(screen.getByText("Factura")).toBeInTheDocument();
  });

  it("shows 'Nota de Entrega' for NOTA_ENTREGA tipo_documento", async () => {
    const nota = { ...baseInvoice, tipo_documento: "NOTA_ENTREGA" as const };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(nota);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Nota #26662")).toBeInTheDocument();
    });
    expect(screen.getByText("Nota de Entrega")).toBeInTheDocument();
  });

  // ── Product table ────────────────────────────────────────────────

  it("shows product details table with correct columns", async () => {
    const detalles = [createDetalle()];
    const invoice = { ...baseInvoice, detalles };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    expect(screen.getByText("Productos")).toBeInTheDocument();
    expect(screen.getByText("Producto A")).toBeInTheDocument();
  });

  it("shows empty message when no products", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.getByText("Sin productos")).toBeInTheDocument();
  });

  // ── Observaciones ────────────────────────────────────────────────

  it("shows observaciones when present", async () => {
    const invoice = { ...baseInvoice, observaciones: "Entregar en la tarde" };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.getByText("Observaciones")).toBeInTheDocument();
    expect(screen.getByText("Entregar en la tarde")).toBeInTheDocument();
  });

  it("hides observaciones when null", async () => {
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(baseInvoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });
    expect(screen.queryByText("Observaciones")).not.toBeInTheDocument();
  });

  // ── Obsequios section ───────────────────────────────────────────

  it("shows obsequios section when obsequios exist", async () => {
    const invoice = {
      ...baseInvoice,
      obsequios: [
        {
          id: 1,
          factura_id: 26,
          producto_id: 1,
          tipo_empaque: "CAJA",
          cantidad: 2,
          justificacion: "Cortesía proveedor",
          product: { id: 1, nombre: "Regalo A", codigo_barra: null, categories: [], unidades_por_caja: 1, stock_cajas: 0, stock_unidades: 0, stock_minimo: 0, precio_costo_caja_usd: 0, precio_costo_usd: 0, precio_unidad_usd: 0, precio_caja_usd: 0, precio_sugerido_unidad_usd: 0, precio_sugerido_caja_usd: 0, proveedor_id: 1, tipo_iva: "GRAVADO" as const, es_favorito: false, precio_divisas_unidad: null, precio_divisas_caja: null },
        },
      ],
    };
    (api.getInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(invoice);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Factura #26662")).toBeInTheDocument();
    });

    expect(screen.getByText(/Obsequios/)).toBeInTheDocument();
    expect(screen.getByText("Regalo A")).toBeInTheDocument();
    expect(screen.getByText("Cortesía proveedor")).toBeInTheDocument();
  });
});
