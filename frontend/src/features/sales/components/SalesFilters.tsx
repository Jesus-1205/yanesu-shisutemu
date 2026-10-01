import Button from "@/ui-components/Button";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import { useSalesFiltersStore } from "../store/salesFiltersStore";
import { useSalesPaymentMethods } from "../hooks/useSalesPaymentMethods";
import FilterField from "./FilterField";

export default function SalesFilters() {
  const { methods: paymentMethods } = useSalesPaymentMethods();

  const fechaDesde = useSalesFiltersStore((s) => s.fechaDesde);
  const fechaHasta = useSalesFiltersStore((s) => s.fechaHasta);
  const horaDesde = useSalesFiltersStore((s) => s.horaDesde);
  const horaHasta = useSalesFiltersStore((s) => s.horaHasta);
  const metodoPagoIds = useSalesFiltersStore((s) => s.metodoPagoIds);
  const setField = useSalesFiltersStore((s) => s.setField);
  const clearAll = useSalesFiltersStore((s) => s.clearAll);

  return (
    <div className="border-b border-slate-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <FilterField
          label="Desde"
          type="date"
          value={fechaDesde}
          onChange={(val) => {
            setField("fechaDesde", val);
            setField("page", 1);
          }}
        />
        <FilterField
          label="Hasta"
          type="date"
          value={fechaHasta}
          onChange={(val) => {
            setField("fechaHasta", val);
            setField("page", 1);
          }}
        />
        <FilterField
          label="Hora desde"
          type="time"
          value={horaDesde}
          onChange={(val) => {
            setField("horaDesde", val);
            setField("page", 1);
          }}
        />
        <FilterField
          label="Hora hasta"
          type="time"
          value={horaHasta}
          onChange={(val) => {
            setField("horaHasta", val);
            setField("page", 1);
          }}
        />
        <div className="min-w-48">
          <MultiSelectTags
            label="Método de pago"
            selected={metodoPagoIds}
            options={paymentMethods.map((m) => ({ value: m.id, label: m.nombre }))}
            onChange={(ids) => {
              setField("metodoPagoIds", ids);
              setField("page", 1);
            }}
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
