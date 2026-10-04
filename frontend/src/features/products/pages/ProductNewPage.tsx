import { useNavigate } from "react-router-dom";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useProductForm } from "../hooks/useProductForm";
import { useProductMutation } from "../hooks/useProductMutation";
import ProductForm from "../components/ProductForm";

export default function ProductNewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";

  const productForm = useProductForm();
  const { saving, createProduct } = useProductMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = productForm.buildPayload();
    await createProduct(payload);
  };

  if (productForm.loadingMeta) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Nuevo Producto"
        description="Registra un nuevo producto en el inventario"
      />

      <ProductForm
        formAPI={productForm}
        isOperator={isOperator}
        saving={saving}
        submitLabel="Crear Producto"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/products")}
      />
    </div>
  );
}
