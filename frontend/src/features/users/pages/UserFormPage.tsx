import { useNavigate } from "react-router-dom";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useUserForm } from "../hooks/useUserForm";
import { UserForm } from "../components/UserForm";

export default function UserFormPage() {
  const navigate = useNavigate();
  const {
    isNew,
    loading,
    saving,
    roles,
    form,
    handleChange,
    handleSubmit,
  } = useUserForm();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={isNew ? "Nuevo Usuario" : "Editar Usuario"}
        description={
          isNew
            ? "Crea un nuevo usuario en el sistema"
            : "Modifica los datos del usuario"
        }
      />

      <UserForm
        form={form}
        roles={roles}
        isNew={isNew}
        saving={saving}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/users")}
      />
    </div>
  );
}
