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
 */
function generateFilename(prefix: string): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const sanitized = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
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
}: ExportOptions<T>): void {
  const headers = columns.map(col => col.header);

  const worksheetData = data.map(item => {
    const row: Record<string, unknown> = {};
    columns.forEach(col => {
      if (col.render) {
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
  XLSX.writeFile(workbook, `${filenameWithDate}.xlsx`);
}
