import { useState } from "react";
import Select from "@/ui-components/Select";
import Input from "@/ui-components/Input";
import Button from "@/ui-components/Button";
import Pagination from "@/ui-components/Pagination";
import { useRetornableHistorico } from "../hooks/useRetornable";
import { MovimientosTable } from "./MovimientosTable";

export function HistoricoTab() {
  const [historicoPage, setHistoricoPage] = useState(1);
  const [histFilters, setHistFilters] = useState<{
    presentacion?: string;
    tipo_movimiento?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }>({});

  const historico = useRetornableHistorico(historicoPage, 20, histFilters);

  return (
    <>
      <div className="grid grid-cols-[auto_auto_1fr_1fr_auto] gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 items-end">
        <Select
          label="Presentación"
          value={histFilters.presentacion ?? ""}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setHistFilters((f) => ({
              ...f,
              presentacion: e.target.value || undefined,
            }))
          }
          options={[
            { label: "Todas", value: "" },
            { label: "222", value: "222" },
            { label: "333", value: "333" },
          ]}
        />
        <Select
          label="Tipo"
          value={histFilters.tipo_movimiento ?? ""}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setHistFilters((f) => ({
              ...f,
              tipo_movimiento: e.target.value || undefined,
            }))
          }
          options={[
            { label: "Todos", value: "" },
            { label: "VENTA", value: "VENTA" },
            { label: "COMPRA", value: "COMPRA" },
          ]}
        />
        <Input
          label="Fecha desde"
          type="date"
          value={histFilters.fecha_desde ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setHistFilters((f) => ({
              ...f,
              fecha_desde: e.target.value || undefined,
            }))
          }
        />
        <Input
          label="Fecha hasta"
          type="date"
          value={histFilters.fecha_hasta ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setHistFilters((f) => ({
              ...f,
              fecha_hasta: e.target.value || undefined,
            }))
          }
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setHistFilters({});
            setHistoricoPage(1);
          }}
        >
          Limpiar
        </Button>
      </div>

      <MovimientosTable
        movimientos={historico.data?.items ?? []}
        loading={historico.loading}
      />

      <Pagination
        page={historicoPage}
        totalPages={historico.data?.pages ?? 1}
        onPageChange={setHistoricoPage}
        className="mt-4"
      />
    </>
  );
}
