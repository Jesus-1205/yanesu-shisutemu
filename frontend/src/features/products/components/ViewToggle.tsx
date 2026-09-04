import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "../types";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
      <button
        onClick={() => onChange("grid")}
        className={`cursor-pointer p-2 transition-colors ${
          view === "grid"
            ? "bg-brand-blue text-white"
            : "bg-surface text-slate-500 hover:bg-slate-100"
        }`}
        aria-label="Vista cuadrícula"
        title="Vista cuadrícula"
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        onClick={() => onChange("table")}
        className={`cursor-pointer p-2 transition-colors ${
          view === "table"
            ? "bg-brand-blue text-white"
            : "bg-surface text-slate-500 hover:bg-slate-100"
        }`}
        aria-label="Vista tabla"
        title="Vista tabla"
      >
        <List className="size-4" />
      </button>
    </div>
  );
}
