import { ChevronLeft, ChevronDown, Search, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface SidebarItem {
  label: string;
  icon?: ReactNode;
  to?: string;
  items?: SidebarItem[];
}

interface SidebarUser {
  name: string;
  email: string;
  avatar?: string;
}

interface SidebarProps {
  items: SidebarItem[];
  brand?: string;
  logo?: ReactNode;
  user?: SidebarUser;
  onLogout?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  expandAll?: boolean;
  forceExpanded?: boolean;
  className?: string;
}

function DefaultIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SidebarLink({
  item,
  collapsed,
}: {
  item: SidebarItem;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={item.to!}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? "bg-brand-blue/10 text-brand-blue"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        }`
      }
      title={collapsed ? item.label : undefined}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        {item.icon || <DefaultIcon />}
      </span>
      <span className={`transition-opacity duration-300 ${collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"}`}>
        {item.label}
      </span>
    </NavLink>
  );
}

function SidebarDropdown({
  item,
  collapsed,
  expanded,
  expandAll,
  onToggle,
}: {
  item: SidebarItem;
  collapsed: boolean;
  expanded: boolean;
  expandAll: boolean;
  onToggle: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showHoverMenu = useCallback(() => {
    if (!collapsed) return;
    clearTimeout(hoverTimeoutRef.current);
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setHoverPos({ top: rect.top, left: rect.right + 8 });
    }
    setIsHovering(true);
  }, [collapsed]);

  const hideHoverMenu = useCallback(() => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => setIsHovering(false), 100);
  }, [collapsed]);

  const keepHoverMenu = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
  }, []);

  const submenuVisible = collapsed ? isHovering : expanded;

  const submenuItems = item.items?.map((sub, i) => (
    <NavLink
      key={i}
      to={sub.to!}
      end
      className={({ isActive }) =>
        `block px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
          isActive
            ? "text-brand-blue font-medium"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
        }`
      }
      onMouseEnter={keepHoverMenu}
      onMouseLeave={hideHoverMenu}
    >
      {sub.label}
    </NavLink>
  ));

  const submenu = (
    <div
      className={`
        z-50 min-w-40 rounded-lg bg-surface py-1 shadow-lg
        transition-all duration-200 ease-in-out
        ${submenuVisible ? "translate-x-0 scale-100 opacity-100" : "pointer-events-none -translate-x-1 scale-95 opacity-0"}
      `}
      style={collapsed ? { position: "fixed" as const, top: hoverPos.top, left: hoverPos.left } : undefined}
      onMouseEnter={keepHoverMenu}
      onMouseLeave={hideHoverMenu}
    >
      {submenuItems}
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
        title={item.label}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          {item.icon || <DefaultIcon />}
        </span>
        <span className={`truncate transition-opacity duration-300 ${collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"}`}>
          {item.label}
        </span>
        {!collapsed && !expandAll && (
          <ChevronDown
            size={14}
            className={`ml-auto transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Submenu — portal when collapsed, inline when expanded */}
      {collapsed
        ? createPortal(submenu, document.body)
        : expanded && (
          <div
            className={`
              max-h-125 overflow-hidden pl-9 opacity-100 transition-all
              duration-300 ease-in-out
            `}
          >
            {submenuItems}
          </div>
        )
      }
    </div>
  );
}

export default function Sidebar({
  items,
  brand = "",
  logo,
  user,
  onLogout,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  expandAll = false,
  forceExpanded = false,
  className = "",
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = forceExpanded ? false : (controlledCollapsed ?? internalCollapsed);
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;
  const [search, setSearch] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(() => {
    if (expandAll) {
      return new Set(items.map((_, i) => i));
    }
    return new Set();
  });

  const toggleSubmenu = (index: number) => {
    if (expandAll) return;
    setExpandedMenus((prev) => {
      const next = new Set<number>();
      if (!prev.has(index)) {
        next.add(index);
      }
      return next;
    });
  };

  const filteredItems = items.filter(
    (item) =>
      !search ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.items?.some((sub) => sub.label.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <aside
      className={`
        relative flex h-dvh flex-col bg-surface
        shadow-[1px_0_10px_rgba(0,0,0,0.08)] transition-all duration-300
        ease-in-out
        ${collapsed ? "w-[4.94rem]" : "w-60"}
        ${className}
      `}
    >
      {/* Toggle button - hidden on mobile, shown on desktop */}
      <button
        onClick={() => setCollapsed(!collapsed)}
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

      {/* Brand */}
      {(brand || logo) && (
        <div className="flex items-center gap-3 overflow-hidden px-4 pt-5 pb-4">
          {logo && <span className="shrink-0">{logo}</span>}
          <span
            className={`
              text-base font-semibold whitespace-nowrap text-text-main
              transition-opacity duration-300
              ${collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"}
            `}
          >
            {brand}
          </span>
        </div>
      )}

      {/* Search */}
      <div className="mb-3 px-3">
        <div
          className={`
            flex cursor-pointer items-center rounded-lg border
            border-slate-300 transition-all duration-300
            ${collapsed ? "justify-start border-transparent px-2.5 py-2 hover:bg-slate-100" : "gap-2 px-2.5 py-1.5 hover:border-slate-500"}
          `}
        >
          <Search size={16} className="shrink-0 text-slate-500" />
          {!collapsed && (
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-text-main outline-none placeholder:text-slate-400"
              autoComplete="off"
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5">
        {filteredItems.map((item, i) =>
          item.items ? (
            <SidebarDropdown
              key={i}
              item={item}
              collapsed={collapsed}
              expanded={expandedMenus.has(i)}
              expandAll={expandAll}
              onToggle={() => toggleSubmenu(i)}
            />
          ) : item.to ? (
            <SidebarLink key={i} item={item} collapsed={collapsed} />
          ) : null
        )}
      </nav>

      {/* Footer / User */}
      {user && (
        <div className="border-t border-slate-200 px-2.5 py-3">
          {collapsed ? (
            <div className="flex justify-center">
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger text-white transition-colors hover:bg-red-700"
                  title="Cerrar sesión"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-slate-500">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden whitespace-nowrap opacity-100">
                <span className="truncate text-sm font-semibold text-text-main" title={user.name}>{user.name}</span>
                <span className="truncate text-xs text-slate-500">{user.email}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger text-white transition-colors hover:bg-red-700"
                  title="Cerrar sesión"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
