import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "../types";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all ${
          view === "grid"
            ? "bg-brand-blue text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="Vista cuadrícula"
        title="Vista cuadrícula"
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-all ${
          view === "table"
            ? "bg-brand-blue text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="Vista tabla"
        title="Vista tabla"
      >
        <List className="size-4" />
      </button>
    </div>
  );
}

