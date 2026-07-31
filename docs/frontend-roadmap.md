# Roadmap del Frontend — Sistema Licorería

**Progreso actual: ~90 %** — Infraestructura completa, todos los módulos CRUD implementados, POS funcional, dashboard con analytics, tasas de cambio con scraping BCV. Faltan: tests unitarios completos, perfil de usuario, y pulido final.

---

## Fase 1 — Infraestructura base (Sprint 1)

- [x] Instalar `react-router-dom` y crear sistema de rutas
- [x] Crear `AppLayout` con Sidebar + Navbar responsive
- [x] Componentes compartidos: `Button`, `Input`, `Select`, `Modal`, `Table`, `Pagination`, `LoadingSpinner`, `ErrorBanner`, `Toast/notifications`, `ConfirmDialog`, `Badge`, `StatCard`
- [x] `AuthContext` + `useAuth` + `PrivateRoute` + redirect a login si 401
- [x] Implementar **todos los servicios REST** en `services/api.ts` (48 endpoints implementados)
- [x] Páginas de Login (Register no se requiere)

## Fase 2 — Módulos CRUD principales (Sprint 2)

- [x] **Usuarios:** listado, crear/editar, toggle activo
- [x] **Roles:** listado, crear/editar/eliminar
- [x] **Categorías:** listado, crear/editar/eliminar + analytics (top ventas, top margen, baja rotación, bajo margen)
- [x] **Proveedores:** listado, crear/editar/eliminar + analytics

## Fase 3 — Productos (Sprint 3)

- [x] **Productos:** listado con búsqueda, filtros (categoría, precio, stock) y paginación
- [x] Formulario crear/editar producto (con categorías multi-select, proveedor, tipo IVA)
- [x] Tablas analíticas: top ventas, top margen, baja rotación, bajo margen

## Fase 4 — Tasas de Cambio (Sprint 4)

- [x] CRUD de tasas de cambio + historial
- [x] Botón/scraping de tasa BCV automática
- [x] Visualización de tasa actual en header/navbar (reutilizable en POS)

## Fase 5 — Ventas / POS (Sprint 5)

- [x] **POS (Punto de Venta):** buscador de productos, carrito, cálculo de totales en BS/USD con tasa BCV vigente, validación de stock
- [x] Listado de ventas con filtros por fecha
- [x] Detalle de venta / recibo / factura
- [x] Dashboard con resumen de ventas (hoy/semana/mes) + top week

## Fase 6 — Dashboard principal (Sprint 6)

- [x] Cards de resumen global
- [x] Top productos más vendidos
- [x] Alertas de stock bajo
- [x] Analytics gráficos (ventas por período, márgenes)

## Fase 7 — Testing y pulido (Sprint 7)

- [ ] Tests unitarios para componentes, hooks y servicios (solo 1 test de cartStore)
- [x] Estados de carga (spinner) en cada página
- [x] Manejo de errores global (toasts, formularios)
- [x] Experiencia mobile responsive (sidebar responsive)
- [ ] Perfil de usuario (cambiar contraseña / datos personales)

---

## Resumen de construcción

| Concepto             | Cantidad |
|----------------------|----------|
| Páginas              | 18       |
| Componentes compartidos | 33   |
| Endpoints API        | 48 (completos) |
| Router files backend | 9        |
| Fases                | 7        |

> **Nota:** La Fase 4 (Tasas de Cambio) se movió antes que el POS porque el punto de venta depende de la tasa BCV para calcular totales en bolívares.
