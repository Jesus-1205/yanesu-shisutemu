import { useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import type { Supplier } from "../types";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import SearchInput from "@/ui-components/SearchInput";
import { useToast } from "@/ui-components/Toast";
import SupplierMicroKPIs from "../components/SupplierMicroKPIs";
import SupplierAnalyticsDrawer from "../components/SupplierAnalyticsDrawer";
import SuppliersTable from "../components/SuppliersTable";
import { useSupplierAnalytics } from "../hooks/useSupplierAnalytics";
import { useSuppliersList } from "../hooks/useSuppliersList";
import { useDeleteSupplier } from "../hooks/useDeleteSupplier";
import { useExportSuppliers } from "../hooks/useExportSuppliers";
import SupplierFormModal from "@/features/shared/components/SupplierFormModal";

export default function SuppliersPage() {
  const { toast } = useToast();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: analytics, loading: analyticsLoading } = useSupplierAnalytics();
  const {
    suppliers,
    loading,
    error,
    page,
    totalPages,
    setPage,
    refetch,
    drawerOpen,
    selectedSupplierId,
    selectedSupplierName,
    openDrawer,
    closeDrawer,
  } = useSuppliersList();

  const {
    deleteTarget,
    setDeleteTarget,
    deleting,
    confirmDelete,
    cancelDelete,
  } = useDeleteSupplier({
    onSuccess: refetch,
  });

  const { handleExportAll } = useExportSuppliers();

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const term = search.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.nombre.toLowerCase().includes(term) ||
        (s.telefono && s.telefono.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)),
    );
  }, [suppliers, search]);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setFormModalOpen(true);
  };

  const handleSupplierSaved = () => {
    toast(
      editingSupplierId ? "Proveedor actualizado" : "Proveedor creado",
      "success",
    );
    setFormModalOpen(false);
    setEditingSupplierId(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Administra los proveedores del sistema"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAll} className="shadow-xs">
              <Download className="size-4" />
              Descargar Excel
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setEditingSupplierId(null);
                setFormModalOpen(true);
              }}
              className="shadow-xs"
            >
              <Plus className="size-4" />
              Nuevo Proveedor
            </Button>
          </div>
        }
      />

      <SupplierMicroKPIs data={analytics} loading={analyticsLoading} />

      {error && (
        <ErrorBanner onRetry={refetch}>
          {error}
        </ErrorBanner>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Card Header matching Reports & Categories */}
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                Directorio de Proveedores
              </h2>
              <p className="text-xs text-slate-500">
                Haz clic en cualquier proveedor para ver su historial de compras y productos suministrados
              </p>
            </div>
            <div className="w-full sm:w-72">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                placeholder="Buscar por nombre, teléfono o email..."
              />
            </div>
          </div>
        </div>

        <SuppliersTable
          suppliers={filteredSuppliers}
          loading={loading}
          onRowClick={openDrawer}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:flex-row">
          <p className="text-xs font-medium text-slate-500">
            Mostrando <span className="font-semibold text-slate-700">{filteredSuppliers.length}</span> proveedores
          </p>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      <SupplierAnalyticsDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        supplierId={selectedSupplierId}
        supplierName={selectedSupplierName}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar proveedor"
        message={
          deleteTarget
            ? `¿Estás seguro de eliminar "${deleteTarget.nombre}"?`
            : ""
        }
        confirmText="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />

      <SupplierFormModal
        open={formModalOpen}
        supplierId={editingSupplierId}
        onClose={() => {
          setFormModalOpen(false);
          setEditingSupplierId(null);
        }}
        onSuccess={handleSupplierSaved}
      />
    </div>
  );
}
