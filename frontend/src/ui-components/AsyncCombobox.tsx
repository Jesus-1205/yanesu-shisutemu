import { useId, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const updateDropdownPos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  const selected =
    options.find((o) => o.value === value) ??
    initialOptions.find((o) => o.value === value);

  useEffect(() => {
    if (selected) {
      setQuery(selected.label);
    } else if (value === null || value === undefined) {
      setQuery("");
    }
  }, [selected, value]);

  useEffect(() => {
    if (value == null) return;
    const initial = initialOptions.find((o) => o.value === value);
    if (!initial) return;
    setOptions((prev) =>
      prev.some((o) => o.value === initial.value) ? prev : [initial, ...prev],
    );
  }, [value, initialOptions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && ref.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropdownPos();
    const onScroll = () => updateDropdownPos();
    const onResize = () => updateDropdownPos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updateDropdownPos]);

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
          ref={inputRef}
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
          className={`h-9 w-full rounded-lg border bg-surface px-3 pr-8 text-sm text-text-main transition-all duration-200 outline-none
            ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : ""}
            ${error ? "border-danger bg-red-50" : "border-slate-300 hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"}
          `}
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>
      {open && !disabled && createPortal(
        <ul
          ref={dropdownRef}
          className="fixed z-9999 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-surface shadow-lg"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {allowClear && (
            <li
              className="cursor-pointer px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100"
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
              className={`cursor-pointer px-4 py-2 transition-colors hover:bg-slate-100 ${
                value === opt.value ? "bg-brand-blue/10 font-medium text-brand-blue" : "text-text-main"
              }`}
              onMouseDown={() => handleSelect(opt)}
            >
              <div className="text-sm">{opt.label}</div>
              {opt.subtitle && (
                <div className="mt-0.5 text-xs text-slate-400">{opt.subtitle}</div>
              )}
            </li>
          ))}
        </ul>,
        document.body,
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
