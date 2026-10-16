import { useSidebarCollapse } from "./sidebar/hooks/useSidebarCollapse";
import { useSidebarAccordion } from "./sidebar/hooks/useSidebarAccordion";
import { SidebarBrand } from "./sidebar/components/SidebarBrand";
import { SidebarToggleButton } from "./sidebar/components/SidebarToggleButton";
import { SidebarLink } from "./sidebar/components/SidebarLink";
import { SidebarDropdown } from "./sidebar/components/SidebarDropdown";
import { SidebarUserFooter } from "./sidebar/components/SidebarUserFooter";
import type { SidebarProps, SidebarItem, SidebarUser } from "./sidebar/types";

export type { SidebarItem, SidebarUser, SidebarProps };

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
  const { collapsed, toggleCollapsed } = useSidebarCollapse({
    controlledCollapsed,
    onCollapsedChange,
    forceExpanded,
  });

  const { isExpanded, toggleSubmenu } = useSidebarAccordion({
    itemCount: items.length,
    expandAll,
  });

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
      <SidebarToggleButton collapsed={collapsed} onToggle={toggleCollapsed} />

      <SidebarBrand brand={brand} logo={logo} collapsed={collapsed} />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5">
        {items.map((item, i) =>
          item.items ? (
            <SidebarDropdown
              key={i}
              item={item}
              collapsed={collapsed}
              expanded={isExpanded(i)}
              expandAll={expandAll}
              onToggle={() => toggleSubmenu(i)}
            />
          ) : item.to ? (
            <SidebarLink key={i} item={item} collapsed={collapsed} />
          ) : null
        )}
      </nav>

      {user && (
        <SidebarUserFooter
          user={user}
          collapsed={collapsed}
          onLogout={onLogout}
        />
      )}
    </aside>
  );
}
