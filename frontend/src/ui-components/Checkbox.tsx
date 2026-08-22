import { useId, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export default function Checkbox({
  label,
  id,
  className = "",
  ...props
}: CheckboxProps) {
  const uid = useId();
  const inputId = id ?? uid;

  return (
    <label className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
      <input id={inputId} type="checkbox" className="hidden peer" autoComplete="off" {...props} />
      <span
        className="
          relative w-[18px] h-[18px] block
          before:absolute before:top-[-15px] before:left-[-15px]
          before:w-12 before:h-12 before:rounded-full
          before:bg-brand-blue/5 before:opacity-0
          before:transition-opacity before:duration-200
          hover:before:opacity-100
          peer-checked:[&_svg]:stroke-brand-blue
          peer-checked:[&_svg_path]:[stroke-dashoffset:60]
          peer-checked:[&_svg_path]:[transition:all_0.3s_linear]
          peer-checked:[&_svg_polyline]:[stroke-dashoffset:42]
          peer-checked:[&_svg_polyline]:[transition:all_0.2s_linear]
          peer-checked:[&_svg_polyline]:[transition-delay:0.15s]
          [&:hover_svg]:stroke-brand-blue
        "
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="
            relative z-10
            stroke-slate-300 stroke-[1.5]
            transition-all duration-200
            [stroke-linecap:round] [stroke-linejoin:round]
            [&_path]:[stroke-dasharray:60] [&_path]:[stroke-dashoffset:0]
            [&_polyline]:[stroke-dasharray:22] [&_polyline]:[stroke-dashoffset:66]
          "
        >
          <path d="M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z" />
          <polyline points="1 9 7 14 15 4" />
        </svg>
      </span>
      {label && (
        <span className="text-sm font-medium text-text-main">{label}</span>
      )}
    </label>
  );
}
