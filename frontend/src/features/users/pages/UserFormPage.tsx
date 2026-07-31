import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services/api";
import type { User } from "@/types/api";
import type { Role } from "@/features/roles/types";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import Select from "@/ui-components/Select";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useToast } from "@/ui-components/Toast";

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    nombre_completo: "",
    rol_id: "",
  });

  useEffect(() => {
    api.getRoles().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    api
      .getUser(Number(id))
      .then((user: User) => {
        setForm({
          username: user.username,
          email: user.email,
          password: "",
          nombre_completo: user.nombre_completo,
          rol_id: String(user.rol_id),
        });
      })
      .catch(() => toast("Error al cargar usuario", "error"))
      .finally(() => setLoading(false));
  }, [id, isNew, toast]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await api.createUser({
          username: form.username,
          email: form.email,
          password: form.password,
          nombre_completo: form.nombre_completo,
          rol_id: Number(form.rol_id),
        });
        toast("Usuario creado", "success");
      } else {
        await api.updateUser(Number(id), {
          username: form.username || undefined,
          email: form.email || undefined,
          password: form.password || undefined,
          nombre_completo: form.nombre_completo || undefined,
          rol_id: form.rol_id ? Number(form.rol_id) : undefined,
        });
        toast("Usuario actualizado", "success");
      }
      navigate("/users");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar usuario",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title={isNew ? "Nuevo Usuario" : "Editar Usuario"}
        description={
          isNew ? "Crea un nuevo usuario en el sistema" : "Modifica los datos del usuario"
        }
      />

      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-xl border border-slate-200 shadow-xs p-6 space-y-5"
      >
        <Input
          label="Nombre de usuario"
          value={form.username}
          onChange={(e) => handleChange("username", e.target.value)}
          placeholder="ej: jperez"
          required
        />

        <Input
          label="Nombre completo"
          value={form.nombre_completo}
          onChange={(e) => handleChange("nombre_completo", e.target.value)}
          placeholder="Ej: Juan Pérez"
          required
        />

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="ej: jperez@correo.com"
          required
        />

        <Input
          label={isNew ? "Contraseña" : "Nueva contraseña (dejar vacío para mantener)"}
          type="password"
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          placeholder="••••••••"
          required={isNew}
        />

        <Select
          label="Rol"
          value={form.rol_id}
          onChange={(e) => handleChange("rol_id", e.target.value)}
          options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))}
          placeholder="Seleccionar rol"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/users")}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="accent" loading={saving}>
            {isNew ? "Crear usuario" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
