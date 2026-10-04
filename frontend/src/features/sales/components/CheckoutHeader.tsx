import { formatCurrency, formatRate } from "@/lib/utils";
import { useCheckoutContext } from "./CheckoutProvider";

export default function CheckoutHeader() {
  const {
    totalUsd,
    totalVes,
    tasaNum,
    totals,
    totalDivisasItems,
    divisasSummary,
  } = useCheckoutContext();

  return (
    <div className="mb-3 rounded-xl bg-slate-50 px-3 py-4 text-center">
      <div className="text-xl font-bold text-info">{formatCurrency(totalUsd)}</div>
      {tasaNum > 0 && (
        <div className="mt-0.5 text-sm font-semibold text-success">
          {formatCurrency(totalVes, "Bs ")}
        </div>
      )}
      <div className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
        Tasa: {formatRate(tasaNum)} | Exento: {formatCurrency(totals.monto_exento_usd)} | Base:{" "}
        {formatCurrency(totals.base_imponible_usd)} | IVA: {formatCurrency(totals.monto_iva_usd)}
      </div>
      {totalDivisasItems > 0 && (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <div className="text-xs font-semibold text-emerald-700">
            Productos Divisas: {formatCurrency(totalDivisasItems)}
          </div>
          {divisasSummary && !divisasSummary.cubierto && (
            <div className="mt-0.5 text-[10px] font-semibold text-danger">
              Falta cubrir: {formatCurrency(divisasSummary.faltante)} en divisas
            </div>
          )}
          {divisasSummary && divisasSummary.cubierto && (
            <div className="mt-0.5 text-[10px] text-success">
              Cubierto con divisas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
