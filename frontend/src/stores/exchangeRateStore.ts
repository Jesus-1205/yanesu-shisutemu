import { create } from "zustand";
import { api } from "@/services/api";

interface ExchangeRateState {
  tasa: number;
  tasaEUR: number;
  loading: boolean;
  fechaUltimaActualizacion: string | null;
  needsUpdate: boolean;
  loadTasa: () => Promise<void>;
  checkDailyStatus: () => Promise<void>;
}

export const useExchangeRateStore = create<ExchangeRateState>((set) => ({
  tasa: 0,
  tasaEUR: 0,
  loading: true,
  fechaUltimaActualizacion: null,
  needsUpdate: false,

  loadTasa: async () => {
    set({ loading: true });
    try {
      const data = await api.getLatestRates();
      const usd = Number(data.rates.USD) || 0;
      const eur = Number(data.rates.EUR) || 0;
      set({
        tasa: usd,
        tasaEUR: eur,
        loading: false,
        fechaUltimaActualizacion: data.fecha_ultima_actualizacion ?? null,
      });
    } catch {
      set({ loading: false });
    }
  },

  checkDailyStatus: async () => {
    try {
      const data = await api.getDailyStatus();
      set({ needsUpdate: data.needs_update });
    } catch {
      // Silently ignore
    }
  },
}));
