import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import POSPage from "../../../features/sales/pages/POSPage";
import { api } from "../../../services/api";
import { ToastProvider } from "../../../ui-components/Toast";
import { useCartStore } from "../../../features/sales/store/cartStore";
import { useHoldQueueStore } from "../../../features/sales/store/holdQueueStore";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import type { ProductOut, ComboActiveOut, ExchangeRatesResponse } from "../../../types/api";

const mockUser = {
  id: 1,
  username: "cajero",
  email: "cajero@yanesu.com",
  nombre_completo: "Cajero Principal",
  rol_id: 2,
  rol_nombre: "VENDEDOR",
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
  id: 10,
  codigo_barra: "1234567890",
  nombre: "Cerveza Polar 330ml",
  categories: [],
  unidades_por_caja: 24,
  stock_cajas: 10,
  stock_unidades: 240,
  stock_minimo: 5,
  precio_costo_caja_usd: 20,
  precio_costo_usd: 0.83,
  precio_unidad_usd: 1.5,
  precio_caja_usd: 30,
  precio_sugerido_unidad_usd: 1.5,
  precio_sugerido_caja_usd: 30,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: true,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

const mockCombo: ComboActiveOut = {
  id: 1,
  nombre: "Combo Parrillero",
  precio_total_usd: 18,
  metodo_pago_ids: [1],
  groups: [
    {
      id: 5,
      nombre: "Bebidas",
      min_cantidad: 1,
      max_cantidad: 1,
      productos: [{ producto_id: 10, nombre: "Cerveza Polar 330ml", precio_unidad_usd: 1.5 }],
    },
  ],
};

const mockRatesResponse: ExchangeRatesResponse = {
  rates: { USD: "45.0", EUR: "48.0" },
  fecha_ultima_actualizacion: "2026-09-14",
};

function renderPOS() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <POSPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("POSPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useCartStore.setState({ items: {}, snapshotTasa: 0 });
    useHoldQueueStore.setState({ heldCarts: [] });
    useExchangeRateStore.setState({ tasa: 45.0, loading: false });

    vi.spyOn(api, "getFavoriteProducts").mockResolvedValue({
      items: [mockProduct],
      total: 1,
      page: 1,
      page_size: 10,
      pages: 1,
    });
    vi.spyOn(api, "getProducts").mockResolvedValue({
      items: [mockProduct],
      total: 1,
      page: 1,
      page_size: 100,
      pages: 1,
    });
    vi.spyOn(api, "getActiveCombos").mockResolvedValue([mockCombo]);
    vi.spyOn(api, "getPaymentMethods").mockResolvedValue([
      { id: 1, nombre: "Efectivo USD", moneda_default: "USD", acepta_referencia: false, activo: true },
    ]);
    vi.spyOn(api, "getLatestRates").mockResolvedValue(mockRatesResponse);
  });

  it("renders page header, search bar, products, combos and cart panel", async () => {
    renderPOS();

    expect(screen.getByText("Punto de Venta")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar productos o escanear/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Cerveza Polar 330ml")).toBeInTheDocument();
      expect(screen.getByText("Promociones (1)")).toBeInTheDocument();
    });
  });

  it("toggles promotions dropdown and adds combo quickly", async () => {
    vi.spyOn(api, "calculateSale").mockResolvedValue({
      total_usd: 18,
      total_divisas_usd: 18,
      total_normal_usd: 18,
      ahorro_usd: 0,
      metodos_divisas_disponibles: [1],
      items: [],
      combo_items: [],
    });

    renderPOS();

    await waitFor(() => {
      expect(screen.getByText("Promociones (1)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Promociones (1)"));

    await waitFor(() => {
      expect(screen.getByText("Combo Parrillero")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Combo Parrillero"));

    await waitFor(() => {
      expect(Object.keys(useCartStore.getState().items).length).toBe(1);
    });
  });

  it("adds unit product to cart when clicking product card and adds box with CAJA button", async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText("Cerveza Polar 330ml")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cerveza Polar 330ml"));

    expect(useCartStore.getState().items["10_UNIDAD"]).toBeDefined();
    expect(useCartStore.getState().items["10_UNIDAD"].cantidad).toBe(1);

    const cajaBtn = screen.getByRole("button", { name: /CAJA/i });
    fireEvent.click(cajaBtn);

    expect(useCartStore.getState().items["10_CAJA"]).toBeDefined();
    expect(useCartStore.getState().items["10_CAJA"].cantidad).toBe(1);
  });

  it("saves sale into hold queue with custom note", async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText("Cerveza Polar 330ml")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cerveza Polar 330ml"));

    const holdButton = screen.getByRole("button", { name: "Guardar" });
    fireEvent.click(holdButton);

    expect(screen.getByText("Guardar venta")).toBeInTheDocument();

    const noteInput = screen.getByPlaceholderText("Cliente");
    fireEvent.change(noteInput, { target: { value: "Mesa 4" } });

    const guardarButtons = screen.getAllByRole("button", { name: "Guardar" });
    fireEvent.click(guardarButtons[1]);

    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(1);
    expect(useHoldQueueStore.getState().heldCarts[0].label).toBe("Mesa 4");
    expect(Object.keys(useCartStore.getState().items)).toHaveLength(0);
  });

  it("opens checkout drawer when cart has items and rate is present", async () => {
    renderPOS();

    await waitFor(() => {
      expect(screen.getByText("Cerveza Polar 330ml")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cerveza Polar 330ml"));

    const cobrarButton = screen.getByRole("button", { name: /Cobrar/i });
    fireEvent.click(cobrarButton);

    await waitFor(() => {
      expect(screen.getByText("Cobro")).toBeInTheDocument();
    });
  });

  it("filters products by search input text", async () => {
    renderPOS();
    await waitFor(() => {
      expect(screen.getByText("Cerveza Polar 330ml")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar productos o escanear/);
    await userEvent.type(searchInput, "Polar");

    await waitFor(() => {
      expect(api.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Polar" }),
      );
    });
  });

  it("toggles hide no stock filter", async () => {
    renderPOS();
    await waitFor(() => {
      expect(screen.getByText("Cerveza Polar 330ml")).toBeInTheDocument();
    });

    const toggle = screen.getByRole("checkbox", { name: /Ocultar sin stock/i });
    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
  });
});
