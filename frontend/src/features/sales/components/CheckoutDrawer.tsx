import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Drawer from "@/ui-components/Drawer";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import { useToast } from "@/ui-components/Toast";
import { useCartStore, computeTotals, getDivisasTotal } from "../store/cartStore";
import { api } from "@/services/api";
import { formatCurrency, formatRate, formatPaymentMethodName } from "@/lib/utils";
import type { PaymentMethodOut as PaymentMethod } from "@/types/api";

interface CheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutDrawer({ open, onClose, onSuccess }: CheckoutDrawerProps) {
  const { toast } = useToast();
  const items = useCartStore((s) => s.items);
  const snapshotTasa = useCartStore((s) => s.snapshotTasa);
  const clearCart = useCartStore((s) => s.clearCart);

  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [references, setReferences] = useState<Record<number, string>>({});
  const [isSplit, setIsSplit] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [divisasMethodIds, setDivisasMethodIds] = useState<Set<number>>(new Set());

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      Promise.all([
        api.getPaymentMethods(true),
        api.getPriceRules({ activo: true }),
      ]).then(([methodsData, rulesData]) => {
        setMethods(methodsData);
        const divisasIds = new Set<number>();
        rulesData.forEach((r) => r.payment_methods.forEach((pm) => divisasIds.add(pm.metodo_pago_id)));
        setDivisasMethodIds(divisasIds);
      }).catch(() => {
        toast("Error al cargar métodos de pago", "error");
        onCloseRef.current();
      });
    }
    if (!open) {
      setAmounts({});
      setReferences({});
      setSaving(false);
      setIsSplit(false);
      setObservaciones("");
      setDivisasMethodIds(new Set());
    }
  }, [open, toast]);

  const tasaNum = snapshotTasa;

  const totals = useMemo(() => computeTotals(items), [items]);
  const totalUsd = useMemo(
    () => totals.monto_exento_usd + totals.base_imponible_usd + totals.monto_iva_usd,
    [totals],
  );
  const totalVes = useMemo(
    () => (tasaNum > 0 ? Math.round(totalUsd * tasaNum * 100) / 100 : 0),
    [totalUsd, tasaNum],
  );

  const setAmount = useCallback((id: number, value: string) =>
    setAmounts((prev) => ({ ...prev, [id]: value })), []);

  const {
    pagadoUSD,
    pagadoVES,
    isPayingVES,
    totalEnMonedaPago,
    pagadoEnMonedaPago,
    restanteEnMonedaPago,
    restanteUSD,
    restanteVES,
    vueltoEnMonedaPago,
    vueltoUSD,
    vueltoVES,
    suficiente,
    progressPct,
  } = useMemo(() => {
    const pUSD = Math.round(methods.reduce((sum, m) => {
      const val = Number(amounts[m.id]) || 0;
      return sum + (m.moneda_default === "VES" ? val / (tasaNum || 1) : val);
    }, 0) * 100) / 100;

    const pVES = Math.round(methods.reduce((sum, m) => {
      const val = Number(amounts[m.id]) || 0;
      return sum + (m.moneda_default === "VES" ? val : val * (tasaNum || 1));
    }, 0) * 100) / 100;

    const payingVES = !methods.some((m) => Number(amounts[m.id]) > 0 && m.moneda_default !== "VES");
    const totalMoneda = payingVES ? totalVes : totalUsd;
    const pagadoMoneda = payingVES ? pVES : pUSD;

    const restanteMoneda = Math.max(0, Math.round((totalMoneda - pagadoMoneda) * 100) / 100);
    const restUSD = payingVES ? Math.round(restanteMoneda / (tasaNum || 1) * 100) / 100 : restanteMoneda;
    const restVES = payingVES ? restanteMoneda : Math.round(restanteMoneda * (tasaNum || 1) * 100) / 100;

    const vueltoMoneda = Math.max(0, Math.round((pagadoMoneda - totalMoneda) * 100) / 100);
    const vUSD = payingVES ? Math.round(vueltoMoneda / (tasaNum || 1) * 100) / 100 : vueltoMoneda;
    const vVES = payingVES ? vueltoMoneda : Math.round(vueltoMoneda * (tasaNum || 1) * 100) / 100;

    const suf = pagadoMoneda >= totalMoneda - 0.01;
    const pct = totalMoneda > 0
      ? Math.min(100, Math.round((pagadoMoneda / totalMoneda) * 10000) / 100)
      : 0;

    return {
      pagadoUSD: pUSD,
      pagadoVES: pVES,
      isPayingVES: payingVES,
      totalEnMonedaPago: totalMoneda,
      pagadoEnMonedaPago: pagadoMoneda,
      restanteEnMonedaPago: restanteMoneda,
      restanteUSD: restUSD,
      restanteVES: restVES,
      vueltoEnMonedaPago: vueltoMoneda,
      vueltoUSD: vUSD,
      vueltoVES: vVES,
      suficiente: suf,
      progressPct: pct,
    };
  }, [methods, amounts, tasaNum, totalUsd, totalVes]);

  const totalDivisasItems = useMemo(() => getDivisasTotal(items), [items]);

  const divisasSummary = useMemo(() => {
    if (totalDivisasItems <= 0) return null;
    const pagadoDivisas = methods
      .filter((m) => divisasMethodIds.has(m.id))
      .reduce((sum, m) => {
        const val = Number(amounts[m.id]) || 0;
        return sum + (m.moneda_default === "VES" ? val / (tasaNum || 1) : val);
      }, 0);
    const faltante = Math.max(0, Math.round((totalDivisasItems - pagadoDivisas) * 100) / 100);
    return { pagadoDivisas, faltante, cubierto: faltante < 0.01 };
  }, [items, methods, amounts, divisasMethodIds, totalDivisasItems, tasaNum]);

  const handleExpressClick = useCallback(
    (m: PaymentMethod) => {
      setAmounts({
        [m.id]: m.moneda_default === "VES" ? totalVes.toFixed(2) : totalUsd.toFixed(2),
      });
    },
    [totalUsd, totalVes],
  );

  const handleConfirm = useCallback(async () => {
    if (!suficiente || saving) return;
    if (tasaNum <= 0) {
      toast("Registra la tasa BCV antes de vender", "error");
      return;
    }
    setSaving(true);
    const currentTasa = useCartStore.getState().snapshotTasa;
    if (currentTasa <= 0) {
      toast("Registra la tasa BCV antes de vender", "error");
      setSaving(false);
      return;
    }

    if (divisasSummary && !divisasSummary.cubierto) {
      toast(`Faltan ${formatCurrency(divisasSummary.faltante, "$ ")} en divisas para cubrir los productos con descuento`, "error");
      setSaving(false);
      return;
    }

    try {
      const pagos = methods
        .map((m) => {
          const raw = Number(amounts[m.id]) || 0;
          const val = Math.max(0, Math.round(raw * 100) / 100);
          const base = m.moneda_default === "VES"
            ? { metodo_pago_id: m.id, monto_usd: 0, monto_ves: val }
            : { metodo_pago_id: m.id, monto_usd: val, monto_ves: 0 };
          if (m.acepta_referencia && references[m.id]?.trim()) {
            (base as Record<string, unknown>).referencia = references[m.id].trim();
          }
          return base;
        })
        .filter((p) => p.monto_usd > 0 || p.monto_ves > 0);

      await api.createSale({
        tasa_bcv_aplicada: currentTasa,
        observaciones: observaciones.trim() || null,
        monto_exento_usd: totals.monto_exento_usd,
        base_imponible_usd: totals.base_imponible_usd,
        monto_iva_usd: totals.monto_iva_usd,
        items: Object.values(items).map((item) => ({
          producto_id: item.producto_id,
          tipo_empaque: item.tipo_empaque,
          cantidad: item.cantidad,
          unidades_descontadas: item.unidades_descontadas,
          precio_unitario_usd: Math.round(item.precio_unitario_usd * 100) / 100,
          iva_porcentaje: item.iva_porcentaje,
          usa_precio_divisas: item.usaPrecioDivisas,
        })),
        pagos,
      });
      toast("Venta registrada", "success");
      clearCart();
      onSuccess();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al registrar venta",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }, [suficiente, saving, tasaNum, totals, items, methods, amounts, observaciones, divisasSummary, toast, clearCart, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && suficiente && !saving) {
        e.preventDefault();
        handleConfirm();
      }
    },
    [handleConfirm, suficiente, saving],
  );

  const hasAnyAmount = Object.values(amounts).some((v) => Number(v) > 0);

  return (
    <Drawer open={open} onClose={onClose} title="Cobro" className="w-[420px]">
      <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
        {/* Header resumen compacto */}
        <div className="bg-slate-50 rounded-xl px-3 py-4 text-center mb-3">
          <div className="text-xl font-bold text-info">{formatCurrency(totalUsd)}</div>
          {tasaNum > 0 && (
            <div className="text-sm font-semibold text-success mt-0.5">
              {formatCurrency(totalVes, "Bs ")}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            Tasa: {formatRate(tasaNum)} | Exento: {formatCurrency(totals.monto_exento_usd)} | Base:{" "}
            {formatCurrency(totals.base_imponible_usd)} | IVA: {formatCurrency(totals.monto_iva_usd)}
          </div>
          {totalDivisasItems > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-emerald-700">
                Productos Divisas: {formatCurrency(totalDivisasItems)}
              </div>
              {divisasSummary && !divisasSummary.cubierto && (
                <div className="text-[10px] text-danger font-semibold mt-0.5">
                  Falta cubrir: {formatCurrency(divisasSummary.faltante)} en divisas
                </div>
              )}
              {divisasSummary && divisasSummary.cubierto && (
                <div className="text-[10px] text-success mt-0.5">
                  Cubierto con divisas
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {!isSplit ? (
            <>
              <p className="text-xs font-semibold text-text-main mb-1.5">Cobro rápido</p>
              <div className={`grid gap-1.5 mb-2 ${methods.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
                {methods.map((m) => {
                  const active = Number(amounts[m.id]) > 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleExpressClick(m)}
                      className={`
                        rounded-lg border-2 px-2 py-2 text-center transition-all duration-150
                        ${
                          active
                            ? "border-brand-blue bg-blue-50 text-brand-blue font-semibold"
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
                <p className="text-[11px] text-slate-400 text-center mb-1">
                  Toca un método para asignar el 100%
                </p>
              )}

              {methods
                .filter((m) => m.acepta_referencia && Number(amounts[m.id]) > 0)
                .map((m) => (
                  <Input
                    key={`ref-${m.id}`}
                    label={`Referencia ${formatPaymentMethodName(m.nombre)}`}
                    type="text"
                    maxLength={20}
                    value={references[m.id] ?? ""}
                    onChange={(e) =>
                      setReferences((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                    placeholder="Número de referencia"
                    className="px-2.5 pt-3 pb-1 text-xs"
                  />
                ))}

              <button
                type="button"
                onClick={() => {
                  setIsSplit(true);
                  if (!hasAnyAmount && methods.length > 0) {
                    handleExpressClick(methods[0]);
                  }
                }}
                className="block text-[11px] text-brand-blue hover:underline mx-auto mb-2"
              >
                Pago dividido / monto exacto?
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1.5">
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

              <div className={`grid gap-1.5 mb-2 ${methods.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
                {methods.map((m) => (
                  <Input
                    key={m.id}
                    label={`${formatPaymentMethodName(m.nombre)} (${m.moneda_default})`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={amounts[m.id] ?? ""}
                    onChange={(e) => setAmount(m.id, e.target.value)}
                    placeholder="0.00"
                    className="px-2.5 pt-3 pb-1 text-xs"
                  />
                ))}
              </div>

              {methods.some((m) => m.acepta_referencia) && (
                <div className="space-y-1.5 mb-2">
                  {methods
                    .filter((m) => m.acepta_referencia && Number(amounts[m.id]) > 0)
                    .map((m) => (
                      <Input
                        key={`ref-${m.id}`}
                        label={`Referencia ${formatPaymentMethodName(m.nombre)}`}
                        type="text"
                        maxLength={20}
                        value={references[m.id] ?? ""}
                        onChange={(e) =>
                          setReferences((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        placeholder="Número de referencia"
                        className="px-2.5 pt-3 pb-1 text-xs"
                      />
                    ))}
                </div>
              )}

              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
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
        <div className="px-1 mb-2">
          <label htmlFor="observaciones" className="block text-[11px] font-medium text-slate-500 mb-0.5">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            rows={1}
            maxLength={255}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue resize-none"
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
            <div className="flex justify-between text-xs text-danger font-semibold">
              <span>Restante</span>
              <span>
                {isPayingVES
                  ? `Bs ${formatCurrency(restanteVES)}`
                  : `${formatCurrency(restanteUSD)} (Bs ${formatCurrency(restanteVES)})`}
              </span>
            </div>
          )}

          {vueltoEnMonedaPago > 0 && (
            <div className="flex justify-between text-xs text-success font-semibold">
              <span>Vuelto</span>
              <span>
                {isPayingVES
                  ? `Bs ${formatCurrency(vueltoVES)}`
                  : `${formatCurrency(vueltoUSD)} / ${formatCurrency(vueltoVES, "Bs ")}`}
              </span>
            </div>
          )}

          <Button
            variant="accent"
            className="w-full !py-1.5 text-sm"
            loading={saving}
            disabled={!suficiente}
            onClick={handleConfirm}
          >
            {suficiente
              ? "Procesar Cobro"
              : isPayingVES
                ? `Faltan Bs ${formatCurrency(restanteVES)}`
                : `Faltan ${formatCurrency(restanteUSD)} (Bs ${formatCurrency(restanteVES)})`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
