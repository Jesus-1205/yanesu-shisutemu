import { ChevronLeft } from "lucide-react";
import type { SidebarToggleButtonProps } from "../types";

export function SidebarToggleButton({
  collapsed,
  onToggle,
}: SidebarToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="
        absolute top-[3.5%] right-0 z-40 hidden
        size-7 translate-x-1/2 cursor-pointer items-center
        justify-center rounded-full border
        border-slate-200 bg-white
        text-slate-500 shadow-md transition-all
        duration-300 hover:text-slate-800
        lg:flex
      "
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <ChevronLeft
        size={16}
        className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
      />
    </button>
  );
}
