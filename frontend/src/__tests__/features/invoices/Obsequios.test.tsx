import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ObsequioForm from "@/features/invoices/components/ObsequioForm";
import ObsequiosSection from "@/features/invoices/components/ObsequiosSection";
import { useInvoiceFormStore } from "@/features/invoices/store/invoiceFormStore";
import type { ProductOut } from "@/types/api";

const mockProducts: ProductOut[] = [
  {
    id: 1,
    codigo_barra: "123",
    nombre: "Vaso Vidrio Promo",
    categories: [],
    unidades_por_caja: 24,
    stock_cajas: 10,
    stock_unidades: 240,
    stock_minimo: 5,
    precio_costo_caja_usd: 10,
    precio_costo_usd: 0.41,
    precio_unidad_usd: 1,
    precio_caja_usd: 20,
    precio_sugerido_unidad_usd: 1,
    precio_sugerido_caja_usd: 20,
    proveedor_id: 1,
    tipo_iva: "EXENTO",
    es_favorito: false,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
];

const mockSearchProducts = vi.fn().mockResolvedValue([
  { value: 1, label: "Vaso Vidrio Promo", subtitle: "24 unds/caja" },
]);

beforeEach(() => {
  vi.clearAllMocks();
  useInvoiceFormStore.getState().reset();
});

// ── ObsequioForm ──────────────────────────────────────────────────────────────

describe("ObsequioForm", () => {
  it("botón Agregar deshabilitado inicialmente hasta cumplir validaciones", () => {
    const onAdd = vi.fn();
    render(
      <ObsequioForm
        products={mockProducts}
        onSearchProducts={mockSearchProducts}
        onAdd={onAdd}
      />,
    );

    const addBtn = screen.getByRole("button", { name: /\+ Agregar/i });
    expect(addBtn).toBeDisabled();
  });

  it("cambiar empaque entre Caja y Unidad actualiza estado de Unds/Caja", () => {
    const onAdd = vi.fn();
    render(
      <ObsequioForm
        products={mockProducts}
        onSearchProducts={mockSearchProducts}
        onAdd={onAdd}
      />,
    );

    const cajaBtn = screen.getByRole("button", { name: "Caja" });
    const unidBtn = screen.getByRole("button", { name: "Unid" });

    // Cambiar a Unidad
    fireEvent.click(unidBtn);
    expect(screen.getByDisplayValue("—")).toBeInTheDocument();

    // Volver a Caja
    fireEvent.click(cajaBtn);
    expect(screen.queryByDisplayValue("—")).not.toBeInTheDocument();
  });
});

// ── ObsequiosSection (Integración con Store) ──────────────────────────────────

describe("ObsequiosSection", () => {
  it("renderiza colapsado por defecto y se expande al hacer clic", () => {
    render(
      <ObsequiosSection
        products={mockProducts}
        onSearchProducts={mockSearchProducts}
      />,
    );

    expect(screen.getByText(/Obsequios \/ Cortesías/i)).toBeInTheDocument();
    expect(screen.queryByText(/Agregar Obsequio/i)).not.toBeInTheDocument();

    // Expandir
    fireEvent.click(screen.getByRole("button", { name: /Obsequios \/ Cortesías/i }));
    expect(screen.getByText(/Agregar Obsequio/i)).toBeInTheDocument();
  });

  it("muestra badge con conteo y permite eliminar un obsequio de la tabla", () => {
    // Inyectar un obsequio en el store
    useInvoiceFormStore.getState().addObsequio({
      producto_id: 1,
      nombre: "Vaso Vidrio Promo",
      tipo_empaque: "CAJA",
      cantidad: 2,
      unidades_por_caja: 24,
      justificacion: "Cortesía de apertura",
    });

    render(
      <ObsequiosSection
        products={mockProducts}
        onSearchProducts={mockSearchProducts}
      />,
    );

    // Expandir
    fireEvent.click(screen.getByRole("button", { name: /Obsequios \/ Cortesías/i }));

    expect(screen.getByText("Vaso Vidrio Promo")).toBeInTheDocument();
    expect(screen.getByText("Cortesía de apertura")).toBeInTheDocument();

    // Eliminar obsequio
    const deleteBtn = screen.getByTitle("Eliminar obsequio");
    fireEvent.click(deleteBtn);

    expect(useInvoiceFormStore.getState().obsequioItems).toHaveLength(0);
  });
});
