import Drawer from "@/ui-components/Drawer";
import { useCheckout } from "../hooks/useCheckout";
import CheckoutHeader from "./CheckoutHeader";
import CheckoutSpeedPayment from "./CheckoutSpeedPayment";
import CheckoutSplitPayment from "./CheckoutSplitPayment";
import CheckoutFooter from "./CheckoutFooter";

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
            <CheckoutSpeedPayment
              methods={methods}
              amounts={amounts}
              references={references}
              hasAnyAmount={hasAnyAmount}
              onExpressClick={handleExpressClick}
              onReferenceChange={(id, val) => setReferences((prev) => ({ ...prev, [id]: val }))}
              onSwitchToSplit={() => {
                setIsSplit(true);
                if (!hasAnyAmount && methods.length > 0) {
                  handleExpressClick(methods[0]);
                }
              }}
            />
          ) : (
            <CheckoutSplitPayment
              methods={methods}
              amounts={amounts}
              references={references}
              progressPct={financials.progressPct}
              onAmountChange={setAmount}
              onReferenceChange={(id, val) => setReferences((prev) => ({ ...prev, [id]: val }))}
              onBackToExpress={() => {
                setAmounts({});
                setIsSplit(false);
              }}
            />
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

        <CheckoutFooter
          financials={financials}
          saving={saving}
          onClose={onClose}
          onConfirm={handleConfirm}
        />
      </div>
    </Drawer>
  );
}

