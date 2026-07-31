import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CartItemRow from "../../../features/sales/components/CartItemRow";
import { useCartStore } from "../../../features/sales/store/cartStore";
import type { CartItem } from "../../../features/sales/store/cartStore";

vi.mock("../../../services/api", () => ({ api: {} }));

const baseItem: CartItem = {
  cartItemId: "1_UNIDAD",
  producto_id: 1,
  nombre: "Whisky X",
  tipo_empaque: "UNIDAD",
  cantidad: 2,
  unidades_por_caja: 12,
  unidades_descontadas: 2,
  precio_unidad_usd: 15,
  precio_caja_usd: 150,
  precio_unitario_usd: 15,
  iva_porcentaje: 16,
  tipo_iva: "GRAVADO",
};

beforeEach(() => {
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
});

describe("CartItemRow", () => {
  it("renders product name and price", () => {
    render(<CartItemRow item={baseItem} />);
    expect(screen.getByText("Whisky X")).toBeInTheDocument();
    expect(screen.getByText("$30,00")).toBeInTheDocument();
  });

  it("calls updateQuantity when clicking plus button", async () => {
    useCartStore.setState({
      items: { "1_UNIDAD": baseItem },
      snapshotTasa: 0,
    });
    const spy = vi.spyOn(useCartStore.getState(), "updateQuantity");
    render(<CartItemRow item={useCartStore.getState().items["1_UNIDAD"]} />);
    const buttons = screen.getAllByRole("button");
    const plusBtn = buttons.find(b => b.querySelector(".lucide-plus"))!;
    await userEvent.click(plusBtn);
    expect(spy).toHaveBeenCalledWith("1_UNIDAD", 3);
  });

  it("calls updateQuantity when clicking minus button", async () => {
    useCartStore.setState({
      items: { "1_UNIDAD": baseItem },
      snapshotTasa: 0,
    });
    const spy = vi.spyOn(useCartStore.getState(), "updateQuantity");
    render(<CartItemRow item={useCartStore.getState().items["1_UNIDAD"]} />);
    const buttons = screen.getAllByRole("button");
    const minusBtn = buttons.find(b => b.querySelector(".lucide-minus"))!;
    await userEvent.click(minusBtn);
    expect(spy).toHaveBeenCalledWith("1_UNIDAD", 1);
  });

  it("calls removeItem when delete is clicked", async () => {
    const spy = vi.spyOn(useCartStore.getState(), "removeItem");
    render(<CartItemRow item={baseItem} />);
    await userEvent.click(screen.getByTitle("Eliminar"));
    expect(spy).toHaveBeenCalledWith("1_UNIDAD");
  });

  it("calls updateEmpaque when empaque changes", async () => {
    const spy = vi.spyOn(useCartStore.getState(), "updateEmpaque");
    render(<CartItemRow item={baseItem} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "CAJA");
    expect(spy).toHaveBeenCalledWith("1_UNIDAD", "CAJA");
  });

  it("shows unidades_descontadas for CAJA empaque", () => {
    const cajaItem: CartItem = {
      ...baseItem, tipo_empaque: "CAJA", cantidad: 2,
      unidades_descontadas: 24, precio_unitario_usd: 150,
    };
    render(<CartItemRow item={cajaItem} />);
    expect(screen.getByText(/24\s*unds/)).toBeInTheDocument();
  });

  it("shows IVA percentage", () => {
    render(<CartItemRow item={baseItem} />);
    expect(screen.getByText(/IVA\s*16%/)).toBeInTheDocument();
  });
});