import { useRef, useEffect } from "react";
import Select from "@/ui-components/Select";
import SearchInput from "@/ui-components/SearchInput";
import type { CategoryOut, SupplierOut } from "@/types/api";
import type { ProductFiltersState, SortField, SortOrder, StockStatus } from "../types";

interface ProductFiltersProps {
  filters: ProductFiltersState;
  onChange: (filters: ProductFiltersState) => void;
  categories: CategoryOut[];
  suppliers: SupplierOut[];
}

const stockOptions = [
  { value: "todos", label: "Todos" },
  { value: "disponible", label: "Disponible" },
  { value: "bajo", label: "Stock Bajo" },
  { value: "agotado", label: "Agotado" },
];

const sortOptions = [
  { value: "nombre_asc", label: "Nombre (A-Z)" },
  { value: "nombre_desc", label: "Nombre (Z-A)" },
  { value: "stock_asc", label: "Stock (Menor-Mayor)" },
  { value: "stock_desc", label: "Stock (Mayor-Menor)" },
  { value: "precio_asc", label: "Precio (Menor-Mayor)" },
  { value: "precio_desc", label: "Precio (Mayor-Menor)" },
];

export default function ProductFilters({
  filters,
  onChange,
  categories,
  suppliers,
}: ProductFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const set = <K extends keyof ProductFiltersState>(key: K, value: ProductFiltersState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const handleSortChange = (raw: string) => {
    const [sortField, sortOrder] = raw.split("_") as [SortField, SortOrder];
    onChange({ ...filters, sortField, sortOrder });
  };

  const sortValue = `${filters.sortField}_${filters.sortOrder}`;

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div className="relative min-w-[240px] flex-1 max-w-sm">
        <SearchInput
          ref={searchRef}
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          onClear={() => set("search", "")}
          placeholder="Buscar nombre o código de barras... (Ctrl+K)"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>

      <div className="w-44">
        <Select
          value={filters.stockStatus}
          onChange={(e) => set("stockStatus", e.target.value as StockStatus)}
          options={stockOptions}
        />
      </div>

      <div className="w-44">
        <Select
          value={sortValue}
          onChange={(e) => handleSortChange(e.target.value)}
          options={sortOptions}
        />
      </div>

      <div className="w-40">
        <Select
          value={filters.tipo_iva}
          onChange={(e) => set("tipo_iva", e.target.value as "" | "GRAVADO" | "EXENTO")}
          options={[
            { value: "", label: "Todo IVA" },
            { value: "GRAVADO", label: "Gravado" },
            { value: "EXENTO", label: "Exento" },
          ]}
        />
      </div>

      <div className="w-40">
        <Select
          value={filters.categoria_ids[0]?.toString() ?? ""}
          onChange={(e) => set("categoria_ids", e.target.value ? [Number(e.target.value)] : [])}
          options={[
            { value: "", label: "Todas las cat." },
            ...categories.map((c) => ({ value: String(c.id), label: c.nombre })),
          ]}
        />
      </div>

      <div className="w-40">
        <Select
          value={filters.proveedor_id?.toString() ?? ""}
          onChange={(e) => set("proveedor_id", e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: "", label: "Todos proveed." },
            ...suppliers.map((s) => ({ value: String(s.id), label: s.nombre })),
          ]}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio min"
          value={filters.precio_min}
          onChange={(e) => set("precio_min", e.target.value === "" ? "" : Number(e.target.value))}
          autoComplete="off"
          className="w-24 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 placeholder:text-slate-400"
        />
        <span className="text-slate-400 text-sm">—</span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio max"
          value={filters.precio_max}
          onChange={(e) => set("precio_max", e.target.value === "" ? "" : Number(e.target.value))}
          autoComplete="off"
          className="w-24 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
