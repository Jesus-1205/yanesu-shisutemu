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
