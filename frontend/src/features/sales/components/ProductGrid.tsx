import type { ProductOut } from "@/types/api";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: ProductOut[];
  tasa: number;
  isOperator: boolean;
  loading: boolean;
  onAddUnit: (product: ProductOut) => void;
  onAddBox: (product: ProductOut) => void;
}

function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-surface p-3.5">
      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
      <div className="space-y-1.5 pt-1">
        <div className="h-6 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-4 w-2/5 animate-pulse rounded border-t border-slate-100 bg-slate-200 pt-1" />
      <div className="flex gap-2 pt-1">
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export default function ProductGrid({
  products,
  tasa,
  isOperator,
  loading,
  onAddUnit,
  onAddBox,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-lg font-medium">No se encontraron productos</p>
        <p className="mt-1 text-sm">Intenta con otra búsqueda</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          tasa={tasa}
          isOperator={isOperator}
          onAddUnit={() => onAddUnit(product)}
          onAddBox={() => onAddBox(product)}
        />
      ))}
    </div>
  );
}
