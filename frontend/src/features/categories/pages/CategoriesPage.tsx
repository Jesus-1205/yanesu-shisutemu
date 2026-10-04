import { useCallback, useState } from "react";
import { Plus, Download } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import SearchInput from "@/ui-components/SearchInput";
import { useToast } from "@/ui-components/Toast";
import CategoryMicroKPIs from "../components/CategoryMicroKPIs";
import CategoryAnalyticsDrawer from "../components/CategoryAnalyticsDrawer";
import CategoriesTable from "../components/CategoriesTable";
import EditCategoryModal from "../components/EditCategoryModal";
import { useCategoryAnalytics } from "../hooks/useCategoryAnalytics";
import { useCategoriesList } from "../hooks/useCategoriesList";
import { useDeleteCategory } from "../hooks/useDeleteCategory";
import { useExportCategories } from "../hooks/useExportCategories";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";
import type { Category } from "../types";

export default function CategoriesPage() {
  const { toast } = useToast();

  const {
    categories,
    loading,
    error,
    page,
    totalPages,
    search,
    setSearch,
    setPage,
    refetch,
  } = useCategoriesList();

  const { handleExportAll } = useExportCategories();
  const {
    data: analytics,
    loading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useCategoryAnalytics();

  const refreshAll = useCallback(() => {
    refetch();
    refetchAnalytics();
  }, [refetch, refetchAnalytics]);

  const {
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
  } = useDeleteCategory({ onSuccess: refreshAll });

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleRowClick = useCallback((cat: Category) => {
    setSelectedCategory(cat);
  }, []);

  const handleEdit = useCallback(
    (cat: Category) => {
      setCategoryToEdit(cat);
    },
    [],
  );

  const handleCategoryCreated = () => {
    toast(`Categoría creada`, "success");
    setCreateModalOpen(false);
    refreshAll();
  };

  const handleCategoryUpdated = () => {
    toast(`Categoría actualizada`, "success");
    setCategoryToEdit(null);
    refreshAll();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Administra las categorías de productos"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="size-4" />
              Descargar Excel
            </Button>
            <Button variant="accent" onClick={() => setCreateModalOpen(true)}>
              <Plus className="size-4" />
              Nueva Categoría
            </Button>
          </div>
        }
      />

      <CategoryMicroKPIs data={analytics} loading={analyticsLoading} />

      {error && (
        <ErrorBanner onRetry={refreshAll}>
          {error}
        </ErrorBanner>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="w-full max-w-md">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Buscar categoría por nombre o descripción..."
            />
          </div>
        </div>

        <CategoriesTable
          categories={categories}
          loading={loading}
          onRowClick={handleRowClick}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />

        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <CategoryAnalyticsDrawer
        open={Boolean(selectedCategory)}
        onClose={() => setSelectedCategory(null)}
        categoryId={selectedCategory?.id ?? null}
        categoryName={selectedCategory?.nombre ?? ""}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar categoría"
        message={
          deleteTarget
            ? `¿Estás seguro de eliminar "${deleteTarget.nombre}"?`
            : ""
        }
        confirmText="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <CreateCategoryModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCategoryCreated}
      />

      <EditCategoryModal
        category={categoryToEdit}
        onClose={() => setCategoryToEdit(null)}
        onUpdated={handleCategoryUpdated}
      />
    </div>
  );
}
