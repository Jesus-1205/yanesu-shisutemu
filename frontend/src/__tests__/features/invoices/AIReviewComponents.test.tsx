import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AIReviewMetadataForm from "@/features/invoices/components/AIReviewMetadataForm";
import AIReviewItemRow from "@/features/invoices/components/AIReviewItemRow";
import type { ReviewItem } from "@/features/invoices/hooks/useAIReviewState";
import type { ProductOut, SupplierOut } from "@/types/api";

const mockSuppliers: SupplierOut[] = [
  { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null },
  { id: 2, nombre: "Cervecería Regional", telefono: null, email: null },
];

const mockProducts: ProductOut[] = [
  {
    id: 10,
    codigo_barra: "123456",
    nombre: "Cerveza Polar",
    categories: [],
    unidades_por_caja: 24,
    stock_cajas: 5,
    stock_unidades: 20,
    stock_minimo: 2,
    precio_costo_caja_usd: 240,
    precio_costo_usd: 10,
    precio_unidad_usd: 15,
    precio_caja_usd: 360,
    precio_sugerido_unidad_usd: 15,
    precio_sugerido_caja_usd: 360,
    proveedor_id: 1,
    tipo_iva: "GRAVADO",
    es_favorito: false,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
];

describe("AIReviewMetadataForm", () => {
  it("renders initial form values correctly and triggers callbacks", () => {
    const setProveedorId = vi.fn();
    const setProveedorNombre = vi.fn();
    const onOpenSupplierModal = vi.fn();
    const setNumeroFactura = vi.fn();
    const setFechaFactura = vi.fn();
    const setFechaLimitePago = vi.fn();
    const setTipoDocumento = vi.fn();
    const setMoneda = vi.fn();

    render(
      <AIReviewMetadataForm
        analysisProveedorNombre="Distribuidora Detectada"
        proveedorId={1}
        setProveedorId={setProveedorId}
        setProveedorNombre={setProveedorNombre}
        suppliers={mockSuppliers}
        onOpenSupplierModal={onOpenSupplierModal}
        numeroFactura="FACT-123"
        setNumeroFactura={setNumeroFactura}
        fechaFactura="2026-03-01"
        setFechaFactura={setFechaFactura}
        fechaLimitePago="2026-03-15"
        setFechaLimitePago={setFechaLimitePago}
        tipoDocumento="FACTURA"
        setTipoDocumento={setTipoDocumento}
        moneda="USD"
        setMoneda={setMoneda}
      />
    );

    expect(screen.getByText("Distribuidora Detectada")).toBeInTheDocument();
    expect(screen.getByDisplayValue("FACT-123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-03-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-03-15")).toBeInTheDocument();

    // Trigger input change
    fireEvent.change(screen.getByDisplayValue("FACT-123"), { target: { value: "FACT-999" } });
    expect(setNumeroFactura).toHaveBeenCalledWith("FACT-999");

    // Click "+ Nuevo" button
    fireEvent.click(screen.getByRole("button", { name: /\+ nuevo/i }));
    expect(onOpenSupplierModal).toHaveBeenCalled();

    // Toggle document type
    fireEvent.click(screen.getByRole("button", { name: /n\. entrega/i }));
    expect(setTipoDocumento).toHaveBeenCalledWith("NOTA_ENTREGA");

    // Toggle currency
    fireEvent.click(screen.getByRole("button", { name: /bs\./i }));
    expect(setMoneda).toHaveBeenCalledWith("BS");
  });
});

describe("AIReviewItemRow", () => {
  const item: ReviewItem = {
    extracted: {
      nombre: "Ron Santa Teresa 1996 750ml",
      tipo_empaque: "CAJA",
      cantidad: 3,
      precio_unitario: 25.5,
    },
    producto_id: 10,
    producto_nombre: "Cerveza Polar",
    tipo_empaque: "CAJA",
    cantidad: 3,
    costo: 25.5,
    unidades_por_caja: 12,
  };

  it("renders row details and responds to interactions", () => {
    const onProductSelect = vi.fn();
    const onUpdateItem = vi.fn();
    const onToggleEmpaque = vi.fn();
    const onOpenProductModal = vi.fn();

    render(
      <AIReviewItemRow
        item={item}
        index={0}
        moneda="USD"
        products={mockProducts}
        onProductSelect={onProductSelect}
        onUpdateItem={onUpdateItem}
        onToggleEmpaque={onToggleEmpaque}
        onOpenProductModal={onOpenProductModal}
      />
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Ron Santa Teresa 1996 750ml")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("25.5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();

    // Change cantidad
    fireEvent.change(screen.getByDisplayValue("3"), { target: { value: "5" } });
    expect(onUpdateItem).toHaveBeenCalledWith(0, "cantidad", 5);

    // Toggle empaque
    fireEvent.click(screen.getByRole("button", { name: "Und" }));
    expect(onToggleEmpaque).toHaveBeenCalledWith(0, "UNIDAD");

    // Open create product modal
    fireEvent.click(screen.getByRole("button", { name: /crear producto/i }));
    expect(onOpenProductModal).toHaveBeenCalledWith("Ron Santa Teresa 1996 750ml");
  });
});
