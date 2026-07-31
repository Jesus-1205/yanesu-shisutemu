import { Pencil, Trash2 } from "lucide-react";
import Badge from "@/ui-components/Badge";
import Table, { type Column } from "@/ui-components/Table";
import { formatCurrency } from "@/lib/utils";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import type { Product } from "@/types/api";
import type { SortField } from "../types";

interface ProductTableProps {
  products: Product[];
  loading?: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  sortField?: SortField;
  sortOrder?: "asc" | "desc";
  onSortColumn?: (field: SortField) => void;
  role?: "admin" | "operator";
}

export default function ProductTable({
  products, loading, onEdit, onDelete,
  sortField, sortOrder, onSortColumn,
  role = "admin",
}: ProductTableProps) {
  const tasa = useExchangeRateStore((s) => s.tasa);

  const sortable = (field: SortField) => ({
    sortable: true,
    onSort: () => onSortColumn?.(field),
    sortDirection: (sortField === field ? sortOrder : null) as "asc" | "desc" | null,
  });

  const columns: Column<Product>[] = [
    {
      key: "nombre",
      header: "Producto",
      ...sortable("nombre"),
      render: (p: Product) => (
        <div className="min-w-0">
          <p className="font-medium text-text-main truncate max-w-[200px]">{p.nombre}</p>
          {p.codigo_barra && (
            <p className="text-xs text-slate-400 font-mono">{p.codigo_barra}</p>
          )}
        </div>
      ),
    },
    {
      key: "categorias",
      header: "Categorías",
      hideOnMobile: true,
      render: (p: Product) => (
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {p.categories.map((c) => (
            <Badge key={c.id} variant="info">{c.nombre}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      className: "text-center",
      ...(role !== "operator" ? sortable("stock") : {}),
      render: (p: Product) => {
        if (role === "operator") {
          return p.stock_unidades > 0
            ? <Badge variant="success">Disponible</Badge>
            : <Badge variant="danger">Agotado</Badge>;
        }
        if (p.stock_unidades === 0) return <Badge variant="danger">0</Badge>;
        if (p.stock_unidades <= p.stock_minimo) return <Badge variant="warning">{p.stock_unidades}</Badge>;
        return <Badge variant="success">{p.stock_unidades}</Badge>;
      },
    },
    {
      key: "precio",
      header: "Precio USD",
      className: "text-right",
      ...sortable("precio"),
      render: (p: Product) => (
        <span className="font-semibold text-text-main">{formatCurrency(p.precio_unidad_usd)}</span>
      ),
    },
    {
      key: "precio_ves",
      header: "Precio VES",
      className: "text-right",
      hideOnMobile: true,
      render: (p: Product) => (
        <span className="font-semibold text-text-main">{tasa > 0 ? formatCurrency(p.precio_unidad_usd * tasa, "Bs ") : "—"}</span>
      ),
    },
    {
      key: "iva",
      header: "IVA",
      className: "text-center",
      hideOnMobile: true,
      render: (p: Product) => (
        <Badge variant={p.tipo_iva === "GRAVADO" ? "neutral" : "info"}>
          {p.tipo_iva === "GRAVADO" ? "Gravado" : "Exento"}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      exportable: false,
      className: "text-right w-20",
      render: (p: Product) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors cursor-pointer"
            aria-label="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {role === "admin" && (
            <button
              onClick={() => onDelete(p)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
              aria-label="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={products}
      keyExtractor={(p) => p.id}
      loading={loading}
      emptyMessage={loading ? "" : "No hay productos que coincidan con los filtros"}
    />
  );
}
