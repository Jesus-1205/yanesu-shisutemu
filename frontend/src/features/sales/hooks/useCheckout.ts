import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/ui-components/Toast";
import { useCartStore, computeTotals, getDivisasTotal } from "../store/cartStore";
import { api } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethodOut as PaymentMethod, SaleItemCreate } from "@/types/api";

interface UseCheckoutProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function useCheckout({ open, onClose, onSuccess }: UseCheckoutProps) {
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
      ])
        .then(([methodsData, rulesData]) => {
          setMethods(methodsData);
          const divisasIds = new Set<number>();
          rulesData.forEach((r) => r.payment_methods.forEach((pm) => divisasIds.add(pm.metodo_pago_id)));
          setDivisasMethodIds(divisasIds);
        })
        .catch(() => {
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
    () => Math.round((totals.monto_exento_usd + totals.base_imponible_usd + totals.monto_iva_usd) * 100) / 100,
    [totals],
  );
  const totalVes = useMemo(
    () => (tasaNum > 0 ? Math.round(totalUsd * tasaNum * 100) / 100 : 0),
    [totalUsd, tasaNum],
  );

  const setAmount = useCallback((id: number, value: string) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
  }, []);

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
    const pagadoDivisas = Math.round(
      methods
        .filter((m) => divisasMethodIds.has(m.id))
        .reduce((sum, m) => {
          const val = Number(amounts[m.id]) || 0;
          return sum + (m.moneda_default === "VES" ? val / (tasaNum || 1) : val);
        }, 0) * 100,
    ) / 100;
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
        items: Object.values(items).flatMap<SaleItemCreate>((item) => {
          if (item.combo_id && item.comboDetalle) {
            return item.comboDetalle.productos.map((p) => ({
              producto_id: p.producto_id,
              tipo_empaque: "UNIDAD" as const,
              cantidad: item.cantidad * p.cantidad,
              unidades_descontadas: item.cantidad * p.cantidad,
              precio_unitario_usd: p.precio_unitario,
              iva_porcentaje: 0,
              usa_precio_divisas: true,
              combo_id: item.combo_id,
              combo_cantidad: item.cantidad,
            }));
          }
          return [{
            producto_id: item.producto_id,
            tipo_empaque: item.tipo_empaque,
            cantidad: item.cantidad,
            unidades_descontadas: item.unidades_descontadas,
            precio_unitario_usd: Math.round(item.precio_unitario_usd * 100) / 100,
            iva_porcentaje: item.iva_porcentaje,
            usa_precio_divisas: item.usaPrecioDivisas,
            combo_id: null,
          }];
        }),
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
  }, [suficiente, saving, tasaNum, totals, items, methods, amounts, references, observaciones, divisasSummary, toast, clearCart, onSuccess]);

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

  return {
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
    financials: {
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
    },
    hasAnyAmount,
    handleExpressClick,
    handleConfirm,
    handleKeyDown,
  };
}
