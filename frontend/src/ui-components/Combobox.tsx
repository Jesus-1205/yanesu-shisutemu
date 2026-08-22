import { useId, useRef, useState, useEffect } from "react";

interface ComboboxOption {
  value: string | number;
  label: string;
}

interface ComboboxProps {
  label?: string;
  value: string | number | null;
  options: ComboboxOption[];
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
}

export default function Combobox({
  label,
  value,
  options,
  onChange,
  placeholder = "Buscar...",
  error,
  disabled = false,
  className = "",
  allowClear = true,
  clearLabel = "Ninguno",
}: ComboboxProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected]);

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
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt: ComboboxOption | null) => {
    onChange(opt?.value ?? null);
    setQuery(opt?.label ?? "");
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-main">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && filtered.length === 1) {
            handleSelect(filtered[0]);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={`w-full h-10 rounded-lg border bg-surface px-3 text-sm text-text-main outline-none transition-all duration-200
          ${disabled ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : ""}
          ${error ? "border-danger bg-red-50" : "border-slate-300 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"}
        `}
      />
      {open && !disabled && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-surface border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {allowClear && (
            <li
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors"
              onMouseDown={() => handleSelect(null)}
            >
              {clearLabel}
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-sm text-slate-400">Sin resultados</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt.value}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors hover:bg-slate-100 ${
                  value === opt.value ? "bg-brand-blue/10 font-medium text-brand-blue" : "text-text-main"
                }`}
                onMouseDown={() => handleSelect(opt)}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
