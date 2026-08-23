/**
 * Alícuota de IVA única del sistema (16%).
 *
 * Es la fuente de verdad en el frontend; el backend mantiene su propia
 * constante `IVA_RATE` en `app/services/sale_service.py`. Al cambiar la
 * alícuota hay que actualizar ambas (se sincronizan con la misma regla).
 */
export const IVA_RATE = 16;

/**
 * Calcula el IVA de un subtotal, redondeando a céntimos por operación.
 * Equivale a `Math.round(subtotal * IVA_RATE) / 100`.
 */
export function calcIva(subtotal: number): number {
  return Math.round(subtotal * IVA_RATE) / 100;
}

export interface ResumenFiscal {
  exento: number;
  base_imponible: number;
  iva: number;
  total: number;
}

export function calcularResumenFiscal(
  items: Array<{
    subtotal_usd: number;
    subtotal_bs: number;
    tipo_iva: "GRAVADO" | "EXENTO";
  }>,
  moneda: "USD" | "BS",
  aplicaIva: boolean,
): ResumenFiscal {
  let exento = 0;
  let base = 0;
  let iva = 0;

  const esBs = moneda === "BS";
  const shouldCalcIva = esBs && aplicaIva;

  for (const item of items) {
    const subtotal = esBs ? item.subtotal_bs : item.subtotal_usd;
    if (shouldCalcIva && item.tipo_iva === "GRAVADO") {
      base += Math.round(subtotal * 100) / 100;
      iva += calcIva(subtotal);
    } else {
      exento += Math.round(subtotal * 100) / 100;
    }
  }

  return {
    exento: Math.round(exento * 100) / 100,
    base_imponible: Math.round(base * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: Math.round((exento + base + iva) * 100) / 100,
  };
}
