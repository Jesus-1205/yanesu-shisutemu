import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import type { Sale, SaleItem, SalePayment } from "../types";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Table from "@/ui-components/Table";
import Spinner from "@/ui-components/Spinner";
import Badge from "@/ui-components/Badge";
import { useToast } from "@/ui-components/Toast";
import { formatCurrency, formatPaymentMethodName } from "@/lib/utils";
import SaleSummaryCards from "../components/SaleSummaryCards";

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
      <div className="py-20 text-center text-slate-500">
        Venta no encontrada
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate("/sales")}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </div>

      <PageHeader
        title={`Venta #${sale.id}`}
        description={new Date(sale.fecha_venta).toLocaleString("es-VE")}
      />

      <SaleSummaryCards sale={sale} />

      {sale.observaciones && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-xs font-semibold text-amber-700">Observaciones</p>
          <p className="text-sm text-amber-900">{sale.observaciones}</p>
        </div>
      )}

      <Table
        columns={[
          {
            key: "producto_nombre",
            header: "Producto",
            render: (i: SaleItem) => (
              <div className="flex items-center gap-1.5">
                <span>{i.producto_nombre || `Producto #${i.producto_id}`}</span>
                {i.combo_id && i.combo_nombre ? (
                  <Badge variant="warning" className="text-[10px]! bg-amber-100! px-1! py-0! text-amber-700!">
                    {i.combo_nombre}
                  </Badge>
                ) : i.usa_precio_divisas ? (
                  <Badge variant="success" className="text-[10px]! px-1! py-0!">DIV</Badge>
                ) : null}
              </div>
            ),
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
        <h3 className="mb-2 text-sm font-semibold text-text-main">Pagos</h3>
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

      <div className="mt-6 ml-auto max-w-sm space-y-2 rounded-xl border border-slate-200 bg-surface p-5">
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
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
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
