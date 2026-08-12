# Frontend: React 19 / TypeScript 5.7 / Tailwind v4

## TypeScript Estricto

- Prohibido el uso implícito o explícito del tipo `any`.
- Definir interfaces o tipos para todas las entidades del inventario, respuestas de API y props de componentes.

```typescript
export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

export type CreateProductDTO = Omit<Product, 'id'>;
```

## Estándares React 19 y Vite 6

- Utilizar Componentes Funcionales con destructuración limpia de props.
- Mantener la separación entre lógica de consumo de API (custom hooks o servicios) y componentes de UI.
- Estado global con **Zustand** en `src/stores/` (ej. `exchangeRateStore.ts`).
- Las llamadas al backend de FastAPI deben configurarse con URLs relativas o usando el proxy de Vite (`vite.config.ts`) para evitar problemas de CORS en desarrollo.

## Decimales y Dinero en el Frontend

El sistema maneja **dinero y stock**: un descuadre de centavos es un fallo grave. JavaScript usa `number` (flotante binario), por lo que operar precios directamente da errores de precisión.

- Los totales y subtotales del carrito/POS se calculan con `number`, pero SIEMPRE se redondean a 2 decimales tras cada operación acumulada:

```typescript
const subtotal = Math.round(item.cantidad * item.precio_unitario_usd * 100) / 100;
const total = Math.round((base + iva) * 100) / 100;
```

- **NUNCA** acumular decimales sin redondear en cada paso (ej. sumar 100 ítems con `0.1` a la vez). Redondear por operación y por total.
- Formatear para mostrar con los helpers de `src/lib/`: `formatCurrency()`, `formatBs()`, `formatUsd()` (formato venezolano `es-VE`). No inventar formatos inline.
- La **fuente de verdad del cálculo** es el backend (Decimal). El frontend solo redondea para presentación y para operaciones locales del carrito.
- `toFixed()` solo para formato/exhibición, nunca para acumular totales.

## Tailwind CSS v4

- Se utiliza el nuevo motor v4 integrado vía `@tailwindcss/vite`.
- La importación de estilos base se realiza en el CSS principal mediante `@import "tailwindcss";` (sin las directivas `@tailwind` antiguas de v3).
- Estilos consistentes para tablas de inventario, badges de stock bajo y formularios de captura.

```typescript
import React from 'react';
import { Product } from '../types/inventory';

interface ProductRowProps {
  product: Product;
  onEdit: (id: number) => void;
}

export const ProductRow: React.FC<ProductRowProps> = ({ product, onEdit }) => {
  const isLowStock = product.stock <= 5;

  return (
    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
      <td className="p-3 font-mono text-sm">{product.sku}</td>
      <td className="p-3 font-medium text-slate-800">{product.name}</td>
      <td className="p-3 text-right">${product.price.toFixed(2)}</td>
      <td className="p-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isLowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {product.stock} unids
        </span>
      </td>
      <td className="p-3 text-right">
        <button 
          onClick={() => onEdit(product.id)}
          className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 cursor-pointer"
        >
          Editar
        </button>
      </td>
    </tr>
  );
};
```

## Testing Frontend (vitest)

Ejecutar tests desde `frontend/`:

```bash
npm test                           # vitest run (una vez)
npm run test:watch                 # Modo watch
```

- Usar `vitest` como framework de testing (nativo de Vite).
- Usar `@testing-library/react` para tests de componentes.
- Usar `@testing-library/jest-dom` para matchers DOM.
- Usar `jsdom` como entorno DOM simulado.
- Configuración en `vitest.config.ts` (setup en `src/__tests__/setup.ts`).
- Nombrar archivos: `*.test.tsx` dentro de `src/__tests__/` (agrupados en `features/`, `hooks/`, `lib/`, `services/`, `stores/`, `ui-components/`).

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Component", () => {
  it("renders correctly", () => {
    render(<div>Hello</div>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```
