import type { RoleOut as Role } from "@/types/api";
import type { UserFormData } from "../hooks/useUserForm";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import Select from "@/ui-components/Select";

export interface UserFormProps {
  form: UserFormData;
  roles: Role[];
  isNew: boolean;
  saving: boolean;
  onChange: (field: keyof UserFormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function UserForm({
  form,
  roles,
  isNew,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: UserFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-slate-200 bg-surface p-6 shadow-xs"
    >
      <Input
        label="Nombre de usuario"
        value={form.username}
        onChange={(e) => onChange("username", e.target.value)}
        placeholder="ej: jperez"
        required
      />

      <Input
        label="Nombre completo"
        value={form.nombre_completo}
        onChange={(e) => onChange("nombre_completo", e.target.value)}
        placeholder="Ej: Juan Pérez"
        required
      />

      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => onChange("email", e.target.value)}
        placeholder="ej: jperez@correo.com"
        required
      />

      <Input
        label={isNew ? "Contraseña" : "Nueva contraseña (dejar vacío para mantener)"}
        type="password"
        value={form.password}
        onChange={(e) => onChange("password", e.target.value)}
        placeholder="••••••••"
        required={isNew}
      />

      <Select
        label="Rol"
        value={form.rol_id}
        onChange={(e) => onChange("rol_id", e.target.value)}
        options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))}
        placeholder="Seleccionar rol"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="accent" loading={saving}>
          {isNew ? "Crear usuario" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
