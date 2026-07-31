# Plan de Implementación - Responsive Design Improvements

**Rama:** `feat/responsive-design-improvements`
**Fecha:** 2026-07-30
**Objetivo:** Mejorar la experiencia responsive del frontend en todos los breakpoints, corrigiendo problemas identificados en el análisis actual.

---

## Fase 0: Fundamentos y Configuración

**Objetivo:** Establecer la base responsive del proyecto.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 0.1 | Agregar breakpoints `xl:` y `2xl:` al tema | `src/index.css` | Definir custom breakpoints si es necesario o confirmar que los defaults de Tailwind v4 son suficientes |
| 0.2 | Crear hook `useBreakpoint` | `src/hooks/useBreakpoint.ts` | Hook ligero para detectar breakpoint actual (lg, xl, 2xl) vía `matchMedia` |
| 0.3 | Agregar utilidades responsive al tema | `src/index.css` | Definir variables CSS para spacing/tipografía responsive si se necesita |

**Criterio de aceptación:** El hook `useBreakpoint` retorna el breakpoint actual; los breakpoints `xl:` y `2xl:` están disponibles en clases Tailwind.

---

## Fase 1: Header y Navegación Global

**Objetivo:** Corregir el header para que funcione correctamente en todos los tamaños de pantalla.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 1.1 | Responsive `TasaBcvIndicator` | `src/ui-components/TasaBcvIndicator.tsx` | En `sm:` mostrar solo USD, en mobile (`<sm:`) ocultar o comprimir a solo "BCV" con tooltip |
| 1.2 | Mejorar header mobile | `src/App.tsx` | Ajustar `LayoutHeader` para que el indicador BCV se colapse en mobile, usar `flex-1 min-w-0` para prevenir overflow |
| 1.3 | Breadcrumbs alternativos en mobile | `src/App.tsx` | Mostrar último segmento del breadcrumb en mobile cuando `sm:block` lo oculta, o usar atajos de navegación |
| 1.4 | Sidebar toggle mejorado | `src/ui-components/Sidebar.tsx` | Asegurar que el botón de colapsar no se superponga con contenido en diferentes anchos |

**Criterio de aceptación:** Header funcional en 320px-2560px; BCV no se desborda; navegación clara en mobile.

---

## Fase 2: ProductsPage - Toolbar y Grid

**Objetivo:** Corregir el overflow del toolbar y mejorar la visualización en diferentes tamaños.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 2.1 | Toolbar responsive | `src/features/products/pages/ProductsPage.tsx` | Aplicar `flex-wrap` o dividir toolbar en 2 filas en `md:`; ocultar texto de botones secundarios en `sm:` |
| 2.2 | Ocultar elementos secundarios | `src/features/products/pages/ProductsPage.tsx` | `hidden lg:inline` para "Descargar Excel" texto; `hidden md:inline` para "Agregar Factura" texto |
| 2.3 | Select de ordenamiento responsive | `src/features/products/pages/ProductsPage.tsx` | En mobile, mover a un drawer o usar `w-full` en `sm:` |
| 2.4 | ViewToggle en mobile | `src/features/products/pages/ProductsPage.tsx` | Asegurar que el toggle grid/table funcione en pantallas pequeñas |
| 2.5 | ProductCard mejoras | `src/features/products/components/ProductCard.tsx` | Revisar que las tarjetas se adapten correctamente en `sm:` |

**Criterio de aceptación:** Toolbar sin overflow en todos los breakpoints; todos los botones accesibles; grid de productos legible.

---

## Fase 3: InvoiceNewPage - Formulario Complejo

**Objetivo:** Simplificar y corregir el grid de 12 columnas del formulario de facturación.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 3.1 | Grid "Información de la Factura" | `src/features/invoices/pages/InvoiceNewPage.tsx` | El `md:grid-cols-2` funciona; verificar que los campos no se desborden |
| 3.2 | Grid "Agregar Ítem" | `src/features/invoices/pages/InvoiceNewPage.tsx` | Reemplazar `md:grid-cols-12` con `md:grid-cols-2 lg:grid-cols-6` o similar; eliminar `col-span-1.5` |
| 3.3 | Tabla de items responsive | `src/features/invoices/pages/InvoiceNewPage.tsx` | Asegurar `overflow-x-auto` esté presente; considerar ocultar columnas secundarias en mobile (`hidden sm:table-cell`) |
| 3.4 | Resumen fiscal responsive | `src/features/invoices/pages/InvoiceNewPage.tsx` | El panel de totales debe ser `w-full sm:w-auto` |
| 3.5 | Botones de acción responsive | `src/features/invoices/pages/InvoiceNewPage.tsx` | Stack vertical en mobile: `flex-col sm:flex-row` |

**Criterio de aceptación:** Formulario usable en tablet (768px+); tabla con scroll horizontal en mobile; botones accesibles.

---

## Fase 4: POSPage - Layout de Venta

**Objetivo:** Optimizar el layout del punto de venta para tablets y desktop.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 4.1 | Layout responsive POS | `src/features/sales/pages/POSPage.tsx` | En tablet (`md:`), considerar layout apilado o grid 2x1 |
| 4.2 | Tabla de productos POS | `src/features/sales/pages/POSPage.tsx` | Columnas ocultables en mobile: `hidden md:table-cell` para "Precio Caja" |
| 4.3 | Carrito sticky | `src/features/sales/pages/POSPage.tsx` | En desktop, carrito sticky en la columna derecha |
| 4.4 | CheckoutDrawer responsive | `src/features/sales/components/CheckoutDrawer.tsx` | Drawer debe ser `w-full sm:w-96` |

**Criterio de aceptación:** POS funcional en tablet (landscape); carrito siempre visible en desktop; checkout accesible.

---

## Fase 5: Otras Páginas

**Objetivo:** Aplicar mejoras responsive a las páginas restantes.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 5.1 | Dashboard responsive | `src/features/dashboard/pages/DashboardPage.tsx` | Verificar KPIs en `xl:`; ajustar charts para pantallas grandes |
| 5.2 | ReportsPage responsive | `src/features/reports/pages/ReportsPage.tsx` | Grid de charts `lg:grid-cols-2` funciona; agregar `xl:grid-cols-3` |
| 5.3 | ExchangeRatesPage | `src/features/exchange-rates/pages/ExchangeRatesPage.tsx` | Verificar `sm:grid-cols-2` |
| 5.4 | SaleDetailPage | `src/features/sales/pages/SaleDetailPage.tsx` | Verificar `sm:grid-cols-5` |
| 5.5 | UsersPage / RolesPage | `src/features/users/pages/UsersPage.tsx`, `src/features/roles/pages/RolesPage.tsx` | Tablas con scroll horizontal |
| 5.6 | SupplierFormPage / CategoryFormPage | `src/features/suppliers/pages/SupplierFormPage.tsx`, `src/features/categories/pages/CategoryFormPage.tsx` | Formularios con grid responsive similar a InvoiceNewPage |

**Criterio de aceptación:** Todas las páginas funcionales en 320px-2560px; sin overflow horizontal.

---

## Fase 6: Componentes UI

**Objetivo:** Mejorar los componentes de diseño para soporte responsive nativo.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 6.1 | Drawer responsive | `src/ui-components/Drawer.tsx` | Cambiar `w-80` fijo por `w-full sm:w-96` |
| 6.2 | Modal responsive | `src/ui-components/Modal.tsx` | Verificar `max-w-lg w-full mx-4` funciona en mobile |
| 6.3 | Table columnas ocultables | `src/ui-components/Table.tsx` | Agregar prop `hideOnMobile?: string[]` para ocultar columnas en mobile |
| 6.4 | Pagination responsive | `src/ui-components/Pagination.tsx` | Simplificar en mobile: ocultar números de página intermedios |
| 6.5 | StatCard tipografía | `src/ui-components/StatCard.tsx` | Agregar `text-xl sm:text-2xl` al valor |
| 6.6 | Button sizes | `src/ui-components/Button.tsx` | Verificar que `sm` funciona en mobile |

**Criterio de aceptación:** Componentes UI funcionales y consistentes en todos los breakpoints.

---

## Fase 7: Tipografía y Espaciado Global

**Objetivo:** Establecer un sistema de tipografía y espaciado responsive.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 7.1 | Títulos responsive | Múltiples archivos | Aplicar `text-xl sm:text-2xl lg:text-3xl` a títulos principales |
| 7.2 | Padding global responsive | `src/App.tsx` | Cambiar `p-6` fijo por `p-4 sm:p-6` en `<main>` |
| 7.3 | Gap responsive | Múltiples archivos | Revisar `gap-4`, `gap-6` y ajustar a `gap-3 sm:gap-4 lg:gap-6` donde sea necesario |
| 7.4 | Container|max-width | `src/App.tsx` | Considerar `max-w-7xl mx-auto` para el contenido principal en `xl:`+ |

**Criterio de aceptación:** Jerarquía visual clara en todos los tamaños; espaciado consistente.

---

## Fase 8: Testing y Validación

**Objetivo:** Verificar que todos los cambios funcionan correctamente.

| # | Tarea | Archivos | Detalle |
|---|-------|----------|---------|
| 8.1 | Testing unitario | `src/__tests__/` | Ejecutar `pnpm test` y asegurar que no hay regresiones |
| 8.2 | Testing visual manual | Navegador | Probar en: 320px (mobile), 375px (iPhone), 768px (tablet), 1024px (laptop), 1440px (desktop), 2560px (ultrawide) |
| 8.3 | Testing de accesibilidad | Navegador | Verificar navegación por teclado, contraste de colores, focus states |
| 8.4 | Lint y typecheck | Terminal | Ejecutar `pnpm lint` y `pnpm typecheck` |
| 8.5 | Build de producción | Terminal | Ejecutar `pnpm build` y verificar que no hay errores |

**Criterio de aceptación:** Todos los tests pasan; sin errores de lint/typecheck; build exitoso; experiencia visual correcta en todos los breakpoints.

---

## Resumen de Fases

| Fase | Descripción | Dependencias |
|------|-------------|--------------|
| **0** | Fundamentos y Configuración | Ninguna |
| **1** | Header y Navegación Global | Fase 0 |
| **2** | ProductsPage - Toolbar y Grid | Fase 0 |
| **3** | InvoiceNewPage - Formulario | Fase 0 |
| **4** | POSPage - Layout Venta | Fase 0 |
| **5** | Otras Páginas | Fase 0 |
| **6** | Componentes UI | Fase 0 |
| **7** | Tipografía y Espaciado | Fases 1-6 |
| **8** | Testing y Validación | Todas las fases |

**Nota:** Las fases 1-6 son independientes entre sí y pueden ejecutarse en paralelo. La fase 7 depende de que las fases anteriores estén completas. La fase 8 es la validación final.

---

## Estimación de Esfuerzo

| Fase |Archivos a Modificar | Complejidad |
|------|---------------------|-------------|
| 0 | 2 | Baja |
| 1 | 3 | Media |
| 2 | 3 | Media |
| 3 | 1 | Alta |
| 4 | 3 | Media |
| 5 | 8+ | Baja-Media |
| 6 | 6 | Media |
| 7 | 10+ | Baja |
| 8 | 0 (testing) | Baja |

**Total estimado:** ~35 archivos a modificar, ~2-3 días de desarrollo.
