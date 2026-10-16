export interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
}

export default function BrandLogo({ collapsed = false, className = "" }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 overflow-hidden ${className}`}>
      {/* Isotipo con estilizado Katakana Ne / Yanesu */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-blue to-blue-500 text-white shadow-xs">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          {/* Geometría estilizada de control e inventario */}
          <path d="M4 7V4h16v3" />
          <path d="M9 20h6" />
          <path d="M12 4v16" />
          <path d="M8 12h8" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col overflow-hidden whitespace-nowrap">
          <span className="text-base font-bold tracking-tight text-slate-900">
            Yanesu Shisutemu
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Control de Inventario
          </span>
        </div>
      )}
    </div>
  );
}
