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
      className={`cursor-pointer px-3 py-2 text-left font-semibold tracking-wider text-slate-500 uppercase transition-colors select-none hover:bg-slate-100 ${className}`}
      onClick={() => onRequestSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {direction === "asc" ? (
          <ArrowUp className="size-3.5 text-brand-blue" />
        ) : direction === "desc" ? (
          <ArrowDown className="size-3.5 text-brand-blue" />
        ) : (
          <ArrowUpDown className="size-3.5 text-slate-400" />
        )}
      </span>
    </th>
  );
}
