import { useCallback, useEffect, useState } from "react";
import { DollarSign, RefreshCw, Clock, Download } from "lucide-react";
import { api } from "@/services/api";
import type { ExchangeRate } from "../types";
import type { Column } from "@/ui-components/Table";
import Table from "@/ui-components/Table";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import StatCard from "@/ui-components/StatCard";
import Pagination from "@/ui-components/Pagination";
import Modal from "@/ui-components/Modal";
import Input from "@/ui-components/Input";
import Spinner from "@/ui-components/Spinner";
import ErrorBanner from "@/ui-components/ErrorBanner";
import { useToast } from "@/ui-components/Toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";
import { formatRate, formatRateFull } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportToExcel";

const PAGE_SIZE = 20;

export default function ExchangeRatesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.rol_nombre === "ADMINISTRADOR";
  const loadTasa = useExchangeRateStore((s) => s.loadTasa);

  const [latest, setLatest] = useState<Record<string, string>>({});
  const [fechaActualizacion, setFechaActualizacion] = useState<string | null>(null);
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formUsd, setFormUsd] = useState("");
  const [formEur, setFormEur] = useState("");

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const ratesRes = await api.getLatestRates();
      setLatest(ratesRes.rates);
      setFechaActualizacion(ratesRes.fecha_ultima_actualizacion ?? null);

      if (isAdmin) {
        const historyRes = await api.getRateHistoryPaginated({ page, page_size: PAGE_SIZE });
        setHistory(historyRes.items);
        setTotalPages(historyRes.pages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tasas");
    } finally {
      setLoadingHistory(false);
    }
  }, [isAdmin, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = async () => {
    setModalOpen(true);
    setScraping(true);
    setFormUsd("");
    setFormEur("");
    try {
      const data = await api.getBcvRates();
      setFormUsd(data.rates.USD ? Number(data.rates.USD).toFixed(4) : "");
      setFormEur(data.rates.EUR ? Number(data.rates.EUR).toFixed(4) : "");
      toast("Tasas del BCV cargadas", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al consultar BCV",
        "error",
      );
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    const usd = parseFloat(formUsd);
    const eur = parseFloat(formEur);
    if (isNaN(usd) || isNaN(eur) || usd <= 0 || eur <= 0) {
      toast("Ingrese valores válidos para ambas tasas", "error");
      return;
    }
    setSaving(true);
    try {
      await api.saveBulkRates({ usd, eur });
      toast("Tasas guardadas correctamente", "success");
      setModalOpen(false);
      fetchData();
      loadTasa();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar tasas",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const exportColumns: Column<ExchangeRate>[] = [
    { key: "id", header: "ID" },
    { key: "moneda", header: "Moneda" },
    { key: "tasa_ves", header: "Tasa (VES)" },
    { key: "fecha_registro", header: "Fecha Registro" },
  ];

  const handleExportAll = async () => {
    try {
      const { history: allRates } = await api.getRateHistory();
      const name = exportToExcel({ data: allRates, columns: exportColumns, filename: "Tasas_cambio" });
      toast(`Archivo descargado: ${name}`, "success");
    } catch {
      toast("Error al exportar tasas de cambio", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Tasas de Cambio"
        description="Administra las tasas de cambio del día"
        actions={
          <Button variant="accent" onClick={handleOpenModal}>
            <RefreshCw className="w-4 h-4" />
            Actualizar Tasas
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner onRetry={fetchData}>
            {error}
          </ErrorBanner>
        </div>
      )}

      {fechaActualizacion && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Clock className="w-4 h-4" />
          Última actualización: {new Date(fechaActualizacion).toLocaleString("es-VE")}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          label="USD / VES"
          value={latest.USD ? `Bs ${formatRate(latest.USD)}` : "—"}
          icon={<DollarSign className="w-5 h-5" />}
          variant="info"
        />
        <StatCard
          label="EUR / VES"
          value={latest.EUR ? `Bs ${formatRate(latest.EUR)}` : "—"}
          icon={<DollarSign className="w-5 h-5" />}
          variant="info"
        />
      </div>

      {isAdmin && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="w-4 h-4" />
              Descargar Excel
            </Button>
          </div>
          <Table
            columns={[
              { key: "id", header: "ID" },
              {
                key: "moneda",
                header: "Moneda",
                render: (r: ExchangeRate) => r.moneda,
              },
              {
                key: "tasa_ves",
                header: "Tasa (Bs)",
                render: (r: ExchangeRate) => formatRateFull(r.tasa_ves),
              },
              {
                key: "fecha_registro",
                header: "Registrado",
                render: (r: ExchangeRate) =>
                  new Date(r.fecha_registro).toLocaleString("es-VE"),
              },
            ]}
            data={history}
            keyExtractor={(r) => r.id}
            loading={loadingHistory}
            emptyMessage="No hay tasas registradas"
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Actualizar Tasas de Cambio"
      >
        {scraping ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="lg" />
            <p className="text-sm text-slate-500">Consultando sitio del BCV...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Valores obtenidos del BCV. Puede modificarlos antes de guardar.
            </p>
            <Input
              label="USD / VES"
              type="number"
              step="0.0001"
              min="0"
              value={formUsd}
              onChange={(e) => setFormUsd(e.target.value)}
              placeholder="ej: 45.1234"
              required
            />
            <Input
              label="EUR / VES"
              type="number"
              step="0.0001"
              min="0"
              value={formEur}
              onChange={(e) => setFormEur(e.target.value)}
              placeholder="ej: 48.5678"
              required
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="accent"
                loading={saving}
                onClick={handleSave}
              >
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
