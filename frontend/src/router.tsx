import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./App";
import PrivateRoute from "./features/auth/components/PrivateRoute";
import RoleGuard from "./features/auth/components/RoleGuard";
import RoleRedirect from "./features/auth/components/RoleRedirect";
import LoginPage from "./features/auth/pages/LoginPage";
import SetupPage from "./features/auth/pages/SetupPage";
import DesignSystemPage from "./features/design-system/pages/DesignSystemPage";

const lazyRoute = (importFn: () => Promise<{ default: React.ComponentType }>) =>
  () => importFn().then(m => ({ Component: m.default }));

const adminOnly = (importFn: () => Promise<{ default: React.ComponentType }>) =>
  () => importFn().then(m => ({
    Component: () => (
      <RoleGuard allowedRoles={["ADMINISTRADOR"]}>
        <m.default />
      </RoleGuard>
    ),
  }));

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/setup",
    element: <SetupPage />,
  },
  {
    path: "/",
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <RoleRedirect /> },
          {
            path: "dashboard",
            lazy: adminOnly(() => import("./features/dashboard/pages/DashboardPage")),
          },
          {
            path: "users",
            lazy: adminOnly(() => import("./features/users/pages/UsersPage")),
          },
          {
            path: "users/new",
            lazy: adminOnly(() => import("./features/users/pages/UserFormPage")),
          },
          {
            path: "users/:id",
            lazy: adminOnly(() => import("./features/users/pages/UserFormPage")),
          },
          {
            path: "roles",
            lazy: adminOnly(() => import("./features/roles/pages/RolesPage")),
          },
          {
            path: "products",
            lazy: lazyRoute(() => import("./features/products/pages/ProductsPage")),
          },
          {
            path: "products/new",
            lazy: lazyRoute(() => import("./features/products/pages/ProductNewPage")),
          },
          {
            path: "products/:id/edit",
            lazy: lazyRoute(() => import("./features/products/pages/ProductEditPage")),
          },
          {
            path: "categories",
            lazy: adminOnly(() => import("./features/categories/pages/CategoriesPage")),
          },
          {
            path: "categories/:id",
            lazy: adminOnly(() => import("./features/categories/pages/CategoryFormPage")),
          },
          {
            path: "suppliers",
            lazy: adminOnly(() => import("./features/suppliers/pages/SuppliersPage")),
          },
          {
            path: "suppliers/:id",
            lazy: adminOnly(() => import("./features/suppliers/pages/SupplierFormPage")),
          },
          {
            path: "invoices",
            lazy: adminOnly(() => import("./features/invoices/pages/InvoicesPage")),
          },
          {
            path: "invoices/new",
            lazy: lazyRoute(() => import("./features/invoices/pages/InvoiceNewPage")),
          },
          {
            path: "invoices/:id",
            lazy: adminOnly(() => import("./features/invoices/pages/InvoiceDetailPage")),
          },
          {
            path: "sales",
            lazy: lazyRoute(() => import("./features/sales/pages/SalesPage")),
          },
          {
            path: "sales/new",
            lazy: lazyRoute(() => import("./features/sales/pages/POSPage")),
          },
          {
            path: "sales/:id",
            lazy: lazyRoute(() => import("./features/sales/pages/SaleDetailPage")),
          },
          {
            path: "payment-methods",
            lazy: adminOnly(() => import("./features/payment-methods/pages/PaymentMethodsPage")),
          },
          {
            path: "exchange-rates",
            lazy: lazyRoute(() => import("./features/exchange-rates/pages/ExchangeRatesPage")),
          },
          {
            path: "reports",
            lazy: adminOnly(() => import("./features/reports/pages/ReportsPage")),
          },
          {
            path: "settings",
            lazy: adminOnly(() => import("./features/settings/components/SettingsLayout")),
            children: [
              {
                index: true,
                lazy: adminOnly(() => import("./features/settings/pages/SettingsPage")),
              },
              {
                path: "users",
                lazy: adminOnly(() => import("./features/settings/pages/SettingsUsersPage")),
              },
              {
                path: "payment-methods",
                lazy: adminOnly(() => import("./features/settings/pages/SettingsPaymentMethodsPage")),
              },

              {
                path: "system",
                lazy: adminOnly(() => import("./features/settings/pages/SettingsSystemPage")),
              },
            ],
          },
          {
            path: "ui-components",
            element: <DesignSystemPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    lazy: lazyRoute(() => import("./features/not-found/pages/NotFoundPage")),
  },
]);
