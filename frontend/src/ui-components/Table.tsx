import { useState, useRef, useEffect, memo } from "react";
import type { ReactNode } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Download, ChevronDown, Loader2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportToExcel";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  /**
   * Valor crudo para exportar a Excel (ej. el número en vez del texto
   * formateado "$1.234,56"). Si no se define, se usa `render` (texto plano)
   * o el valor directo de `key`.
   */
  exportValue?: (item: T) => unknown;
  className?: string;
  sortable?: boolean;
  onSort?: () => void;
  sortDirection?: "asc" | "desc" | null;
  exportable?: boolean;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
  exportable?: boolean;
  exportFilename?: string;
  allData?: T[];
  fetchAllData?: () => Promise<T[]>;
  headerLeft?: ReactNode;
  menuDirection?: "up" | "down";
  singleExport?: boolean;
  onExported?: (filename: string) => void;
  footer?: ReactNode;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <span className="block h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No hay registros",
  className = "",
  onRowClick,
  exportable = false,
  exportFilename = "export",
  allData,
  fetchAllData,
  headerLeft,
  menuDirection = "up",
  singleExport = false,
  onExported,
  footer,
}: TableProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const hasExport = exportable && data.length > 0;
  const hasAllData = hasExport && (allData !== undefined || fetchAllData !== undefined);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const visibleColumns = isMobile
    ? columns.filter((col) => !col.hideOnMobile)
    : columns;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className={`rounded-xl border border-slate-200 shadow-xs ${className}`}>
      {(hasExport || headerLeft) && (
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5">
          {headerLeft && <div>{headerLeft}</div>}
          {!headerLeft && <div />}
          {hasExport && (
            <div ref={menuRef} className="relative">
              {singleExport ? (
                <button
                  title="Exportar a Excel"
                  onClick={() => {
                    const exportCols = columns.filter((c) => c.exportable !== false);
                    const name = exportToExcel({
                      data: (allData || data) as (T & Record<string, unknown>)[],
                      columns: exportCols,
                      filename: exportFilename,
                    });
                    onExported?.(name);
                  }}
                  className="flex cursor-pointer items-center gap-1 rounded p-1.5 transition-colors hover:bg-slate-200"
                >
                  <Download className="size-3.5 text-slate-600" />
                </button>
              ) : (
                <>
                  <button
                    title="Exportar a Excel"
                    onClick={() => {
                      if (!menuOpen) {
                        const rect = menuRef.current!.getBoundingClientRect();
                        setMenuPos({
                          top: menuDirection === "up" ? rect.top : rect.bottom + 4,
                          right: window.innerWidth - rect.right,
                        });
                      }
                      setMenuOpen(!menuOpen);
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded p-1.5 transition-colors hover:bg-slate-200"
                  >
                    <Download className="size-3.5 text-slate-600" />
                    <ChevronDown className={`size-3 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {menuOpen && (
                    <div
                      className="fixed z-9999 min-w-45 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                      style={{
                        top: menuDirection === "up" ? undefined : menuPos.top,
                        right: menuPos.right,
                        ...(menuDirection === "up" ? { bottom: window.innerHeight - menuPos.top + 4 } : {}),
                      }}
                    >
                      <button
                        onClick={() => {
                          const exportCols = columns.filter((c) => c.exportable !== false);
                          const name = exportToExcel({
                            data: data as (T & Record<string, unknown>)[],
                            columns: exportCols,
                            filename: exportFilename,
                          });
                          onExported?.(name);
                          setMenuOpen(false);
                        }}
                        className="w-full cursor-pointer px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        Datos visibles
                      </button>
                      {hasAllData && (
                          <button
                            disabled={exportingAll}
                            onClick={async () => {
                              setExportingAll(true);
                              try {
                                const exportCols = columns.filter((c) => c.exportable !== false);
                                const fullData = fetchAllData
                                  ? await fetchAllData()
                                  : allData!;
                                const name = exportToExcel({
                                  data: fullData as (T & Record<string, unknown>)[],
                                  columns: exportCols,
                                  filename: `${exportFilename}_completo`,
                                });
                                onExported?.(name);
                              } finally {
                                setExportingAll(false);
                                setMenuOpen(false);
                              }
                            }}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                        >
                          {exportingAll ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Exportando...
                            </>
                          ) : (
                            "Todos los datos"
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      <div ref={tableContainerRef} className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase ${col.className || ""}`}
              >
                {col.sortable ? (
                  <button
                    onClick={col.onSort}
                    className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-text-main"
                  >
                    {col.header}
                    {col.sortDirection === "asc" ? (
                      <ArrowUp className="size-3.5" />
                    ) : col.sortDirection === "desc" ? (
                      <ArrowDown className="size-3.5" />
                    ) : (
                      <ArrowUpDown className="size-3.5 text-slate-300" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} cols={visibleColumns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length}
                className="px-4 py-12 text-center text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, i) => (
              <tr
                key={keyExtractor(item, i)}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-slate-100 transition-colors duration-150 last:border-b-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""} ${onRowClick ? "cursor-pointer hover:bg-blue-50/60" : "hover:bg-blue-50/40"}`}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 whitespace-nowrap text-text-main ${col.className || ""}`}
                  >
                    {col.render
                      ? col.render(item)
                      : (item as Record<string, ReactNode>)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot>{footer}</tfoot>
        )}
      </table>
      </div>
    </div>
  );
}

const MemoizedTable = memo(Table) as typeof Table;
export default MemoizedTable;
