import { useNavigate } from "react-router-dom";
import { Menu, X, Settings } from "lucide-react";
import Breadcrumbs from "../../ui-components/Breadcrumbs";
import TasaBcvIndicator from "../../ui-components/TasaBcvIndicator";
import { useBreadcrumbs } from "../hooks/useBreadcrumbs";

export interface LayoutHeaderProps {
  onMenuToggle: () => void;
  menuOpen: boolean;
  isOperator: boolean;
}

export function LayoutHeader({
  onMenuToggle,
  menuOpen,
  isOperator,
}: LayoutHeaderProps) {
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-surface px-4 sm:h-16 sm:gap-4 sm:px-6">
      <button
        onClick={onMenuToggle}
        className="shrink-0 cursor-pointer p-1 text-slate-500 transition-colors hover:text-slate-800 lg:hidden"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      {/* Breadcrumbs - hidden on mobile, show last segment as mobile title */}
      <div className="hidden min-w-0 flex-1 sm:block">
        <Breadcrumbs items={crumbs} />
      </div>

      {/* Mobile: show last crumb as page title */}
      {crumbs.length > 0 && (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-main sm:hidden">
          {crumbs[crumbs.length - 1].label}
        </span>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <TasaBcvIndicator />
        {!isOperator && (
          <button
            onClick={() => navigate("/settings")}
            className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title="Configuración"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
