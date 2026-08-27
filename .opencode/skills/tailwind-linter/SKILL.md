---
name: tailwind-linter
description: >-
  Use when the user wants to audit, lint, or fix Tailwind CSS classes in the
  frontend codebase. Triggers on: "revisa tailwind", "lint tailwind",
  "arbitrary values", "valores arbitrarios", "clases hardcodeadas",
  "p-[10px]", "max-w-[120px]", "text-[11px]", "analiza estilos",
  "fix tailwind classes", "clean tailwind", "Tailwind warnings",
  "equivalencias tailwind", or any request to detect/replace hardcoded
  Tailwind arbitrary values with standard classes. Also use when setting
  up ESLint for Tailwind CSS linting.
---

# Tailwind CSS Linter

Audita y corrige valores arbitrarios hardcodeados en clases de Tailwind CSS,
reemplazándolos por clases estándar cuando exista equivalente.

## Quick Start

### Opción A: Análisis rápido (script standalone, sin dependencias extra)

```bash
python .opencode/skills/tailwind-linter/scripts/scan_tw.py frontend/src/
```

O para un archivo específico:
```bash
python .opencode/skills/tailwind-linter/scripts/scan_tw.py frontend/src/features/sales/components/CheckoutDrawer.tsx
```

Opciones:
- `--fix` — Aplica reemplazos automáticamente (categorías seguras)
- `--json` — Salida en formato JSON para procesamiento programático
- `--severity warn|error` — Filtrar por severidad

### Opción B: ESLint con plugin (recomendado para CI/desarrollo continuo)

```bash
python .opencode/skills/tailwind-linter/scripts/setup_eslint.py frontend/
```

Esto instala y configura ESLint + `eslint-plugin-tailwindcss` en el proyecto.
Después ejecuta:

```bash
# Desde frontend/
npx eslint src/ --ext .tsx,.ts
```

## How It Works

El script `scan_tw.py` escanea archivos TSX/TS y detecta valores arbitrarios
de Tailwind CSS que tienen equivalente en clases estándar.

### Categorías de detección

| Cat. | Tipo | Ejemplo | Reemplazo | Auto-fix |
|------|------|---------|-----------|----------|
| A | Espaciado/dimensiones px | `p-[10px]` | `p-2.5` | ✅ |
| B | Tipografía px | `text-[11px]` | `text-xs` | ✅ |
| C | Viewport (vh/vw) | `max-h-[90vh]` | `max-h-[90vh]` | ❌ (mantener) |
| D | Selectores arbitrarios | `[&>svg]:w-4` | `[&>svg]:w-4` | ❌ (aceptable) |
| E | Animaciones custom | `animate-[fadeIn_150ms]` | `animate-[fadeIn_150ms]` | ❌ (custom) |
| F | Z-index no estándar | `z-[9999]` | `z-[9999]` | ❌ (mantener) |

**Solo las categorías A y B se auto-fixean** — las demás son flags para
revisión manual.

### Mapeo de clases (v4 estándar)

Ver `references/tailwind-v4-mappings.md` para el mapeo completo.

Resumen rápido de spacing (1 unit = 0.25rem = 4px):
- `1px → px`, `2px → 0.5`, `4px → 1`, `6px → 1.5`, `8px → 2`
- `10px → 2.5`, `12px → 3`, `14px → 3.5`, `16px → 4`, `20px → 5`
- `24px → 6`, `28px → 7`, `32px → 8`, `36px → 9`, `40px → 10`
- `48px → 12`, `56px → 14`, `64px → 16`, `80px → 20`, `96px → 24`
- `128px → 32`, `160px → 40`, `192px → 48`, `256px → 64`, `384px → 96`

Font sizes:
- `12px → text-xs`, `14px → text-sm`, `16px → text-base`
- `18px → text-lg`, `20px → text-xl`, `24px → text-2xl`, `30px → text-3xl`

## Interpreting Results

El output muestra un reporte por archivo:

```
src/features/sales/components/CheckoutDrawer.tsx
  L260  text-[10px]  →  text-xs          [tipografía]
  L260  text-slate-400 mt-1.5  (ok)
  L313  text-[11px]  →  text-xs          [tipografía]
  L420  w-[420px]    →  w-[420px]        [sin equivalente exacto]
```

Leyenda:
- Flecha `→` = reemplazo sugerido
- `[ok]` = clase estándar, sin problema
- `[sin equivalente exacto]` = valor arbitrario sin match en escala estándar

## Configuración ESLint (Opción B)

El setup crea `eslint.config.mjs` con estas reglas:

```js
"tailwindcss/no-unnecessary-arbitrary-value": "warn",  // La regla principal
"tailwindcss/classnames-order": "warn",
"tailwindcss/enforces-shorthand": "warn",
"tailwindcss/no-contradicting-classname": "error",
```

La regla `no-unnecessary-arbitrary-value` es exactamente lo que el usuario
describe: "la clase X puede escribirse como Y" con auto-fix disponible.

### Integración con VS Code

Instalar la extensión `ESLint` de Microsoft. Al guardar un archivo con
valores arbitrarios innecesarios, VS Code subrayará las clases y ofrecerá
el fix con Ctrl+.

## Archivos del proyecto que usa

- `frontend/src/index.css` — Entry point de Tailwind v4 (para `cssConfigPath`)
- `frontend/package.json` — Para instalar dependencias
- `frontend/vite.config.ts` — Referencia de plugins activos
