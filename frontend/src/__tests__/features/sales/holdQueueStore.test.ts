import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useHoldQueueStore,
  heldCartTotalUsd,
  heldCartItemCount,
  MAX_HOLDS,
  type HeldCart,
} from "../../../features/sales/store/holdQueueStore";
import { useCartStore, type CartItem } from "../../../features/sales/store/cartStore";

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

beforeEach(() => {
  localStorage.clear();
  useHoldQueueStore.setState({ heldCarts: [] });
  useCartStore.setState({ items: {}, snapshotTasa: 0 });
});

describe("holdQueueStore - holdCurrentCart", () => {
  it("devuelve false con carrito vacío y no agrega nada", () => {
    const result = useHoldQueueStore.getState().holdCurrentCart();
    expect(result).toBe(false);
    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(0);
  });

  it("hace snapshot de items y tasa, limpia el carrito e inserta al inicio", () => {
    useCartStore.setState({
      items: { "1_UNIDAD": makePlainItem({ cartItemId: "1_UNIDAD" }) },
      snapshotTasa: 45.5,
    });

    const result = useHoldQueueStore.getState().holdCurrentCart("Mi venta");

    expect(result).toBe(true);
    const held = useHoldQueueStore.getState().heldCarts[0];
    expect(held.label).toBe("Mi venta");
    expect(held.items["1_UNIDAD"]).toBeDefined();
    expect(held.snapshotTasa).toBe(45.5);
    expect(useCartStore.getState().items).toEqual({});
    expect(useCartStore.getState().snapshotTasa).toBe(0);
  });

  it("inserta la venta más reciente al inicio de la lista", () => {
    useCartStore.setState({ items: { a: makePlainItem({ cartItemId: "a" }) }, snapshotTasa: 1 });
    useHoldQueueStore.getState().holdCurrentCart("Primera");
    useCartStore.setState({ items: { b: makePlainItem({ cartItemId: "b" }) }, snapshotTasa: 2 });
    useHoldQueueStore.getState().holdCurrentCart("Segunda");

    const held = useHoldQueueStore.getState().heldCarts;
    expect(held).toHaveLength(2);
    expect(held[0].label).toBe("Segunda");
    expect(held[1].label).toBe("Primera");
  });

  it("usa label por defecto con formato Venta dd/mm hh:mm", () => {
    useCartStore.setState({ items: { a: makePlainItem({ cartItemId: "a" }) }, snapshotTasa: 1 });
    useHoldQueueStore.getState().holdCurrentCart();
    const label = useHoldQueueStore.getState().heldCarts[0].label;
    expect(label).toMatch(/^Venta \d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it("usa label por defecto cuando el label custom es solo espacios", () => {
    useCartStore.setState({ items: { a: makePlainItem({ cartItemId: "a" }) }, snapshotTasa: 1 });
    useHoldQueueStore.getState().holdCurrentCart("   ");
    const label = useHoldQueueStore.getState().heldCarts[0].label;
    expect(label).toMatch(/^Venta \d{2}\/\d{2} \d{2}:\d{2}$/);
  });
});

describe("holdQueueStore - restoreCart", () => {
  it("inyecta items y snapshotTasa en useCartStore y elimina el held", () => {
    useCartStore.setState({
      items: { "1_UNIDAD": makePlainItem({ cartItemId: "1_UNIDAD" }) },
      snapshotTasa: 45.5,
    });
    useHoldQueueStore.getState().holdCurrentCart("A");
    const heldId = useHoldQueueStore.getState().heldCarts[0].id;

    // Simula que el carrito se limpió tras guardar
    useCartStore.setState({ items: {}, snapshotTasa: 0 });

    useHoldQueueStore.getState().restoreCart(heldId);

    expect(useCartStore.getState().items["1_UNIDAD"]).toBeDefined();
    expect(useCartStore.getState().snapshotTasa).toBe(45.5);
    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(0);
  });

  it("no hace nada con un id inexistente", () => {
    useHoldQueueStore.getState().restoreCart("no-existe");
    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(0);
    expect(Object.keys(useCartStore.getState().items)).toHaveLength(0);
  });
});

describe("holdQueueStore - removeHeld y clearAll", () => {
  it("removeHeld elimina solo el held indicado", () => {
    useCartStore.setState({ items: { a: makePlainItem({ cartItemId: "a" }) }, snapshotTasa: 1 });
    useHoldQueueStore.getState().holdCurrentCart("A");
    useCartStore.setState({ items: { b: makePlainItem({ cartItemId: "b" }) }, snapshotTasa: 2 });
    useHoldQueueStore.getState().holdCurrentCart("B");

    const held = useHoldQueueStore.getState().heldCarts;
    const idA = held[1].id;
    useHoldQueueStore.getState().removeHeld(idA);

    const remaining = useHoldQueueStore.getState().heldCarts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe("B");
  });

  it("clearAll vacía la lista", () => {
    useCartStore.setState({ items: { a: makePlainItem({ cartItemId: "a" }) }, snapshotTasa: 1 });
    useHoldQueueStore.getState().holdCurrentCart("A");
    useHoldQueueStore.getState().clearAll();
    expect(useHoldQueueStore.getState().heldCarts).toHaveLength(0);
  });
});

describe("holdQueueStore - límite MAX_HOLDS", () => {
  it(`mantiene máximo ${MAX_HOLDS} ventas y conserva la más reciente primero`, () => {
    for (let i = 0; i < 12; i++) {
      useCartStore.setState({
        items: { [`k${i}`]: makePlainItem({ cartItemId: `k${i}` }) },
        snapshotTasa: i + 1,
      });
      useHoldQueueStore.getState().holdCurrentCart(`Venta ${i}`);
    }

    const held = useHoldQueueStore.getState().heldCarts;
    expect(held).toHaveLength(MAX_HOLDS);
    expect(held[0].label).toBe("Venta 11");
    expect(held[MAX_HOLDS - 1].label).toBe("Venta 2");
  });
});

describe("holdQueueStore - helpers", () => {
  it("heldCartTotalUsd redondea a 2 decimales (0.1 + 0.2)", () => {
    const items = {
      a: makePlainItem({ cartItemId: "a", cantidad: 1, precio_unitario_usd: 0.1 }),
      b: makePlainItem({ cartItemId: "b", cantidad: 1, precio_unitario_usd: 0.2 }),
    };
    // base 0.3 + IVA 0.02 + 0.03 = 0.35
    expect(heldCartTotalUsd({ items })).toBe(0.35);
  });

  it("heldCartTotalUsd suma exento + base + IVA con redondeo por ítem", () => {
    const items = {
      a: makePlainItem({ cartItemId: "a", cantidad: 3, precio_unitario_usd: 1.67 }),
      b: makePlainItem({
        cartItemId: "b",
        cantidad: 1,
        precio_unitario_usd: 0.1,
        tipo_iva: "EXENTO",
        iva_porcentaje: 0,
      }),
    };
    // a: base 5.01 + IVA 0.8 = 5.81; b: exento 0.1 → total 5.91
    expect(heldCartTotalUsd({ items })).toBe(5.91);
  });

  it("heldCartItemCount cuenta líneas del carrito", () => {
    const items = {
      a: makePlainItem({ cartItemId: "a" }),
      b: makePlainItem({ cartItemId: "b" }),
      c: makePlainItem({ cartItemId: "c" }),
    };
    expect(heldCartItemCount({ items })).toBe(3);
    expect(heldCartItemCount({ items: {} })).toBe(0);
  });
});

describe("holdQueueStore - persistencia", () => {
  it("round-trip: hold → localStorage → nuevo store rehidratado", async () => {
    localStorage.clear();
    useCartStore.setState({
      items: { "1_UNIDAD": makePlainItem({ cartItemId: "1_UNIDAD" }) },
      snapshotTasa: 45.5,
    });
    useHoldQueueStore.getState().holdCurrentCart("Persistida");

    // Escritura en localStorage
    const raw = localStorage.getItem("yanesu-hold-queue-v1");
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!) as { state: { heldCarts: HeldCart[] } };
    expect(persisted.state.heldCarts).toHaveLength(1);
    expect(persisted.state.heldCarts[0].label).toBe("Persistida");
    expect(persisted.state.heldCarts[0].snapshotTasa).toBe(45.5);

    // Nuevo store que lee de localStorage
    vi.resetModules();
    const fresh = await import("../../../features/sales/store/holdQueueStore");
    const freshHeld = fresh.useHoldQueueStore.getState().heldCarts;
    expect(freshHeld).toHaveLength(1);
    expect(freshHeld[0].label).toBe("Persistida");
    expect(freshHeld[0].snapshotTasa).toBe(45.5);
  });
});
