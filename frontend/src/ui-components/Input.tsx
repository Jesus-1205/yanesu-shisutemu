import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: "md" | "sm";
}

export default function Input({
  label,
  error,
  hint,
  variant = "md",
  className = "",
  disabled,
  id,
  placeholder,
  autoComplete = "off",
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const padding = variant === "sm" ? "px-3 pt-4 pb-1.5 text-sm" : "px-4 pt-5 pb-2 text-sm";
  const labelPos = variant === "sm" ? "left-3" : "left-4";

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="relative">
        <input
          id={inputId}
          placeholder={placeholder ?? " "}
          className={`
            peer w-full rounded-xl border bg-surface ${padding} text-text-main
            transition-all duration-200 outline-none
            ${label && placeholder ? "placeholder-transparent focus:placeholder-slate-400" : ""}
            ${
              disabled
                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                : error
                  ? "border-danger bg-red-50 text-text-main"
                  : "border-slate-300 hover:border-brand-blue focus:border-brand-blue"
            }
            ${className}
          `}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {label && (
          <label
            htmlFor={inputId}
            className={`
              absolute ${labelPos} peer-not-placeholder-shown:scale-75 peer-focus:scale-75 pointer-events-none top-1/2
              z-10 origin-left -translate-y-1/2
              text-sm whitespace-nowrap
              transition-all duration-200 peer-not-placeholder-shown:top-1.5
              peer-not-placeholder-shown:translate-y-0 peer-not-placeholder-shown:bg-surface
              peer-not-placeholder-shown:px-1.5
              peer-focus:top-1.5
              peer-focus:translate-y-0
              peer-focus:bg-surface
              peer-focus:px-1.5
              ${
                disabled
                  ? "text-slate-400"
                  : error
                    ? "text-danger"
                    : "text-slate-500 peer-focus:text-brand-blue"
              }
            `}
          >
            {label}
          </label>
        )}
      </div>
      {error && (
        <span id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className="text-xs text-slate-500">
          {hint}
        </span>
      )}
    </div>
  );
}
