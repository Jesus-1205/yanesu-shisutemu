import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  const btnBase =
    "inline-flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer disabled:cursor-not-allowed";

  return (
    <nav className={`flex items-center justify-center gap-1.5 ${className}`} aria-label="Paginación">
      <button
        className={`${btnBase} gap-1 px-3 h-9 text-sm text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1`}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`e${i}`}
            className="flex items-center justify-center w-9 h-9 text-sm text-slate-400 select-none"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            className={`${btnBase} w-9 h-9 text-sm ${
              p === page
                ? "bg-brand-blue text-white border-brand-blue hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
                : "text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
            }`}
            onClick={() => onPageChange(p)}
            aria-label={`Ir a página ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}

      <button
        className={`${btnBase} gap-1 px-3 h-9 text-sm text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1`}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Página siguiente"
      >
        Siguiente
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
