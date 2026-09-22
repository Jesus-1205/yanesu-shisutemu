import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { PaymentMethodOut } from "@/types/api";
import Button from "@/ui-components/Button";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import { useSalesFiltersStore } from "../store/salesFiltersStore";

export default function SalesFilters() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);

  const fechaDesde = useSalesFiltersStore((s) => s.fechaDesde);
  const fechaHasta = useSalesFiltersStore((s) => s.fechaHasta);
  const horaDesde = useSalesFiltersStore((s) => s.horaDesde);
  const horaHasta = useSalesFiltersStore((s) => s.horaHasta);
  const metodoPagoIds = useSalesFiltersStore((s) => s.metodoPagoIds);
  const setField = useSalesFiltersStore((s) => s.setField);
  const clearAll = useSalesFiltersStore((s) => s.clearAll);

  useEffect(() => {
    api.getPaymentMethods(true).then(setPaymentMethods).catch(() => {});
  }, []);

  return (
    <div className="border-b border-slate-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setField("fechaDesde", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setField("fechaHasta", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Hora desde</label>
          <input
            type="time"
            value={horaDesde}
            onChange={(e) => { setField("horaDesde", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">Hora hasta</label>
          <input
            type="time"
            value={horaHasta}
            onChange={(e) => { setField("horaHasta", e.target.value); setField("page", 1); }}
            className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div className="min-w-48">
          <MultiSelectTags
            label="Método de pago"
            selected={metodoPagoIds}
            options={paymentMethods.map((m) => ({ value: m.id, label: m.nombre }))}
            onChange={(ids) => { setField("metodoPagoIds", ids); setField("page", 1); }}
            placeholder="Todos"
          />
        </div>
        {(fechaDesde || fechaHasta || horaDesde || horaHasta || metodoPagoIds.length > 0) && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="mb-0.5">
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
