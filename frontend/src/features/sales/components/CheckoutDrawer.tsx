import Drawer from "@/ui-components/Drawer";
import Button from "@/ui-components/Button";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";
import { useCheckout } from "../hooks/useCheckout";
import CheckoutHeader from "./CheckoutHeader";

interface CheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutDrawer({ open, onClose, onSuccess }: CheckoutDrawerProps) {
  const {
    methods,
    amounts,
    setAmount,
    setAmounts,
    references,
    setReferences,
    isSplit,
    setIsSplit,
    observaciones,
    setObservaciones,
    saving,
    tasaNum,
    totals,
    totalUsd,
    totalVes,
    totalDivisasItems,
    divisasSummary,
    financials,
    hasAnyAmount,
    handleExpressClick,
    handleConfirm,
    handleKeyDown,
  } = useCheckout({ open, onClose, onSuccess });

  const {
    pagadoUSD,
    pagadoVES,
    isPayingVES,
    pagadoEnMonedaPago,
    restanteEnMonedaPago,
    restanteUSD,
    restanteVES,
    vueltoEnMonedaPago,
    vueltoUSD,
    vueltoVES,
    suficiente,
    progressPct,
  } = financials;

  return (
    <Drawer open={open} onClose={onClose} title="Cobro" className="w-105">
      <div className="flex h-full flex-col" onKeyDown={handleKeyDown}>
        <CheckoutHeader
          totalUsd={totalUsd}
          totalVes={totalVes}
          tasaNum={tasaNum}
          totals={totals}
          totalDivisasItems={totalDivisasItems}
          divisasSummary={divisasSummary}
        />

        {/* Cuerpo scrolleable */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {!isSplit ? (
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
                      onChange={(e) =>
                        setReferences((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      placeholder="Número de referencia"
                      autoComplete="off"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                    />
                  </div>
                ))}

              <button
                type="button"
                onClick={() => {
                  setIsSplit(true);
                  if (!hasAnyAmount && methods.length > 0) {
                    handleExpressClick(methods[0]);
                  }
                }}
                className="mx-auto mb-2 block text-[11px] text-brand-blue hover:underline"
              >
                Pago dividido / monto exacto?
              </button>
            </>
          ) : (
            <>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-semibold text-text-main">Desglose de pagos</p>
                <button
                  type="button"
                  onClick={() => {
                    setAmounts({});
                    setIsSplit(false);
                  }}
                  className="text-[11px] text-slate-400 hover:text-brand-blue"
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
                          onChange={(e) =>
                            setReferences((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
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
                    progressPct >= 99.5 ? "bg-success" : "bg-accent-orange"
                  }`}
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Observaciones compacto */}
        <div className="mb-2 px-1">
          <label htmlFor="observaciones" className="mb-0.5 block text-[11px] font-medium text-slate-500">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            rows={1}
            maxLength={255}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas (opcional)"
            autoComplete="off"
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        {/* Footer fijo compacto */}
        <div className="space-y-1.5 border-t border-slate-100 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Pagado</span>
            <span className="font-medium">
              {pagadoEnMonedaPago > 0
                ? (isPayingVES ? formatCurrency(pagadoVES, "Bs ") : formatCurrency(pagadoUSD))
                : formatCurrency(pagadoUSD)}
            </span>
          </div>

          {restanteEnMonedaPago > 0 && (
            <div className="flex justify-between text-xs font-semibold text-danger">
              <span>Restante</span>
              <span>
                {isPayingVES
                  ? `${formatCurrency(restanteVES, "Bs ")} (${formatCurrency(restanteUSD)})`
                  : `${formatCurrency(restanteUSD)} (${formatCurrency(restanteVES, "Bs ")})`}
              </span>
            </div>
          )}

          {vueltoEnMonedaPago > 0 && (
            <div className="flex justify-between text-xs font-semibold text-success">
              <span>Cambio / Vuelto</span>
              <span>
                {isPayingVES
                  ? `${formatCurrency(vueltoVES, "Bs ")} (${formatCurrency(vueltoUSD)})`
                  : `${formatCurrency(vueltoUSD)} (${formatCurrency(vueltoVES, "Bs ")})`}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="accent"
              size="sm"
              disabled={!suficiente || saving}
              loading={saving}
              onClick={handleConfirm}
              className="flex-2"
            >
              Procesar Cobro
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
