/**
 * Helpers de precisión monetaria.
 *
 * Regla del sistema: SIEMPRE Decimal en backend, SIEMPRE redondeo a céntimos
 * en cada paso del frontend (frontend_rules.md § Decimales y Dinero).
 * Acumular sin redondear causa descuadres de centavos — fallo grave.
 */

import type { MonedaEnum } from "@/types/api";

/**
 * Redondea un número a 2 decimales (céntimos) usando HALF_UP.
 * Base de todo el cálculo monetario del frontend.
 */
export function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Convierte un costo de su moneda de ingreso a ambas divisas (USD y BS)
 * usando la tasa de cambio vigente.
 *
 * Si la tasa es 0 o negativa, la moneda convertida queda en 0.
 */
export function convertirCostos(
  costoIngresado: number,
  monedaIngreso: MonedaEnum,
  tasa: number,
): { usd: number; bs: number } {
  const t = tasa > 0 ? tasa : 0;
  if (monedaIngreso === "BS") {
    return {
      usd: t > 0 ? toCents(costoIngresado / t) : 0,
      bs: toCents(costoIngresado),
    };
  }
  return {
    usd: toCents(costoIngresado),
    bs: toCents(costoIngresado * t),
  };
}

/**
 * Calcula el subtotal de una línea: cantidad × costo unitario.
 * Para CAJA: cantidad = número de cajas, costo unitario = costo por caja.
 * Para UNIDAD: cantidad = número de unidades, costo unitario = costo por unidad.
 *
 * IMPORTANTE: en inventario, el subtotal = cantidad * costo_unitario,
 * NO = unidades_totales * costo_unitario (eso infla el subtotal por
 * unidades_por_caja).
 */
export function calcularSubtotal(cantidad: number, costoUnitario: number): number {
  return toCents(cantidad * costoUnitario);
}
