import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { User, RoleOut as Role } from "@/types/api";

export interface UserFormData {
  username: string;
  email: string;
  password: string;
  nombre_completo: string;
  rol_id: string;
}

export interface UseUserFormReturn {
  isNew: boolean;
  loading: boolean;
  saving: boolean;
  roles: Role[];
  form: UserFormData;
  handleChange: (field: keyof UserFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const INITIAL_FORM_STATE: UserFormData = {
  username: "",
  email: "",
  password: "",
  nombre_completo: "",
  rol_id: "",
};

export function useUserForm(customId?: string): UseUserFormReturn {
  const params = useParams<{ id?: string }>();
  const id = customId ?? params.id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<UserFormData>(INITIAL_FORM_STATE);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await api.getRoles();
      setRoles(data);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al cargar roles",
        "error",
      );
    }
  }, [toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const fetchUser = useCallback(
    async (userId: number) => {
      setLoading(true);
      try {
        const user: User = await api.getUser(userId);
        setForm({
          username: user.username,
          email: user.email,
          password: "",
          nombre_completo: user.nombre_completo,
          rol_id: String(user.rol_id),
        });
      } catch {
        toast("Error al cargar usuario", "error");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!id) return;
    fetchUser(Number(id));
  }, [id, fetchUser]);

  const handleChange = (field: keyof UserFormData, value: string) => {
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

  return {
    isNew,
    loading,
    saving,
    roles,
    form,
    handleChange,
    handleSubmit,
  };
}
