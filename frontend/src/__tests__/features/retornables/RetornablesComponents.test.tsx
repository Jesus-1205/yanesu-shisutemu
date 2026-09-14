import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResumenPresentacion } from "../../../features/retornables/components/ResumenPresentacion";
import { NuevoReporteModal } from "../../../features/retornables/components/NuevoReporteModal";
import { AsociarProductoModal } from "../../../features/retornables/components/AsociarProductoModal";
import { GestionarProductosModal } from "../../../features/retornables/components/GestionarProductosModal";
import RetornablesPage from "../../../features/retornables/pages/RetornablesPage";
import { ToastProvider } from "../../../ui-components/Toast";
import { api } from "../../../services/api";
import type {
  RetornablePresentacionOut,
  RetornableProductoOut,
  RetornableReportePaginationOut,
} from "../../../types/api";

const mockPresentacionData: RetornablePresentacionOut = {
  presentacion: "222",
  casillero: {
    estado: "CASILLERO",
    cantidad_botellas: 0,
    cantidad_cajas: 10,
    total_botellas: 0,
    cajas_enteras: 10,
    botellas_sueltas: 0,
  },
  vacio: {
    estado: "VACIO",
    cantidad_botellas: 72,
    cantidad_cajas: 2,
    total_botellas: 72,
    cajas_enteras: 2,
    botellas_sueltas: 0,
  },
  lleno: {
    estado: "LLENO",
    cantidad_botellas: 180,
    cantidad_cajas: 5,
    total_botellas: 180,
    cajas_enteras: 5,
    botellas_sueltas: 0,
  },
  total_botellas: 252,
  total_cajas_enteras: 7,
  lleno_esperado_botellas: 180,
  dif_botellas: 0,
  vacio_esperado_botellas: 72,
  dif_vacio_botellas: 0,
  productos_asociados: [
    {
      id: 1,
      producto_id: 101,
      presentacion: "222",
      producto_nombre: "Polar Pilsen 222ml",
      stock_cajas: 5,
      stock_unidades: 180,
    },
  ],
};

const mockAssociatedProducts: RetornableProductoOut[] = [
  {
    id: 1,
    producto_id: 101,
    presentacion: "222",
    producto_nombre: "Polar Pilsen 222ml",
    stock_cajas: 5,
    stock_unidades: 180,
  },
];

const mockReportesPagination: RetornableReportePaginationOut = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 1,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("ResumenPresentacion component", () => {
  it("renders stock cards for casillero, vacio and lleno", () => {
    render(<ResumenPresentacion data={mockPresentacionData} />);

    expect(screen.getByText("Presentación 222")).toBeInTheDocument();
    expect(screen.getByText("CASILLERO")).toBeInTheDocument();
    expect(screen.getByText("VACÍO")).toBeInTheDocument();
    expect(screen.getByText("LLENO")).toBeInTheDocument();
    expect(screen.getByText("Total (Vacío + Lleno)")).toBeInTheDocument();
    expect(screen.getByText("Polar Pilsen 222ml")).toBeInTheDocument();
    expect(screen.getAllByText("✅ Sin diferencias")).toHaveLength(2);
  });

  it("shows difference alerts when there is a mismatch", () => {
    const mismatchData: RetornablePresentacionOut = {
      ...mockPresentacionData,
      dif_botellas: 5,
      dif_vacio_botellas: -3,
    };

    render(<ResumenPresentacion data={mismatchData} />);

    expect(screen.getByText("🚨 Faltan 5 botellas")).toBeInTheDocument();
    expect(screen.getByText("⚠️ Sobran 3 botellas")).toBeInTheDocument();
  });
});

describe("NuevoReporteModal component", () => {
  it("validates required fields and saves report", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const createSpy = vi.spyOn(api, "crearRetornableReporte").mockResolvedValue(mockReportesPagination);

    render(
      <ToastProvider>
        <NuevoReporteModal open={true} onClose={onClose} onSaved={onSaved} />
      </ToastProvider>,
    );

    expect(screen.getByText("Nuevo Reporte de Conteo Físico")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: "Guardar Reporte" });
    fireEvent.click(saveBtn);
    expect(createSpy).not.toHaveBeenCalled();

    const nameInput = screen.getByPlaceholderText("Nombre de quien realizó el conteo");
    fireEvent.change(nameInput, { target: { value: "Juan Conteo" } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          realizado_por: "Juan Conteo",
        }),
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe("AsociarProductoModal component", () => {
  it("associates product with presentacion", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.spyOn(api, "getProducts").mockResolvedValue({
      items: [
        {
          id: 101,
          codigo_barra: "111",
          nombre: "Polar Pilsen 222ml",
          categories: [],
          unidades_por_caja: 36,
          stock_cajas: 5,
          stock_unidades: 180,
          stock_minimo: 1,
          precio_costo_caja_usd: 10,
          precio_costo_usd: 10,
          precio_unidad_usd: 15,
          precio_caja_usd: 15,
          precio_sugerido_unidad_usd: 15,
          precio_sugerido_caja_usd: 15,
          proveedor_id: null,
          tipo_iva: "GRAVADO",
          es_favorito: false,
          precio_divisas_unidad: null,
          precio_divisas_caja: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
      pages: 1,
    });
    const assocSpy = vi.spyOn(api, "asociarRetornableProducto").mockResolvedValue({ detail: "ok", id: 1 });

    render(
      <ToastProvider>
        <AsociarProductoModal open={true} onClose={onClose} onSaved={onSaved} />
      </ToastProvider>,
    );

    expect(screen.getByText("Asociar Producto Retornable")).toBeInTheDocument();

    const assocBtn = screen.getByRole("button", { name: "Asociar" });
    fireEvent.click(assocBtn);
    expect(assocSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("GestionarProductosModal component", () => {
  it("renders associated products table and disassociates", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const disassocSpy = vi.spyOn(api, "desasociarRetornableProducto").mockResolvedValue();

    render(
      <ToastProvider>
        <GestionarProductosModal
          open={true}
          onClose={onClose}
          onSaved={onSaved}
          productos={mockAssociatedProducts}
        />
      </ToastProvider>,
    );

    expect(screen.getByText("Productos Retornables")).toBeInTheDocument();
    expect(screen.getByText("Polar Pilsen 222ml")).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", { name: "Quitar" });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(disassocSpy).toHaveBeenCalledWith(1);
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });
});

describe("RetornablesPage component", () => {
  it("renders page, switches tabs and loads reports", async () => {
    vi.spyOn(api, "getRetornableReportes").mockResolvedValue(mockReportesPagination);
    vi.spyOn(api, "getRetornableHistorico").mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      pages: 1,
    });
    vi.spyOn(api, "getRetornableProductos").mockResolvedValue(mockAssociatedProducts);
    vi.spyOn(api, "getRetornableComparacion").mockResolvedValue({
      ultimo_reporte: null,
      reporte_anterior: null,
      lineas_sistema: [],
      lineas_anterior: [],
    });

    render(
      <ToastProvider>
        <RetornablesPage />
      </ToastProvider>,
    );

    expect(screen.getByText("Inventario Retornable")).toBeInTheDocument();

    const reportesTab = screen.getByLabelText("Reportes");
    fireEvent.click(reportesTab);

    await waitFor(() => {
      expect(screen.getByText("No hay reportes registrados")).toBeInTheDocument();
    });

    const productosTab = screen.getByLabelText("Productos");
    fireEvent.click(productosTab);

    await waitFor(() => {
      expect(screen.getByText("Polar Pilsen 222ml")).toBeInTheDocument();
    });
  });
});
