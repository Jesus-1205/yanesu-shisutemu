import { useState } from "react";
import type { DetalleLinea } from "@/types/api";
import Modal from "@/ui-components/Modal";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import Textarea from "@/ui-components/Textarea";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";

const BOTTLES_PER_CASE = 36;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  referencia: {
    presentacion: string;
    estado: string;
    cantidad_botellas: number;
  } | null;
}

const ESTADOS = ["CASILLERO", "VACIO", "LLENO"] as const;
const PRESENTACIONES = ["222", "333"] as const;

function buildEmptyDetalles(): DetalleLinea[] {
  const detalles: DetalleLinea[] = [];
  for (const pres of PRESENTACIONES) {
    for (const estado of ESTADOS) {
      detalles.push({
        presentacion: pres,
        estado,
        cantidad_botellas: 0,
        cantidad_cajas: 0,
      });
    }
  }
  return detalles;
}

export function NuevoReporteModal({ open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [realizadoPor, setRealizadoPor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [detalles, setDetalles] = useState<DetalleLinea[]>(buildEmptyDetalles);
  const [loading, setLoading] = useState(false);

  const updateDetalle = (
    presentacion: string,
    estado: string,
    field: "cantidad_botellas" | "cantidad_cajas",
    value: number,
  ) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.presentacion !== presentacion || d.estado !== estado) return d;
        if (field === "cantidad_cajas") {
          return { ...d, cantidad_cajas: value, cantidad_botellas: value * BOTTLES_PER_CASE };
        }
        return { ...d, [field]: value };
      }),
    );
  };

  const getDetalle = (presentacion: string, estado: string) =>
    detalles.find((d) => d.presentacion === presentacion && d.estado === estado);

  const handleSubmit = async () => {
    if (!realizadoPor.trim()) {
      toast("El campo 'Realizado por' es obligatorio", "error");
      return;
    }
    setLoading(true);
    try {
      await api.crearRetornableReporte({
        realizado_por: realizadoPor.trim(),
        observaciones: observaciones.trim() || null,
        detalles,
      });
      toast("Reporte creado exitosamente", "success");
      onSaved();
      onClose();
      setRealizadoPor("");
      setObservaciones("");
      setDetalles(buildEmptyDetalles());
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Error al crear reporte", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo Reporte de Conteo Físico"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <Input
          label="Realizado por"
          value={realizadoPor}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRealizadoPor(e.target.value)}
          placeholder="Nombre de quien realizó el conteo"
        />

        <Textarea
          label="Observaciones (opcional)"
          value={observaciones}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservaciones(e.target.value)}
          placeholder="Notas sobre el conteo..."
          rows={2}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2 text-left font-semibold text-slate-600">Present.</th>
                <th className="p-2 text-left font-semibold text-slate-600">Estado</th>
                <th className="p-2 text-right font-semibold text-slate-600">Cajas</th>
                <th className="p-2 text-right font-semibold text-slate-600">Botellas</th>
              </tr>
            </thead>
            <tbody>
              {PRESENTACIONES.map((pres) =>
                ESTADOS.map((estado) => {
                  const det = getDetalle(pres, estado);
                  return (
                    <tr key={`${pres}-${estado}`} className="border-b border-slate-100">
                      <td className="p-2 font-semibold">{pres}</td>
                      <td className="p-2">{estado}</td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min={0}
                          className="w-20 text-right border border-slate-300 rounded px-2 py-1 text-sm"
                          value={det?.cantidad_cajas ?? 0}
                          onChange={(e) =>
                            updateDetalle(pres, estado, "cantidad_cajas", Number(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="p-2 text-right text-slate-400 text-xs">
                        {det ? (det.estado === "CASILLERO" ? "—" : `${det.cantidad_botellas} bot.`) : "—"}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Guardar Reporte
          </Button>
        </div>
      </div>
    </Modal>
  );
}
