import { Outlet } from "react-router-dom";
import Sidebar from "./ui-components/Sidebar";
import BrandLogo from "./ui-components/BrandLogo";
import { ToastProvider } from "./ui-components/Toast";
import { LayoutHeader, LayoutOverlay, useLayoutState } from "./layout";

export default function AppLayout() {
  return (
    <ToastProvider>
      <AppLayoutInner />
    </ToastProvider>
  );
}

function AppLayoutInner() {
  const {
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    isMobile,
    user,
    isOperator,
    sidebarItems,
    handleLogout,
  } = useLayoutState();

  return (
    <div className="min-h-screen bg-background">
      <LayoutOverlay
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

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
          logo={<BrandLogo collapsed={collapsed} />}
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
          onMenuToggle={() => setMobileOpen((prev) => !prev)}
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
