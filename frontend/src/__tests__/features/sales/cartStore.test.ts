import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "../../../features/sales/store/cartStore";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import type { ProductOut } from "../../../types/api";

const mockProduct: ProductOut = {
  id: 1,
  codigo_barra: "7791234567890",
  nombre: "Whisky X 750ml",
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

const mockExento: ProductOut = {
  ...mockProduct,
  id: 2,
  nombre: "Pan",
  codigo_barra: "123456789",
  precio_costo_caja_usd: 12,
  precio_costo_usd: 1,
  precio_unidad_usd: 2,
  precio_caja_usd: 20,
  precio_sugerido_unidad_usd: 1.43,
  precio_sugerido_caja_usd: 17.14,
  tipo_iva: "EXENTO",
};

beforeEach(() => {
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
  useExchangeRateStore.setState({ tasa: 0, loading: false });
});

describe("cartStore - addItem", () => {
  it("creates a new entry with composite cartItemId", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    const items = useCartStore.getState().items;
    expect(items["1_UNIDAD"]).toBeDefined();
    expect(items["1_UNIDAD"].cantidad).toBe(1);
    expect(items["1_UNIDAD"].tipo_empaque).toBe("UNIDAD");
    expect(items["1_UNIDAD"].precio_unitario_usd).toBe(15);
    expect(items["1_UNIDAD"].unidades_descontadas).toBe(1);
  });

  it("merges when same product and empaque already exist", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    const items = useCartStore.getState().items;
    expect(Object.keys(items).length).toBe(1);
    expect(items["1_UNIDAD"].cantidad).toBe(2);
    expect(items["1_UNIDAD"].unidades_descontadas).toBe(2);
  });

  it("creates separate entries for different empaque types", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().addItem(mockProduct, "CAJA");
    const items = useCartStore.getState().items;
    expect(Object.keys(items).length).toBe(2);
    expect(items["1_UNIDAD"]).toBeDefined();
    expect(items["1_CAJA"]).toBeDefined();
    expect(items["1_UNIDAD"].cantidad).toBe(1);
    expect(items["1_CAJA"].cantidad).toBe(1);
    expect(items["1_CAJA"].unidades_descontadas).toBe(12);
  });

  it("snapshots tasa on first item", () => {
    useExchangeRateStore.setState({ tasa: 45.5 });
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    expect(useCartStore.getState().snapshotTasa).toBe(45.5);
  });

  it("does not update snapshot on subsequent items", () => {
    useExchangeRateStore.setState({ tasa: 45.5 });
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useExchangeRateStore.setState({ tasa: 50.0 });
    useCartStore.getState().addItem(mockExento, "UNIDAD");
    expect(useCartStore.getState().snapshotTasa).toBe(45.5);
  });

  it("re-snapshots after clearCart", () => {
    useExchangeRateStore.setState({ tasa: 45.5 });
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().clearCart();
    useExchangeRateStore.setState({ tasa: 60.0 });
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    expect(useCartStore.getState().snapshotTasa).toBe(60.0);
  });
});

describe("cartStore - updateQuantity", () => {
  it("updates quantity and recalculates unidades_descontadas", () => {
    useCartStore.getState().addItem(mockProduct, "CAJA");
    useCartStore.getState().updateQuantity("1_CAJA", 3);
    const item = useCartStore.getState().items["1_CAJA"];
    expect(item.cantidad).toBe(3);
    expect(item.unidades_descontadas).toBe(36);
  });

  it("removes item when quantity <= 0", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().updateQuantity("1_UNIDAD", 0);
    expect(useCartStore.getState().items["1_UNIDAD"]).toBeUndefined();
  });
});

describe("cartStore - updateEmpaque", () => {
  it("switches empaque and recalculates", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().updateEmpaque("1_UNIDAD", "CAJA");
    const state = useCartStore.getState().items;
    expect(state["1_CAJA"]).toBeDefined();
    expect(state["1_UNIDAD"]).toBeUndefined();
    expect(state["1_CAJA"].tipo_empaque).toBe("CAJA");
    expect(state["1_CAJA"].precio_unitario_usd).toBe(150);
    expect(state["1_CAJA"].unidades_descontadas).toBe(12);
  });

  it("merges with existing entry of target empaque", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().addItem(mockProduct, "CAJA");
    useCartStore.getState().updateEmpaque("1_UNIDAD", "CAJA");
    const state2 = useCartStore.getState().items;
    expect(Object.keys(state2).length).toBe(1);
    expect(state2["1_CAJA"].cantidad).toBe(2);
    expect(state2["1_CAJA"].unidades_descontadas).toBe(24);
  });

  it("does nothing if empaque is the same", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().updateEmpaque("1_UNIDAD", "UNIDAD");
    expect(Object.keys(useCartStore.getState().items).length).toBe(1);
  });

  it("does nothing for non-existent item", () => {
    useCartStore.getState().updateEmpaque("999_CAJA", "UNIDAD");
    expect(Object.keys(useCartStore.getState().items).length).toBe(0);
  });
});

describe("cartStore - removeItem", () => {
  it("removes the correct item by cartItemId", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().addItem(mockExento, "UNIDAD");
    useCartStore.getState().removeItem("1_UNIDAD");
    const items = useCartStore.getState().items;
    expect(items["1_UNIDAD"]).toBeUndefined();
    expect(items["2_UNIDAD"]).toBeDefined();
  });
});

describe("cartStore - clearCart", () => {
  it("resets items and snapshotTasa", () => {
    useExchangeRateStore.setState({ tasa: 45.5 });
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    useCartStore.getState().clearCart();
    expect(Object.keys(useCartStore.getState().items).length).toBe(0);
    expect(useCartStore.getState().snapshotTasa).toBe(0);
  });
});

describe("cartStore - totals", () => {
  it("computes monto_exento_usd correctly", () => {
    useCartStore.getState().addItem(mockExento, "UNIDAD");
    const totals = useCartStore.getState().getTotals();
    expect(totals.monto_exento_usd).toBe(2);
    expect(totals.base_imponible_usd).toBe(0);
    expect(totals.monto_iva_usd).toBe(0);
  });

  it("computes IVA for GRAVADO items at 16%", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    const totals = useCartStore.getState().getTotals();
    expect(totals.monto_exento_usd).toBe(0);
    expect(totals.base_imponible_usd).toBe(15);
    expect(totals.monto_iva_usd).toBe(2.4); // 15 * 0.16
  });

  it("computes mixed totals correctly", () => {
    useCartStore.getState().addItem(mockExento, "UNIDAD");  // $2 exento
    useCartStore.getState().addItem(mockProduct, "UNIDAD"); // $15 gravado + $2.4 IVA
    useCartStore.getState().addItem(mockProduct, "CAJA");   // $150 gravado + $24 IVA
    const totals = useCartStore.getState().getTotals();
    expect(totals.monto_exento_usd).toBe(2);
    expect(totals.base_imponible_usd).toBe(165);
    expect(totals.monto_iva_usd).toBe(26.4);
    expect(useCartStore.getState().getTotalUsd()).toBe(193.4);
  });

  it("returns 0 for getTotalVes when no snapshot", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    expect(useCartStore.getState().getTotalVes()).toBe(0);
  });

  it("computes getTotalVes using snapshotTasa", () => {
    useExchangeRateStore.setState({ tasa: 45.5 });
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    const totalVes = useCartStore.getState().getTotalVes();
    // totalUsd = 15 + 2.4 = 17.4. 17.4 * 45.5 = 791.7
    expect(totalVes).toBe(791.7);
  });
});
