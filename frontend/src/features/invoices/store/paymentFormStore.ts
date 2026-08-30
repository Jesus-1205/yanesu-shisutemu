import { create } from "zustand";

interface PaymentFormState {
  selectedMethodId: number | null;
  monto: string;
  referencia: string;
  comprobantes: File[];
  observaciones: string;
  incluirMora: boolean;
}

interface PaymentFormActions {
  setField: <K extends keyof PaymentFormState>(field: K, value: PaymentFormState[K]) => void;
  setMethod: (id: number | null) => void;
  setMonto: (value: string) => void;
  setReferencia: (value: string) => void;
  addComprobantes: (files: File[]) => void;
  removeComprobante: (index: number) => void;
  setObservaciones: (value: string) => void;
  reset: () => void;
}

const INITIAL_STATE: PaymentFormState = {
  selectedMethodId: null,
  monto: "",
  referencia: "",
  comprobantes: [],
  observaciones: "",
  incluirMora: false,
};

export const usePaymentFormStore = create<PaymentFormState & PaymentFormActions>((set) => ({
  ...INITIAL_STATE,

  setField: (field, value) => set({ [field]: value } as Partial<PaymentFormState>),
  setMethod: (id) => set({ selectedMethodId: id, monto: "", incluirMora: false }),
  setMonto: (value) => set({ monto: value }),
  setReferencia: (value) => set({ referencia: value }),
  addComprobantes: (files) => set((s) => ({ comprobantes: [...s.comprobantes, ...files] })),
  removeComprobante: (index) => set((s) => ({
    comprobantes: s.comprobantes.filter((_, i) => i !== index),
  })),
  setObservaciones: (value) => set({ observaciones: value }),
  reset: () => set(INITIAL_STATE),
}));
