import { useState, useMemo } from "react";
import { Calendar, RotateCcw } from "lucide-react";
import Button from "@/ui-components/Button";
import MultiSelectTags from "@/ui-components/MultiSelectTags";
import { getReportPresetDates, getTodayInCaracas } from "@/lib/utils";
import { useSalesFiltersStore } from "../store/salesFiltersStore";
import { useSalesPaymentMethods } from "../hooks/useSalesPaymentMethods";
import type { SalesDatePreset } from "../types";
import FilterField from "./FilterField";

export interface SalesFiltersProps {
  onPresetChange?: (preset: SalesDatePreset) => void;
}

const PRESET_OPTIONS: { id: SalesDatePreset; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "today", label: "Hoy" },
  { id: "7d", label: "Últimos 7 días" },
  { id: "this_month", label: "Este mes" },
  { id: "custom", label: "Personalizado" },
];

export default function SalesFilters({ onPresetChange }: SalesFiltersProps = {}) {
  const { methods: paymentMethods } = useSalesPaymentMethods();
  const [isCustomSelected, setIsCustomSelected] = useState(false);

  const fechaDesde = useSalesFiltersStore((s) => s.fechaDesde);
  const fechaHasta = useSalesFiltersStore((s) => s.fechaHasta);
  const horaDesde = useSalesFiltersStore((s) => s.horaDesde);
  const horaHasta = useSalesFiltersStore((s) => s.horaHasta);
  const metodoPagoIds = useSalesFiltersStore((s) => s.metodoPagoIds);
  const setField = useSalesFiltersStore((s) => s.setField);
  const clearAll = useSalesFiltersStore((s) => s.clearAll);

  const activePreset: SalesDatePreset = useMemo(() => {
    if (isCustomSelected) return "custom";
    if (!fechaDesde && !fechaHasta) return "all";

    const todayCaracas = getTodayInCaracas();
    const todayIso = new Date().toISOString().split("T")[0];
    if (
      fechaDesde === fechaHasta &&
      (fechaDesde === todayCaracas || fechaDesde === todayIso)
    ) {
      return "today";
    }

    const d7 = getReportPresetDates("7d");
    if (fechaDesde === d7.from && fechaHasta === d7.to) {
      return "7d";
    }

    const dMonth = getReportPresetDates("this_month");
    if (fechaDesde === dMonth.from && fechaHasta === dMonth.to) {
      return "this_month";
    }

    return "custom";
  }, [fechaDesde, fechaHasta, isCustomSelected]);

  const handlePresetClick = (preset: SalesDatePreset) => {
    if (preset === "all") {
      setIsCustomSelected(false);
      setField("fechaDesde", "");
      setField("fechaHasta", "");
    } else if (preset === "today") {
      setIsCustomSelected(false);
      const today = getTodayInCaracas();
      setField("fechaDesde", today);
      setField("fechaHasta", today);
    } else if (preset === "7d") {
      setIsCustomSelected(false);
      const dates = getReportPresetDates("7d");
      setField("fechaDesde", dates.from);
      setField("fechaHasta", dates.to);
    } else if (preset === "this_month") {
      setIsCustomSelected(false);
      const dates = getReportPresetDates("this_month");
      setField("fechaDesde", dates.from);
      setField("fechaHasta", dates.to);
    } else if (preset === "custom") {
      setIsCustomSelected(true);
    }
    setField("page", 1);
    onPresetChange?.(preset);
  };

  const hasActiveFilters = Boolean(
    fechaDesde || fechaHasta || horaDesde || horaHasta || metodoPagoIds.length > 0
  );

  const handleClear = () => {
    setIsCustomSelected(false);
    clearAll();
  };

  return (
    <div className="border-b border-slate-100 p-4 sm:p-5 space-y-4">
      {/* Barra superior de presets rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-surface p-1 text-xs max-w-full overflow-x-auto scrollbar-none flex-nowrap">
          <Calendar className="size-3.5 text-slate-400 ml-1 shrink-0" />
          {PRESET_OPTIONS.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`cursor-pointer shrink-0 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  isActive
                    ? "bg-brand-blue text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel de filtros detallados */}
      <div className="flex flex-wrap items-end gap-3">
        <FilterField
          label="Desde"
          type="date"
          value={fechaDesde}
          onChange={(val) => {
            setIsCustomSelected(false);
            setField("fechaDesde", val);
            setField("page", 1);
          }}
        />
        <FilterField
          label="Hasta"
          type="date"
          value={fechaHasta}
          onChange={(val) => {
            setIsCustomSelected(false);
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
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="mb-0.5 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="size-3.5" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
