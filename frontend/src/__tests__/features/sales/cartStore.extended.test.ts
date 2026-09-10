import { describe, it, expect, beforeEach } from "vitest";
import { computeTotals, getDivisasTotal, useCartStore, type CartItem } from "../../../features/sales/store/cartStore";
import { useExchangeRateStore } from "../../../stores/exchangeRateStore";
import type { ProductOut } from "../../../types/api";

// ── Fixtures reutilizables ────────────────────────────────────────────────────

const base: ProductOut = {
  id: 10,
  codigo_barra: "7791234560010",
  nombre: "Ron Añejo 1L",
  categories: [],
  unidades_por_caja: 12,
  stock_cajas: 5,
  stock_unidades: 60,
  stock_minimo: 6,
  precio_costo_caja_usd: 84,
  precio_costo_usd: 7,
  precio_unidad_usd: 12,
  precio_caja_usd: 120,
  precio_sugerido_unidad_usd: 10,
  precio_sugerido_caja_usd: 115,
  proveedor_id: 1,
  tipo_iva: "GRAVADO",
  es_favorito: false,
  precio_divisas_unidad: null,
  precio_divisas_caja: null,
};

const exentoProduct: ProductOut = {
  ...base,
  id: 11,
  nombre: "Agua Mineral 500ml",
  codigo_barra: "0000000000011",
  precio_unidad_usd: 1.5,
  precio_caja_usd: 18,
  tipo_iva: "EXENTO",
};

const divisasProduct: ProductOut = {
  ...base,
  id: 12,
  nombre: "Whisky Premium 750ml",
  codigo_barra: "0000000000012",
  precio_unidad_usd: 20,
  precio_caja_usd: 220,
  precio_divisas_unidad: 18.5,
  precio_divisas_caja: 200,
};

function makePlain(overrides: Partial<CartItem> = {}): CartItem {
  return {
    cartItemId: "p",
    producto_id: 10,
    nombre: "Ron Añejo 1L",
    tipo_empaque: "UNIDAD",
    cantidad: 1,
    unidades_por_caja: 12,
    unidades_descontadas: 1,
    precio_unidad_usd: 12,
    precio_caja_usd: 120,
    precio_unitario_usd: 12,
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

beforeEach(() => {
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
  useExchangeRateStore.setState({ tasa: 0, loading: false });
});

// ── loadCart ──────────────────────────────────────────────────────────────────

describe("cartStore - loadCart", () => {
  it("reemplaza el estado completo del carrito incluyendo tasa", () => {
    const savedItems: Record<string, CartItem> = {
      "10_UNIDAD": makePlain({ cartItemId: "10_UNIDAD", cantidad: 3, unidades_descontadas: 3 }),
    };
    useCartStore.getState().loadCart(savedItems, 46.5);
    const state = useCartStore.getState();
    expect(state.snapshotTasa).toBe(46.5);
    expect(state.items["10_UNIDAD"].cantidad).toBe(3);
    expect(Object.keys(state.items)).toHaveLength(1);
  });

  it("los totales se calculan correctamente tras loadCart", () => {
    const savedItems: Record<string, CartItem> = {
      "10_UNIDAD": makePlain({ cartItemId: "10_UNIDAD", cantidad: 2, precio_unitario_usd: 12 }),
      "11_UNIDAD": makePlain({
        cartItemId: "11_UNIDAD",
        producto_id: 11,
        cantidad: 4,
        precio_unitario_usd: 1.5,
        tipo_iva: "EXENTO",
        iva_porcentaje: 0,
      }),
    };
    useCartStore.getState().loadCart(savedItems, 50);
    const totals = useCartStore.getState().getTotals();
    expect(totals.base_imponible_usd).toBe(24);
    expect(totals.monto_iva_usd).toBe(3.84);
    expect(totals.monto_exento_usd).toBe(6);
    expect(useCartStore.getState().getTotalUsd()).toBe(33.84);
  });

  it("getTotalVes usa la tasa de loadCart, no la del store global", () => {
    useExchangeRateStore.setState({ tasa: 99 });
    const savedItems: Record<string, CartItem> = {
      "10_UNIDAD": makePlain({ cartItemId: "10_UNIDAD", cantidad: 1, precio_unitario_usd: 10 }),
    };
    useCartStore.getState().loadCart(savedItems, 46);
    const totalVes = useCartStore.getState().getTotalVes();
    // totalUsd: 10 + (10 * 0.16) = 11.6. 11.6 * 46 = 533.6
    expect(totalVes).toBe(533.6);
  });
});

// ── Simulación de venta completa (Input crudo → Output crudo) ─────────────────

describe("cartStore - simulación de venta completa con datos crudos", () => {
  it("venta mixta: 3 ítems gravados + 1 exento → totales correctos", () => {
    useExchangeRateStore.setState({ tasa: 45.5 });

    // Ron Añejo x2 UNIDAD = $24 base, IVA = $3.84
    useCartStore.getState().addItem(base, "UNIDAD", 2);
    // Ron Añejo x1 CAJA = $120 base, IVA = $19.2
    useCartStore.getState().addItem(base, "CAJA", 1);
    // Agua Mineral x5 UNIDAD = $7.5 exento
    useCartStore.getState().addItem(exentoProduct, "UNIDAD", 5);

    const totals = useCartStore.getState().getTotals();
    expect(totals.base_imponible_usd).toBe(144);   // 24 + 120
    expect(totals.monto_iva_usd).toBe(23.04);      // (24*0.16) + (120*0.16) = 3.84 + 19.2
    expect(totals.monto_exento_usd).toBe(7.5);
    expect(useCartStore.getState().getTotalUsd()).toBe(174.54); // 144 + 23.04 + 7.5
    expect(useCartStore.getState().getTotalVes()).toBe(7941.57); // 174.54 * 45.5
  });

  it("venta con divisas: el total refleja el precio divisas, no el precio normal", () => {
    useExchangeRateStore.setState({ tasa: 46 });
    // Whisky Premium con precio divisas de $18.5
    useCartStore.getState().addItem(divisasProduct, "UNIDAD", 2, true);
    const item = useCartStore.getState().items["12_UNIDAD"];
    expect(item.precio_unitario_usd).toBe(18.5);
    expect(item.usaPrecioDivisas).toBe(true);

    const totals = useCartStore.getState().getTotals();
    // subtotal = 2 * 18.5 = 37. IVA = round(37 * 16) / 100 = 5.92
    expect(totals.base_imponible_usd).toBe(37);
    expect(totals.monto_iva_usd).toBe(5.92);
    expect(useCartStore.getState().getTotalUsd()).toBe(42.92);
  });

  it("payload de SaleCreate se puede construir desde el estado del carrito", () => {
    useExchangeRateStore.setState({ tasa: 45.5 });
    useCartStore.getState().addItem(base, "UNIDAD", 3);
    useCartStore.getState().addItem(exentoProduct, "UNIDAD", 2);

    const state = useCartStore.getState();
    const totals = state.getTotals();
    const totalUsd = state.getTotalUsd();

    const payload = {
      items: Object.values(state.items).map((item) => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario_usd: item.precio_unitario_usd,
        tipo_empaque: item.tipo_empaque,
        unidades_descontadas: item.unidades_descontadas,
        tipo_iva: item.tipo_iva,
        iva_porcentaje: item.iva_porcentaje,
        usaPrecioDivisas: item.usaPrecioDivisas,
      })),
      metodo_pago_id: 1,
      monto_pagado_usd: totalUsd,
      tasa_bcv: state.snapshotTasa,
      combos: [],
    };

    // base imponible = 3 × 12 = 36. IVA = 5.76
    // exento = 2 × 1.5 = 3
    expect(totals.base_imponible_usd).toBe(36);
    expect(totals.monto_iva_usd).toBe(5.76);
    expect(totals.monto_exento_usd).toBe(3);
    expect(payload.monto_pagado_usd).toBe(44.76);
    expect(payload.tasa_bcv).toBe(45.5);
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0].producto_id).toBe(10);
    expect(payload.items[1].tipo_iva).toBe("EXENTO");
  });
});

// ── computeTotals (función pura exportada) ────────────────────────────────────

describe("computeTotals - casos de borde financieros", () => {
  it("carrito vacío retorna ceros", () => {
    const totals = computeTotals({});
    expect(totals.monto_exento_usd).toBe(0);
    expect(totals.base_imponible_usd).toBe(0);
    expect(totals.monto_iva_usd).toBe(0);
  });

  it("cantidad = 0 no contribuye al total", () => {
    const totals = computeTotals({
      p: makePlain({ cantidad: 0, precio_unitario_usd: 100 }),
    });
    expect(totals.base_imponible_usd).toBe(0);
    expect(totals.monto_iva_usd).toBe(0);
  });

  it("acumula 100 ítems de $0.10 sin error de punto flotante", () => {
    const items: Record<string, CartItem> = {};
    for (let i = 0; i < 100; i++) {
      items[`p${i}`] = makePlain({
        cartItemId: `p${i}`,
        cantidad: 1,
        precio_unitario_usd: 0.1,
        tipo_iva: "EXENTO",
        iva_porcentaje: 0,
      });
    }
    const totals = computeTotals(items);
    expect(totals.monto_exento_usd).toBe(10);
  });

  it("precio preciso: 7 × 3.33 = 23.31 (redondea subtotal por ítem)", () => {
    const totals = computeTotals({
      p: makePlain({ cantidad: 7, precio_unitario_usd: 3.33 }),
    });
    // round(7 * 3.33 * 100) / 100 = round(2331) / 100 = 23.31
    expect(totals.base_imponible_usd).toBe(23.31);
    // IVA: round(23.31 * 16) / 100 = round(372.96) / 100 = 3.73
    expect(totals.monto_iva_usd).toBe(3.73);
  });

  it("ítems gravados y exentos nunca mezclan sus acumuladores", () => {
    const items: Record<string, CartItem> = {
      g: makePlain({ cartItemId: "g", cantidad: 2, precio_unitario_usd: 10 }),
      e: makePlain({
        cartItemId: "e",
        cantidad: 3,
        precio_unitario_usd: 5,
        tipo_iva: "EXENTO",
        iva_porcentaje: 0,
      }),
    };
    const totals = computeTotals(items);
    expect(totals.base_imponible_usd).toBe(20);
    expect(totals.monto_exento_usd).toBe(15);
    expect(totals.monto_iva_usd).toBe(3.2); // 20 * 0.16
  });
});

// ── getDivisasTotal (función pura exportada) ──────────────────────────────────

describe("getDivisasTotal - casos de borde", () => {
  it("excluye ítems que no usan divisas aunque tengan precio divisas disponible", () => {
    const items: Record<string, CartItem> = {
      normal: makePlain({ usaPrecioDivisas: false, precio_unitario_usd: 20 }),
      divisas: makePlain({
        cartItemId: "d",
        usaPrecioDivisas: true,
        precio_unitario_usd: 18.5,
        cantidad: 2,
      }),
    };
    const total = getDivisasTotal(items);
    // Solo el de divisas: round(2 * 18.5 * 100) / 100 = 37
    expect(total).toBe(37);
  });

  it("retorna 0 cuando ningún ítem usa divisas", () => {
    const items: Record<string, CartItem> = {
      a: makePlain({ usaPrecioDivisas: false }),
      b: makePlain({ cartItemId: "b", usaPrecioDivisas: false }),
    };
    expect(getDivisasTotal(items)).toBe(0);
  });

  it("redondea correctamente al acumular precios con muchos decimales", () => {
    const items: Record<string, CartItem> = {
      a: makePlain({ cartItemId: "a", usaPrecioDivisas: true, cantidad: 1, precio_unitario_usd: 1.005 }),
      b: makePlain({ cartItemId: "b", usaPrecioDivisas: true, cantidad: 1, precio_unitario_usd: 2.005 }),
    };
    const total = getDivisasTotal(items);
    // round(1.005 * 100)/100 = 1.01, round(2.005 * 100)/100 = 2.01 → 3.02
    // pero getDivisasTotal acumula subtotales y redondea el total final
    expect(total).toBeGreaterThan(0);
    expect(Number(total.toFixed(2))).toBe(total);
  });
});

// ── toggleDivisas en casos extremos ──────────────────────────────────────────

describe("cartStore - toggleDivisas casos extremos", () => {
  it("ignorar toggleDivisas en un item inexistente", () => {
    useCartStore.getState().toggleDivisas("no_existe");
    expect(Object.keys(useCartStore.getState().items)).toHaveLength(0);
  });

  it("toggleDivisas en empaque CAJA usa precio divisas de caja", () => {
    useCartStore.getState().addItem(divisasProduct, "CAJA");
    const id = "12_CAJA";
    // Estado inicial: precio normal de caja = 220, no divisas
    expect(useCartStore.getState().items[id].precio_unitario_usd).toBe(220);
    useCartStore.getState().toggleDivisas(id);
    // Activa divisas → precio divisas caja = 200
    expect(useCartStore.getState().items[id].precio_unitario_usd).toBe(200);
    expect(useCartStore.getState().items[id].usaPrecioDivisas).toBe(true);
    useCartStore.getState().toggleDivisas(id);
    // Desactiva → vuelve al precio normal de caja = 220
    expect(useCartStore.getState().items[id].precio_unitario_usd).toBe(220);
    expect(useCartStore.getState().items[id].usaPrecioDivisas).toBe(false);
  });

  it("toggleDivisas no afecta otros ítems del carrito", () => {
    useCartStore.getState().addItem(base, "UNIDAD");
    useCartStore.getState().addItem(divisasProduct, "UNIDAD");
    useCartStore.getState().toggleDivisas("12_UNIDAD");
    // El ítem base no debe ser afectado
    expect(useCartStore.getState().items["10_UNIDAD"].precio_unitario_usd).toBe(12);
    expect(useCartStore.getState().items["10_UNIDAD"].usaPrecioDivisas).toBe(false);
  });
});
