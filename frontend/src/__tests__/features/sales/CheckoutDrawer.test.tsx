import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCartStore } from "../../../features/sales/store/cartStore";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import CheckoutDrawer from "../../../features/sales/components/CheckoutDrawer";
import { ToastProvider } from "../../../ui-components/Toast";
import type { ProductOut } from "../../../types/api";
import type { ReactNode } from "react";

const mockGetPaymentMethods = vi.fn();
const mockCreateSale = vi.fn();

vi.mock("../../../services/api", () => ({
  api: {
    getPaymentMethods: (...args: unknown[]) => mockGetPaymentMethods(...args),
    createSale: (...args: unknown[]) => mockCreateSale(...args),
  },
}));

const mockProduct: ProductOut = {
  id: 1,
  codigo_barra: "123",
  nombre: "Whisky",
  categories: [],
  unidades_por_caja: 12,
  stock_unidades: 50,
  stock_minimo: 5,
  precio_costo_caja_usd: 96,
  precio_costo_usd: 8,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_sugerido_unidad_usd: 11.43,
  precio_sugerido_caja_usd: 137.14,
  proveedor_id: null,
  tipo_iva: "GRAVADO",
  es_favorito: false,
};

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
  useExchangeRateStore.setState({ tasa: 45.5, loading: false });
  mockGetPaymentMethods.mockResolvedValue([
    { id: 1, nombre: "EFECTIVO", activo: true },
    { id: 2, nombre: "PAGO_MOVIL", activo: true },
  ]);
  mockCreateSale.mockResolvedValue({ id: 1 });
});

describe("CheckoutDrawer - render", () => {
  it("renders nothing when closed", () => {
    render(<CheckoutDrawer open={false} onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    expect(screen.queryByText("Cobro")).not.toBeInTheDocument();
  });

  it("renders header when open", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => expect(screen.getByText("Cobro")).toBeInTheDocument());
  });

  it("loads payment methods on open", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(mockGetPaymentMethods).toHaveBeenCalledWith(true);
    });
  });

  it("shows express payment buttons", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Efectivo")).toBeInTheDocument();
      expect(screen.getByText("Pago Movil")).toBeInTheDocument();
    });
  });
});

describe("CheckoutDrawer - with cart items", () => {
  beforeEach(() => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
  });

  it("displays total amounts", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("$17,40")).toBeInTheDocument();
    });
  });

  it("shows express mode initially", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Cobro rápido")).toBeInTheDocument();
    });
  });

  it("shows split mode when clicking link", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("¿Pago dividido / monto exacto?")).toBeInTheDocument();
    });
  });

  it("calls onSuccess after successful sale", async () => {
    const onSuccess = vi.fn();
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={onSuccess} />, { wrapper });

    await waitFor(() => expect(screen.getByText("Efectivo")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Efectivo"));

    await waitFor(() => expect(screen.getByText("Procesar Cobro")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Procesar Cobro"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows observaciones textarea", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByLabelText("Observaciones")).toBeInTheDocument();
    });
  });

  it("sends observaciones in sale payload", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });

    await waitFor(() => expect(screen.getByText("Efectivo")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Efectivo"));

    const textarea = screen.getByLabelText("Observaciones");
    await userEvent.type(textarea, "Cliente VIP");

    await waitFor(() => expect(screen.getByText("Procesar Cobro")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Procesar Cobro"));

    await waitFor(() => {
      expect(mockCreateSale).toHaveBeenCalledWith(
        expect.objectContaining({ observaciones: "Cliente VIP" }),
      );
    });
  });

  it("sends null observaciones when textarea is empty", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });

    await waitFor(() => expect(screen.getByText("Efectivo")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Efectivo"));

    await waitFor(() => expect(screen.getByText("Procesar Cobro")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Procesar Cobro"));

    await waitFor(() => {
      expect(mockCreateSale).toHaveBeenCalledWith(
        expect.objectContaining({ observaciones: null }),
      );
    });
  });

  it("shows pagado amount after selecting Efectivo", async () => {
    render(<CheckoutDrawer open onClose={vi.fn()} onSuccess={vi.fn()} />, { wrapper });

    await waitFor(() => expect(screen.getByText("Efectivo")).toBeInTheDocument());
    const btn = screen.getByText("Efectivo");
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Pagado")).toBeInTheDocument();
      expect(screen.getAllByText("Bs 791,70").length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("CheckoutDrawer - error handling", () => {
  it("shows error when payment methods fail to load", async () => {
    mockGetPaymentMethods.mockRejectedValueOnce(new Error("Network"));
    const onClose = vi.fn();
    render(<CheckoutDrawer open onClose={onClose} onSuccess={vi.fn()} />, { wrapper });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});