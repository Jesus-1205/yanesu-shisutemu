import { useId, type InputHTMLAttributes } from "react";

interface ToggleSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export default function ToggleSwitch({
  label,
  id,
  className = "",
  ...props
}: ToggleSwitchProps) {
  const uid = useId();
  const inputId = id ?? uid;

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${className}`}
    >
      <span className="relative inline-block w-10 h-[22px]">
        <input
          id={inputId}
          type="checkbox"
          className="hidden peer"
          autoComplete="off"
          {...props}
        />
        <span
          className={`
            absolute inset-0 rounded-full transition-all duration-300 ease-in-out
            bg-slate-200
            peer-checked:bg-accent-orange
          `}
        />
        <span
          className={`
            absolute top-[3px] left-[3px] w-4 h-4 rounded-full
            bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]
            transition-transform duration-300 ease-in-out
            peer-checked:translate-x-[18px]
          `}
        />
      </span>
      {label && <span className="text-sm font-medium text-text-main">{label}</span>}
    </label>
  );
}
