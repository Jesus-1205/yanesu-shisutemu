import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CartPanel from "../../../../features/sales/components/CartPanel";
import type { CartItem, CartTotals } from "../../../../features/sales/store/cartStore";

vi.mock("../../../../features/sales/components/CartItemRow", () => ({
  default: ({ item }: { item: { cartItemId: string; nombre: string } }) => (
    <div data-testid={`cart-item-row-${item.cartItemId}`}>{item.nombre}</div>
  ),
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

const emptyTotals: CartTotals = { monto_exento_usd: 0, base_imponible_usd: 0, monto_iva_usd: 0 };

const breakdownTotals: CartTotals = { monto_exento_usd: 2, base_imponible_usd: 165, monto_iva_usd: 26.4 };

function renderPanel(overrides: Partial<Parameters<typeof CartPanel>[0]> = {}) {
  const props = {
    items: {},
    totals: emptyTotals,
    totalUsd: 0,
    totalVes: 0,
    snapshotTasa: 0,
    itemCount: 0,
    onCheckout: vi.fn(),
    ...overrides,
  };
  render(<CartPanel {...props} />);
  return props;
}

describe("CartPanel", () => {
  it("muestra el total USD prominente", () => {
    renderPanel({ totalUsd: 193.4 });
    expect(screen.getByText("$193,40")).toBeInTheDocument();
  });

  it("muestra total en Bs y la tasa cuando snapshotTasa > 0", () => {
    renderPanel({ totalUsd: 193.4, totalVes: 8800.5, snapshotTasa: 45.5 });
    expect(screen.getByText("Bs 8.800,50")).toBeInTheDocument();
    expect(screen.getByText("Tasa: 45,50")).toBeInTheDocument();
  });

  it("no muestra total en Bs cuando snapshotTasa es 0", () => {
    renderPanel({ totalVes: 8800.5, snapshotTasa: 0 });
    expect(screen.queryByText(/^Bs /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tasa:/)).not.toBeInTheDocument();
  });

  it("muestra desglose exento, base imponible e IVA cuando son mayores a cero", () => {
    renderPanel({ totals: breakdownTotals });
    expect(screen.getByText("Exento")).toBeInTheDocument();
    expect(screen.getByText("$2,00")).toBeInTheDocument();
    expect(screen.getByText("Base imponible")).toBeInTheDocument();
    expect(screen.getByText("$165,00")).toBeInTheDocument();
    expect(screen.getByText("IVA")).toBeInTheDocument();
    expect(screen.getByText("$26,40")).toBeInTheDocument();
  });

  it("no muestra desglose cuando los montos son cero", () => {
    renderPanel();
    expect(screen.queryByText("Exento")).not.toBeInTheDocument();
    expect(screen.queryByText("Base imponible")).not.toBeInTheDocument();
    expect(screen.queryByText("IVA")).not.toBeInTheDocument();
  });

  it("muestra mensaje vacío cuando itemCount es 0", () => {
    renderPanel();
    expect(screen.getByText("Selecciona productos para agregar")).toBeInTheDocument();
  });

  it("renderiza un CartItemRow por item del carrito", () => {
    const items = {
      "1_UNIDAD": makeItem(),
      "2_UNIDAD": makeItem({ cartItemId: "2_UNIDAD", producto_id: 2, nombre: "Pan" }),
    };
    renderPanel({ items, itemCount: 2 });
    expect(screen.getAllByTestId(/^cart-item-row-/)).toHaveLength(2);
    expect(screen.getByTestId("cart-item-row-1_UNIDAD")).toHaveTextContent("Whisky X");
    expect(screen.getByTestId("cart-item-row-2_UNIDAD")).toHaveTextContent("Pan");
    expect(screen.queryByText("Selecciona productos para agregar")).not.toBeInTheDocument();
  });

  it("deshabilita el botón Cobrar cuando no hay items", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /cobrar/i })).toBeDisabled();
  });

  it("habilita Cobrar y llama onCheckout al hacer click cuando hay items", async () => {
    const { onCheckout } = renderPanel({
      items: { "1_UNIDAD": makeItem() },
      itemCount: 1,
    });
    const checkoutButton = screen.getByRole("button", { name: /cobrar/i });
    expect(checkoutButton).toBeEnabled();
    await userEvent.click(checkoutButton);
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });
});
