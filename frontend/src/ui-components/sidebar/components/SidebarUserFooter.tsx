import { LogOut } from "lucide-react";
import type { SidebarUserFooterProps } from "../types";

export function SidebarUserFooter({
  user,
  collapsed,
  onLogout,
}: SidebarUserFooterProps) {
  return (
    <div className="border-t border-slate-200 px-2.5 py-3">
      {collapsed ? (
        <div className="flex justify-center">
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger text-white transition-colors hover:bg-red-700"
              aria-label="Cerrar sesión"
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
            <span className="truncate text-sm font-semibold text-text-main">
              {user.name}
            </span>
            <span className="truncate text-xs text-slate-500">{user.email}</span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger text-white transition-colors hover:bg-red-700"
              aria-label="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
