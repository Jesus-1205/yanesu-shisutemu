import { create } from "zustand";
import type { ProductOut } from "@/types/api";
import type { ComboActiveOut, CalculateResponseItem } from "@/types/api";
import { api } from "@/services/api";
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
  usaPrecioDivisas: boolean;
  precioDivisasUnidad: number | null;
  precioDivisasCaja: number | null;
  comboBlockId: string | null;
  comboNombre: string | null;
}

export interface CartTotals {
  monto_exento_usd: number;
  base_imponible_usd: number;
  monto_iva_usd: number;
}

export interface ComboBlock {
  blockId: string;
  comboNombre: string;
  items: CartItem[];
  total: number;
}

interface CartState {
  items: Record<string, CartItem>;
  snapshotTasa: number;
  addItem: (product: ProductOut, tipo_empaque: "UNIDAD" | "CAJA", cantidad?: number, usaPrecioDivisas?: boolean) => void;
  addCombo: (combo: ComboActiveOut) => Promise<void>;
  addComboWithSelections: (combo: ComboActiveOut, selections: Map<number, number>) => Promise<void>;
  updateQuantity: (cartItemId: string, cantidad: number) => void;
  updateEmpaque: (cartItemId: string, nuevoEmpaque: "UNIDAD" | "CAJA") => void;
  toggleDivisas: (cartItemId: string) => void;
  removeItem: (cartItemId: string) => void;
  removeComboBlock: (comboBlockId: string) => void;
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

export function getDivisasTotal(items: Record<string, CartItem>): number {
  return Object.values(items)
    .filter((i) => i.usaPrecioDivisas)
    .reduce((sum, i) => sum + i.cantidad * i.precio_unitario_usd, 0);
}

export function getComboBlocks(items: Record<string, CartItem>): ComboBlock[] {
  const blocks: Record<string, ComboBlock> = {};
  for (const item of Object.values(items)) {
    if (!item.comboBlockId) continue;
    if (!blocks[item.comboBlockId]) {
      blocks[item.comboBlockId] = {
        blockId: item.comboBlockId,
        comboNombre: item.comboNombre || "Combo",
        items: [],
        total: 0,
      };
    }
    blocks[item.comboBlockId].items.push(item);
    blocks[item.comboBlockId].total += item.cantidad * item.precio_unitario_usd;
  }
  return Object.values(blocks);
}

export function isFirstInComboBlock(items: Record<string, CartItem>, item: CartItem): boolean {
  if (!item.comboBlockId) return false;
  const blockItems = Object.values(items).filter((i) => i.comboBlockId === item.comboBlockId);
  if (blockItems.length === 0) return false;
  return blockItems[0].cartItemId === item.cartItemId;
}

export function getComboBlockTotal(items: Record<string, CartItem>, comboBlockId: string): number {
  return Object.values(items)
    .filter((i) => i.comboBlockId === comboBlockId)
    .reduce((sum, i) => sum + i.cantidad * i.precio_unitario_usd, 0);
}

function _addComboItems(
  state: CartState,
  combo: ComboActiveOut,
  comboItems: CalculateResponseItem[],
  comboBlockId: string,
) {
  const newItems = { ...state.items };
  let lastTasa = state.snapshotTasa;

  for (const ci of comboItems) {
    const cartItemId = `${ci.producto_id}_${ci.tipo_empaque}_${comboBlockId}`;
    const subtotal = ci.cantidad * ci.precio_unitario_usd;

    const existing = newItems[cartItemId];
    if (existing) {
      newItems[cartItemId] = {
        ...existing,
        cantidad: existing.cantidad + ci.cantidad,
        unidades_descontadas: existing.unidades_descontadas + ci.cantidad,
      };
    } else {
      newItems[cartItemId] = {
        cartItemId,
        producto_id: ci.producto_id,
        nombre: `Lata ${ci.producto_id}`,
        tipo_empaque: "UNIDAD",
        cantidad: ci.cantidad,
        unidades_por_caja: 1,
        unidades_descontadas: ci.cantidad,
        precio_unidad_usd: ci.precio_original_usd,
        precio_caja_usd: ci.precio_original_usd * 24,
        precio_unitario_usd: ci.precio_unitario_usd,
        iva_porcentaje: 16,
        tipo_iva: "GRAVADO",
        usaPrecioDivisas: true,
        precioDivisasUnidad: null,
        precioDivisasCaja: null,
        comboBlockId,
        comboNombre: combo.nombre,
      };
    }
  }

  const currentTasa = useExchangeRateStore.getState().tasa;
  const snapshotTasa =
    lastTasa <= 0 && currentTasa > 0 ? currentTasa : lastTasa;

  return { items: newItems, snapshotTasa };
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

  addItem: (product, tipo_empaque, cantidad = 1, usaPrecioDivisas = false) => {
    const state = get();
    const cartItemId = `${product.id}_${tipo_empaque}`;

    const precioNormal =
      tipo_empaque === "UNIDAD"
        ? Number(product.precio_unidad_usd)
        : Number(product.precio_caja_usd);

    const precioDivisas =
      tipo_empaque === "UNIDAD"
        ? product.precio_divisas_unidad ?? null
        : product.precio_divisas_caja ?? null;

    const usaDivisas = usaPrecioDivisas && precioDivisas !== null;

    const precio =
      usaDivisas
        ? Number(precioDivisas)
        : precioNormal;

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
        usaPrecioDivisas: usaDivisas,
        precioDivisasUnidad: product.precio_divisas_unidad ?? null,
        precioDivisasCaja: product.precio_divisas_caja ?? null,
        comboBlockId: null,
        comboNombre: null,
      };

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

  addCombo: async (combo) => {
    const allProducts: { producto_id: number; cantidad: number }[] = [];
    for (const group of combo.groups) {
      const products = group.productos;
      const totalNeeded = group.max_cantidad;
      const perVariant = Math.floor(totalNeeded / products.length);
      const remainder = totalNeeded % products.length;
      for (let i = 0; i < products.length; i++) {
        const qty = perVariant + (i < remainder ? 1 : 0);
        if (qty > 0) {
          allProducts.push({ producto_id: products[i].producto_id, cantidad: qty });
        }
      }
    }

    const selection: { grupo_id: number; productos: number[]; cantidades: number[] } = {
      grupo_id: combo.groups[0].id,
      productos: allProducts.map((p) => p.producto_id),
      cantidades: allProducts.map((p) => p.cantidad),
    };

    try {
      const response = await api.calculateSale({
        items: [],
        combos: [{
          combo_id: combo.id,
          cantidad: 1,
          selecciones: [selection],
        }],
        metodo_pago_ids: combo.metodo_pago_ids,
      });

      const state = get();
      const comboBlockId = `combo_${combo.id}_${Date.now()}`;
      const result = _addComboItems(state, combo, response.combo_items, comboBlockId);
      set(result);
    } catch {
      // silently ignore
    }
  },

  addComboWithSelections: async (combo, selections) => {
    const grupoId = combo.groups[0].id;
    const productos: number[] = [];
    const cantidades: number[] = [];
    selections.forEach((cantidad, productoId) => {
      if (cantidad > 0) {
        productos.push(productoId);
        cantidades.push(cantidad);
      }
    });

    try {
      const response = await api.calculateSale({
        items: [],
        combos: [{
          combo_id: combo.id,
          cantidad: 1,
          selecciones: [{ grupo_id: grupoId, productos, cantidades }],
        }],
        metodo_pago_ids: combo.metodo_pago_ids,
      });

      const state = get();
      const comboBlockId = `combo_${combo.id}_${Date.now()}`;
      const result = _addComboItems(state, combo, response.combo_items, comboBlockId);
      set(result);
    } catch {
      // silently ignore
    }
  },

  updateQuantity: (cartItemId, cantidad) => {
    if (cantidad <= 0) {
      const item = get().items[cartItemId];
      if (item?.comboBlockId) {
        get().removeComboBlock(item.comboBlockId);
      } else {
        get().removeItem(cartItemId);
      }
      return;
    }
    const state = get();
    const item = state.items[cartItemId];
    if (!item) return;
    if (item.comboBlockId) return;
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
    if (!item || item.tipo_empaque === nuevoEmpaque || item.comboBlockId) return;

    const newId = `${item.producto_id}_${nuevoEmpaque}`;

    const precioNormal =
      nuevoEmpaque === "UNIDAD" ? item.precio_unidad_usd : item.precio_caja_usd;

    const precioDivisas =
      nuevoEmpaque === "UNIDAD"
        ? item.precioDivisasUnidad
        : item.precioDivisasCaja;

    const newPrecio =
      item.usaPrecioDivisas && precioDivisas !== null
        ? precioDivisas
        : precioNormal;

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

  toggleDivisas: (cartItemId) => {
    const state = get();
    const item = state.items[cartItemId];
    if (!item || item.comboBlockId) return;

    const precioDivisasActual =
      item.tipo_empaque === "UNIDAD"
        ? item.precioDivisasUnidad
        : item.precioDivisasCaja;

    if (precioDivisasActual === null) return;

    const nuevoValor = !item.usaPrecioDivisas;
    const nuevoPrecio = nuevoValor
      ? precioDivisasActual
      : item.tipo_empaque === "UNIDAD"
        ? item.precio_unidad_usd
        : item.precio_caja_usd;

    set({
      items: {
        ...state.items,
        [cartItemId]: {
          ...item,
          usaPrecioDivisas: nuevoValor,
          precio_unitario_usd: nuevoPrecio,
        },
      },
    });
  },

  removeItem: (cartItemId) => {
    const { [cartItemId]: _, ...rest } = get().items;
    set({ items: rest });
  },

  removeComboBlock: (comboBlockId) => {
    const state = get();
    const newItems = { ...state.items };
    for (const key of Object.keys(newItems)) {
      if (newItems[key].comboBlockId === comboBlockId) {
        delete newItems[key];
      }
    }
    set({ items: newItems });
  },

  clearCart: () => {
    set({ items: {}, snapshotTasa: 0 });
  },
};
});