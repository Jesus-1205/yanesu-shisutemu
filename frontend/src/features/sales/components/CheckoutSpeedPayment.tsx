import { formatPaymentMethodName } from "@/lib/utils";
import { useCheckoutContext } from "./CheckoutProvider";

export default function CheckoutSpeedPayment() {
  const {
    methods,
    amounts,
    references,
    hasAnyAmount,
    handleExpressClick,
    setReferences,
    setIsSplit,
  } = useCheckoutContext();

  const handleSwitchToSplit = () => {
    setIsSplit(true);
    if (!hasAnyAmount && methods.length > 0) {
      handleExpressClick(methods[0]);
    }
  };

  return (
    <>
      <p className="mb-1.5 text-xs font-semibold text-text-main">Cobro rápido</p>
      <div className={`mb-2 grid gap-1.5 ${methods.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
        {methods.map((m) => {
          const active = Number(amounts[m.id]) > 0;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleExpressClick(m)}
              className={`
                rounded-lg border-2 p-2 text-center transition-all duration-150
                ${
                  active
                    ? "border-brand-blue bg-blue-50 font-semibold text-brand-blue"
                    : "border-slate-200 bg-surface text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }
              `}
            >
              <div className="text-xs leading-tight">{formatPaymentMethodName(m.nombre)}</div>
              <div className="text-[10px] opacity-70">{m.moneda_default}</div>
            </button>
          );
        })}
      </div>

      {!hasAnyAmount && (
        <p className="mb-1 text-center text-[11px] text-slate-400">
          Toca un método para asignar el 100%
        </p>
      )}

      {methods
        .filter((m) => m.acepta_referencia && Number(amounts[m.id]) > 0)
        .map((m) => (
          <div key={`ref-${m.id}`} className="mb-2">
            <label
              htmlFor={`express-ref-${m.id}`}
              className="mb-0.5 block text-[11px] font-medium text-slate-500"
            >
              Ref. {formatPaymentMethodName(m.nombre)}
            </label>
            <input
              id={`express-ref-${m.id}`}
              type="text"
              maxLength={20}
              value={references[m.id] ?? ""}
              onChange={(e) => setReferences((prev) => ({ ...prev, [m.id]: e.target.value }))}
              placeholder="Número de referencia"
              autoComplete="off"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
            />
          </div>
        ))}

      <button
        type="button"
        onClick={handleSwitchToSplit}
        className="mx-auto mb-2 block text-[11px] text-brand-blue hover:underline cursor-pointer"
      >
        Pago dividido / monto exacto?
      </button>
    </>
  );
}
