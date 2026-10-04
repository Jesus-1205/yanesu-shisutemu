import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AIReviewPanel from "@/features/invoices/components/AIReviewPanel";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import type { InvoiceAnalysisOut, ProductOut, SupplierOut } from "@/types/api";

const mockAnalysis: InvoiceAnalysisOut = {
  proveedor_nombre: "Distribuidora Los Andes",
  numero_factura: "FAC-9988",
  fecha_factura: "2026-03-15",
  fecha_limite_pago: "2026-03-30",
  moneda: "USD",
  tipo_documento: "FACTURA",
  productos: [
    {
      nombre: "Ron Santa Teresa 1996",
      cantidad: 2,
      precio_unitario: 35.0,
      tipo_empaque: "UNIDAD",
    },
  ],
  raw_json_ia: {},
};

const mockSuppliers: SupplierOut[] = [
  { id: 1, nombre: "Distribuidora Los Andes", telefono: null, email: null },
];

const mockProducts: ProductOut[] = [
  {
    id: 101,
    codigo_barra: "7591234567890",
    nombre: "Ron Santa Teresa 1996",
    categories: [],
    unidades_por_caja: 6,
    stock_cajas: 1,
    stock_unidades: 10,
    stock_minimo: 2,
    precio_costo_caja_usd: 180,
    precio_costo_usd: 30,
    precio_unidad_usd: 40,
    precio_caja_usd: 240,
    precio_sugerido_unidad_usd: 40,
    precio_sugerido_caja_usd: 240,
    proveedor_id: 1,
    tipo_iva: "GRAVADO",
    es_favorito: false,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
];

describe("AIReviewPanel Integration", () => {
  const onSupplierCreated = vi.fn();
  const onProductCreated = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceFormStore.getState().reset();
    useInvoiceFormStore.getState().setField("tasa", "36.00");
  });

  it("renders the review panel properly and cancels on click", () => {
    render(
      <AIReviewPanel
        aiAnalysis={mockAnalysis}
        products={mockProducts}
        suppliers={mockSuppliers}
        onSupplierCreated={onSupplierCreated}
        onProductCreated={onProductCreated}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/revisión de factura \(ia\)/i)).toBeInTheDocument();
    expect(screen.getByText("1 producto(s) sin resolver")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("handles image preview when invoiceFile is provided", () => {
    const file = new File(["test-image"], "factura.png", { type: "image/png" });

    render(
      <AIReviewPanel
        aiAnalysis={mockAnalysis}
        products={mockProducts}
        suppliers={mockSuppliers}
        invoiceFile={file}
        onSupplierCreated={onSupplierCreated}
        onProductCreated={onProductCreated}
        onCancel={onCancel}
      />
    );

    expect(screen.getByAltText("Factura a revisar")).toBeInTheDocument();
  });

  it("opens create supplier and create product modals when requested", async () => {
    render(
      <AIReviewPanel
        aiAnalysis={mockAnalysis}
        products={mockProducts}
        suppliers={mockSuppliers}
        onSupplierCreated={onSupplierCreated}
        onProductCreated={onProductCreated}
        onCancel={onCancel}
      />
    );

    // Click "+ Nuevo" to open supplier modal
    fireEvent.click(screen.getByRole("button", { name: /\+ nuevo/i }));
    expect(screen.getByText("Nuevo Proveedor")).toBeInTheDocument();
  });
});
