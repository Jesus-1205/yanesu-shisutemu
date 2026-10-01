import Button from "@/ui-components/Button";
import { formatCurrency } from "@/lib/utils";
import { useCheckoutContext } from "./CheckoutProvider";

export default function CheckoutFooter() {
  const { financials, saving, onClose, handleConfirm } = useCheckoutContext();

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
  } = financials;

  return (
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
  );
}
