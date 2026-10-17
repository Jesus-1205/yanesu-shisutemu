import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";
import { useToast } from "../../ui-components/Toast";
import { useExchangeRateStore } from "../../stores/exchangeRateStore";
import { useRateStream } from "../../hooks/useRateStream";
import { formatBs } from "../../lib/text";
import { getSidebarItems, POS_PATH } from "../config/navigation";
import type { SidebarItem } from "../../ui-components/Sidebar";

export interface UseLayoutStateReturn {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  user: ReturnType<typeof useAuth>["user"];
  isOperator: boolean;
  sidebarItems: SidebarItem[];
  handleLogout: () => Promise<void>;
}

export function useLayoutState(): UseLayoutStateReturn {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const loadTasa = useExchangeRateStore((s) => s.loadTasa);

  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const sidebarItems = getSidebarItems(user?.rol_nombre);

  // Responsive breakpoint tracking (< 1024px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carga inicial de tasa
  useEffect(() => {
    loadTasa();
  }, [loadTasa]);

  // Sincronización SSE en vivo de tasa BCV
  useRateStream((newUsd) => {
    toast(`Nueva tasa BCV sincronizada: ${formatBs(newUsd)} Bs/USD`, "info");
  });

  // Auto-colapso al entrar a POS y restauración al salir
  const prevPathRef = useRef<string | null>(null);
  const prePosCollapsedRef = useRef(false);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    const isPos = pathname === POS_PATH;
    const wasPos = prev === POS_PATH;
    if (isPos && !wasPos) {
      prePosCollapsedRef.current = collapsed;
      setCollapsed(true);
    } else if (!isPos && wasPos) {
      setCollapsed(prePosCollapsedRef.current);
    }
  }, [pathname, collapsed]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast("Error al cerrar sesión", "error");
    }
  };

  return {
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    isMobile,
    user,
    isOperator,
    sidebarItems,
    handleLogout,
  };
}
