import { useState } from "react";
import { Plus, Download } from "lucide-react";
import type { Supplier } from "../types";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
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
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="size-4" />
              Descargar Excel
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setEditingSupplierId(null);
                setFormModalOpen(true);
              }}
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
        <SuppliersTable
          suppliers={suppliers}
          loading={loading}
          onRowClick={openDrawer}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />

        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
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
