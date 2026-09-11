import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/services/api";
import type { ExchangeRateOut } from "@/types/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

interface UseExchangeRateSelectorReturn {
  tasaBs: number;
  tasaBsInput: string;
  exchangeRates: ExchangeRateOut[];
  showRateDropdown: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  setShowRateDropdown: (v: boolean) => void;
  handleRateInputChange: (val: string) => void;
  selectRate: (rate: ExchangeRateOut) => void;
}

export function useExchangeRateSelector(): UseExchangeRateSelectorReturn {
  const exchangeRateStore = useExchangeRateStore();
  const [tasaBs, setTasaBs] = useState<number>(0);
  const [tasaBsInput, setTasaBsInput] = useState<string>("");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateOut[]>([]);
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchExchangeRates = useCallback(async () => {
    try {
      const ratesData = await api.getRateHistory({ days: 30 });
      if (exchangeRateStore.tasa === 0) {
        await exchangeRateStore.loadTasa();
      }
      const items = ratesData.history ?? [];
      setExchangeRates(items.slice(0, 10));
      const current = exchangeRateStore.tasa > 0
        ? Math.round(exchangeRateStore.tasa * 100) / 100
        : items.length > 0 ? Math.round(Number(items[0].tasa_usd) * 100) / 100 : 0;
      if (current > 0) {
        setTasaBs(current);
        setTasaBsInput(String(current));
      }
    } catch {
      // silently fail
    }
  }, [exchangeRateStore]);

  useEffect(() => { fetchExchangeRates(); }, [fetchExchangeRates]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowRateDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRateInputChange = useCallback((val: string) => {
    setTasaBsInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) setTasaBs(Math.round(num * 100) / 100);
  }, []);

  const selectRate = useCallback((rate: ExchangeRateOut) => {
    const rounded = Math.round(Number(rate.tasa_usd) * 100) / 100;
    setTasaBs(rounded);
    setTasaBsInput(String(rounded));
    setShowRateDropdown(false);
  }, []);

  return {
    tasaBs,
    tasaBsInput,
    exchangeRates,
    showRateDropdown,
    dropdownRef,
    setShowRateDropdown,
    handleRateInputChange,
    selectRate,
  };
}
