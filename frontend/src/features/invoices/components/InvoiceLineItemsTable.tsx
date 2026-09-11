import type { Invoice } from "../types";
import Table from "@/ui-components/Table";
import { formatBs, formatUsd } from "@/lib/text";

interface InvoiceLineItemsTableProps {
  invoice: Invoice;
  totalPrincipal: number;
  totalSecundario: number;
  nTasa: number;
}

export default function InvoiceLineItemsTable({ invoice, totalPrincipal, totalSecundario, nTasa }: InvoiceLineItemsTableProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-medium text-slate-700">Productos</h3>
      <Table
        columns={[
          { key: "producto", header: "Producto", render: (d) => d.product?.nombre || "—" },
          {
            key: "tipo_empaque",
            header: "Tipo",
            render: (d) => (
              <div className="flex flex-col items-center">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  d.tipo_empaque === "CAJA" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                }`}>
                  {d.tipo_empaque === "CAJA" ? "Caja" : "Und"}
                </span>
                {d.tipo_empaque === "CAJA" && d.product?.unidades_por_caja && d.product.unidades_por_caja > 1 && (
                  <span className="mt-0.5 text-[10px] text-slate-400">{d.product.unidades_por_caja} unds/caja</span>
                )}
                {d.tipo_iva === "EXENTO" && (
                  <span className="mt-0.5 text-[10px] font-semibold text-orange-600">Exento</span>
                )}
              </div>
            ),
          },
          { key: "cantidad", header: "Cant" },
          {
            key: "costo_caja_usd",
            header: "$ / Caja",
            render: (d) => {
              if (d.tipo_empaque !== "CAJA") return <span className="text-slate-300">—</span>;
              return (
                <div className="text-right">
                  <span className="font-mono text-sm font-semibold">{formatUsd(Number(d.costo_unitario_usd))}</span>
                </div>
              );
            },
          },
          {
            key: "costo_unidad_usd",
            header: "$ / Und",
            hideOnMobile: true,
            render: (d) => {
              if (d.tipo_empaque === "CAJA" && d.product?.unidades_por_caja && d.product.unidades_por_caja > 1) {
                const costoUnitario = Number(d.costo_unitario_usd) / d.product.unidades_por_caja;
                return <span className="font-mono text-xs text-slate-400">{invoice.moneda_principal === "BS" && "≈ "}{formatUsd(costoUnitario)}</span>;
              }
              if (d.tipo_empaque === "UNIDAD") {
                return <span className={`font-mono ${invoice.moneda_principal === "BS" ? "text-xs text-slate-400" : "text-sm font-semibold"}`}>{invoice.moneda_principal === "BS" && "≈ "}{formatUsd(Number(d.costo_unitario_usd))}</span>;
              }
              return <span className="text-slate-300">—</span>;
            },
          },
          {
            key: "costo_unitario_bs",
            header: "Bs. / Unid",
            hideOnMobile: true,
            render: (d) => (
              <span className={`font-mono ${invoice.moneda_principal === "BS" ? "text-sm font-semibold" : "text-xs"}`}>{invoice.moneda_principal !== "BS" && "≈ "}Bs. {formatBs(Number(d.costo_unitario_bs))}</span>
            ),
          },
          {
            key: "subtotal_usd",
            header: "Subtotal USD",
            render: (d) => (
              <span className={`font-mono ${invoice.moneda_principal !== "BS" ? "font-semibold" : ""}`}>{formatUsd(d.cantidad * Number(d.costo_unitario_usd))}</span>
            ),
          },
          {
            key: "subtotal_bs",
            header: "Subtotal Bs.",
            render: (d) => {
              const subUsd = d.cantidad * Number(d.costo_unitario_usd);
              const subBs = invoice.moneda_principal !== "BS" && nTasa > 0
                ? Math.round(subUsd * nTasa * 100) / 100
                : d.cantidad * Number(d.costo_unitario_bs);
              return (
                <span className={`font-mono ${invoice.moneda_principal === "BS" ? "font-semibold" : ""}`}>Bs. {formatBs(subBs)}</span>
              );
            },
          },
        ]}
        data={invoice.detalles}
        keyExtractor={(d) => d.id}
        loading={false}
        emptyMessage="Sin productos"
        footer={invoice.detalles.length > 0 ? (() => {
          let totalCajas = 0;
          let totalUnidades = 0;
          for (const d of invoice.detalles) {
            if (d.tipo_empaque === "CAJA") {
              totalCajas += d.cantidad;
              totalUnidades += d.cantidad * (d.product?.unidades_por_caja || 1);
            } else {
              totalUnidades += d.cantidad;
            }
          }
          return (
            <tr className="border-t-2 border-slate-200 bg-slate-100/70 font-semibold text-text-main">
              <td className="px-4 py-3.5" colSpan={2}>Totales</td>
              <td className="px-4 py-3.5 text-right text-xs tabular-nums">
                {totalCajas > 0 && <div>{totalCajas} cajas</div>}
                <div>{totalUnidades} unds</div>
              </td>
              <td />
              <td className="hidden md:table-cell" />
              <td className="hidden md:table-cell" />
              <td className="px-4 py-3.5 text-right tabular-nums">
                <span className={invoice.moneda_principal !== "BS" ? "font-semibold" : ""}>
                  {formatUsd(invoice.moneda_principal === "BS" ? totalSecundario : totalPrincipal)}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums">
                <span className={invoice.moneda_principal === "BS" ? "font-semibold" : ""}>
                  Bs. {formatBs(invoice.moneda_principal === "BS" ? totalPrincipal : totalSecundario)}
                </span>
              </td>
            </tr>
          );
        })() : undefined}
      />
    </div>
  );
}
