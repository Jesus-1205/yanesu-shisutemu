import { create } from "zustand";
import type { ProductOut } from "@/types/api";
import type { ComboActiveOut, CalculateResponseItem } from "@/types/api";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

export interface ComboDetalle {
  nombre: string;
  productos: ComboDetalleProducto[];
  metodo_pago_ids: number[];
}

export interface ComboDetalleProducto {
  producto_id: number;
  nombre: string;
  tipo_iva: "GRAVADO" | "EXENTO";
  cantidad: number;
  precio_unitario: number;
}

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
  combo_id: number | null;
  comboDetalle: ComboDetalle | null;
}

export interface CartTotals {
  monto_exento_usd: number;
  base_imponible_usd: number;
  monto_iva_usd: number;
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

function _defaultDistribute(combo: ComboActiveOut) {
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
  return allProducts;
}

function _buildComboDetalle(combo: ComboActiveOut, comboItems: CalculateResponseItem[]): ComboDetalle {
  const productos: ComboDetalleProducto[] = [];
  const tipoIvaMap = new Map<number, "GRAVADO" | "EXENTO">();
  for (const group of combo.groups) {
    for (const p of group.productos) {
      tipoIvaMap.set(p.producto_id, "GRAVADO");
    }
  }
  for (const ci of comboItems) {
    productos.push({
      producto_id: ci.producto_id,
      nombre: ci.producto_nombre,
      tipo_iva: "GRAVADO",
      cantidad: ci.cantidad,
      precio_unitario: ci.precio_unitario_usd,
    });
  }
  return {
    nombre: combo.nombre,
    productos,
    metodo_pago_ids: combo.metodo_pago_ids,
  };
}

async function _fetchComboPrices(
  combo: ComboActiveOut,
  selecciones: { grupo_id: number; productos: number[]; cantidades: number[] },
): Promise<CalculateResponseItem[]> {
  const response = await api.calculateSale({
    items: [],
    combos: [{
      combo_id: combo.id,
      cantidad: 1,
      selecciones: [selecciones],
    }],
    metodo_pago_ids: combo.metodo_pago_ids,
  });
  return response.combo_items;
}

function _createComboItem(
  state: CartState,
  combo: ComboActiveOut,
  comboItems: CalculateResponseItem[],
  isNew: boolean,
): { items: Record<string, CartItem>; snapshotTasa: number } {
  const cartItemId = `combo_${combo.id}`;
  const existing = state.items[cartItemId];

  const newCantidad = isNew
    ? (existing ? existing.cantidad + 1 : 1)
    : 1;

  const newComboDetalle = existing?.comboDetalle ?? _buildComboDetalle(combo, comboItems);

  const newItem: CartItem = {
    cartItemId,
    producto_id: 0,
    nombre: combo.nombre,
    tipo_empaque: "UNIDAD",
    cantidad: newCantidad,
    unidades_por_caja: 1,
    unidades_descontadas: newCantidad,
    precio_unidad_usd: combo.precio_total_usd,
    precio_caja_usd: 0,
    precio_unitario_usd: combo.precio_total_usd,
    iva_porcentaje: 0,
    tipo_iva: "EXENTO",
    usaPrecioDivisas: true,
    precioDivisasUnidad: null,
    precioDivisasCaja: null,
    combo_id: combo.id,
    comboDetalle: newComboDetalle,
  };

  const currentTasa = useExchangeRateStore.getState().tasa;
  const snapshotTasa = state.snapshotTasa <= 0 && currentTasa > 0
    ? currentTasa : state.snapshotTasa;

  return {
    items: { ...state.items, [cartItemId]: newItem },
    snapshotTasa,
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

    const precio = usaDivisas ? Number(precioDivisas) : precioNormal;
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
        combo_id: null,
        comboDetalle: null,
      };

      const currentTasa = useExchangeRateStore.getState().tasa;
      const snapshotTasa =
        state.snapshotTasa <= 0 && currentTasa > 0 ? currentTasa : state.snapshotTasa;

      set({
        items: { ...state.items, [cartItemId]: newItem },
        snapshotTasa,
      });
    }
  },

  addCombo: async (combo) => {
    const state = get();
    const cartItemId = `combo_${combo.id}`;

    if (state.items[cartItemId]) {
      const existing = state.items[cartItemId];
      set({
        items: {
          ...state.items,
          [cartItemId]: { ...existing, cantidad: existing.cantidad + 1 },
        },
      });
      return;
    }

    try {
      const dist = _defaultDistribute(combo);
      const seleccion = {
        grupo_id: combo.groups[0].id,
        productos: dist.map((p) => p.producto_id),
        cantidades: dist.map((p) => p.cantidad),
      };
      const comboItems = await _fetchComboPrices(combo, seleccion);
      const result = _createComboItem(state, combo, comboItems, true);
      set(result);
    } catch {
      // silently ignore
    }
  },

  addComboWithSelections: async (combo, selections) => {
    const state = get();
    const cartItemId = `combo_${combo.id}`;
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
      const comboItems = await _fetchComboPrices(combo, {
        grupo_id: grupoId,
        productos,
        cantidades,
      });

      if (state.items[cartItemId]) {
        const existing = state.items[cartItemId];
        set({
          items: {
            ...state.items,
            [cartItemId]: {
              ...existing,
              cantidad: existing.cantidad + 1,
              comboDetalle: _buildComboDetalle(combo, comboItems),
            },
          },
        });
      } else {
        const result = _createComboItem(state, combo, comboItems, true);
        set(result);
      }
    } catch {
      // silently ignore
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

    if (item.combo_id) {
      set({
        items: {
          ...state.items,
          [cartItemId]: { ...item, cantidad },
        },
      });
      return;
    }

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
    if (!item || item.tipo_empaque === nuevoEmpaque || item.combo_id) return;

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
    if (!item || item.combo_id) return;

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

  clearCart: () => {
    set({ items: {}, snapshotTasa: 0 });
  },
};
});