import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProductsPage from "@/features/products/pages/ProductsPage";
import type { ProductOut } from "@/types/api";

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, rol_nombre: "ADMINISTRADOR" },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

const mockProducts: ProductOut[] = [
  {
    id: 1, codigo_barra: "001", nombre: "Whisky A",
    categories: [{ id: 1, nombre: "Licores", descripcion: null }],
    unidades_por_caja: 12, stock_cajas: 0, stock_unidades: 50, stock_minimo: 5,
    precio_costo_caja_usd: 96, precio_costo_usd: 8,
    precio_unidad_usd: 15, precio_caja_usd: 150,
    precio_sugerido_unidad_usd: 11.43, precio_sugerido_caja_usd: 137.14,
    proveedor_id: null, tipo_iva: "GRAVADO", es_favorito: false,
    precio_divisas_unidad: null, precio_divisas_caja: null,
  },
];

vi.mock("@/services/api", () => ({
  api: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    getSuppliers: vi.fn(),
  },
}));

import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";

const mockApi = vi.mocked(api);

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>
  );
}

describe("ProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getCategories.mockResolvedValue([]);
    mockApi.getSuppliers.mockResolvedValue([]);
  });

  it("muestra boton de descargar excel solo para admin", async () => {
    mockApi.getProducts.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, pages: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Descargar Excel")).toBeInTheDocument();
    });
  });

  it("exporta todos los productos a excel", async () => {
    mockApi.getProducts
      .mockResolvedValueOnce({ items: mockProducts, total: 1, page: 1, page_size: 20, pages: 1 })
      .mockResolvedValueOnce({ items: mockProducts, total: 1, page: 1, page_size: 999999, pages: 1 });
    renderPage();
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(exportToExcel).toHaveBeenCalledWith({
        data: mockProducts,
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "ID" }),
          expect.objectContaining({ header: "Nombre" }),
          expect.objectContaining({ header: "Codigo de Barra" }),
          expect.objectContaining({ header: "Categorias" }),
          expect.objectContaining({ header: "Stock (uds)" }),
          expect.objectContaining({ header: "Precio Unidad USD" }),
          expect.objectContaining({ header: "Tipo IVA" }),
        ]),
        filename: "Productos",
      });
    });
  });

  it("no incluye precio sugerido en la exportacion", async () => {
    mockApi.getProducts
      .mockResolvedValueOnce({ items: mockProducts, total: 1, page: 1, page_size: 20, pages: 1 })
      .mockResolvedValueOnce({ items: mockProducts, total: 1, page: 1, page_size: 999999, pages: 1 });
    renderPage();
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      const callArgs = (exportToExcel as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const headers = callArgs.columns.map((c: { header: string }) => c.header);
      expect(headers).not.toContain("Precio Sugerido Unidad USD");
      expect(headers).not.toContain("Precio Sugerido Caja USD");
    });
  });
});
