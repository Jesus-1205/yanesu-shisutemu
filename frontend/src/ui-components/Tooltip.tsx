import type { ReactNode } from "react";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  side?: TooltipSide;
  children: ReactNode;
  className?: string;
}

const sideStyles: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowStyles: Record<TooltipSide, string> = {
  top: "top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-800",
  left: "left-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-slate-800",
  right: "right-full top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-slate-800",
};

export default function Tooltip({
  content,
  side = "top",
  children,
  className = "",
}: TooltipProps) {
  return (
    <div className={`group relative inline-flex ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`
          pointer-events-none absolute z-50
          opacity-0 transition-opacity
          duration-150 group-hover:opacity-100
          ${sideStyles[side]}
        `}
      >
        <span className="block rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white">
          {content}
        </span>
        <span className={`absolute ${arrowStyles[side]}`} />
      </div>
    </div>
  );
}
