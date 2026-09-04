import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Settings,
  DollarSign,
  BarChart3,
  Tags,
} from "lucide-react";
import Sidebar, { type SidebarItem } from "./ui-components/Sidebar";
import Breadcrumbs, { type Crumb } from "./ui-components/Breadcrumbs";
import { ToastProvider, useToast } from "./ui-components/Toast";
import { useAuth } from "./features/auth/context/AuthContext";
import TasaBcvIndicator from "./ui-components/TasaBcvIndicator";
import { useExchangeRateStore } from "./stores/exchangeRateStore";
import { api } from "./services/api";

const adminSidebarItems: SidebarItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={18} />, to: "/dashboard" },
  {
    label: "VENTAS",
    icon: <ShoppingCart size={18} />,
    items: [
      { label: "Punto de Venta (POS)", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  {
    label: "INVENTARIO",
    icon: <Package size={18} />,
    items: [
      { label: "Productos", to: "/products" },
      { label: "Combos", to: "/combos" },
    ],
  },
  {
    label: "CATÁLOGO",
    icon: <Tags size={18} />,
    items: [
      { label: "Categorías", to: "/categories" },
      { label: "Precios Div.", to: "/price-rules" },
    ],
  },
  { label: "Facturas", icon: <Truck size={18} />, to: "/buys" },
  { label: "Tasas de Cambio", icon: <DollarSign size={18} />, to: "/exchange-rates" },
  { label: "Reportes", icon: <BarChart3 size={18} />, to: "/reports" },
];

const operatorSidebarItems: SidebarItem[] = [
  {
    label: "OPERACIONES",
    icon: <ShoppingCart size={18} />,
    items: [
      { label: "Nueva Venta", to: "/sales/new" },
      { label: "Historial de Ventas", to: "/sales" },
    ],
  },
  { label: "Consulta de Productos", icon: <Package size={18} />, to: "/products" },
  { label: "Tasas de Cambio", icon: <DollarSign size={18} />, to: "/exchange-rates" },
];

function getSidebarItems(rolNombre: string | undefined): SidebarItem[] {
  if (rolNombre === "ADMINISTRADOR") {
    return adminSidebarItems;
  }
  return operatorSidebarItems;
}

const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  compras: "Compras",
  products: "Productos",
  categories: "Categorías",
  suppliers: "Proveedores",
  sales: "Ventas",
  users: "Usuarios",
  roles: "Roles",
  "exchange-rates": "Tasas de Cambio",
  reports: "Reportes",
  invoices: "Facturas de Compra",
  "payment-methods": "Métodos de Pago",
  "price-rules": "Precios Div.",
  "combos": "Combos",
  settings: "Configuración",
  system: "API Keys",
  new: "Nuevo",
};

/** Ruta del Punto de Venta: al entrar, el sidebar se colapsa para ganar espacio de trabajo. */
const POS_PATH = "/sales/new";

function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const isProductEdit = segments[0] === "products" && segments.length === 3 && segments[2] === "edit";
  const productId = isProductEdit ? segments[1] : null;

  useEffect(() => {
    if (productId && !entityNames[productId] && !requestedRef.current.has(productId)) {
      requestedRef.current.add(productId);
      api.getProduct(Number(productId))
        .then((p) => setEntityNames((prev) => ({ ...prev, [productId]: p.nombre })))
        .catch(() => setEntityNames((prev) => ({ ...prev, [productId]: `#${productId}` })));
    }
  }, [productId, entityNames]);

  const crumbs = useMemo<Crumb[]>(() => {
    const result: Crumb[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (i === 1 && isProductEdit && productId) {
        const name = entityNames[productId] || `Producto #${productId}`;
        result.push({ label: name });
        continue;
      }

      const label = breadcrumbMap[segment] ?? segment;
      if (i < segments.length - 1) {
        result.push({ label, href: `/${segments.slice(0, i + 1).join("/")}` });
      } else {
        result.push({ label });
      }
    }
    return result;
  }, [segments, isProductEdit, productId, entityNames]);
  return crumbs;
}

function LayoutHeader({
  onMenuToggle,
  menuOpen,
  isOperator,
}: {
  onMenuToggle: () => void;
  menuOpen: boolean;
  isOperator: boolean;
}) {
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

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const loadTasa = useExchangeRateStore((s) => s.loadTasa);
  const checkDailyStatus = useExchangeRateStore((s) => s.checkDailyStatus);
  const { user } = useAuth();

  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const sidebarItems = getSidebarItems(user?.rol_nombre);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadTasa();
  }, [loadTasa]);

  useEffect(() => {
    checkDailyStatus();
    const interval = setInterval(checkDailyStatus, 60_000);
    return () => clearInterval(interval);
  }, [checkDailyStatus]);

  return (
    <ToastProvider>
      <AppLayoutInner
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isMobile={isMobile}
        user={user}
        isOperator={isOperator}
        sidebarItems={sidebarItems}
      />
    </ToastProvider>
  );
}

function AppLayoutInner({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  isMobile,
  user,
  isOperator,
  sidebarItems,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  isMobile: boolean;
  user: ReturnType<typeof useAuth>["user"];
  isOperator: boolean;
  sidebarItems: SidebarItem[];
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  const { pathname } = useLocation();
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
  }, [pathname, collapsed, setCollapsed]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      toast("Error al cerrar sesión", "error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-30 overflow-y-auto pr-4
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar
          items={sidebarItems}
          brand="Yanesu Shisutemu"
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          expandAll={isOperator}
          forceExpanded={isMobile && mobileOpen}
          user={user ? { name: user.nombre_completo || user.username, email: user.email } : undefined}
          onLogout={handleLogout}
        />
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? "lg:ml-[4.94rem]" : "lg:ml-60"
        }`}
      >
        <LayoutHeader
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
          menuOpen={mobileOpen}
          isOperator={isOperator}
        />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
