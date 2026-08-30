import { create } from "zustand";

interface InvoiceFiltersState {
  search: string;
  proveedorId: number | null;
  tipoDocumento: string;
  estadoPago: string;
  sortBy: string;
  fechaDesde: string;
  fechaHasta: string;
  page: number;
}

interface InvoiceFiltersActions {
  setField: <K extends keyof InvoiceFiltersState>(field: K, value: InvoiceFiltersState[K]) => void;
  clearAll: () => void;
}

const INITIAL_STATE: InvoiceFiltersState = {
  search: "",
  proveedorId: null,
  tipoDocumento: "",
  estadoPago: "",
  sortBy: "",
  fechaDesde: "",
  fechaHasta: "",
  page: 1,
};

export const useInvoiceFiltersStore = create<InvoiceFiltersState & InvoiceFiltersActions>((set) => ({
  ...INITIAL_STATE,

  setField: (field, value) => set({ [field]: value }),

  clearAll: () => set(INITIAL_STATE),
}));
