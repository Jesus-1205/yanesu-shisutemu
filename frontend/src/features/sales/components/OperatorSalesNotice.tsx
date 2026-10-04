import { Calendar } from "lucide-react";

export default function OperatorSalesNotice() {
  return (
    <div className="border-b border-slate-100 p-4 sm:p-5">
      <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
        <Calendar className="size-4" />
        Mostrando ventas del día de hoy
      </div>
    </div>
  );
}
