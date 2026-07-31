import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { SortConfig, SortDirection } from "@/hooks/useSortableData";

interface SortableHeaderProps<T> {
  label: string;
  sortKey: keyof T;
  currentSortConfig: SortConfig<T> | null;
  onRequestSort: (key: keyof T) => void;
  className?: string;
}

export default function SortableHeader<T>({
  label,
  sortKey,
  currentSortConfig,
  onRequestSort,
  className = "",
}: SortableHeaderProps<T>) {
  const isActive = currentSortConfig?.key === sortKey;
  const direction: SortDirection = isActive ? currentSortConfig.direction : null;

  return (
    <th
      className={`px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none transition-colors ${className}`}
      onClick={() => onRequestSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {direction === "asc" ? (
          <ArrowUp className="w-3.5 h-3.5 text-brand-blue" />
        ) : direction === "desc" ? (
          <ArrowDown className="w-3.5 h-3.5 text-brand-blue" />
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </span>
    </th>
  );
}
