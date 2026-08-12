import { describe, it, expect, beforeEach } from "vitest";
import { computeTotals, getDivisasTotal, useCartStore, type CartItem } from "../../../features/sales/store/cartStore";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import type { ProductOut } from "../../../types/api";

const mockProduct: ProductOut = {
  id: 1,
  codigo_barra: "7791234567890",
  nombre: "Whisky X 750ml",
  categories: [],
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
  proveedor_id: null,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
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

const mockDivisas: ProductOut = {
  ...mockProduct,
  id: 3,
  nombre: "Ron X 1L",
  precio_divisas_unidad: 14,
  precio_divisas_caja: 140,
};

const mockDivisasUnidadOnly: ProductOut = {
  ...mockProduct,
  id: 4,
  nombre: "Gin X 700ml",
  precio_divisas_unidad: 9.5,
  precio_divisas_caja: null,
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

function makeComboItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cartItemId: "combo_9",
    producto_id: 0,
    nombre: "Combo 6-pack",
    tipo_empaque: "UNIDAD",
    cantidad: 1,
    unidades_por_caja: 1,
    unidades_descontadas: 6,
    precio_unidad_usd: 10,
    precio_caja_usd: 0,
    precio_unitario_usd: 10,
    iva_porcentaje: 0,
    tipo_iva: "EXENTO",
    usaPrecioDivisas: true,
    precioDivisasUnidad: null,
    precioDivisasCaja: null,
    combo_id: 9,
    comboDetalle: {
      nombre: "Combo 6-pack",
      productos: [
        {
          producto_id: 3,
          nombre: "Cerveza",
          tipo_iva: "GRAVADO",
          cantidad: 6,
          precio_unitario: 1.67,
        },
      ],
      metodo_pago_ids: [],
    },
    ...overrides,
  };
}

describe("cartStore - totals con combos", () => {
  it("cobra el precio total del combo, no la suma de constituyentes", () => {
    // El combo se vende como unidad a su precio total ($10), aunque los
    // constituyentes sumen 6 × 1.67 = 10.02 tras el reparto de precio.
    const totals = computeTotals({ combo_9: makeComboItem() });
    expect(totals.monto_exento_usd).toBe(10);
    expect(totals.base_imponible_usd).toBe(0);
    expect(totals.monto_iva_usd).toBe(0);
  });

  it("getDivisasTotal usa el precio total del combo", () => {
    const total = getDivisasTotal({ combo_9: makeComboItem() });
    expect(total).toBe(10);
  });

  it("getDivisasTotal redondea por ítem", () => {
    const items = {
      a: makeComboItem({
        cartItemId: "a",
        cantidad: 1,
        precio_unitario_usd: 1.67,
        combo_id: null,
        comboDetalle: null,
      }),
      b: makeComboItem({
        cartItemId: "b",
        cantidad: 3,
        precio_unitario_usd: 1.67,
        combo_id: null,
        comboDetalle: null,
      }),
    };
    // 1 × 1.67 = 1.67 y 3 × 1.67 = 5.01 → total 6.68
    const total = getDivisasTotal(items);
    expect(total).toBe(6.68);
  });
});

function makePlainItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cartItemId: "x",
    producto_id: 1,
    nombre: "Item",
    tipo_empaque: "UNIDAD",
    cantidad: 1,
    unidades_por_caja: 1,
    unidades_descontadas: 1,
    precio_unidad_usd: 1,
    precio_caja_usd: 1,
    precio_unitario_usd: 1,
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

describe("cartStore - addItem con divisas", () => {
  it("usa precio divisas cuando se solicita y el producto tiene precio divisas", () => {
    useCartStore.getState().addItem(mockDivisas, "UNIDAD", 1, true);
    const item = useCartStore.getState().items["3_UNIDAD"];
    expect(item.usaPrecioDivisas).toBe(true);
    expect(item.precio_unitario_usd).toBe(14);
  });

  it("ignora el flag divisas cuando no existe precio divisas", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD", 1, true);
    const item = useCartStore.getState().items["1_UNIDAD"];
    expect(item.usaPrecioDivisas).toBe(false);
    expect(item.precio_unitario_usd).toBe(15);
  });
});

describe("cartStore - updateEmpaque con divisas", () => {
  it("preserva usaPrecioDivisas si el nuevo empaque tiene precio divisas", () => {
    useCartStore.getState().addItem(mockDivisas, "UNIDAD", 1, true);
    useCartStore.getState().updateEmpaque("3_UNIDAD", "CAJA");
    const item = useCartStore.getState().items["3_CAJA"];
    expect(item).toBeDefined();
    expect(item.tipo_empaque).toBe("CAJA");
    expect(item.usaPrecioDivisas).toBe(true);
    expect(item.precio_unitario_usd).toBe(140);
    expect(item.unidades_descontadas).toBe(12);
  });

  it("cae al precio normal si el nuevo empaque no tiene precio divisas", () => {
    useCartStore.getState().addItem(mockDivisasUnidadOnly, "UNIDAD", 1, true);
    useCartStore.getState().updateEmpaque("4_UNIDAD", "CAJA");
    const item = useCartStore.getState().items["4_CAJA"];
    expect(item.usaPrecioDivisas).toBe(false);
    expect(item.precio_unitario_usd).toBe(150);
    expect(item.unidades_descontadas).toBe(12);
  });
});

describe("cartStore - toggleDivisas", () => {
  it("alterna entre precio normal y precio divisas", () => {
    useCartStore.getState().addItem(mockDivisas, "UNIDAD");
    const id = "3_UNIDAD";

    expect(useCartStore.getState().items[id].usaPrecioDivisas).toBe(false);
    expect(useCartStore.getState().items[id].precio_unitario_usd).toBe(15);

    useCartStore.getState().toggleDivisas(id);
    expect(useCartStore.getState().items[id].usaPrecioDivisas).toBe(true);
    expect(useCartStore.getState().items[id].precio_unitario_usd).toBe(14);

    useCartStore.getState().toggleDivisas(id);
    expect(useCartStore.getState().items[id].usaPrecioDivisas).toBe(false);
    expect(useCartStore.getState().items[id].precio_unitario_usd).toBe(15);
  });

  it("alterna empaque CAJA usando el precio divisas de caja", () => {
    useCartStore.getState().addItem(mockDivisas, "CAJA");
    const id = "3_CAJA";
    useCartStore.getState().toggleDivisas(id);
    expect(useCartStore.getState().items[id].usaPrecioDivisas).toBe(true);
    expect(useCartStore.getState().items[id].precio_unitario_usd).toBe(140);
  });

  it("no cambia nada cuando el item no tiene precio divisas", () => {
    useCartStore.getState().addItem(mockProduct, "UNIDAD");
    const id = "1_UNIDAD";
    useCartStore.getState().toggleDivisas(id);
    const item = useCartStore.getState().items[id];
    expect(item.usaPrecioDivisas).toBe(false);
    expect(item.precio_unitario_usd).toBe(15);
  });
});

describe("computeTotals - redondeo a 2 decimales", () => {
  it("redondea 0.1 + 0.2 a 0.3 (evita errores de punto flotante)", () => {
    const totals = computeTotals({
      a: makePlainItem({ cartItemId: "a", cantidad: 1, precio_unitario_usd: 0.1 }),
      b: makePlainItem({ cartItemId: "b", cantidad: 1, precio_unitario_usd: 0.2 }),
    });
    expect(totals.base_imponible_usd).toBe(0.3);
    // IVA por ítem: round(0.1*16)/100 = 0.02 y round(0.2*16)/100 = 0.03 → 0.05
    expect(totals.monto_iva_usd).toBe(0.05);
  });

  it("redondea el subtotal por ítem: 3 × 1.67 = 5.01", () => {
    const totals = computeTotals({
      a: makePlainItem({ cartItemId: "a", cantidad: 3, precio_unitario_usd: 1.67 }),
    });
    expect(totals.base_imponible_usd).toBe(5.01);
    // IVA: round(5.01 * 16) / 100 = 0.8
    expect(totals.monto_iva_usd).toBe(0.8);
  });

  it("redondea montos exentos acumulados con 0.1", () => {
    const totals = computeTotals({
      a: makePlainItem({
        cartItemId: "a",
        cantidad: 3,
        precio_unitario_usd: 0.1,
        tipo_iva: "EXENTO",
        iva_porcentaje: 0,
      }),
    });
    expect(totals.monto_exento_usd).toBe(0.3);
    expect(totals.base_imponible_usd).toBe(0);
    expect(totals.monto_iva_usd).toBe(0);
  });
});
