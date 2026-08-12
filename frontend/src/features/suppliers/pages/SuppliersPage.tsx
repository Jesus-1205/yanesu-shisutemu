import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { api } from "@/services/api";
import type { Supplier } from "../types";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Pagination from "@/ui-components/Pagination";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import { useToast } from "@/ui-components/Toast";
import { exportToExcel } from "@/lib/exportToExcel";
import SupplierMicroKPIs from "../components/SupplierMicroKPIs";
import SupplierAnalyticsDrawer from "../components/SupplierAnalyticsDrawer";
import { useSupplierAnalytics } from "../hooks/useSupplierAnalytics";
import CreateSupplierModal from "@/features/shared/components/CreateSupplierModal";

const PAGE_SIZE = 20;

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { data: analytics, loading: analyticsLoading } = useSupplierAnalytics();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSuppliersPaginated({ page, page_size: PAGE_SIZE });
      setSuppliers(res.items);
      setTotalPages(res.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSupplier(deleteTarget.id);
      toast(`Proveedor "${deleteTarget.nombre}" eliminado`, "success");
      setDeleteTarget(null);
      fetchSuppliers();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar proveedor",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleRowClick = useCallback((supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    setSelectedSupplierName(supplier.nombre);
    setDrawerOpen(true);
  }, []);

  const handleSupplierCreated = () => {
    toast(`Proveedor creado`, "success");
    setCreateModalOpen(false);
    fetchSuppliers();
  };

  const exportColumns: Column<Supplier>[] = [
    { key: "id", header: "ID" },
    { key: "nombre", header: "Nombre" },
    { key: "telefono", header: "Teléfono" },
    { key: "email", header: "Email" },
  ];

  const handleExportAll = async () => {
    try {
      const allSuppliers = await api.getSuppliers();
      const name = exportToExcel({ data: allSuppliers, columns: exportColumns, filename: "Proveedores" });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar proveedores", "error");
    }
  };

  const columns: Column<Supplier>[] = useMemo(() => [
    { key: "id", header: "ID" },
    { key: "nombre", header: "Nombre" },
    { key: "telefono", header: "Teléfono", render: (s: Supplier) => s.telefono || "—" },
    { key: "email", header: "Email", render: (s: Supplier) => s.email || "—" },
    {
      key: "acciones",
      header: "Acciones",
      render: (s: Supplier) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Editar proveedor"
            onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${s.id}`); }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
          >
            <Trash2 className="w-4 h-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ], [navigate, setDeleteTarget]);

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Administra los proveedores del sistema"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="w-4 h-4" />
              Descargar Excel
            </Button>
            <Button variant="accent" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </Button>
          </div>
        }
      />

      <SupplierMicroKPIs data={analytics} loading={analyticsLoading} />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchSuppliers}>
            {error}
          </ErrorBanner>
        </div>
      )}

      <Table
        columns={columns}
        data={suppliers}
        keyExtractor={(s) => s.id}
        loading={loading}
        emptyMessage="No hay proveedores registrados"
        onRowClick={handleRowClick}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />

      <SupplierAnalyticsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
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
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <CreateSupplierModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleSupplierCreated}
      />
    </div>
  );
}
