import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProductsPage from "@/features/products/pages/ProductsPage";
import type { ProductOut } from "@/types/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockToast = vi.fn();
vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

let mockUserRole = "ADMINISTRADOR";
vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, rol_nombre: mockUserRole },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/exportToExcel", () => ({
  exportToExcel: vi.fn(),
}));

const mockProducts: ProductOut[] = [
  {
    id: 1,
    codigo_barra: "001",
    nombre: "Whisky A",
    categories: [{ id: 1, nombre: "Licores", descripcion: null }],
    unidades_por_caja: 12,
    stock_cajas: 0,
    stock_unidades: 50,
    stock_minimo: 5,
    precio_costo_caja_usd: 96,
    precio_costo_usd: 8,
    precio_unidad_usd: 15,
    precio_caja_usd: 150,
    precio_sugerido_unidad_usd: 11.43,
    precio_sugerido_caja_usd: 137.14,
    proveedor_id: 1,
    tipo_iva: "GRAVADO",
    es_favorito: false,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
  {
    id: 2,
    codigo_barra: "002",
    nombre: "Ron B",
    categories: [{ id: 1, nombre: "Licores", descripcion: null }],
    unidades_por_caja: 12,
    stock_cajas: 1,
    stock_unidades: 12,
    stock_minimo: 5,
    precio_costo_caja_usd: 60,
    precio_costo_usd: 5,
    precio_unidad_usd: 10,
    precio_caja_usd: 100,
    precio_sugerido_unidad_usd: 7.14,
    precio_sugerido_caja_usd: 85.71,
    proveedor_id: null,
    tipo_iva: "GRAVADO",
    es_favorito: true,
    precio_divisas_unidad: null,
    precio_divisas_caja: null,
  },
];

vi.mock("@/services/api", () => ({
  api: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    getSuppliers: vi.fn(),
    toggleProductFavorite: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

import { api } from "@/services/api";
import { exportToExcel } from "@/lib/exportToExcel";

import { useProductsStore } from "@/features/products/stores/useProductsStore";

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
    useProductsStore.getState().resetAll();
    mockUserRole = "ADMINISTRADOR";
    mockApi.getCategories.mockResolvedValue([
      { id: 1, nombre: "Licores", descripcion: null },
    ]);
    mockApi.getSuppliers.mockResolvedValue([
      { id: 1, nombre: "Distribuidora Polar", telefono: null, email: null },
    ]);
    mockApi.getProducts.mockResolvedValue({
      items: mockProducts,
      total: 2,
      page: 1,
      page_size: 20,
      pages: 1,
    });
  });

  it("muestra boton de descargar excel solo para admin", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Descargar Excel")).toBeInTheDocument();
    });
  });

  it("exporta todos los productos a excel", async () => {
    mockApi.getProducts
      .mockResolvedValueOnce({ items: mockProducts, total: 1, page: 1, page_size: 20, pages: 1 })
      .mockResolvedValue({ items: mockProducts, total: 1, page: 1, page_size: 200, pages: 1 });
    renderPage();
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(exportToExcel).toHaveBeenCalledWith({
        data: mockProducts,
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "Nombre" }),
          expect.objectContaining({ header: "Código de Barra" }),
          expect.objectContaining({ header: "Categorías" }),
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
      .mockResolvedValue({ items: mockProducts, total: 1, page: 1, page_size: 200, pages: 1 });
    renderPage();
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      const callArgs = (exportToExcel as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const headers = (callArgs.columns as Array<{ header: string }>).map((c) => c.header);
      expect(headers).not.toContain("Precio Sugerido Unidad USD");
      expect(headers).not.toContain("Precio Sugerido Caja USD");
    });
  });

  it("pagina todas las paginas de productos al exportar", async () => {
    const productB: ProductOut = { ...mockProducts[0], id: 3, nombre: "Whisky C" };
    mockApi.getProducts.mockImplementation((params) => {
      if (params?.page_size === 200) {
        return Promise.resolve(
          params?.page === 2
            ? { items: [productB], total: 2, page: 2, page_size: 200, pages: 2 }
            : { items: mockProducts, total: 2, page: 1, page_size: 200, pages: 2 },
        );
      }
      return Promise.resolve({ items: mockProducts, total: 2, page: 1, page_size: 20, pages: 2 });
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Descargar Excel")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Descargar Excel"));
    await waitFor(() => {
      expect(mockApi.getProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 2, page_size: 200 }));
    });
  });

  it("muestra estado vacio cuando no hay productos y permite navegar a crear nuevo", async () => {
    mockApi.getProducts.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, pages: 0 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No hay productos")).toBeInTheDocument();
    });
    const nuevoBtn = screen.getAllByText("Nuevo Producto")[0];
    await userEvent.click(nuevoBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/products/new");
  });

  it("muestra banner de error y reintenta la carga al pulsar reintentar", async () => {
    mockApi.getProducts
      .mockRejectedValueOnce(new Error("Error de conexion"))
      .mockResolvedValueOnce({ items: mockProducts, total: 2, page: 1, page_size: 20, pages: 1 });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Error de conexion")).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Reintentar");
    await userEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Whisky A")).toBeInTheDocument();
    });
  });

  it("permite cambiar entre vista de cuadricula y tabla", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Whisky A")).toBeInTheDocument();
    });

    const tableToggleBtn = screen.getByTitle("Vista tabla");
    await userEvent.click(tableToggleBtn);

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  it("filtra productos por favoritos", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Whisky A")).toBeInTheDocument();
    });

    const favButton = screen.getByTitle("Mostrar solo favoritos");
    await userEvent.click(favButton);

    await waitFor(() => {
      expect(mockApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ es_favorito: true }),
      );
    });
  });

  it("abre el menu de catalogo y navega a combos y reglas de precio", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Catálogo")).toBeInTheDocument();
    });

    const catalogBtn = screen.getByText("Catálogo").closest("button");
    expect(catalogBtn).toBeInTheDocument();
    await userEvent.click(catalogBtn!);

    expect(screen.getByText("Combos")).toBeInTheDocument();
    expect(screen.getByText("Reglas de Precio")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Combos"));
    expect(mockNavigate).toHaveBeenCalledWith("/combos");
  });

  it("abre el modal de edicion rapida al hacer clic en editar", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Whisky A")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole("button", { name: "Editar" });
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Editar Producto")).toBeInTheDocument();
      expect(screen.getByText("Costo caja USD")).toBeInTheDocument();
    });
  });

  it("abre confirmacion de eliminacion y elimina producto", async () => {
    mockApi.deleteProduct.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Whisky A")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Eliminar" });
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/¿Estás seguro de eliminar/i)).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button", { name: "Eliminar" });
    const modalConfirmBtn = buttons[buttons.length - 1];
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(mockApi.deleteProduct).toHaveBeenCalledWith(1);
      expect(mockToast).toHaveBeenCalledWith('Producto "Whisky A" eliminado', "success");
    });
  });

  it("abre drawer de filtros, aplica filtros y luego los limpia", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Filtros")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Filtros"));
    await waitFor(() => {
      expect(screen.getByText("Estado de Stock")).toBeInTheDocument();
    });

    const applyBtn = screen.getByText("Aplicar Filtros");
    await userEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.queryByText("Estado de Stock")).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Filtros"));
    await waitFor(() => {
      expect(screen.getByText("Limpiar")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Limpiar"));
    await waitFor(() => {
      expect(screen.queryByText("Estado de Stock")).not.toBeInTheDocument();
    });
  });

  it("se adapta correctamente para el rol de operador", async () => {
    mockUserRole = "OPERADOR";
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Inventario")).toBeInTheDocument();
      expect(screen.getByText("Consulta el catálogo de productos")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    expect(screen.queryByText("Descargar Excel")).not.toBeInTheDocument();
  });

  it("cambia el ordenamiento desde el select de admin", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Whisky A")).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    const sortSelect = selects.find((sel) =>
      Array.from((sel as HTMLSelectElement).options).some((o) => o.value === "stock_asc"),
    );

    expect(sortSelect).toBeDefined();

    fireEvent.change(sortSelect!, { target: { value: "stock_asc" } });
    await waitFor(() => {
      expect(mockApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ sort_by: "stock", order: "asc" }),
      );
    });
  });
});
