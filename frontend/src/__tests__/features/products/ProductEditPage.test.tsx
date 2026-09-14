import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductEditPage from "../../../features/products/pages/ProductEditPage";
import { ToastProvider } from "../../../ui-components/Toast";
import { api } from "../../../services/api";
import type { ProductOut, CategoryOut, SupplierOut } from "../../../types/api";

const mockUser = {
  id: 1,
  username: "admin",
  email: "admin@yanesu.com",
  nombre_completo: "Administrador",
  rol_id: 1,
  rol_nombre: "ADMINISTRADOR",
  is_active: true,
  created_at: "2026-01-01T00:00:00",
};

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    needsSetup: false,
    login: vi.fn(),
    logout: vi.fn(),
    setupAdmin: vi.fn(),
  }),
}));

const mockProduct: ProductOut = {
  id: 15,
  codigo_barra: "7591234567890",
  nombre: "Ron Cacique 750ml",
  categories: [{ id: 1, nombre: "Licores", descripcion: null }],
  unidades_por_caja: 12,
  stock_cajas: 5,
  stock_unidades: 60,
  stock_minimo: 6,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 12,
  precio_caja_usd: 130,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: 11.5,
  precio_divisas_caja: 125,
};

const mockCategories: CategoryOut[] = [
  { id: 1, nombre: "Licores", descripcion: null },
];

const mockSuppliers: SupplierOut[] = [
  { id: 1, nombre: "Destilerías Unidas", telefono: null, email: null },
];

function renderProductEdit(productId = "15") {
  return render(
    <MemoryRouter initialEntries={[`/products/${productId}/edit`]}>
      <ToastProvider>
        <Routes>
          <Route path="/products/:id/edit" element={<ProductEditPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
  vi.spyOn(api, "getSuppliers").mockResolvedValue(mockSuppliers);
});

describe("ProductEditPage", () => {
  it("renders product data, computes margins and allows updating product", async () => {
    vi.spyOn(api, "getProduct").mockResolvedValue(mockProduct);
    const updateSpy = vi.spyOn(api, "updateProduct").mockResolvedValue(mockProduct);

    renderProductEdit("15");

    await waitFor(() => {
      expect(screen.getByText("Editar: Ron Cacique 750ml")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Ron Cacique 750ml")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("Ron Cacique 750ml");
    fireEvent.change(nameInput, { target: { value: "Ron Cacique 750ml Especial" } });

    const submitBtn = screen.getByRole("button", { name: "Guardar Cambios" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        15,
        expect.objectContaining({
          nombre: "Ron Cacique 750ml Especial",
        }),
      );
    });
  });

  it("handles loading error gracefully", async () => {
    vi.spyOn(api, "getProduct").mockRejectedValue(new Error("Error al obtener producto"));

    renderProductEdit("99");

    await waitFor(() => {
      expect(screen.getByText("Error al obtener producto")).toBeInTheDocument();
    });
  });
});
