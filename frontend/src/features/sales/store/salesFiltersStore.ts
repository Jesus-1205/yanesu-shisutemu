import { create } from "zustand";

interface SalesFiltersState {
  fechaDesde: string;
  fechaHasta: string;
  horaDesde: string;
  horaHasta: string;
  metodoPagoIds: number[];
  page: number;
}

interface SalesFiltersActions {
  setField: <K extends keyof SalesFiltersState>(field: K, value: SalesFiltersState[K]) => void;
  clearAll: () => void;
}

const INITIAL_STATE: SalesFiltersState = {
  fechaDesde: "",
  fechaHasta: "",
  horaDesde: "",
  horaHasta: "",
  metodoPagoIds: [],
  page: 1,
};

export const useSalesFiltersStore = create<SalesFiltersState & SalesFiltersActions>((set) => ({
  ...INITIAL_STATE,
  setField: (field, value) => set({ [field]: value }),
  clearAll: () => set(INITIAL_STATE),
}));
