import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { DefaultIcon } from "./DefaultIcon";
import { useTooltipPosition } from "../hooks/useTooltipPosition";
import type { SidebarLinkProps } from "../types";

export function SidebarLink({ item, collapsed }: SidebarLinkProps) {
  const { linkRef, showTooltip, pos, handleMouseEnter, handleMouseLeave, hideTooltip } =
    useTooltipPosition({ collapsed });

  return (
    <>
      <NavLink
        ref={linkRef}
        to={item.to!}
        onClick={hideTooltip}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            isActive
              ? "bg-brand-blue/10 text-brand-blue"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`
        }
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {item.icon || <DefaultIcon />}
        </span>
        <span
          className={`transition-opacity duration-300 ${
            collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
          }`}
        >
          {item.label}
        </span>
      </NavLink>

      {collapsed &&
        showTooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
            }}
            className="pointer-events-none z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-sidebar-tooltip"
          >
            {item.label}
          </div>,
          document.body
        )}
    </>
  );
}
