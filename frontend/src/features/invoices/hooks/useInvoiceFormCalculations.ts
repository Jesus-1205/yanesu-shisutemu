import { useEffect, useMemo } from "react";
import { calcularResumenFiscal, type ResumenFiscal } from "@/lib/iva";
import { useInvoiceFormStore } from "../store/invoiceFormStore";

export interface IvaBreakdown extends ResumenFiscal {
  totalUnidades: number;
}

export interface UseInvoiceFormCalculationsReturn {
  esBs: boolean;
  nTasa: number;
  totalUsd: number;
  totalBs: number;
  ivaBreakdown: IvaBreakdown;
}

export function useInvoiceFormCalculations(): UseInvoiceFormCalculationsReturn {
  const store = useInvoiceFormStore();

  const esBs = store.moneda === "BS";
  const nTasa = store.tasa === "" ? 0 : Number(store.tasa);

  const totalUsd = useMemo(() => {
    if (esBs && nTasa > 0) {
      const totalBsExact =
        Math.round(store.lineItems.reduce((acc, d) => acc + d.subtotal_bs, 0) * 100) / 100;
      return Math.round((totalBsExact / nTasa) * 100) / 100;
    }
    return Math.round(store.lineItems.reduce((acc, d) => acc + d.subtotal_usd, 0) * 100) / 100;
  }, [store.lineItems, nTasa, esBs]);

  const totalBs = useMemo(() => {
    if (!esBs && nTasa > 0) return Math.round(totalUsd * nTasa * 100) / 100;
    return Math.round(store.lineItems.reduce((acc, d) => acc + d.subtotal_bs, 0) * 100) / 100;
  }, [store.lineItems, totalUsd, nTasa, esBs]);

  const ivaBreakdown = useMemo<IvaBreakdown>(() => {
    let totalUnidades = 0;
    for (const item of store.lineItems) {
      totalUnidades +=
        item.tipo_empaque === "CAJA"
          ? item.cantidad * item.unidades_por_caja
          : item.cantidad;
    }
    const resumen = calcularResumenFiscal(
      store.lineItems.map((item) => ({
        subtotal_usd: item.subtotal_usd,
        subtotal_bs: item.subtotal_bs,
        tipo_iva: item.tipo_iva,
      })),
      store.moneda,
      store.aplicaIva,
    );
    return { ...resumen, totalUnidades };
  }, [store.lineItems, store.moneda, store.aplicaIva]);

  useEffect(() => {
    if (nTasa <= 0) return;
    store.recalcAllItems(nTasa);
  }, [nTasa]);

  useEffect(() => {
    if (store.aplicaIva && esBs) {
      store.forceAllItemsGravado();
    }
  }, [store.aplicaIva, esBs]);

  return {
    esBs,
    nTasa,
    totalUsd,
    totalBs,
    ivaBreakdown,
  };
}
