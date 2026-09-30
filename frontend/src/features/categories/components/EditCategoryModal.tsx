import type { CategoryOut, CategoryUpdate } from "@/types/api";
import Modal from "@/ui-components/Modal";
import { useUpdateCategory } from "@/features/categories/hooks/useUpdateCategory";
import CreateCategoryForm from "@/features/shared/components/CreateCategoryForm";
import type { Category } from "../types";

interface EditCategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onUpdated: (category: CategoryOut) => void;
}

export default function EditCategoryModal({
  category,
  onClose,
  onUpdated,
}: EditCategoryModalProps) {
  const { saving, error, updateCategory, clearError } = useUpdateCategory({
    onSuccess: (updated) => {
      onUpdated(updated);
      handleClose();
    },
  });

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleSubmit = async (data: CategoryUpdate) => {
    if (!category) return;
    await updateCategory(category.id, data);
  };

  return (
    <Modal
      open={Boolean(category)}
      onClose={handleClose}
      title="Editar Categoría"
    >
      {category && (
        <CreateCategoryForm
          initialData={category}
          submitLabel="Guardar cambios"
          onSubmit={handleSubmit}
          onCancel={handleClose}
          saving={saving}
          error={error}
        />
      )}
    </Modal>
  );
}
