import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";
import { createPortal } from "react-dom";
import { DefaultIcon } from "./DefaultIcon";
import { useHoverFlyout } from "../hooks/useHoverFlyout";
import type { SidebarDropdownProps } from "../types";

export function SidebarDropdown({
  item,
  collapsed,
  expanded,
  expandAll,
  onToggle,
}: SidebarDropdownProps) {
  const {
    btnRef,
    isHovering,
    hoverPos,
    showHoverMenu,
    hideHoverMenu,
    keepHoverMenu,
    closeHoverMenu,
  } = useHoverFlyout({ collapsed });

  const submenuItems = item.items?.map((sub, i) => (
    <NavLink
      key={i}
      to={sub.to!}
      end
      className={({ isActive }) =>
        `block px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
          isActive
            ? "text-brand-blue font-medium bg-brand-blue/10"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
        }`
      }
    >
      {sub.label}
    </NavLink>
  ));

  const flyoutMenu = (
    <div
      className="z-50 min-w-44 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl animate-sidebar-flyout"
      style={{ position: "fixed", top: hoverPos.top, left: hoverPos.left }}
      onMouseEnter={keepHoverMenu}
      onMouseLeave={hideHoverMenu}
    >
      <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {item.label}
      </div>
      <div className="pt-1 space-y-0.5">
        {item.items?.map((sub, i) => (
          <NavLink
            key={i}
            to={sub.to!}
            end
            onClick={closeHoverMenu}
            className={({ isActive }) =>
              `block px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-brand-blue/10 text-brand-blue font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`
            }
          >
            {sub.label}
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="relative"
      onMouseEnter={showHoverMenu}
      onMouseLeave={hideHoverMenu}
    >
      <button
        ref={btnRef}
        onClick={onToggle}
        className={`
          flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
          ${expanded ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}
        `}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {item.icon || <DefaultIcon />}
        </span>
        <span
          className={`truncate transition-opacity duration-300 ${
            collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
          }`}
        >
          {item.label}
        </span>
        {!collapsed && !expandAll && (
          <ChevronDown
            size={14}
            className={`ml-auto transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Submenú: portal flotante en colapsado, acordeón Grid en expandido */}
      {collapsed
        ? isHovering && createPortal(flyoutMenu, document.body)
        : expanded && (
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden pl-7 space-y-0.5">
                {submenuItems}
              </div>
            </div>
          )}
    </div>
  );
}
