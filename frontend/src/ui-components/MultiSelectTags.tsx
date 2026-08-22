import { useId, useRef, useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

interface MultiSelectOption {
  value: number;
  label: string;
}

interface MultiSelectTagsProps {
  label?: string;
  selected: number[];
  options: MultiSelectOption[];
  onChange: (selected: number[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function MultiSelectTags({
  label,
  selected,
  options,
  onChange,
  placeholder = "Seleccionar...",
  error,
  disabled = false,
  className = "",
}: MultiSelectTagsProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o.value))
    : options.filter((o) => !selected.includes(o.value));

  const selectedLabels = selected
    .map((id) => options.find((o) => o.value === id))
    .filter(Boolean) as MultiSelectOption[];

  const toggle = (id: number) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
    setQuery("");
  };

  const remove = (id: number) => {
    onChange(selected.filter((s) => s !== id));
  };

  return (
    <div ref={ref} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-main">
          {label}
        </label>
      )}
      <div
        id={inputId}
        onClick={() => !disabled && setOpen(!open)}
        className={`flex flex-wrap items-center gap-1.5 min-h-10 w-full rounded-lg border bg-surface px-3 py-1.5 text-sm cursor-pointer transition-all
          ${disabled ? "border-slate-200 bg-slate-50 cursor-not-allowed" : ""}
          ${error ? "border-danger bg-red-50" : "border-slate-300 hover:border-brand-blue"}
        `}
      >
        {selectedLabels.length > 0 ? (
          selectedLabels.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-medium"
            >
              {opt.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(opt.value); }}
                  className="hover:text-danger transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-slate-400 text-sm">{placeholder}</span>
        )}
        <span className="ml-auto shrink-0">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </div>
      {open && !disabled && (
        <div className="absolute z-50 top-full mt-1 w-full bg-surface border border-slate-200 rounded-xl shadow-lg">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar..."
              className="w-full h-8 px-3 text-sm rounded-lg border border-slate-300 bg-surface outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
              autoComplete="off"
              autoFocus
            />
          </div>
          <ul className="max-h-40 overflow-y-auto pb-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">
                {query ? "Sin resultados" : "No hay más opciones"}
              </li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  onMouseDown={() => toggle(opt.value)}
                  className="px-3 py-2 text-sm text-text-main hover:bg-slate-100 cursor-pointer transition-colors mx-1 rounded-lg"
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
