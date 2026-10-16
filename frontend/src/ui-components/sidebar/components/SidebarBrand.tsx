import type { SidebarBrandProps } from "../types";

export function SidebarBrand({ brand, logo, collapsed }: SidebarBrandProps) {
  if (!brand && !logo) return null;

  return (
    <div
      className={`flex items-center gap-3 overflow-hidden pt-5 pb-4 transition-all duration-300 ${
        collapsed ? "justify-center px-2" : "px-4"
      }`}
    >
      {logo && <span className="shrink-0">{logo}</span>}
      {brand && (
        <span
          className={`
            text-base font-semibold whitespace-nowrap text-text-main
            transition-opacity duration-300
            ${collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"}
          `}
        >
          {brand}
        </span>
      )}
    </div>
  );
}
