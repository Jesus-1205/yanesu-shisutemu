import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InvoiceDetailPage from "@/features/invoices/pages/InvoiceDetailPage";
import type { FacturaOut } from "@/types/api";

vi.mock("@/services/api", () => ({
  api: {
    getInvoice: vi.fn(),
    getInvoiceImageUrl: (id: number) => `/api/invoices/${id}/image`,
    downloadInvoiceImage: vi.fn(),
  },
}));

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { api } from "@/services/api";

const baseInvoice: FacturaOut = {
  id: 26,
  proveedor_id: 1,
  numero_factura: "26662",
  fecha_factura: "2026-07-14",
  image_path: null,
  usuario_id: 1,
  observaciones: null,
  moneda_principal: "USD",
  tasa_bs: 750,
  total_usd: 89.35,
  total_bs: 67018,
  aplica_iva: true,
  created_at: "2026-07-14T12:00:00",
  procesada_por_ia: false,
  raw_json_ia: null,
  supplier: { id: 1, nombre: "Inversiones CG, C.A", telefono: null, email: null },
  detalles: [],
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

function renderPage(invoiceId = 26) {
  return render(
    <MemoryRouter initialEntries={[`/invoices/${invoiceId}`]}>
      <Routes>
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("InvoiceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
