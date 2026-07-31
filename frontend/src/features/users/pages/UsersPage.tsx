import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import type { User } from "../types";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Badge from "@/ui-components/Badge";
import ErrorBanner from "@/ui-components/ErrorBanner";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import { useToast } from "@/ui-components/Toast";

export default function UsersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (user: User) => {
    setTogglingIds((prev) => new Set(prev).add(user.id));
    try {
      const updated = await api.toggleUserActive(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updated : u)),
      );
      toast(
        updated.is_active
          ? `Usuario "${user.username}" activado`
          : `Usuario "${user.username}" desactivado`,
        "success",
      );
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al cambiar estado",
        "error",
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast(`Usuario "${deleteTarget.username}" eliminado`, "success");
      setDeleteTarget(null);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar usuario",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Administra los usuarios del sistema"
        actions={
          <Button variant="accent" onClick={() => navigate("/users/new")}>
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchUsers}>
            {error}
          </ErrorBanner>
        </div>
      )}

      <Table
        columns={[
          { key: "username", header: "Usuario" },
          { key: "email", header: "Email" },
          {
            key: "rol_nombre",
            header: "Rol",
          },
          {
            key: "is_active",
            header: "Estado",
            render: (user: User) => (
              <Badge variant={user.is_active ? "success" : "danger"}>
                {user.is_active ? "Activo" : "Inactivo"}
              </Badge>
            ),
          },
          {
            key: "acciones",
            header: "Acciones",
            exportable: false,
            render: (user: User) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/users/${user.id}`)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={togglingIds.has(user.id)}
                  onClick={() => handleToggleActive(user)}
                >
                  {user.is_active ? (
                    <PowerOff className="w-4 h-4 text-danger" />
                  ) : (
                    <Power className="w-4 h-4 text-success" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(user)}
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            ),
          },
        ]}
        data={users}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyMessage="No hay usuarios registrados"
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
