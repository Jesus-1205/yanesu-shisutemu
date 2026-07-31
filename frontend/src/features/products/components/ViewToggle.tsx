import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "../types";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
      <button
        onClick={() => onChange("grid")}
        className={`p-2 transition-colors cursor-pointer ${
          view === "grid"
            ? "bg-brand-blue text-white"
            : "bg-surface text-slate-500 hover:bg-slate-100"
        }`}
        aria-label="Vista cuadrícula"
        title="Vista cuadrícula"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("table")}
        className={`p-2 transition-colors cursor-pointer ${
          view === "table"
            ? "bg-brand-blue text-white"
            : "bg-surface text-slate-500 hover:bg-slate-100"
        }`}
        aria-label="Vista tabla"
        title="Vista tabla"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
