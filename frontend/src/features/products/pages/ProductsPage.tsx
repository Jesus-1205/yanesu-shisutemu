import { Download } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import { useAuth } from "@/features/auth/context/AuthContext";
import QuickEditModal from "../components/QuickEditModal";
import ProductFiltersDrawer from "../components/ProductFiltersDrawer";
import ProductsToolbar from "../components/ProductsToolbar";
import ProductsContent from "../components/ProductsContent";
import { useProductsCatalog, filtersToParams } from "../hooks/useProductsCatalog";
import { useProductsStore } from "../stores/useProductsStore";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";

  const catalog = useProductsCatalog();

  const quickEditProduct = useProductsStore((s) => s.quickEditProduct);
  const closeQuickEdit = useProductsStore((s) => s.closeQuickEdit);
  const deleteTarget = useProductsStore((s) => s.deleteTarget);
  const cancelDelete = useProductsStore((s) => s.cancelDelete);

  return (
    <div>
      <PageHeader
        title={isOperator ? "Inventario" : "Productos"}
        description={
          isOperator
            ? "Consulta el catálogo de productos"
            : "Administra el catálogo de productos"
        }
        actions={
          !isOperator ? (
            <Button variant="outline" onClick={catalog.handleExportAll}>
              <Download className="size-4" />
              Descargar Excel
            </Button>
          ) : undefined
        }
      />

      {catalog.error && (
        <div className="mb-4">
          <ErrorBanner
            onRetry={() =>
              catalog.fetchProducts({
                ...filtersToParams(catalog.filters, catalog.showFavoritesOnly),
                page: catalog.page,
                page_size: PAGE_SIZE,
              })
            }
          >
            {catalog.error}
          </ErrorBanner>
        </div>
      )}

      <ProductsToolbar
        searchRef={catalog.searchRef}
        isOperator={isOperator}
      />

      <ProductsContent
        loading={catalog.loading}
        products={catalog.products}
        totalPages={catalog.totalPages}
        isOperator={isOperator}
        onPageChange={catalog.handlePageChange}
        onToggleFavorite={catalog.handleToggleFavorite}
      />

      <QuickEditModal
        open={quickEditProduct !== null}
        onClose={closeQuickEdit}
        onSaved={() =>
          catalog.fetchProducts(
            filtersToParams(catalog.filters, catalog.showFavoritesOnly),
          )
        }
        product={quickEditProduct}
        role={isOperator ? "operator" : "admin"}
      />

      <ProductFiltersDrawer
        categories={catalog.categories}
        suppliers={catalog.suppliers}
        isOperator={isOperator}
      />

      {!isOperator && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Eliminar producto"
          message={
            deleteTarget
              ? `¿Estás seguro de eliminar "${deleteTarget.nombre}"?`
              : ""
          }
          confirmText="Eliminar"
          loading={catalog.deleting}
          onConfirm={catalog.handleDelete}
          onClose={cancelDelete}
        />
      )}
    </div>
  );
}
