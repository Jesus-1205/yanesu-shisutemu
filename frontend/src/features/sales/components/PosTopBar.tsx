import type { ChangeEvent, RefObject } from "react";
import { Search } from "lucide-react";
import ToggleSwitch from "@/ui-components/ToggleSwitch";

interface PosTopBarProps {
  search: string;
  searchRef?: RefObject<HTMLInputElement | null>;
  hideNoStock: boolean;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onToggleHideNoStock: (hide: boolean) => void;
}

export default function PosTopBar({
  search,
  searchRef,
  hideNoStock,
  onSearchChange,
  onToggleHideNoStock,
}: PosTopBarProps) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          placeholder="Buscar productos o escanear código de barras..."
          value={search}
          onChange={onSearchChange}
          onFocus={(e) => e.target.select()}
          className="w-full rounded-xl border border-slate-300 bg-surface py-2.5 pr-3 pl-10 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          autoComplete="off"
          autoFocus
        />
      </div>
      <div className="shrink-0">
        <ToggleSwitch
          label="Ocultar sin stock"
          checked={hideNoStock}
          onChange={(e) => onToggleHideNoStock(e.target.checked)}
        />
      </div>
    </div>
  );
}
