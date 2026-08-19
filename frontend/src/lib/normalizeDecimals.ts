/**
 * Normaliza los montos que el backend serializa como string (Decimal) a number,
 * para que el runtime coincida con los tipos `number` declarados en types/api.ts.
 *
 * FastAPI/Pydantic v2 devuelve los valores DECIMAL como strings (ej. "25.50").
 * Este helper recorre la respuesta y convierte a number únicamente las claves
 * que representan dinero, tasas o porcentajes, sin tocar el resto de los campos.
 */

const DECIMAL_KEY_SUFFIX = /_(usd|ves|bs)$/i;

const DECIMAL_KEY_EXACT = new Set<string>([
  "tasa_bcv_aplicada",
  "tasa_usd",
  "tasa_eur",
  "tasa_bs",
  "margen_porcentaje",
  "margen_promedio",
  "margen_pct",
  "iva_porcentaje",
  "precio_divisas_unidad",
  "precio_divisas_caja",
  "precio_unitario",
]);

export function isDecimalKey(key: string): boolean {
  return DECIMAL_KEY_SUFFIX.test(key) || DECIMAL_KEY_EXACT.has(key);
}

function normalizeValue(key: string, value: unknown): unknown {
  if (typeof value === "string" && isDecimalKey(key) && value.trim() !== "") {
    const num = Number(value);
    return Number.isFinite(num) ? num : value;
  }
  return value;
}

export function normalizeDecimals<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeDecimals(item)) as unknown as T;
  }
  if (payload !== null && typeof payload === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      out[key] = normalizeValue(key, normalizeDecimals(value));
    }
    return out as T;
  }
  return payload;
}
