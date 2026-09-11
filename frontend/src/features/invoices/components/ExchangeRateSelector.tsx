import { ChevronDown } from "lucide-react";
import type { ExchangeRateOut } from "@/types/api";
import { formatBs } from "@/lib/text";
import type { useExchangeRateSelector } from "../hooks/useExchangeRateSelector";

type ExchangeRateSelectorProps = ReturnType<typeof useExchangeRateSelector>;

export default function ExchangeRateSelector({
  tasaBsInput,
  exchangeRates,
  showRateDropdown,
  dropdownRef,
  setShowRateDropdown,
  handleRateInputChange,
  selectRate,
}: ExchangeRateSelectorProps) {
  return (
    <section>
      <label className="mb-1 block text-sm font-semibold tracking-wide text-slate-700 uppercase">
        Tasa de cambio (BS/USD)
      </label>
      <p className="mb-2 text-xs text-slate-500">Usa la tasa BCV actual o selecciona una reciente</p>
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={tasaBsInput}
              onChange={(e) => handleRateInputChange(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-surface pr-10 pl-4 font-mono text-sm text-text-main transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              placeholder="Ej: 791.32"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400">
              Bs./USD
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowRateDropdown(!showRateDropdown)}
            className="flex h-11 cursor-pointer items-center gap-1 rounded-xl border-2 border-slate-200 bg-surface px-3 transition-colors hover:border-slate-300"
            title="Ver tasas recientes"
          >
            <ChevronDown className="size-4 text-slate-500" />
          </button>
        </div>
        {showRateDropdown && exchangeRates.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {exchangeRates.map((rate: ExchangeRateOut) => (
              <button
                key={rate.id}
                type="button"
                onClick={() => selectRate(rate)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-mono font-medium text-text-main">
                  {formatBs(Number(rate.tasa_usd))}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(rate.fecha_registro).toLocaleDateString("es-VE")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
