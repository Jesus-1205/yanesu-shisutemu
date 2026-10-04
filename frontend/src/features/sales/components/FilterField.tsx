import  { useId } from "react";

export interface FilterFieldProps {
  label: string;
  type: "date" | "time" | "text";
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}

export const FilterField = ({
  label,
  type,
  value,
  onChange,
  id,
  className = "",
}: FilterFieldProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase"
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        autoComplete="off"
      />
    </div>
  );
};

export default FilterField;
