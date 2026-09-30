import type { CategoryOut, CategoryCreate } from "@/types/api";
import Modal from "@/ui-components/Modal";
import { useCreateCategory } from "@/features/categories/hooks/useCreateCategory";
import CreateCategoryForm from "./CreateCategoryForm";

interface CreateCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (category: CategoryOut) => void;
}

export default function CreateCategoryModal({
  open,
  onClose,
  onCreated,
}: CreateCategoryModalProps) {
  const { saving, error, createCategory, clearError } = useCreateCategory({
    onSuccess: (category) => {
      onCreated(category);
      handleClose();
    },
  });

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleSubmit = async (data: CategoryCreate) => {
    await createCategory(data);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Nueva Categoría">
      <CreateCategoryForm
        onSubmit={handleSubmit}
        onCancel={handleClose}
        saving={saving}
        error={error}
      />
    </Modal>
  );
}
