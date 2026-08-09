import { create } from "zustand";
import type { ProductOut } from "@/types/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

export interface CartItem {
  cartItemId: string;
  producto_id: number;
  nombre: string;
  tipo_empaque: "UNIDAD" | "CAJA";
  cantidad: number;
  unidades_por_caja: number;
  unidades_descontadas: number;
  precio_unidad_usd: number;
  precio_caja_usd: number;
  precio_unitario_usd: number;
  iva_porcentaje: number;
  tipo_iva: "GRAVADO" | "EXENTO";
}

export interface CartTotals {
  monto_exento_usd: number;
  base_imponible_usd: number;
  monto_iva_usd: number;
}

interface CartState {
  items: Record<string, CartItem>;
  snapshotTasa: number;
  addItem: (product: ProductOut, tipo_empaque: "UNIDAD" | "CAJA", cantidad?: number) => void;
  updateQuantity: (cartItemId: string, cantidad: number) => void;
  updateEmpaque: (cartItemId: string, nuevoEmpaque: "UNIDAD" | "CAJA") => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
}

export function computeTotals(items: Record<string, CartItem>): CartTotals {
  const acc = { monto_exento_usd: 0, base_imponible_usd: 0, monto_iva_usd: 0 };
  for (const item of Object.values(items)) {
    const subtotal = Math.round(item.cantidad * item.precio_unitario_usd * 100) / 100;
    if (item.tipo_iva === "EXENTO") {
      acc.monto_exento_usd += subtotal;
    } else {
      acc.base_imponible_usd += subtotal;
      acc.monto_iva_usd += Math.round(subtotal * item.iva_porcentaje) / 100;
    }
  }
  return {
    monto_exento_usd: Math.round(acc.monto_exento_usd * 100) / 100,
    base_imponible_usd: Math.round(acc.base_imponible_usd * 100) / 100,
    monto_iva_usd: Math.round(acc.monto_iva_usd * 100) / 100,
  };
}

export const useCartStore = create<CartState>((set, get) => {
  useExchangeRateStore.subscribe((state) => {
    if (state.tasa > 0) {
      const cur = get();
      if (cur.snapshotTasa === 0 && Object.keys(cur.items).length > 0) {
        set({ snapshotTasa: state.tasa });
      }
    }
  });

  return {
  items: {},
  snapshotTasa: 0,

  addItem: (product, tipo_empaque, cantidad = 1) => {
    const state = get();
    const cartItemId = `${product.id}_${tipo_empaque}`;
    const precio =
      tipo_empaque === "UNIDAD"
        ? Number(product.precio_unidad_usd)
        : Number(product.precio_caja_usd);
    const iva = product.tipo_iva === "GRAVADO" ? 16 : 0;

    const existing = state.items[cartItemId];
    if (existing) {
      const newCantidad = existing.cantidad + cantidad;
      const newUnidades =
        tipo_empaque === "CAJA"
          ? newCantidad * product.unidades_por_caja
          : newCantidad;
      set({
        items: {
          ...state.items,
          [cartItemId]: { ...existing, cantidad: newCantidad, unidades_descontadas: newUnidades },
        },
      });
    } else {
      const unidades =
        tipo_empaque === "CAJA" ? cantidad * product.unidades_por_caja : cantidad;

      const newItem: CartItem = {
        cartItemId,
        producto_id: product.id,
        nombre: product.nombre,
        tipo_empaque,
        cantidad,
        unidades_por_caja: product.unidades_por_caja,
        unidades_descontadas: unidades,
        precio_unidad_usd: Number(product.precio_unidad_usd),
        precio_caja_usd: Number(product.precio_caja_usd),
        precio_unitario_usd: precio,
        iva_porcentaje: iva,
        tipo_iva: product.tipo_iva,
      };

      // Si el snapshot quedó en 0 (la tasa aun no estaba cargada al crear el
      // carrito) pero el store ya tiene una tasa valida, capturarla ahora.
      const currentTasa = useExchangeRateStore.getState().tasa;
      const snapshotTasa =
        state.snapshotTasa <= 0 && currentTasa > 0
          ? currentTasa
          : state.snapshotTasa;

      set({
        items: { ...state.items, [cartItemId]: newItem },
        snapshotTasa,
      });
    }
  },

  updateQuantity: (cartItemId, cantidad) => {
    if (cantidad <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    const state = get();
    const item = state.items[cartItemId];
    if (!item) return;
    const unidades =
      item.tipo_empaque === "CAJA" ? cantidad * item.unidades_por_caja : cantidad;
    set({
      items: {
        ...state.items,
        [cartItemId]: { ...item, cantidad, unidades_descontadas: unidades },
      },
    });
  },

  updateEmpaque: (cartItemId, nuevoEmpaque) => {
    const state = get();
    const item = state.items[cartItemId];
    if (!item || item.tipo_empaque === nuevoEmpaque) return;

    const newId = `${item.producto_id}_${nuevoEmpaque}`;
    const newPrecio =
      nuevoEmpaque === "UNIDAD" ? item.precio_unidad_usd : item.precio_caja_usd;
    const newUnidades =
      nuevoEmpaque === "CAJA"
        ? item.cantidad * item.unidades_por_caja
        : item.cantidad;

    const { [cartItemId]: removed, ...rest } = state.items;

    if (newId !== cartItemId && rest[newId]) {
      const existing = rest[newId];
      rest[newId] = {
        ...existing,
        cantidad: existing.cantidad + item.cantidad,
        unidades_descontadas: existing.unidades_descontadas + newUnidades,
      };
    } else {
      rest[newId] = {
        ...item,
        cartItemId: newId,
        tipo_empaque: nuevoEmpaque,
        precio_unitario_usd: newPrecio,
        unidades_descontadas: newUnidades,
      };
    }

    set({ items: rest });
  },

  removeItem: (cartItemId) => {
    const { [cartItemId]: _, ...rest } = get().items;
    set({ items: rest });
  },

  clearCart: () => {
    set({ items: {}, snapshotTasa: 0 });
  },
};
});
