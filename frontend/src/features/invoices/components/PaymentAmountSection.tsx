import { toCents } from "@/lib/money";
import { formatBs, formatUsd } from "@/lib/text";
import { usePaymentFormStore } from "../store/paymentFormStore";

interface PaymentAmountSectionProps {
  payInUsd: boolean;
  saldoEnMonedaPago: number;
  saldoPendienteUsd: number;
  saldoPendienteBs: number;
  saldoRestanteUsd: number;
  saldoRestanteBs: number;
  totalFacturaUsd: number;
  totalFacturaBs: number;
  montoNum: number;
  montoMoraUsd: number;
  montoMoraBs: number;
  montoBs: number;
  montoUsd: number;
  tasaBs: number;
  excedeSaldo: boolean;
}

export default function PaymentAmountSection({
  payInUsd,
  saldoEnMonedaPago,
  saldoPendienteUsd,
  saldoPendienteBs,
  saldoRestanteUsd,
  saldoRestanteBs,
  totalFacturaUsd,
  totalFacturaBs,
  montoNum,
  montoMoraUsd,
  montoMoraBs,
  montoBs,
  montoUsd,
  tasaBs,
  excedeSaldo,
}: PaymentAmountSectionProps) {
  const store = usePaymentFormStore();

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
          Monto a pagar
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 select-none">
          <input
            type="checkbox"
            checked={store.incluirMora}
            onChange={(e) => store.setField("incluirMora", e.target.checked)}
            className="size-4 cursor-pointer rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
          Incluir mora
        </label>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Saldo pendiente:{" "}
        <span className="font-mono font-medium text-slate-700">
          {payInUsd ? formatUsd(saldoEnMonedaPago) : `Bs. ${formatBs(saldoEnMonedaPago)}`}
        </span>
        <span className="ml-1 text-slate-400">
          ({formatUsd(saldoPendienteUsd)} / Bs. {formatBs(saldoPendienteBs)})
        </span>
      </p>
      <div className="relative">
        <span className="absolute top-1/2 left-4 -translate-y-1/2 font-mono text-base font-semibold text-slate-500">
          {payInUsd ? "$" : "Bs."}
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          max={store.incluirMora ? undefined : toCents(saldoEnMonedaPago)}
          value={store.monto}
          onChange={(e) => store.setMonto(e.target.value)}
          className="h-14 w-full rounded-xl border-2 border-slate-200 bg-surface pr-4 pl-12 font-mono text-xl font-semibold text-text-main transition-all duration-200 outline-none hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          placeholder="0.00"
        />
      </div>
      {excedeSaldo && (
        <p className="mt-1.5 text-xs text-red-500">
          {store.incluirMora
            ? `El monto mínimo con mora es ${payInUsd ? formatUsd(totalFacturaUsd) : `Bs. ${formatBs(totalFacturaBs)}`}`
            : "El monto excede el saldo pendiente"}
        </p>
      )}

      {store.incluirMora && montoNum > 0 && !excedeSaldo && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-amber-600">Mora</span>
            <span className="font-mono font-bold text-amber-700">
              {montoMoraBs > 0 ? `Bs. ${formatBs(montoMoraBs)}` : "Bs. 0,00"}
            </span>
          </div>
          {payInUsd && montoMoraUsd > 0 && (
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-amber-500">Recargo por pago tardío</span>
              <span className="font-mono text-amber-600">{formatUsd(montoMoraUsd)}</span>
            </div>
          )}
          {!payInUsd && montoMoraBs > 0 && (
            <p className="mt-1 text-[10px] text-amber-500">Recargo por pago tardío</p>
          )}
        </div>
      )}

      {montoNum > 0 && !excedeSaldo && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-1 text-xs font-medium text-slate-500">Quedaría por pagar</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-green-700">{formatUsd(saldoRestanteUsd)}</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-sm font-bold text-green-700">Bs. {formatBs(saldoRestanteBs)}</span>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => store.setMonto(String(toCents(saldoEnMonedaPago)))}
          className="h-10 flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium transition-colors hover:bg-slate-50"
        >
          Pagar todo
        </button>
        <button
          type="button"
          onClick={() => store.setMonto(String(toCents(saldoEnMonedaPago / 2)))}
          className="h-10 flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium transition-colors hover:bg-slate-50"
        >
          Mitad
        </button>
        <button
          type="button"
          onClick={() => store.setMonto("")}
          className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium transition-colors hover:bg-slate-50"
        >
          Otro
        </button>
      </div>

      {tasaBs > 0 && montoNum > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-700">
              {payInUsd ? formatUsd(montoNum) : `Bs. ${formatBs(montoNum)}`}
            </span>
            <span className="text-amber-400">→</span>
            <span className="font-mono font-bold text-amber-800">
              {payInUsd ? `Bs. ${formatBs(montoBs)}` : formatUsd(montoUsd)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-amber-600">Tasa BCV: {formatBs(tasaBs)}</p>
        </div>
      )}
    </section>
  );
}
