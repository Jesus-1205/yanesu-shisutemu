import { useNavigate } from "react-router-dom";
import type { ProductOut as Product } from "@/types/api";
import Spinner from "@/ui-components/Spinner";
import EmptyState from "@/ui-components/EmptyState";
import Pagination from "@/ui-components/Pagination";
import ProductTable from "./ProductTable";
import ProductGrid from "./ProductGrid";
import {
  useProductsStore,
  selectActiveFiltersCount,
} from "../stores/useProductsStore";

export interface ProductsContentProps {
  loading: boolean;
  products: Product[];
  totalPages: number;
  isOperator?: boolean;
  onPageChange?: (page: number) => void;
  onOpenCreate?: () => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
}

export default function ProductsContent({
  loading,
  products,
  totalPages,
  isOperator = false,
  onPageChange,
  onOpenCreate,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ProductsContentProps) {
  const navigate = useNavigate();

  const view = useProductsStore((s) => s.view);
  const sortField = useProductsStore((s) => s.filters.sortField);
  const sortOrder = useProductsStore((s) => s.filters.sortOrder);
  const handleTableSort = useProductsStore((s) => s.handleTableSort);
  const page = useProductsStore((s) => s.page);
  const setPage = useProductsStore((s) => s.setPage);
  const activeFiltersCount = useProductsStore(selectActiveFiltersCount);
  const openQuickEdit = useProductsStore((s) => s.openQuickEdit);
  const requestDelete = useProductsStore((s) => s.requestDelete);

  const handleEdit = onEdit ?? openQuickEdit;
  const handleDelete = onDelete ?? requestDelete;
  const handlePaginationChange = onPageChange ?? setPage;
  const handleCreate = onOpenCreate ?? (() => navigate("/products/new"));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No hay productos"
        description={
          activeFiltersCount > 0
            ? "Intenta con otros filtros"
            : "Registra tu primer producto"
        }
        actionLabel={activeFiltersCount === 0 ? "Nuevo Producto" : undefined}
        onAction={activeFiltersCount === 0 ? handleCreate : undefined}
      />
    );
  }

  return (
    <>
      {isOperator || view === "table" ? (
        <ProductTable
          products={products}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleFavorite={onToggleFavorite}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortColumn={handleTableSort}
          role={isOperator ? "operator" : "admin"}
        />
      ) : (
        <ProductGrid
          products={products}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleFavorite={onToggleFavorite}
        />
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlePaginationChange}
        className="mt-6"
      />
    </>
  );
}
