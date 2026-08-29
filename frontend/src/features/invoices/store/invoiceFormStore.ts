import { create } from "zustand";
import type { MonedaEnum } from "@/types/api";
import { convertirCostos, calcularSubtotal, toCents } from "@/lib/money";
import { generateUUID, getTodayInCaracas } from "@/lib/utils";
import type { LineItem, ObsequioItem } from "../types";

interface InvoiceFormState {
  proveedorId: number | null;
  numeroFactura: string;
  tipoDocumento: "FACTURA" | "NOTA_ENTREGA";
  fechaFactura: string;
  fechaLimitePago: string | null;
  observaciones: string;
  moneda: MonedaEnum;
  tasa: string;
  aplicaIva: boolean;
  invoiceFiles: File[];
  lineItems: LineItem[];
  obsequioItems: ObsequioItem[];
  loading: boolean;
}

interface InvoiceFormActions {
  setField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void;
  addLineItem: (item: Omit<LineItem, "key" | "costo_unitario_usd" | "costo_unitario_bs" | "subtotal_usd" | "subtotal_bs">) => void;
  removeLineItem: (key: string) => void;
  toggleItemIva: (key: string) => void;
  setLineItems: (items: LineItem[]) => void;
  recalcAllItems: (tasa: number) => void;
  forceAllItemsGravado: () => void;
  addObsequio: (item: Omit<ObsequioItem, "key">) => void;
  removeObsequio: (key: string) => void;
  reset: () => void;
}

const INITIAL_STATE: InvoiceFormState = {
  proveedorId: null,
  numeroFactura: "",
  tipoDocumento: "FACTURA",
  fechaFactura: getTodayInCaracas(),
  fechaLimitePago: null,
  observaciones: "",
  moneda: "USD",
  tasa: "",
  aplicaIva: false,
  invoiceFiles: [],
  lineItems: [],
  obsequioItems: [],
  loading: false,
};

export const useInvoiceFormStore = create<InvoiceFormState & InvoiceFormActions>((set, get) => ({
  ...INITIAL_STATE,

  setField: (field, value) => set({ [field]: value } as Partial<InvoiceFormState>),

  addLineItem: (item) => {
    const nTasa = Number(get().tasa) || 0;
    const esBs = get().moneda === "BS";
    const costos = convertirCostos(item.costo_ingresado, item.moneda_ingreso, nTasa);
    let subtotalUsd: number;
    let subtotalBs: number;
    if (esBs) {
      subtotalBs = calcularSubtotal(item.cantidad, costos.bs);
      subtotalUsd = nTasa > 0 ? toCents(subtotalBs / nTasa) : 0;
    } else {
      subtotalUsd = calcularSubtotal(item.cantidad, costos.usd);
      subtotalBs = nTasa > 0 ? toCents(subtotalUsd * nTasa) : 0;
    }
    const newItem: LineItem = {
      ...item,
      key: generateUUID(),
      costo_unitario_usd: costos.usd,
      costo_unitario_bs: costos.bs,
      subtotal_usd: subtotalUsd,
      subtotal_bs: subtotalBs,
    };
    set((s) => ({ lineItems: [...s.lineItems, newItem] }));
  },

  removeLineItem: (key) => set((s) => ({ lineItems: s.lineItems.filter((i) => i.key !== key) })),

  toggleItemIva: (key) => set((s) => ({
    lineItems: s.lineItems.map((i) =>
      i.key === key ? { ...i, tipo_iva: i.tipo_iva === "GRAVADO" ? "EXENTO" : "GRAVADO" } : i,
    ),
  })),

  setLineItems: (items) => set({ lineItems: items }),

  recalcAllItems: (tasa) => {
    if (tasa <= 0) return;
    const esBs = get().moneda === "BS";
    set((s) => ({
      lineItems: s.lineItems.map((item) => {
        const costos = convertirCostos(item.costo_ingresado, item.moneda_ingreso, tasa);
        let subtotalUsd: number;
        let subtotalBs: number;
        if (esBs) {
          subtotalBs = calcularSubtotal(item.cantidad, costos.bs);
          subtotalUsd = toCents(subtotalBs / tasa);
        } else {
          subtotalUsd = calcularSubtotal(item.cantidad, costos.usd);
          subtotalBs = toCents(subtotalUsd * tasa);
        }
        return {
          ...item,
          costo_unitario_usd: costos.usd,
          costo_unitario_bs: costos.bs,
          subtotal_usd: subtotalUsd,
          subtotal_bs: subtotalBs,
        };
      }),
    }));
  },

  forceAllItemsGravado: () => set((s) => ({
    lineItems: s.lineItems.map((i) => ({ ...i, tipo_iva: "GRAVADO" as const })),
  })),

  addObsequio: (item) => set((s) => ({
    obsequioItems: [...s.obsequioItems, { ...item, key: generateUUID() }],
  })),

  removeObsequio: (key) => set((s) => ({
    obsequioItems: s.obsequioItems.filter((i) => i.key !== key),
  })),

  reset: () => set(INITIAL_STATE),
}));
