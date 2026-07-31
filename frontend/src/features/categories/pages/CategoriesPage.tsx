import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { api } from "@/services/api";
import type { Category } from "../types";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import { useToast } from "@/ui-components/Toast";
import { exportToExcel } from "@/lib/exportToExcel";
import CategoryMicroKPIs from "../components/CategoryMicroKPIs";
import CategoryAnalyticsDrawer from "../components/CategoryAnalyticsDrawer";
import { useCategoryAnalytics } from "../hooks/useCategoryAnalytics";
import CreateCategoryModal from "@/features/shared/components/CreateCategoryModal";

const PAGE_SIZE = 20;

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { data: analytics, loading: analyticsLoading } = useCategoryAnalytics();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCategoriesPaginated({ page, page_size: PAGE_SIZE });
      setCategories(res.items);
      setTotalPages(res.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCategory(deleteTarget.id);
      toast(`Categoría "${deleteTarget.nombre}" eliminada`, "success");
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar categoría",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleRowClick = (cat: Category) => {
    setSelectedCategoryId(cat.id);
    setSelectedCategoryName(cat.nombre);
    setDrawerOpen(true);
  };

  const handleCategoryCreated = () => {
    toast(`Categoría creada`, "success");
    setCreateModalOpen(false);
    fetchCategories();
  };

  const exportColumns: Column<Category>[] = [
    { key: "id", header: "ID" },
    { key: "nombre", header: "Nombre" },
    { key: "descripcion", header: "Descripcion" },
  ];

  const handleExportAll = async () => {
    try {
      const allCategories = await api.getCategories();
      exportToExcel({ data: allCategories, columns: exportColumns, filename: "Categorias" });
    } catch {
      toast("Error al exportar categorias", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Administra las categorías de productos"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="w-4 h-4" />
              Descargar Excel
            </Button>
            <Button variant="accent" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Nueva Categoría
            </Button>
          </div>
        }
      />

      <CategoryMicroKPIs data={analytics} loading={analyticsLoading} />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchCategories}>
            {error}
          </ErrorBanner>
        </div>
      )}

      <Table
        columns={[
          { key: "id", header: "ID", hideOnMobile: true },
          { key: "nombre", header: "Nombre" },
          {
            key: "descripcion",
            header: "Descripción",
            hideOnMobile: true,
            render: (cat: Category) => cat.descripcion || "—",
          },
          {
            key: "acciones",
            header: "Acciones",
            render: (cat: Category) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); navigate(`/categories/${cat.id}`); }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(cat); }}
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            ),
          },
        ]}
        data={categories}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyMessage="No hay categorías registradas"
        onRowClick={handleRowClick}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />

      <CategoryAnalyticsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categoryId={selectedCategoryId}
        categoryName={selectedCategoryName}
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
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <CreateCategoryModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCategoryCreated}
      />
    </div>
  );
}
