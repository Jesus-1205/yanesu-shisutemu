import * as XLSX from 'xlsx';
import type { ReactNode } from 'react';
import type { Column } from '@/ui-components/Table';

/**
 * Extrae texto plano de un ReactNode (JSX elements, strings, numbers, arrays)
 */
function extractText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

/**
 * Genera nombre de archivo con formato: {prefijo}_{YYYY-MM-DD}.xlsx
 * La fecha se calcula en la zona horaria de Caracas (no UTC) y se conservan
 * los caracteres acentuados/ñ del prefijo.
 */
function generateFilename(prefix: string): string {
  const today = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(today);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") partMap[p.type] = p.value;
  }
  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const sanitized = prefix.replace(/[^\w\u00C0-\u024F-]/g, "_");
  return `${sanitized}_${dateStr}`;
}

interface ExportOptions<T> {
  data: T[];
  columns: Column<T>[];
  filename: string;
}

export function exportToExcel<T extends object>({
  data,
  columns,
  filename,
}: ExportOptions<T>): string {
  const headers = columns.map(col => col.header);

  const worksheetData = data.map(item => {
    const row: Record<string, unknown> = {};
    columns.forEach(col => {
      if (col.exportValue) {
        row[col.header] = col.exportValue(item);
      } else if (col.render) {
        row[col.header] = extractText(col.render(item));
      } else {
        row[col.header] = (item as Record<string, unknown>)[col.key];
      }
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData, {
    header: headers,
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

  const filenameWithDate = generateFilename(filename);
  const fullFilename = `${filenameWithDate}.xlsx`;
  XLSX.writeFile(workbook, fullFilename);
  return fullFilename;
}
