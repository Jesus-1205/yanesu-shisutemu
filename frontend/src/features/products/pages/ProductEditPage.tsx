import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Product } from "@/types/api";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useToast } from "@/ui-components/Toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useProductForm } from "../hooks/useProductForm";
import ProductForm from "../components/ProductForm";

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isOperator = user?.rol_nombre !== "ADMINISTRADOR";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const prod = await api.getProduct(Number(id));
        if (cancelled) return;
        setProduct(prod);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar producto");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const productForm = useProductForm(product);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    try {
      const payload = productForm.buildPayload();
      await api.updateProduct(product.id, payload);
      toast("Producto actualizado", "success");
      navigate("/products");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar producto",
        "error",
      );
    } finally {
      setSaving(false);
    }
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
          <ErrorBanner onRetry={() => window.location.reload()}>
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
        submitLabel="Guardar Cambios"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/products")}
      />
    </div>
  );
}
