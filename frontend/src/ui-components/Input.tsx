import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  className = "",
  disabled,
  id,
  placeholder,
  autoComplete = "off",
  ...props
}: InputProps) {
  const inputId = id ?? useId();

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="relative">
        <input
          id={inputId}
          placeholder={placeholder ?? " "}
          className={`
            peer w-full rounded-xl border bg-surface px-4 pt-5 pb-2 text-sm text-text-main
            transition-all duration-200 outline-none
            ${label && placeholder ? "placeholder-transparent focus:placeholder-slate-400" : ""}
            ${
              disabled
                ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
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
              absolute left-4 text-sm pointer-events-none
              transition-all duration-200 origin-left
              top-1/2 -translate-y-1/2
              peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-[0.75]
              peer-focus:bg-surface peer-focus:px-1.5
              peer-not-placeholder-shown:top-0
              peer-not-placeholder-shown:-translate-y-1/2
              peer-not-placeholder-shown:scale-[0.75]
              peer-not-placeholder-shown:bg-surface
              peer-not-placeholder-shown:px-1.5
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
