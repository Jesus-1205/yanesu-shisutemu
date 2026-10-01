import { formatPaymentMethodName } from "@/lib/utils";
import { useCheckoutContext } from "./CheckoutProvider";

export default function CheckoutSplitPayment() {
  const {
    methods,
    amounts,
    references,
    financials,
    setAmount,
    setAmounts,
    setReferences,
    setIsSplit,
  } = useCheckoutContext();

  const handleBackToExpress = () => {
    setAmounts({});
    setIsSplit(false);
  };

  return (
    <>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-text-main">Desglose de pagos</p>
        <button
          type="button"
          onClick={handleBackToExpress}
          className="text-[11px] text-slate-400 hover:text-brand-blue cursor-pointer"
        >
          Volver a Cobro Exprés
        </button>
      </div>

      <div className={`mb-2 grid gap-1.5 px-0.5 ${methods.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
        {methods.map((m) => (
          <div key={m.id}>
            <label
              htmlFor={`amount-${m.id}`}
              className="mb-0.5 block text-[11px] font-medium text-slate-500"
            >
              {formatPaymentMethodName(m.nombre)} ({m.moneda_default})
            </label>
            <input
              id={`amount-${m.id}`}
              type="number"
              step="0.01"
              min="0"
              value={amounts[m.id] ?? ""}
              onChange={(e) => setAmount(m.id, e.target.value)}
              placeholder="0.00"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        ))}
      </div>

      {methods.some((m) => m.acepta_referencia) && (
        <div className="mb-2 space-y-1.5">
          {methods
            .filter((m) => m.acepta_referencia && Number(amounts[m.id]) > 0)
            .map((m) => (
              <div key={`ref-${m.id}`}>
                <label
                  htmlFor={`ref-${m.id}`}
                  className="mb-0.5 block text-[11px] font-medium text-slate-500"
                >
                  Ref. {formatPaymentMethodName(m.nombre)}
                </label>
                <input
                  id={`ref-${m.id}`}
                  type="text"
                  maxLength={20}
                  value={references[m.id] ?? ""}
                  onChange={(e) => setReferences((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  placeholder="Número de referencia"
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                />
              </div>
            ))}
        </div>
      )}

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            financials.progressPct >= 99.5 ? "bg-success" : "bg-accent-orange"
          }`}
          style={{ width: `${Math.min(100, financials.progressPct)}%` }}
        />
      </div>
    </>
  );
}
