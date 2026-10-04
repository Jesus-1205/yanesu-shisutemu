export function extractUnidadesFromNombre(nombre: string): { cleanName: string; unidades: number } {
  // Patrones comunes en facturas venezolanas:
  // "24UNID." / "24 UNID" / "12UND" / "12 UNIDADES" / "6 1L" (al final del nombre)
  const patterns = [
    /\s+(\d+)\s*(?:UNID(?:\.|ADES)?|UND(?:\.|ES)?)\.?\s*$/i,
    /\s+(\d+)\s+uds\.?\s*$/i,
  ];
  for (const re of patterns) {
    const match = nombre.match(re);
    if (match) {
      return {
        cleanName: nombre.replace(re, "").trim(),
        unidades: parseInt(match[1], 10),
      };
    }
  }
  return { cleanName: nombre, unidades: 0 };
}
