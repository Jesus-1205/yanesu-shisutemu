import { Clock } from "lucide-react";
import type { MonedaEnum, ExchangeRateOut } from "@/types/api";

const inputBase =
  "w-full h-10 rounded-lg border border-slate-300 bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";
const labelBase = "block text-xs font-medium text-slate-700 mb-1";

interface InvoiceCurrencyConfigProps {
  moneda: MonedaEnum;
  tasa: string;
  aplicaIva: boolean;
  rateHistory: ExchangeRateOut[];
  showRateHistory: boolean;
  tasaActual: number;
  fechaUltimaActualizacion: string | null;
  onMonedaChange: (moneda: MonedaEnum) => void;
  onTasaChange: (tasa: string) => void;
  onAplicaIvaChange: (aplica: boolean) => void;
  onToggleRateHistory: () => void;
  onCloseRateHistory: () => void;
  onSelectRate: (rate: ExchangeRateOut) => void;
}

export default function InvoiceCurrencyConfig({
  moneda,
  tasa,
  aplicaIva,
  rateHistory,
  showRateHistory,
  tasaActual,
  fechaUltimaActualizacion,
  onMonedaChange,
  onTasaChange,
  onAplicaIvaChange,
  onToggleRateHistory,
  onCloseRateHistory,
  onSelectRate,
}: InvoiceCurrencyConfigProps) {
  return (
    <>
      <div>
        <label className={labelBase}>Moneda Principal</label>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => onMonedaChange("USD")}
            className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
              moneda === "USD"
                ? "bg-brand-blue text-white"
                : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            USD $
          </button>
          <button
            type="button"
            onClick={() => onMonedaChange("BS")}
            className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
              moneda === "BS"
                ? "bg-brand-blue text-white"
                : "bg-surface text-slate-600 hover:bg-slate-50"
            }`}
          >
            Bs.
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="invoice-info-tasa" className={labelBase}>
          Tasa de Cambio (Bs. por USD)
        </label>
        <div className="flex gap-2">
          <input
            id="invoice-info-tasa"
            type="number"
            step="0.01"
            min={0}
            value={tasa}
            onChange={(e) => onTasaChange(e.target.value)}
            placeholder="0.00"
            autoComplete="off"
            className={`${inputBase} flex-1`}
          />
          <div className="relative">
            <button
              type="button"
              onClick={onToggleRateHistory}
              className="flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-surface px-3 text-xs font-medium text-slate-600 transition-colors hover:border-brand-blue hover:bg-slate-50"
              title="Historial de tasas"
            >
              <Clock className="size-3.5" />
            </button>
            {showRateHistory && rateHistory.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseRateHistory} />
                <div className="absolute top-full right-0 z-50 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Últimas tasas
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {rateHistory.map((rate) => (
                      <button
                        key={rate.id}
                        type="button"
                        onClick={() => onSelectRate(rate)}
                        className="flex w-full cursor-pointer items-center justify-between border-b border-slate-50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-text-main">
                            USD {Number(rate.tasa_usd).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            EUR {Number(rate.tasa_eur).toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(rate.fecha_registro).toLocaleDateString("es-VE")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {fechaUltimaActualizacion && (
          <p className="mt-0.5 text-[10px] text-slate-400">
            Tasa actual: {Number(tasaActual).toFixed(2)} Bs/USD • Actualizada{" "}
            {new Date(fechaUltimaActualizacion).toLocaleDateString("es-VE")}
          </p>
        )}
      </div>
      <div>
        <label className={labelBase}>¿La factura incluye IVA?</label>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => onAplicaIvaChange(true)}
            disabled={moneda === "USD"}
            className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
              aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
            } ${moneda === "USD" ? "cursor-not-allowed opacity-50" : ""}`}
          >
            Con IVA
          </button>
          <button
            type="button"
            onClick={() => onAplicaIvaChange(false)}
            disabled={moneda === "USD"}
            className={`h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${
              !aplicaIva ? "bg-brand-blue text-white" : "bg-surface text-slate-600 hover:bg-slate-50"
            } ${moneda === "USD" ? "cursor-not-allowed opacity-50" : ""}`}
          >
            Sin IVA
          </button>
        </div>
        {moneda === "USD" && (
          <p className="mt-0.5 text-[10px] text-slate-400">
            El IVA solo aplica a facturas en bolívares
          </p>
        )}
      </div>
    </>
  );
}
