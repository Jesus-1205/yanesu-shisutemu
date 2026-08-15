import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HoldQueueDrawer from "../../../../features/sales/components/HoldQueueDrawer";
import {
  useHoldQueueStore,
  type HeldCart,
} from "../../../../features/sales/store/holdQueueStore";
import { useCartStore, type CartItem } from "../../../../features/sales/store/cartStore";
import { formatDateTimeVE } from "../../../../lib/utils";

const mockToast = vi.fn();

vi.mock("@/ui-components/Toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cartItemId: "1_UNIDAD",
    producto_id: 1,
    nombre: "Whisky X",
    tipo_empaque: "UNIDAD",
    cantidad: 1,
    unidades_por_caja: 12,
    unidades_descontadas: 1,
    precio_unidad_usd: 15,
    precio_caja_usd: 150,
    precio_unitario_usd: 15,
    iva_porcentaje: 16,
    tipo_iva: "GRAVADO",
    usaPrecioDivisas: false,
    precioDivisasUnidad: null,
    precioDivisasCaja: null,
    combo_id: null,
    comboDetalle: null,
    ...overrides,
  };
}

function makeHeld(overrides: Partial<HeldCart> = {}): HeldCart {
  return {
    id: "h1",
    label: "Venta 01/01 10:30",
    savedAt: "2026-08-15T14:30:00.000Z",
    items: {
      "1_UNIDAD": makeItem(),
      "2_UNIDAD": makeItem({
        cartItemId: "2_UNIDAD",
        producto_id: 2,
        nombre: "Pan",
        tipo_iva: "EXENTO",
        iva_porcentaje: 0,
        precio_unitario_usd: 2,
      }),
    },
    snapshotTasa: 45.5,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useHoldQueueStore.setState({ heldCarts: [] });
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
});

describe("HoldQueueDrawer - render", () => {
  it("muestra EmptyState cuando no hay ventas en espera", () => {
    render(<HoldQueueDrawer open onClose={vi.fn()} />);
    expect(screen.getByText("Sin ventas en espera")).toBeInTheDocument();
  });

  it("renderiza label, fecha, nº de ítems y total USD de cada venta guardada", () => {
    useHoldQueueStore.setState({ heldCarts: [makeHeld()] });
    render(<HoldQueueDrawer open onClose={vi.fn()} />);

    expect(screen.getByText("Venta 01/01 10:30")).toBeInTheDocument();
    expect(
      screen.getByText(formatDateTimeVE("2026-08-15T14:30:00.000Z")),
    ).toBeInTheDocument();
    expect(screen.getByText("2 ítems")).toBeInTheDocument();
    // 15 + 2.4 IVA + 2 exento = 19.4 → "$19,40" (formato es-VE)
    expect(screen.getByText("$19,40")).toBeInTheDocument();
  });

  it("usa singular «ítem» cuando hay una sola línea", () => {
    useHoldQueueStore.setState({
      heldCarts: [makeHeld({ items: { "1_UNIDAD": makeItem() } })],
    });
    render(<HoldQueueDrawer open onClose={vi.fn()} />);
    expect(screen.getByText("1 ítem")).toBeInTheDocument();
  });
});

describe("HoldQueueDrawer - cargar venta", () => {
  it("restaura y cierra cuando el carrito actual está vacío", async () => {
    useHoldQueueStore.setState({ heldCarts: [makeHeld()] });
    useCartStore.setState({ items: {}, snapshotTasa: 0 });
    const onClose = vi.fn();

    render(<HoldQueueDrawer open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /cargar/i }));

    expect(useCartStore.getState().items["1_UNIDAD"]).toBeDefined();
    expect(useCartStore.getState().items["2_UNIDAD"]).toBeDefined();
    expect(useCartStore.getState().snapshotTasa).toBe(45.5);
    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith("Venta cargada", "success");
  });

  it("abre ConfirmDialog de reemplazo cuando el carrito actual tiene items", async () => {
    useHoldQueueStore.setState({ heldCarts: [makeHeld()] });
    useCartStore.setState({
      items: {
        "9_UNIDAD": makeItem({ cartItemId: "9_UNIDAD", producto_id: 9, nombre: "Actual" }),
      },
      snapshotTasa: 10,
    });

    render(<HoldQueueDrawer open onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /cargar/i }));

    expect(screen.getByText("Reemplazar carrito")).toBeInTheDocument();
    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(1);
    expect(useCartStore.getState().items["9_UNIDAD"]).toBeDefined();
  });

  it("al confirmar el reemplazo restaura, cierra y muestra toast", async () => {
    useHoldQueueStore.setState({ heldCarts: [makeHeld()] });
    useCartStore.setState({
      items: {
        "9_UNIDAD": makeItem({ cartItemId: "9_UNIDAD", producto_id: 9, nombre: "Actual" }),
      },
      snapshotTasa: 10,
    });
    const onClose = vi.fn();

    render(<HoldQueueDrawer open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /cargar/i }));
    await userEvent.click(screen.getByRole("button", { name: /reemplazar y cargar/i }));

    expect(useCartStore.getState().items["1_UNIDAD"]).toBeDefined();
    expect(useCartStore.getState().items["9_UNIDAD"]).toBeUndefined();
    expect(useCartStore.getState().snapshotTasa).toBe(45.5);
    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith("Venta cargada", "success");
  });
});

describe("HoldQueueDrawer - eliminar venta", () => {
  it("abre ConfirmDialog de eliminación y al confirmar elimina y muestra toast", async () => {
    useHoldQueueStore.setState({ heldCarts: [makeHeld()] });

    render(<HoldQueueDrawer open onClose={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar Venta 01/01 10:30" }),
    );

    expect(screen.getByText("Eliminar venta en espera")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^eliminar$/i }));

    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(0);
    expect(mockToast).toHaveBeenCalledWith("Venta en espera eliminada", "success");
  });

  it("cancelar la eliminación conserva la venta guardada", async () => {
    useHoldQueueStore.setState({ heldCarts: [makeHeld()] });

    render(<HoldQueueDrawer open onClose={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar Venta 01/01 10:30" }),
    );
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(1);
    expect(mockToast).not.toHaveBeenCalled();
  });
});
