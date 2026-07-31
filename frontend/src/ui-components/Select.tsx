import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md";
}

export default function Select({
  label,
  error,
  options,
  placeholder,
  size = "md",
  className = "",
  disabled,
  ...props
}: SelectProps) {
  const sizes = {
    sm: "pl-2.5 pr-7 py-1 text-xs rounded-md",
    md: "pl-3 pr-8 py-2 text-sm rounded-lg",
  };

  const arrowSizes = {
    sm: "right-2 w-3.5 h-3.5",
    md: "right-2.5 w-4 h-4",
  };

  const base =
    "w-full border transition-colors outline-none bg-surface appearance-none truncate";
  const stateStyles = disabled
    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
    : error
      ? "border-danger bg-red-50 text-text-main"
      : "border-slate-300 text-text-main hover:border-brand-blue focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-text-main">{label}</label>
      )}
      <div className="relative">
        <select
          className={`${base} ${sizes[size]} ${stateStyles} ${className}`}
          disabled={disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className={`absolute ${arrowSizes[size]} top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
