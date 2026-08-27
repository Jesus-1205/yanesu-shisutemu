# Tailwind CSS v4 — Mapeo de Valores Arbitrarios a Clases Estándar

Referencia completa para convertir valores arbitrarios hardcodeados
a clases estándar de Tailwind CSS v4.

## 1. Spacing (1 unit = 0.25rem = 4px)

| px  | Clase | px  | Clase | px  | Clase |
|-----|-------|-----|-------|-----|-------|
| 0   | 0     | 36  | 9     | 160 | 40    |
| 1   | px    | 40  | 10    | 176 | 44    |
| 2   | 0.5   | 44  | 11    | 192 | 48    |
| 4   | 1     | 48  | 12    | 208 | 52    |
| 6   | 1.5   | 56  | 14    | 224 | 56    |
| 8   | 2     | 64  | 16    | 240 | 60    |
| 10  | 2.5   | 72  | 18    | 256 | 64    |
| 12  | 3     | 80  | 20    | 288 | 72    |
| 14  | 3.5   | 88  | 22    | 320 | 80    |
| 16  | 4     | 96  | 24    | 352 | 88    |
| 20  | 5     | 104 | 26    | 384 | 96    |
| 24  | 6     | 112 | 28    |     |       |
| 28  | 7     | 120 | 30    |     |       |
| 32  | 8     | 128 | 32    |     |       |

**Prefijos que usan esta escala:**
`p-`, `m-`, `px-`, `py-`, `pt-`, `pb-`, `pl-`, `pr-`,
`mx-`, `my-`, `mt-`, `mb-`, `ml-`, `mr-`,
`gap-`, `gap-x-`, `gap-y-`,
`inset-`, `top-`, `right-`, `bottom-`, `left-`,
`w-`, `h-`, `min-w-`, `min-h-`, `max-w-`, `max-h-`,
`size-`, `scroll-m-`, `scroll-p-`

**Ejemplo:**
- `p-[10px]` → `p-2.5`
- `m-[16px]` → `m-4`
- `gap-[8px]` → `gap-2`
- `top-[3px]` → `top-[3px]` (no hay match exacto, 3px no está en la escala)

## 2. Font Sizes

| px  | Clase      | Tamaño   |
|-----|------------|----------|
| 12  | `text-xs`  | 0.75rem  |
| 14  | `text-sm`  | 0.875rem |
| 16  | `text-base`| 1rem     |
| 18  | `text-lg`  | 1.125rem |
| 20  | `text-xl`  | 1.25rem  |
| 24  | `text-2xl` | 1.5rem   |
| 30  | `text-3xl` | 1.875rem |
| 36  | `text-4xl` | 2.25rem  |
| 48  | `text-5xl` | 3rem     |
| 60  | `text-6xl` | 3.75rem  |
| 72  | `text-7xl` | 4.5rem   |
| 96  | `text-8xl` | 6rem     |

**Nota:** `text-[10px]` y `text-[11px]` NO tienen equivalente exacto en la
escala estándar (el más cercano es `text-xs` = 12px). En estos casos:
- Si la diferencia es tolerante → sugerir `text-xs`
- Si se necesita precisión → mantener el arbitrario y justificar

## 3. Border Radius

| px  | Clase      |
|-----|------------|
| 0   | `rounded-none` |
| 2   | `rounded-sm`   |
| 4   | `rounded`      |
| 6   | `rounded-md`   |
| 8   | `rounded-lg`   |
| 12  | `rounded-xl`   |
| 16  | `rounded-2xl`  |
| 24  | `rounded-3xl`  |
| 9999| `rounded-full` |

## 4. Border Width

| px | Clase         |
|----|---------------|
| 0  | `border-0`    |
| 1  | `border`      |
| 2  | `border-2`    |
| 4  | `border-4`    |
| 8  | `border-8`    |

## 5. Opacity

| %   | Clase         |
|-----|---------------|
| 0   | `opacity-0`   |
| 5   | `opacity-5`   |
| 10  | `opacity-10`  |
| 20  | `opacity-20`  |
| 25  | `opacity-25`  |
| 30  | `opacity-30`  |
| 40  | `opacity-40`  |
| 50  | `opacity-50`  |
| 60  | `opacity-60`  |
| 70  | `opacity-70`  |
| 75  | `opacity-75`  |
| 80  | `opacity-80`  |
| 90  | `opacity-90`  |
| 95  | `opacity-95`  |
| 100 | `opacity-100` |

## 6. Z-Index (no es escala de 4px)

| valor | Clase       |
|-------|-------------|
| 0     | `z-0`       |
| 10    | `z-10`      |
| 20    | `z-20`      |
| 30    | `z-30`      |
| 40    | `z-40`      |
| 50    | `z-50`      |
| auto  | `z-auto`    |

**Nota:** `z-[9999]` no tiene equivalente estándar. Mantener como arbitrario.

## 7. Viewport Units (vh/vw)

**No hay equivalente estándar** — siempre son arbitrarios:
- `max-h-[90vh]` → mantener
- `max-h-[75vh]` → mantener
- `h-[calc(100vh-380px)]` → mantener (expresión CSS compleja)

## 8. Selectores Arbitrarios

**Aceptables** — no reemplazar:
- `[&>svg]:w-4` → mantener
- `[&>svg]:h-4` → mantener
- `[&>span]:text-red-500` → mantener

## 9. Animaciones Custom

**Aceptables** cuando usan keyframes definidos en el proyecto:
- `animate-[fadeIn_150ms_ease]` → mantener
- `animate-[scaleIn_200ms_cubic-bezier(...)]` → mantener

## 10. Colores Hex

| Hex         | Tailwind        |
|-------------|-----------------|
| `#22c55e`   | `green-500`     |
| `#3b82f6`   | `blue-500`      |
| `#f97316`   | `orange-500`    |
| `#94a3b8`   | `slate-400`     |
| `#ef4444`   | `red-500`       |
| `#eab308`   | `yellow-500`    |
| `#8b5cf6`   | `violet-500`    |
| `#06b6d4`   | `cyan-500`      |
| `#10b981`   | `emerald-500`   |
| `#f43f5e`   | `rose-500`      |

**Nota:** Solo sugerir reemplazo si el color exacto coincide con la paleta
default de Tailwind. Los colores personalizados del theme (`brand-blue`, etc.)
NO se reemplazan.
