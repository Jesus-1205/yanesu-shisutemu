import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RetornablesPage from "@/features/retornables/pages/RetornablesPage";
import type {
  ComparacionOut,
  RetornableReportePaginationOut,
  RetornableMovimientoPaginationOut,
  RetornableProductoOut,
} from "@/types/api";

const mockReportesRefetch = vi.fn();
const mockHistoricoRefetch = vi.fn();
const mockProductosRefetch = vi.fn();
const mockComparacionRefetch = vi.fn();

let mockComparacionData: { data: ComparacionOut | null; loading: boolean; error: string | null } = {
  data: {
    ultimo_reporte: {
      id: 1,
      fecha: "2026-08-20T10:00:00",
      realizado_por: "Admin",
      usuario_id: 1,
      observaciones: "Reporte 1",
      es_actual: true,
    },
    reporte_anterior: null,
    lineas_sistema: [],
    lineas_anterior: [],
  },
  loading: false,
  error: null,
};

let mockReportesData: { data: RetornableReportePaginationOut | null; loading: boolean; error: string | null } = {
  data: {
    items: [
      {
        id: 1,
        fecha: "2026-08-20T10:00:00",
        realizado_por: "Admin",
        usuario_id: 1,
        observaciones: "Reporte 1",
        es_actual: true,
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
    pages: 1,
  },
  loading: false,
  error: null,
};

let mockHistoricoData: { data: RetornableMovimientoPaginationOut | null; loading: boolean; error: string | null } = {
  data: {
    items: [
      {
        id: 1,
        fecha: "2026-08-20T12:00:00",
        presentacion: "222",
        estado: "VACIO",
        delta_botellas: 5,
        tipo_movimiento: "VENTA",
        referencia_id: 101,
        referencia_tipo: "VENTA",
        usuario_id: 1,
        usuario_nombre: "Admin",
        observaciones: "Venta directa",
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
    pages: 1,
  },
  loading: false,
  error: null,
};

let mockProductosData: { data: RetornableProductoOut[] | null; loading: boolean; error: string | null } = {
  data: [
    {
      id: 1,
      producto_id: 1,
      producto_nombre: "Cerveza Polar 222ml",
      presentacion: "222",
      stock_cajas: 10,
      stock_unidades: 360,
    },
  ],
  loading: false,
  error: null,
};

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/retornables/hooks/useRetornable", () => ({
  useRetornableReportes: () => ({ ...mockReportesData, refetch: mockReportesRefetch }),
  useRetornableHistorico: () => ({ ...mockHistoricoData, refetch: mockHistoricoRefetch }),
  useRetornableProductos: () => ({ ...mockProductosData, refetch: mockProductosRefetch }),
  useRetornableComparacion: () => ({ ...mockComparacionData, refetch: mockComparacionRefetch }),
  useRetornableDetalleReporte: () => ({ data: null, loading: false, error: null, refetch: vi.fn() }),
}));

vi.mock("@/services/api", () => ({
  api: {
    getProducts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, pages: 0 }),
    crearRetornableReporte: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RetornablesPage />
    </MemoryRouter>
  );
}

describe("RetornablesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockComparacionData = {
      data: {
        ultimo_reporte: {
          id: 1,
          fecha: "2026-08-20T10:00:00",
          realizado_por: "Admin",
          usuario_id: 1,
          observaciones: "Reporte 1",
          es_actual: true,
        },
        reporte_anterior: null,
        lineas_sistema: [],
        lineas_anterior: [],
      },
      loading: false,
      error: null,
    };
  });

  it("renders page header and tabs", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Inventario Retornable" })).toBeInTheDocument();
    expect(screen.getByText("Control de casilleros, cajas vacías y llenas")).toBeInTheDocument();
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
    expect(screen.getByText("Histórico")).toBeInTheDocument();
    expect(screen.getByText("Productos")).toBeInTheDocument();
  });

  it("renders comparison table in Resumen tab by default", () => {
    renderPage();
    expect(screen.getByText(/Reporte actual vs Sistema esperado/i)).toBeInTheDocument();
  });

  it("renders spinner when comparison is loading", () => {
    mockComparacionData = { data: null, loading: true, error: null };
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders error banner when comparison fails", () => {
    mockComparacionData = { data: null, loading: false, error: "Error al cargar comparación" };
    renderPage();
    expect(screen.getByText("Error al cargar comparación")).toBeInTheDocument();
  });

  it("switches to Reportes tab and shows table and pagination", async () => {
    renderPage();
    fireEvent.click(screen.getByDisplayValue("reportes"));

    await waitFor(() => {
      expect(screen.getByText("Reporte 1")).toBeInTheDocument();
    });
  });

  it("switches to Historico tab, uses filters and clears them", async () => {
    renderPage();
    fireEvent.click(screen.getByDisplayValue("historico"));

    await waitFor(() => {
      expect(screen.getByText("VENTA #101")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
    const presentacionSelect = selects[0];
    
    fireEvent.change(presentacionSelect, { target: { value: "222" } });
    
    const dateDesdeInput = screen.getByLabelText("Fecha desde");
    expect(dateDesdeInput).toBeInTheDocument();
    fireEvent.change(dateDesdeInput, { target: { value: "2026-08-01" } });

    expect((presentacionSelect as HTMLSelectElement).value).toBe("222");
    expect((dateDesdeInput as HTMLInputElement).value).toBe("2026-08-01");

    const limpiarBtn = screen.getByText("Limpiar");
    await userEvent.click(limpiarBtn);

    await waitFor(() => {
      expect((presentacionSelect as HTMLSelectElement).value).toBe("");
      expect((dateDesdeInput as HTMLInputElement).value).toBe("");
    });
  });

  it("switches to Productos tab and renders productos asociados", async () => {
    renderPage();
    fireEvent.click(screen.getByDisplayValue("productos"));

    await waitFor(() => {
      expect(screen.getByText("Cerveza Polar 222ml")).toBeInTheDocument();
    });
  });

  it("opens and closes Nuevo Reporte modal", async () => {
    renderPage();
    const nuevoBtn = screen.getAllByRole("button", { name: /Nuevo Reporte/i })[0];
    await userEvent.click(nuevoBtn);

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Reporte de Conteo Físico/i)).toBeInTheDocument();
    });

    const cancelarBtn = screen.getByRole("button", { name: "Cancelar" });
    await userEvent.click(cancelarBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Nuevo Reporte de Conteo Físico/i)).not.toBeInTheDocument();
    });
  });
});
