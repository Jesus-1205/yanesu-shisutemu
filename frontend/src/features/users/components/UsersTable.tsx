import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import type { User } from "../types";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import Badge from "@/ui-components/Badge";

export interface UsersTableProps {
  users: User[];
  loading: boolean;
  togglingIds: Set<number>;
  onEdit: (id: number) => void;
  onToggleActive: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersTable({
  users,
  loading,
  togglingIds,
  onEdit,
  onToggleActive,
  onDelete,
}: UsersTableProps) {
  return (
    <Table
      columns={[
        { key: "username", header: "Usuario" },
        {
          key: "email",
          header: "Email",
          render: (u: User) => (
            <span className="block max-w-50 truncate" title={u.email}>
              {u.email}
            </span>
          ),
        },
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
                onClick={() => onEdit(user.id)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={togglingIds.has(user.id)}
                onClick={() => onToggleActive(user)}
              >
                {user.is_active ? (
                  <PowerOff className="size-4 text-danger" />
                ) : (
                  <Power className="size-4 text-success" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(user)}
              >
                <Trash2 className="size-4 text-danger" />
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
  );
}
