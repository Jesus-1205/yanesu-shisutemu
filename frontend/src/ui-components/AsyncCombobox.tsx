import { useId, useRef, useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface AsyncComboboxOption {
  value: string | number;
  label: string;
  subtitle?: string;
}

interface AsyncComboboxProps {
  label?: string;
  value: string | number | null;
  onSearch: (query: string) => Promise<AsyncComboboxOption[]>;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  clearLabel?: string;
  initialOptions?: AsyncComboboxOption[];
}

export default function AsyncCombobox({
  label,
  value,
  onSearch,
  onChange,
  placeholder = "Buscar...",
  error,
  disabled = false,
  className = "",
  allowClear = true,
  clearLabel = "Ninguno",
  initialOptions = [],
}: AsyncComboboxProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AsyncComboboxOption[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (selected) {
      setQuery(selected.label);
    } else if (!value && !query) {
      setQuery("");
    }
  }, [selected, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const results = await onSearch(searchQuery);
      setOptions(results);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onSearch]);

  useEffect(() => {
    if (!open) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [query, open, performSearch]);

  const q = query.toLowerCase();
  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q))
      )
    : options;

  const handleSelect = (opt: AsyncComboboxOption | null) => {
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
      <div className="relative">
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
          className={`w-full h-9 rounded-lg border bg-surface px-3 pr-8 text-sm text-text-main outline-none transition-all duration-200
            ${disabled ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : ""}
            ${error ? "border-danger bg-red-50" : "border-slate-300 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"}
          `}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>
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
          {!loading && filtered.length === 0 && (
            <li className="px-4 py-2 text-sm text-slate-400">Sin resultados</li>
          )}
          {!loading && filtered.map((opt) => (
            <li
              key={opt.value}
              className={`px-4 py-2 cursor-pointer transition-colors hover:bg-slate-100 ${
                value === opt.value ? "bg-brand-blue/10 font-medium text-brand-blue" : "text-text-main"
              }`}
              onMouseDown={() => handleSelect(opt)}
            >
              <div className="text-sm">{opt.label}</div>
              {opt.subtitle && (
                <div className="text-xs text-slate-400 mt-0.5">{opt.subtitle}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
