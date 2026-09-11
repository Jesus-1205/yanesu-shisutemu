import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import { useToast } from "@/ui-components/Toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useProductForm } from "../hooks/useProductForm";
import ProductForm from "../components/ProductForm";

export default function ProductNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";
  const [saving, setSaving] = useState(false);

  const productForm = useProductForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = productForm.buildPayload();
      await api.createProduct(payload);
      toast("Producto creado", "success");
      navigate("/products");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al crear producto",
        "error",
      );
    } finally {
      setSaving(false);
    }
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
        form={productForm.form}
        setField={productForm.setField}
        setForm={productForm.setForm}
        numChange={productForm.numChange}
        categories={productForm.categories}
        suppliers={productForm.suppliers}
        precioCostoUnitario={productForm.precioCostoUnitario}
        unitMargin={productForm.unitMargin}
        boxMargin={productForm.boxMargin}
        precioSugerido={productForm.precioSugerido}
        precioSugeridoCaja={productForm.precioSugeridoCaja}
        onCategoryCreated={productForm.onCategoryCreated}
        onSupplierCreated={productForm.onSupplierCreated}
        isOperator={isOperator}
        saving={saving}
        submitLabel="Crear Producto"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/products")}
      />
    </div>
  );
}
