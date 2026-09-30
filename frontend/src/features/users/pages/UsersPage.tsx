import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import { useUsers } from "../hooks/useUsers";
import { UsersTable } from "../components/UsersTable";

export default function UsersPage() {
  const navigate = useNavigate();
  const {
    users,
    loading,
    error,
    togglingIds,
    deleteTarget,
    deleting,
    fetchUsers,
    handleToggleActive,
    handleDelete,
    setDeleteTarget,
  } = useUsers();

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Administra los usuarios del sistema"
        actions={
          <Button variant="accent" onClick={() => navigate("/users/new")}>
            <Plus className="size-4" />
            Nuevo Usuario
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchUsers}>{error}</ErrorBanner>
        </div>
      )}

      <UsersTable
        users={users}
        loading={loading}
        togglingIds={togglingIds}
        onEdit={(id) => navigate(`/users/${id}`)}
        onToggleActive={handleToggleActive}
        onDelete={(user) => setDeleteTarget(user)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar usuario"
        message={
          deleteTarget
            ? `¿Estás seguro de eliminar "${deleteTarget.username}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
