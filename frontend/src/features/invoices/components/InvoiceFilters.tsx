import { X } from "lucide-react";
import type { SupplierOut } from "@/types/api";
import SearchInput from "@/ui-components/SearchInput";
import Combobox from "@/ui-components/Combobox";
import Select from "@/ui-components/Select";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";
import { useInvoiceFiltersStore } from "../store/invoiceFiltersStore";

interface InvoiceFiltersProps {
  suppliers: SupplierOut[];
}

export default function InvoiceFilters({ suppliers }: InvoiceFiltersProps) {
  const search = useInvoiceFiltersStore((s) => s.search);
  const proveedorId = useInvoiceFiltersStore((s) => s.proveedorId);
  const tipoDocumento = useInvoiceFiltersStore((s) => s.tipoDocumento);
  const estadoPago = useInvoiceFiltersStore((s) => s.estadoPago);
  const sortBy = useInvoiceFiltersStore((s) => s.sortBy);
  const fechaDesde = useInvoiceFiltersStore((s) => s.fechaDesde);
  const fechaHasta = useInvoiceFiltersStore((s) => s.fechaHasta);
  const setField = useInvoiceFiltersStore((s) => s.setField);
  const clearAll = useInvoiceFiltersStore((s) => s.clearAll);

  const hasActiveFilters = search || proveedorId || tipoDocumento || estadoPago || fechaDesde || fechaHasta;

  return (
    <>
      {/* Filtros - Fila 1 */}
      <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs sm:min-w-50 sm:flex-1">
          <SearchInput
            value={search}
            onChange={(e) => { setField("search", e.target.value); setField("page", 1); }}
            onClear={() => { setField("search", ""); setField("page", 1); }}
            placeholder="Buscar factura..."
          />
        </div>
        <div className="w-full sm:w-56">
          <Combobox
            value={proveedorId}
            options={suppliers.map((s) => ({ value: s.id, label: s.nombre }))}
            onChange={(v) => { setField("proveedorId", v ? Number(v) : null); setField("page", 1); }}
            placeholder="Buscar proveedor..."
            allowClear
            clearLabel="Todos"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={tipoDocumento}
            onChange={(e) => { setField("tipoDocumento", e.target.value); setField("page", 1); }}
            options={[
              { value: "", label: "Todos los tipos" },
              { value: "FACTURA", label: "Factura" },
              { value: "NOTA_ENTREGA", label: "Nota de Entrega" },
            ]}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={sortBy}
            onChange={(e) => { setField("sortBy", e.target.value); setField("page", 1); }}
            options={[
              { value: "", label: "Fecha" },
              { value: "fecha_limite_pago", label: "Por vencer" },
              { value: "precio_desc", label: "Mayor a menor precio" },
              { value: "precio_asc", label: "Menor a mayor precio" },
            ]}
          />
        </div>
      </div>

      {/* Filtros - Fila 2: fechas */}
      <div className="mb-3 flex items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setField("fechaDesde", e.target.value); setField("page", 1); }}
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setField("fechaHasta", e.target.value); setField("page", 1); }}
            className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            autoComplete="off"
          />
        </div>
        {(fechaDesde || fechaHasta) && (
          <Button variant="ghost" size="sm" onClick={() => { setField("fechaDesde", ""); setField("fechaHasta", ""); setField("page", 1); }}>
            Limpiar fechas
          </Button>
        )}
      </div>

      {/* Filtros activos */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Filtros activos:</span>
          {search && (
            <Badge variant="neutral" className="gap-1">
              &quot;{search}&quot;
              <button onClick={() => { setField("search", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {proveedorId && (
            <Badge variant="neutral" className="gap-1">
              {suppliers.find((s) => s.id === proveedorId)?.nombre}
              <button onClick={() => { setField("proveedorId", null); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {tipoDocumento && (
            <Badge variant="neutral" className="gap-1">
              {tipoDocumento === "FACTURA" ? "Factura" : "Nota de Entrega"}
              <button onClick={() => { setField("tipoDocumento", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {fechaDesde && (
            <Badge variant="neutral" className="gap-1">
              Desde: {fechaDesde}
              <button onClick={() => { setField("fechaDesde", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {fechaHasta && (
            <Badge variant="neutral" className="gap-1">
              Hasta: {fechaHasta}
              <button onClick={() => { setField("fechaHasta", ""); setField("page", 1); }} className="ml-1 cursor-pointer hover:text-text-main">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpiar todo
          </Button>
        </div>
      )}
    </>
  );
}
