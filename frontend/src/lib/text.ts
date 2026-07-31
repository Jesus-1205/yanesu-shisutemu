/**
 * Convierte texto a Title Case, preservando abreviaturas y códigos técnicos.
 *
 * - "MEDIA ANIS CARTUJO 350ML 24UNID." → "Media Anis Cartujo 350ML 24UNID."
 * - "SUPERERCADO KARA, C.A." → "Superercado Kara, C.A."
 * - "L/R CARTA ROJA 1L 12UNID." → "L/R Carta Roja 1L 12UNID."
 */
export function toTitleCase(text: string): string {
  return text
    .split(/(\s+)/)
    .map((word) => {
      if (/^\s+$/.test(word)) return word;

      // Abreviaturas con puntos: C.A., S.A., R.L., etc. → mantener mayúsculas
      if (/^[A-Z](?:\.[A-Z])+\.?$/.test(word)) return word;

      // Abreviaturas con puntos y coma: C.A., → mantener
      if (/^[A-Z](?:\.[A-Z])+\.?,?$/.test(word)) return word;

      // Códigos técnicos que empiezan con número: 350ML, 1L, 24UNID. → mantener tal cual
      if (/^\d/.test(word)) return word;

      // Abreviaturas con barra: L/R → mantener
      if (/^[A-Z]{1,3}\/[A-Z]{1,3}$/.test(word)) return word;

      // Resto: primera letra mayúscula, resto minúscula
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Formatea número al estilo venezolano: puntos para miles, coma para decimales.
 * Ej: 14991.77 → "14.991,77" | 12726.15 → "12.726,15"
 */
export function formatBs(value: number): string {
  return value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea USD al estilo venezolano: $ con puntos para miles, coma para decimales.
 * Ej: 582.00 → "$582,00" | 14991.77 → "$14.991,77"
 */
export function formatUsd(value: number): string {
  return "$" + value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
