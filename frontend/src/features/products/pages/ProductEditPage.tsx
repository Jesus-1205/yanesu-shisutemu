import { useParams, useNavigate } from "react-router-dom";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useProductDetails } from "../hooks/useProductDetails";
import { useProductForm } from "../hooks/useProductForm";
import { useProductMutation } from "../hooks/useProductMutation";
import ProductForm from "../components/ProductForm";

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";

  const { product, loading, error, refetch } = useProductDetails(id);
  const productForm = useProductForm(product);
  const { saving, updateProduct } = useProductMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    const payload = productForm.buildPayload();
    await updateProduct(product.id, payload);
  };

  if (loading || productForm.loadingMeta) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Editar Producto" description="Error al cargar" />
        <div className="mt-4">
          <ErrorBanner onRetry={refetch}>
            {error}
          </ErrorBanner>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <PageHeader title="Editar Producto" description="Producto no encontrado" />
        <p className="mt-4 text-slate-500">El producto solicitado no existe.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/products")}>
          Volver a productos
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Editar: ${product.nombre}`}
        description="Gestión completa del producto"
      />

      <ProductForm
        formAPI={productForm}
        isOperator={isOperator}
        saving={saving}
        submitLabel="Guardar Cambios"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/products")}
      />
    </div>
  );
}
