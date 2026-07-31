import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface SplitAddButtonProps {
  onAddUnit: () => void;
  onAddBox: () => void;
  disabled?: boolean;
}

export default function SplitAddButton({
  onAddUnit,
  onAddBox,
  disabled = false,
}: SplitAddButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        onClick={onAddUnit}
        className="px-3 py-1.5 text-xs h-8 font-semibold rounded-l-lg transition-all duration-150 ease-out cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:shadow-none bg-accent-orange text-white hover:bg-orange-700 active:bg-orange-800 shadow-xs hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
      >
        +
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="px-1 h-8 text-[10px] rounded-r-lg border-l border-blue-700 transition-all duration-150 ease-out cursor-pointer hover:bg-blue-800 active:bg-blue-900 bg-brand-blue text-white disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
      >
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[150px] bg-surface rounded-lg border border-slate-200 shadow-lg py-1">
          <button
            type="button"
            onClick={() => {
              onAddBox();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs text-text-main hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Agregar Caja
          </button>
        </div>
      )}
    </div>
  );
}
