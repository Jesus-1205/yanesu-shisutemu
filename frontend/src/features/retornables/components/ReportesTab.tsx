import { useState } from "react";
import Button from "@/ui-components/Button";
import Pagination from "@/ui-components/Pagination";
import { useRetornableReportes } from "../hooks/useRetornable";
import { ReportesTable } from "./ReportesTable";

interface Props {
  onNuevoReporte: () => void;
}

export function ReportesTab({ onNuevoReporte }: Props) {
  const [reportePage, setReportePage] = useState(1);
  const reportes = useRetornableReportes(reportePage);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="accent" onClick={onNuevoReporte}>
          Nuevo Reporte
        </Button>
      </div>
      <ReportesTable
        reportes={reportes.data?.items ?? []}
        loading={reportes.loading}
      />
      <Pagination
        page={reportePage}
        totalPages={reportes.data?.pages ?? 1}
        onPageChange={setReportePage}
        className="mt-4"
      />
    </>
  );
}
