import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import type { Sale, SaleItem, SalePayment } from "../types";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Table from "@/ui-components/Table";
import Spinner from "@/ui-components/Spinner";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency, formatPaymentMethodName, formatRate } from "@/lib/utils";

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSale(Number(id))
      .then(setSale)
      .catch(() => toast("Error al cargar venta", "error"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-20 text-slate-500">
        Venta no encontrada
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate("/sales")}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </div>

      <PageHeader
        title={`Venta #${sale.id}`}
        description={new Date(sale.fecha_venta).toLocaleString("es-VE")}
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Usuario</p>
          <p className="text-lg font-semibold">{sale.usuario_nombre || `Usuario #${sale.usuario_id}`}</p>
        </div>
        <div className="bg-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Tasa BCV</p>
          <p className="text-lg font-semibold">{formatRate(sale.tasa_bcv_aplicada)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total USD</p>
          <p className="text-lg font-semibold text-info">{formatCurrency(sale.total_usd)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total VES</p>
          <p className="text-lg font-semibold text-success">{formatCurrency(sale.total_ves, "Bs ")}</p>
        </div>
        <div className="bg-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Método de Pago</p>
          <p className="text-lg font-semibold">{sale.metodo_pago ? sale.metodo_pago.split(", ").map(formatPaymentMethodName).join(", ") : "-"}</p>
        </div>
      </div>

      {sale.observaciones && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">Observaciones</p>
          <p className="text-sm text-amber-900">{sale.observaciones}</p>
        </div>
      )}

      <Table
        columns={[
          {
            key: "producto_nombre",
            header: "Producto",
            render: (i: SaleItem) => i.producto_nombre || `Producto #${i.producto_id}`,
          },
          { key: "tipo_empaque", header: "Empaque" },
          { key: "cantidad", header: "Cantidad" },
          { key: "unidades_descontadas", header: "Unds." },
          {
            key: "precio_unitario_usd",
            header: "Precio Ud.",
            render: (i: SaleItem) => formatCurrency(i.precio_unitario_usd),
          },
          {
            key: "subtotal_usd",
            header: "Subtotal",
            render: (i: SaleItem) => formatCurrency(i.subtotal_usd),
          },
          {
            key: "iva_porcentaje",
            header: "IVA %",
            render: (i: SaleItem) => `${i.iva_porcentaje}%`,
          },
        ]}
        data={sale.items}
        keyExtractor={(i) => i.id}
        emptyMessage="Sin items"
      />

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-text-main mb-2">Pagos</h3>
        <Table
          columns={[
            { key: "metodo_pago_nombre", header: "Método", render: (p: SalePayment) => formatPaymentMethodName(p.metodo_pago_nombre) },
            {
              key: "referencia",
              header: "Referencia",
              render: (p: SalePayment) => p.referencia || "-",
            },
            {
              key: "monto_usd",
              header: "Monto USD",
              render: (p: SalePayment) => formatCurrency(p.monto_usd),
            },
            {
              key: "monto_ves",
              header: "Monto VES",
              render: (p: SalePayment) => formatCurrency(p.monto_ves, "Bs "),
            },
          ]}
          data={sale.pagos}
          keyExtractor={(p) => p.id}
          emptyMessage="Sin pagos registrados"
        />
      </div>

      <div className="mt-6 bg-surface rounded-xl border border-slate-200 p-5 space-y-2 max-w-sm ml-auto">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Monto exento USD</span>
          <span>{formatCurrency(sale.monto_exento_usd)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Base imponible USD</span>
          <span>{formatCurrency(sale.base_imponible_usd)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">IVA USD</span>
          <span>{formatCurrency(sale.monto_iva_usd)}</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
          <span>Total USD</span>
          <span className="text-info">{formatCurrency(sale.total_usd)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total VES</span>
          <span className="text-success">{formatCurrency(sale.total_ves, "Bs ")}</span>
        </div>
      </div>
    </div>
  );
}
