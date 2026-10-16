import type { ReactNode } from "react";

export interface SidebarItem {
  label: string;
  icon?: ReactNode;
  to?: string;
  items?: SidebarItem[];
}

export interface SidebarUser {
  name: string;
  email: string;
  avatar?: string;
}

export interface SidebarProps {
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

export interface SidebarBrandProps {
  brand?: string;
  logo?: ReactNode;
  collapsed: boolean;
}

export interface SidebarToggleButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export interface SidebarUserFooterProps {
  user: SidebarUser;
  collapsed: boolean;
  onLogout?: () => void;
}

export interface SidebarLinkProps {
  item: SidebarItem;
  collapsed: boolean;
}

export interface SidebarDropdownProps {
  item: SidebarItem;
  collapsed: boolean;
  expanded: boolean;
  expandAll: boolean;
  onToggle: () => void;
}
