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
}

const ESTADOS = ["CASILLERO", "VACIO", "LLENO"] as const;
const PRESENTACIONES = ["222", "333"] as const;
const LABELS_ESTADO: Record<string, string> = {
  CASILLERO: "Casillero (cajas vacías sin botellas)",
  VACIO: "Vacío (cajas con botellas vacías)",
  LLENO: "Lleno (cajas con botellas listas para vender)",
};

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

function NumberInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const display = value === 0 ? "" : String(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    if (text === "") {
      onChange(0);
      return;
    }
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className="w-20 text-right border border-slate-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
      value={display}
      onChange={handleChange}
      disabled={disabled}
    />
  );
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
          const botellas = estado === "CASILLERO" ? 0 : value * BOTTLES_PER_CASE;
          return { ...d, cantidad_cajas: value, cantidad_botellas: botellas };
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
      className="max-w-lg"
    >
      <div className="space-y-5">
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

        {PRESENTACIONES.map((pres) => (
          <div key={pres}>
            <h4 className="text-sm font-bold text-slate-700 mb-2">
              {pres}ml
            </h4>
            <div className="space-y-2">
              {ESTADOS.map((estado) => {
                const det = getDetalle(pres, estado);
                const isCasillero = estado === "CASILLERO";
                return (
                  <div key={`${pres}-${estado}`} className="flex items-center gap-3">
                    <span className="w-56 text-sm text-slate-600 truncate" title={LABELS_ESTADO[estado]}>
                      {LABELS_ESTADO[estado]}
                    </span>
                    <span className="text-xs text-slate-400">Cajas:</span>
                    <NumberInput
                      value={det?.cantidad_cajas ?? 0}
                      onChange={(v) => updateDetalle(pres, estado, "cantidad_cajas", v)}
                    />
                    {!isCasillero && (
                      <span className="text-xs text-slate-400 ml-2">
                        ({(det?.cantidad_cajas ?? 0) * BOTTLES_PER_CASE} botellas)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
