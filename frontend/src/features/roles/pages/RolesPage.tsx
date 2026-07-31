import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import type { Role, CreateRoleData } from "../types";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import ConfirmDialog from "@/ui-components/ConfirmDialog";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useToast } from "@/ui-components/Toast";

export default function RolesPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRoles();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setEditingRole(null);
    setFormName("");
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormName(role.nombre);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const data: CreateRoleData = { nombre: formName.trim() };
      if (editingRole) {
        await api.updateRole(editingRole.id, data);
        toast("Rol actualizado", "success");
      } else {
        await api.createRole(data);
        toast("Rol creado", "success");
      }
      setModalOpen(false);
      await fetchRoles();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar rol",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteRole(deleteTarget.id);
      toast("Rol eliminado", "success");
      setDeleteTarget(null);
      await fetchRoles();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar rol",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Administra los roles del sistema"
        actions={
          <Button variant="accent" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo Rol
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchRoles}>
            {error}
          </ErrorBanner>
        </div>
      )}

      <Table
        columns={[
          { key: "id", header: "ID" },
          { key: "nombre", header: "Nombre" },
          {
            key: "acciones",
            header: "Acciones",
            exportable: false,
            render: (role: Role) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(role)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(role)}
                >
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            ),
          },
        ]}
        data={roles}
        keyExtractor={(r) => r.id}
        loading={loading}
        emptyMessage="No hay roles registrados"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRole ? "Editar Rol" : "Nuevo Rol"}
      >
        <div className="space-y-4">
          <Input
            label="Nombre del rol"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ej: VENDEDOR"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={handleSave}
              loading={saving}
              disabled={!formName.trim()}
            >
              {editingRole ? "Guardar cambios" : "Crear rol"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar rol"
        message={`¿Eliminar el rol "${deleteTarget?.nombre}"? Los usuarios con este rol quedarán sin rol asignado.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
