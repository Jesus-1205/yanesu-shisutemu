import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { User } from "../types";

export interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  togglingIds: Set<number>;
  deleteTarget: User | null;
  deleting: boolean;
  fetchUsers: () => Promise<void>;
  handleToggleActive: (user: User) => Promise<void>;
  handleDelete: () => Promise<void>;
  setDeleteTarget: (user: User | null) => void;
}

export function useUsers(): UseUsersReturn {
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

  return {
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
  };
}
