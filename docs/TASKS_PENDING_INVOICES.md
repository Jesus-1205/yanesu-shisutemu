# Tasks Pendientes - Módulo Invoices

> Documento generado el 2026-08-23. Cada tarea tiene prioridad, archivos afectados y descripción técnica.
> **Regla**: antes de implementar, revisar que no haya lógica duplicada entre tareas relacionadas.

---

## Bugs

### BUG-001 — Subtotal inflado por `unidades_por_caja` en InvoiceDetailPage

**Prioridad**: CRÍTICA
**Archivos afectados**:
- `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx` (líneas 207-224, 235-241)

**Descripción**:
Al crear una factura con items de tipo CAJA donde `unidades_por_caja > 1`, la página de detalle (`InvoiceDetailPage`) muestra subtotales inflados. El primer item se ve correcto porque su `unidades_por_caja` es 1, pero los siguientes tienen el subtotal multiplicado por `unidades_por_caja` (ej: 20).

**Causa raíz**:
`InvoiceDetailPage.tsx` **recalcula** los subtotales en el frontend con una fórmula incorrecta, en lugar de usar los valores que el backend ya calculó correctamente.

- **Backend** (`invoice_service.py:670-671`): `subtotal = cantidad × costo_unitario` ✅
- **Frontend detalle** (líneas 209-213): `subtotal = cantidad × unidades_por_caja × costo_unitario` ❌

**Ejemplo**:
- 3 cajas de cerveza, $10/caja, 20 unds/caja
- Backend: `3 × 10 = $30` ✅
- Detail page: `3 × 20 × 10 = $600` ❌

**Lugares con el bug** (mismo archivo):
| Líneas | Contexto | Fórmula incorrecta |
|--------|----------|-------------------|
| 207-214 | Columna "Subtotal USD" | `unidades × costo_unitario_usd` |
| 217-224 | Columna "Subtotal Bs." | `unidades × costo_unitario_bs` |
| 235-241 | Resumen fiscal (base imponible) | `unidades × costo_unitario_bs` |

**Corrección**: Eliminar la multiplicación por `unidades_por_caja`. Usar `cantidad × costo_unitario` directamente (igual que el backend).

---

## Mejoras

### MEJORA-001 — Columna "$/Unid" muestra precio por caja como si fuera por unidad

**Prioridad**: ALTA
**Archivos afectados**:
- `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` (línea 765, 796-798)
- `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx` (líneas 197-204)

**Descripción**:
El encabezado de columna dice "$/Unid" pero cuando el item es de tipo CAJA, el valor mostrado es el costo por caja (no por unidad). Esto contradice el label del input que dice "$/Caja" (línea 677).

**Impacto UX**: El usuario ve "$100/Unid" en la tabla pero ingresó "$100/Caja" en el formulario. Crea confusión inmediata.

**Sugerencia**: Hacer el label dinámico por fila o mostrar ambos precios:
```tsx
<td>
  ${item.costo_unitario_usd.toFixed(2)}
  <span className="text-[10px] text-slate-400">/{item.tipo_empaque === "CAJA" ? "caja" : "und"}</span>
</td>
```

---

### MEJORA-002 — Mostrar `unidades_por_caja` en la tabla de items

**Prioridad**: MEDIA
**Archivos afectados**:
- `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` (líneas 784-791)

**Descripción**:
La tabla de items no muestra `unidades_por_caja`. Para items CAJA, el usuario necesita ver "12 unds/caja" para verificar que 5 cajas × 12 = 60 unidades. Sin esta info, el total de unidades en el footer (60) parece desconectado de la columna cantidad (5).

**Sugerencia**: Agregar subtítulo en la columna "Tipo":
```tsx
{item.tipo_empaque === "CAJA" && (
  <div className="text-[10px] text-slate-400">{item.unidades_por_caja} unds/caja</div>
)}
```

---

### MEJORA-003 — Footer de totales muestra unidades expandidas sin contexto

**Prioridad**: MEDIA
**Archivos afectados**:
- `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` (líneas 819-836)

**Descripción**:
El footer de la tabla muestra `ivaBreakdown.totalUnidades` que expande cajas a unidades (ej: 5 cajas → 60 unidades), pero la columna "Cant" muestra 5. Sin explicación, parece un error.

**Sugerencia**: Mostrar desglose: "5 cajas (60 unds)" o agregar label "unds" al total.

---

### MEJORA-004 — Helper de conversión en input de costo

**Prioridad**: BAJA
**Archivos afectados**:
- `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` (líneas 676-689)

**Descripción**:
Cuando el tipo es CAJA y el usuario ingresa el costo por caja, no hay indicación del costo unitario equivalente. El usuario debe calcular mentalmente.

**Sugerencia**: Mostrar texto auxiliar debajo del input:
```tsx
{newTipoEmpaque === "CAJA" && nUndsCaja > 0 && nCostoPrim > 0 && (
  <p className="text-[10px] text-slate-400">= ${(nCostoPrim / nUndsCaja).toFixed(2)} por unidad</p>
)}
```

---

## Implementaciones

### IMPL-001 — Sistema de Estado de Pago y Comprobantes para Facturas

**Prioridad**: ALTA
**Tipo**: Feature completa (backend + frontend)
**Archivos afectados**:

| Capa | Archivo | Cambio |
|------|---------|--------|
| Modelo | `backend/app/models/invoice.py` | +1 columna `estado_pago`, +1 relación `payments` |
| Modelo | `backend/app/models/invoice_payment.py` | **NUEVO** (~60 líneas) — tablas `pagos_facturas` y `comprobantes_pago_facturas` |
| Modelo | `backend/app/models/__init__.py` | +2 imports |
| Schema | `backend/app/schemas/invoice.py` | +5 schemas (~80 líneas) |
| Servicio | `backend/app/services/invoice_service.py` | +4 funciones (~150 líneas) |
| Ruta | `backend/app/routes/invoices.py` | +4 endpoints (~100 líneas) |
| Config | `backend/app/core/config.py` | +1 función directorio comprobantes |
| Frontend types | `frontend/src/types/api.ts` | +5 interfaces (~40 líneas) |
| Frontend API | `frontend/src/services/api.ts` | +4 métodos (~30 líneas) |
| Frontend UI | `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx` | +~200 líneas (panel + historial + drawer) |
| Frontend UI | `frontend/src/features/invoices/pages/InvoicesPage.tsx` | +~30 líneas (columna + filtro) |
| Frontend UI | `frontend/src/features/invoices/components/PaymentDrawer.tsx` | **NUEVO** componente Drawer |
| Migración | SQL script | ~20 líneas |
| Tests | `backend/tests/test_invoice_payments.py` | ~150 líneas |

**Total estimado**: ~850 líneas nuevas, ~50 líneas modificadas.

---

#### 1. Modelo de Base de Datos

**1.1. Columna a agregar en `Factura`**:
```python
estado_pago: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDIENTE")
# Valores: "PENDIENTE", "PARCIALMENTE_PAGADA", "PAGADA"
```

**1.2. Nueva tabla `InvoicePayment`** (`pagos_facturas`):
```python
class InvoicePayment(Base):
    __tablename__ = "pagos_facturas"
    id, factura_id (FK CASCADE), metodo_pago_id (FK RESTRICT),
    monto_usd (DECIMAL 12,2), monto_bs (DECIMAL 14,2),
    referencia (String 100), observaciones (Text),
    fecha_pago (DateTime), usuario_id (FK RESTRICT)
```
- Reutiliza `PaymentMethod` existente (`metodos_pago`)
- `ondelete="CASCADE"`: si se elimina la factura, se eliminan sus pagos

**1.3. Nueva tabla `InvoicePaymentReceipt`** (`comprobantes_pago_facturas`):
```python
class InvoicePaymentReceipt(Base):
    __tablename__ = "comprobantes_pago_facturas"
    id, pago_id (FK CASCADE), archivo_path (String 255),
    nombre_original (String 255), tipo_archivo (String 50),
    created_at (DateTime)
```
- Un pago puede tener múltiples comprobantes (transferencia + depósito + screenshot)

**1.4. Script de migración SQLite**:
```sql
ALTER TABLE facturas ADD COLUMN estado_pago VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE';
CREATE TABLE pagos_facturas (...);
CREATE TABLE comprobantes_pago_facturas (...);
CREATE INDEX idx_pagos_facturas_factura_id ON pagos_facturas(factura_id);
CREATE INDEX idx_comprobantes_pago_id ON comprobantes_pago_facturas(pago_id);
```

---

#### 2. Schemas Pydantic

- `InvoicePaymentCreate`: metodo_pago_id, monto_usd, monto_bs, referencia, observaciones
  - Validador: al menos un monto debe ser > 0
- `InvoicePaymentOut`: id, factura_id, metodo_pago_nombre, montos, referencia, fecha_pago, usuario_nombre, comprobantes[]
- `InvoicePaymentReceiptOut`: id, pago_id, archivo_path, nombre_original, tipo_archivo
- `InvoicePaymentSummary`: estado_pago, total_factura_usd/bs, total_pagado_usd/bs, saldo_pendiente_usd/bs, cantidad_pagos, porcentaje_pagado

---

#### 3. Endpoints

| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/invoices/{id}/payments` | Registrar pago + comprobantes | ADMIN, OPERADOR |
| GET | `/invoices/{id}/payments` | Listar pagos + resumen | ADMIN, OPERADOR |
| DELETE | `/invoices/{id}/payments/{pid}` | Eliminar pago (recalcula estado) | ADMIN |
| GET | `/invoices/{id}/payments/summary` | Resumen de pago | ADMIN, OPERADOR |

---

#### 4. Lógica de Negocio

**Cálculo del estado de pago** (en `invoice_service.py`):
```
total_pagado_usd = SUM(pagos.monto_usd) + SUM(pagos.monto_bs) / factura.tasa_bs
Si total_pagado >= total_factura → PAGADA
Si total_pagado > 0 → PARCIALMENTE_PAGADA
Si total_pagado == 0 → PENDIENTE
```

**Reglas**:
- Usar SIEMPRE la `tasa_bs` de la factura para conversiones (no la tasa actual)
- Validar que el monto no exceda el saldo pendiente
- Recalcular `estado_pago` después de cada registro/eliminación de pago
- Comprobantes se guardan en `%LOCALAPPDATA%/YanesuShisutemu/uploads/comprobantes_pago/`
- Validar tamaño máx 5MB y tipos (JPEG, PNG, PDF)

---

#### 5. UX / Interfaz

**5.1. Lista de facturas (`InvoicesPage`)**:
- Nueva columna "Estado" con badge: 🟢 Pagada / 🟠 Parcial / 🔴 Pendiente
- Nueva columna "Saldo Pend." (oculta si PAGADA)
- Nuevo filtro por estado de pago (dropdown)
- Botón 💰 de acceso rápido a pago (solo si no PAGADA)

**5.2. Detalle de factura (`InvoiceDetailPage`)**:
- **Panel de Estado de Pago** (debajo de cards de info):
  - Barra de progreso visual (0-100%)
  - 4 cards: Total, Pagado, Saldo, Estado
  - Botón "Registrar Pago" (solo si no PAGADA)
- **Historial de Pagos** (tabla):
  - Columnas: Fecha, Método, Monto USD, Monto Bs, Referencia, Comprobante
  - Link "Ver" para abrir comprobante en nueva pestaña
  - EmptyState si no hay pagos

**5.3. Drawer de Registrar Pago** (`PaymentDrawer` — nuevo componente):
- Patrón consistente con `CheckoutDrawer` de ventas
- Pre-fill del monto con el saldo pendiente
- Grid de botones para seleccionar método de pago
- Campo de referencia condicional (si `acepta_referencia`)
- Upload de comprobantes (drag & drop, múltiples)
- Observaciones opcionales
- Validación: monto no puede exceder saldo
- **Flujo: 4 clicks** (pagar → método → referencia → confirmar)

**5.4. Mapeo de colores**:
| Estado | Badge variant | Icono |
|--------|---------------|-------|
| PAGADA | success (verde) | CheckCircle |
| PARCIALMENTE_PAGADA | warning (naranja) | Clock |
| PENDIENTE | danger (rojo) | AlertCircle |

---

#### 6. Edge Cases

| Problema | Mitigación |
|----------|------------|
| Sobrepago | Validar `monto <= saldo_pendiente`, rechazar con 409 |
| Eliminación de pago cambia estado | Recalcular `estado_pago` después de cada eliminación |
| Tasa de cambio inconsistente | Usar SIEMPRE `tasa_bs` de la factura |
| Pago en moneda mixta | Permitir, convertir BS→USD con tasa de factura |
| Factura eliminada con pagos | CASCADE elimina pagos; limpiar archivos del disco |
| Factura con total 0 | Rechazar registro de pago con error |
| Migración de facturas existentes | `ALTER TABLE DEFAULT 'PENDIENTE'` las marca automáticamente |

---

### IMPL-002 — Campo `tipo_documento` (Factura / Nota de Entrega) + Filtros

**Prioridad**: MEDIA
**Tipo**: Feature (backend + frontend)
**Complejidad**: Baja-media
**Archivos afectados**:

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `backend/app/models/invoice.py` | Nuevo enum `TipoDocumentoEnum`, nuevo campo `tipo_documento` |
| 2 | `backend/app/schemas/invoice.py` | Campo en `FacturaCreate` (opcional, default FACTURA) y `FacturaOut` (requerido) |
| 3 | `backend/app/services/invoice_service.py` | Parámetro nuevo en `get_invoices()`, asignación en `create_invoice()` |
| 4 | `backend/app/routes/invoices.py` | Query param `tipo_documento` en `list_all()` |
| 5 | `frontend/src/types/api.ts` | Tipo `TipoDocumento`, campo en `FacturaCreate` y `FacturaOut` |
| 6 | `frontend/src/services/api.ts` | Parámetro en `getInvoices()` |
| 7 | `frontend/src/features/invoices/pages/InvoicesPage.tsx` | Filtro Select + columna Badge en tabla |
| 8 | `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` | Segmented button selector + título dinámico |
| 9 | `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx` | Badge en header + card en grid |
| 10 | `backend/sql/migrate_tipo_documento.sql` | Script de migración |

---

#### 1. Modelo de Base de Datos

**Nuevo enum** (en `invoice.py`, junto a `MonedaEnum`):
```python
class TipoDocumentoEnum(str, enum.Enum):
    FACTURA = "FACTURA"
    NOTA_ENTREGA = "NOTA_ENTREGA"
```

**Nuevo campo en `Factura`** (después de `numero_factura`):
```python
tipo_documento: Mapped[TipoDocumentoEnum] = mapped_column(
    String(15), nullable=False, default=TipoDocumentoEnum.FACTURA
)
```

**Migración SQLite**:
```sql
ALTER TABLE facturas ADD COLUMN tipo_documento VARCHAR(15) NOT NULL DEFAULT 'FACTURA';
```

**Decisiones**:
- Default `"FACTURA"` para registros existentes (todas las facturas actuales son facturas)
- La UniqueConstraint `(proveedor_id, numero_factura)` **NO se modifica** — un proveedor no puede tener dos documentos con el mismo número sin importar el tipo
- El campo es puramente clasificatorio — NO afecta cálculos de IVA, totales ni stock

---

#### 2. Schemas Pydantic

**`FacturaCreate`** — campo opcional con default:
```python
tipo_documento: TipoDocumentoEnum = TipoDocumentoEnum.FACTURA
```

**`FacturaOut`** — campo requerido:
```python
tipo_documento: TipoDocumentoEnum
```

---

#### 3. Servicio y Rutas

**`get_invoices()`** — nuevo parámetro de filtro:
```python
def get_invoices(db, *, proveedor_id=None, tipo_documento=None, search=None, page=1, page_size=20):
    ...
    if tipo_documento:
        stmt = stmt.where(Factura.tipo_documento == tipo_documento)
```

**`list_all()`** — nuevo query param:
```python
def list_all(proveedor_id=None, tipo_documento=None, search=None, page=1, page_size=20, ...):
```

**`create_invoice()`** — asignar campo:
```python
factura = Factura(..., tipo_documento=data.tipo_documento, ...)
```

---

#### 4. UX / Interfaz

**4.1. Formulario de creación (`InvoiceNewPage`)**:
- **Segmented button** (mismo patrón que Moneda y Empaque): `Factura` | `Nota de Entrega`
- **Ubicación**: Primera posición del grid izquierdo, antes de Proveedor
- **Default**: `FACTURA` pre-seleccionado
- **Título dinámico**: "Nueva Factura" / "Nueva Nota de Entrega"
- **Botón dinámico**: "Registrar Factura" / "Registrar Nota de Entrega"

**4.2. Lista de facturas (`InvoicesPage`)**:
- **Columna "Tipo"**: Badge entre "Factura" y "Proveedor"
  - FACTURA → Badge `info` (azul) — "Factura"
  - NOTA_ENTREGA → Badge `warning` (naranja) — "Nota Entrega"
- **Filtro**: Select a la derecha del filtro de proveedor
  - Opciones: "Todos los tipos" / "Factura" / "Nota de Entrega"
  - Resetea paginación a página 1

**4.3. Detalle de factura (`InvoiceDetailPage`)**:
- **Header**: Título dinámico "Factura #X" / "Nota #X" + Badge inline
- **Card**: Nueva tarjeta "Tipo de Documento" en el grid de metadata

---

#### 5. Edge Cases

| Problema | Mitigación |
|----------|------------|
| Frontend sin enviar `tipo_documento` | Default `"FACTURA"` en schema Pydantic — no rompe nada |
| Migración en DB con datos | `ALTER TABLE ADD COLUMN DEFAULT` es seguro en SQLite ≥ 3.35 |
| Breaking change en API | Campo opcional en Create, requerido en Out — backwards compatible |
| IA no detecta tipo | Usuario selecciona manualmente. Futuro: agregar detección IA |

---

### IMPL-003 — Campo `aplica_iva` a nivel de Factura

**Prioridad**: MEDIA
**Tipo**: Feature (backend + frontend)
**Complejidad**: Baja (~30 líneas nuevas/modificadas + 1 archivo SQL)
**Archivos afectados**:

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `backend/app/models/invoice.py` | +1 campo `aplica_iva: Boolean` en `Factura` |
| 2 | `backend/app/schemas/invoice.py` | +2 líneas: campo en `FacturaCreate` (default True) y `FacturaOut` |
| 3 | `backend/app/services/invoice_service.py` | +1 línea: propagar `aplica_iva` al crear `Factura` |
| 4 | `backend/sql/add_aplica_iva_to_facturas.sql` | **NUEVO**: migración ALTER TABLE |
| 5 | `frontend/src/types/api.ts` | +2 líneas: campo en `FacturaCreate` y `FacturaOut` |
| 6 | `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` | +estado, +segmented button, modificar lógica `ivaBreakdown` |
| 7 | `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx` | +badge en card, corregir cálculo fiscal |

---

#### 1. Modelo de Base de Datos

**Nuevo campo en `Factura`** (después de `total_bs`):
```python
aplica_iva: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
```

**Migración SQLite**:
```sql
ALTER TABLE facturas ADD COLUMN aplica_iva BOOLEAN NOT NULL DEFAULT 1;
```

**Decisiones**:
- Default `True` — el comportamiento actual asume que las facturas en BS aplican IVA
- Todas las facturas existentes quedan con `aplica_iva = True` (sin cambio de comportamiento)
- El campo es un **interruptor maestro** a nivel de factura: si es `False`, TODOS los items van a exento sin importar `product.tipo_iva`
- NO modifica el `tipo_iva` del producto — solo afecta el resumen fiscal de ESA factura

---

#### 2. Interacción con `tipo_iva` del Producto

Regla jerárquica:
```
¿factura.aplica_iva == false?
  ├─ SÍ → TODOS los ítems van a "Exento" (sin importar product.tipo_iva)
  └─ NO → Se respeta product.tipo_iva de cada ítem:
           - GRAVADO → base imponible + IVA 16%
           - EXENTO  → exento
```

---

#### 3. Schemas Pydantic

**`FacturaCreate`** — campo opcional con default:
```python
aplica_iva: bool = True
```

**`FacturaOut`** — campo requerido:
```python
aplica_iva: bool
```

---

#### 4. Servicio

**`create_invoice()`** — propagar campo:
```python
factura = Factura(..., aplica_iva=data.aplica_iva, ...)
```

**Cálculo de IVA**: se mantiene en el frontend (resumen fiscal). El backend NO calcula IVA — solo suma subtotales. Los `total_usd` y `total_bs` son la suma de subtotales SIN IVA.

---

#### 5. UX / Interfaz

**5.1. Formulario de creación (`InvoiceNewPage`)**:
- **Segmented button** (mismo patrón que Moneda): `Con IVA` | `Sin IVA`
- **Ubicación**: En la columna derecha del card "Información", debajo de Tasa de Cambio
- **Label**: `¿La factura incluye IVA?`
- **Default**: `Con IVA` (la mayoría de facturas en Bs. sí incluyen IVA)
- **Tooltip**: `Indica si el proveedor cobra IVA en esta factura`
- **Deshabilitación**: Si moneda es USD, el selector se deshabilita con tooltip: "El IVA solo aplica a facturas en bolívares"

**5.2. Lógica de cálculo `ivaBreakdown`**:
```typescript
// ANTES:
const aplicaIva = moneda === "BS";

// DESPUÉS:
const aplicaIva = moneda === "BS" && aplicaIvaState;
```

**5.3. Resumen fiscal cuando `aplica_iva = false`**:
```
Resumen Fiscal y Total
  Base imponible      Bs. 250.00
  IVA (16%)           Bs. 0.00 (no aplica)
  ─────────────────────────────
  Total               Bs. 250.00
```
- Se muestra IVA en 0 con indicador "(no aplica)" — no se oculta la fila
- Mantiene consistencia visual con el layout existente

**5.4. Detalle de factura (`InvoiceDetailPage`)**:
- Badge en card de Total Bs.: `Con IVA` (success/verde) o `Sin IVA` (neutral/gris)
- Resumen fiscal condicional: si `aplica_iva = false`, IVA = 0 con "(no aplica)"

---

#### 6. Edge Cases

| Problema | Mitigación |
|----------|------------|
| Factura `aplica_iva = false` + moneda BS | Todo va a exento. Es la intención del usuario |
| Factura `aplica_iva = true` + moneda USD | IVA no aplica en USD. Toggle no tiene efecto práctico |
| Mix GRAVADO + EXENTO, `aplica_iva = true` | Se respeta `tipo_iva` de cada producto |
| Facturas existentes | Migración las deja con `aplica_iva = True` — sin cambio |
| Flujo IA | Campo no se detecta automáticamente. Usuario lo marca manualmente |
| Cambio de toggle después de agregar productos | Solo cambia el resumen fiscal, NO los costos ni el stock |

---

#### 7. Lo que NO cambia

- **Costo de productos**: el cálculo de costo promedio no se ve afectado
- **Stock**: la actualización de stock no depende del IVA
- **Totales de factura**: `total_usd` y `total_bs` son suma de subtotales SIN IVA
- **Modelo Product**: no se modifica `tipo_iva` del producto
- **Ventas (POS)**: el IVA de ventas es independiente del IVA de compras

---

### MEJORA-005 — Responsive design en InvoicesPage (mobile)

**Prioridad**: ALTA
**Tipo**: UX / Mobile
**Archivos afectados**:
- `frontend/src/features/invoices/pages/InvoicesPage.tsx`
- `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx`

**Descripción**:
En dispositivos móviles, las tablas de facturas requieren scroll horizontal para ver todas las columnas (Fecha, Moneda, Total USD, Total Bs., Acciones). El botón de "Ver" queda oculto fuera de pantalla, haciendo difícil acceder al detalle de la factura.

El componente `Table` ya soporta la propiedad `hideOnMobile` en cada columna (ver `Table.tsx:21,89-91`): cuando `window.innerWidth < 768`, oculta automáticamente las columnas marcadas con `hideOnMobile: true`.

**Solución**: Marcar columnas secundarias con `hideOnMobile: true` en ambas páginas.

**1. InvoicesPage.tsx** — Columnas a ocultar en mobile:

| Columna | `hideOnMobile` | Razón |
|---------|----------------|-------|
| `numero_factura` | `false` | Información principal — siempre visible |
| `supplier` | `false` | Información principal — siempre visible |
| `fecha_factura` | `true` | Secundaria en mobile |
| `moneda_principal` | `true` | Secundaria en mobile |
| `total_usd` | `true` | El total en la moneda de la factura es suficiente |
| `total_bs` | `true` | El total en la moneda de la factura es suficiente |
| `acciones` | `false` | SIEMPRE visible — es el botón de acción |

**Resultado en mobile** (solo 3 columnas):
```
┌──────────────┬───────────────────────────────┬──────┐
│ FACTURA      │ PROVEEDOR                     │      │
├──────────────┼───────────────────────────────┼──────┤
│ 30099        │ Inversiones Cg                │ [👁] │
│ 2225         │ Supermercado Kara C.A.        │ [👁] │
│ 14384        │ Comercializadora Hermanos L   │ [👁] │
└──────────────┴───────────────────────────────┴──────┘
```

**2. InvoiceDetailPage.tsx** — Tabla de productos con `overflow-x-auto`:
La tabla de productos ya está dentro de un `div` con `overflow-x-auto` (el componente `Table` lo maneja). No requiere cambios adicionales en el contenedor.

**Código propuesto para InvoicesPage**:
```tsx
{
  key: "fecha_factura",
  header: "Fecha",
  hideOnMobile: true,
  render: (inv: Invoice) => new Date(inv.fecha_factura).toLocaleDateString("es-VE"),
},
{
  key: "moneda_principal",
  header: "Moneda",
  hideOnMobile: true,
  render: (inv: Invoice) => (
    <Badge variant={inv.moneda_principal === "USD" ? "info" : "warning"}>
      {inv.moneda_principal}
    </Badge>
  ),
},
{
  key: "total_usd",
  header: "Total USD",
  hideOnMobile: true,
  render: (inv: Invoice) => (
    <span className="font-mono tabular-nums">{formatUsd(Number(inv.total_usd))}</span>
  ),
},
{
  key: "total_bs",
  header: "Total Bs.",
  hideOnMobile: true,
  render: (inv: Invoice) => (
    <span className="font-mono tabular-nums">Bs. {formatBs(Number(inv.total_bs))}</span>
  ),
},
```

**Impacto**: Sin cambio en desktop. En mobile, la tabla se muestra completa sin scroll horizontal. El usuario puede ver el botón de "Ver" inmediatamente.

**Nota**: En el **detalle** de factura (`InvoiceDetailPage`) se muestra **toda la información** sin ocultar nada. Los cards se apilan verticalmente en mobile (`grid-cols-1 md:grid-cols-5`) y la tabla de productos tiene scroll horizontal nativo (`overflow-x-auto`). No se aplica `hideOnMobile` en el detalle.

---

### IMPL-004 — Obsequios / Cortesías en Facturas

**Prioridad**: MEDIA
**Tipo**: Feature (backend + frontend)
**Complejidad**: Media (~4-6 horas)
**Archivos afectados**:

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `backend/app/models/invoice.py` | Nuevo modelo `ObsequioFactura` + relationships en `Factura` y `Product` |
| 2 | `backend/app/schemas/invoice.py` | Nuevo `ObsequioFacturaCreate`/`Out`, campo `obsequios` en `FacturaCreate`/`Out` |
| 3 | `backend/app/services/invoice_service.py` | Loop de obsequios en `create_invoice`, `selectinload` en queries |
| 4 | `frontend/src/types/api.ts` | Nuevos interfaces `ObsequioFacturaCreate`/`Out`, campo en `FacturaCreate`/`Out` |
| 5 | `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` | Sección de obsequios (formulario + tabla) |
| 6 | `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx` | Tabla de obsequios debajo de productos |

**Total estimado**: ~300 líneas nuevas, ~20 líneas modificadas.

---

#### 1. Modelo de Base de Datos

**Decisión de diseño: Tabla separada `obsequios_factura`** (no flag en `detalles_facturas`).

Razones:
- `DetalleFactura` tiene `CheckConstraint("costo_unitario_usd > 0")` — no permite costo 0
- Separación limpia de dominios: "lo que pago" vs "lo que me regalan"
- Cero impacto en queries existentes de `detalles_facturas`
- Reportes/auditoría directos: "¿cuántos obsequios tuvo esta factura?"

**Nuevo modelo `ObsequioFactura`** (en `invoice.py`):
```python
class ObsequioFactura(Base):
    __tablename__ = "obsequios_factura"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    factura_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facturas.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    tipo_empaque: Mapped[str] = mapped_column(String(10), nullable=False, default="CAJA")
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    justificacion: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_obsequio_cantidad_positivo"),
        CheckConstraint(
            "tipo_empaque IN ('UNIDAD', 'CAJA')",
            name="ck_obsequio_tipo_empaque_valido",
        ),
    )
```

**Columnas que NO lleva** (a diferencia de DetalleFactura):
- `costo_unitario_usd` — implícitamente 0
- `costo_unitario_bs` — implícitamente 0

**Relationships a agregar**:
- `Factura.obsequios` → relationship con cascade="all, delete-orphan"
- `Product.obsequios_factura` → relationship

**Migración**: No se necesita script SQL. SQLAlchemy crea la tabla automáticamente con `Base.metadata.create_all()`.

---

#### 2. Schemas Pydantic

**`ObsequioFacturaCreate`**:
```python
class ObsequioFacturaCreate(BaseModel):
    producto_id: int
    tipo_empaque: Literal["UNIDAD", "CAJA"] = "CAJA"
    cantidad: int = Field(gt=0)
    justificacion: str = Field(min_length=3, max_length=500)
    unidades_por_caja: int | None = Field(gt=0, default=None)
```

**`ObsequioFacturaOut`**:
```python
class ObsequioFacturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    factura_id: int
    producto_id: int
    tipo_empaque: str
    cantidad: int
    justificacion: str
    product: ProductOut | None = None
```

**Cambios en schemas existentes**:
- `FacturaCreate.obsequios: list[ObsequioFacturaCreate] = Field(default_factory=list)`
- `FacturaOut.obsequios: list[ObsequioFacturaOut] = []`

---

#### 3. Servicio `create_invoice`

**Después del loop de detalles** (línea 715), agregar loop de obsequios:

| Aspecto | Items normales | Obsequios |
|---------|---------------|-----------|
| Costo unitario | > 0, se almacena | Implícitamente 0, no se almacena |
| Suma a total_usd/bs | Sí | **No** |
| Actualiza stock | Sí | Sí (misma lógica) |
| Actualiza costo promedio | Sí | **No** (costo 0 no afecta WAP) |
| Asigna proveedor_id al producto | Sí | **No** |

**Cambios en queries**:
- `get_invoice()`: agregar `selectinload(Factura.obsequios).selectinload(ObsequioFactura.product)`
- `get_invoices()`: igual

---

#### 4. UX / Interfaz

**4.1. Formulario de creación (`InvoiceNewPage`)**:
- **Sección separada** debajo de la tabla de items normales
- **Estilo diferenciado**: borde púrpura, fondo púrpura claro
- **Formulario simplificado**: solo Producto, Cantidad, Empaque, Justificación (sin precio)
- **Justificación obligatoria**: Textarea con validación progresiva (contador de caracteres)
- **Botón púrpura**: "Agregar Obsequio" (diferente al azul de items normales)
- **Tabla de obsequios**: filas con estilo púrpura, sin columnas de precio

**4.2. Detalle de factura (`InvoiceDetailPage`)**:
- **Sección separada** debajo de la tabla de productos
- **Header**: "Obsequios / Cortesías (N)" con icono Gift
- **Tabla**: Producto, Tipo, Cantidad, Justificación (sin precio)
- **Nota informativa** en resumen fiscal: "Obsequios: N productos (M unidades) — $0.00"

**4.3. Resumen fiscal**:
- Los obsequios **NO aparecen** en el desglose fiscal (exento, base imponible, IVA)
- Solo una nota informativa al final: "No afectan el total de la factura"

---

#### 5. Edge Cases

| Problema | Mitigación |
|----------|------------|
| Obsequio sin justificación | Pydantic rechaza: `Field(min_length=3)` |
| Obsequio de producto inexistente | `EntityNotFoundError` en servicio |
| Mismo producto en obsequio Y detalle | Permitido: stock se actualiza sumando ambas cantidades |
| Factura con SOLO obsequios (0 detalles) | Permitido: total = 0 |
| Eliminar factura con obsequios | CASCADE on delete |
| Obsequio en factura procesada por IA | La IA no detecta obsequios — se agregan manualmente |
| Reportes de compras | Obsequios NO aparecen en totales de compra |

---

#### 6. Lo que NO cambia

- **Modelo DetalleFactura**: no se modifica
- **Constraints existentes**: no se tocan
- **Queries de detalles**: no se modifican
- **Cálculo de totales**: solo suma detalles, no obsequios
- **Costo promedio**: no se afecta (obsequio tiene costo 0)

---

### BUG-002 — Cálculos de IVA inconsistentes entre creación y detalle

**Prioridad**: ALTA
**Tipo**: Bug + Refactor
**Archivos afectados**:
- `frontend/src/features/invoices/pages/InvoiceNewPage.tsx` (líneas 402-428)
- `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx` (líneas 235-251)

**Descripción**:
Hay **2 cálculos de IVA independientes con lógica diferente**. Al implementar IMPL-003 (`aplica_iva`), estos cálculos deben unificarse para usar la misma fuente de verdad.

**Cálculo 1 — InvoiceNewPage (creación)**:
```typescript
const aplicaIva = moneda === "BS"; // Solo depende de la moneda
if (aplicaIva && item.tipo_iva === "GRAVADO") {
  base += subtotal_bs;
  iva += calcIva(subtotal_bs);
} else {
  exento += subtotal_usd; // ← BUG: usa USD cuando debería ser BS
}
```

**Cálculo 2 — InvoiceDetailPage (detalle)**:
```typescript
const baseImponible = invoice.detalles.reduce((sum, d) => {
  const unidades = d.tipo_empaque === "CAJA"
    ? d.cantidad * (d.product?.unidades_por_caja ?? 1) // ← BUG-001
    : d.cantidad;
  return sum + unidades * Number(d.costo_unitario_bs); // ← TODO va a base imponible
}, 0);
const iva = invoice.moneda_principal === "BS" ? calcIva(baseImponible) : 0;
const exento = invoice.moneda_principal === "USD" ? Number(invoice.total_usd) : 0;
```

**Problemas encontrados**:

| # | Problema | Ubicación | Impacto |
|---|----------|-----------|---------|
| 1 | No respeta `tipo_iva` del producto en detalle | DetailPage:235-241 | Items EXENTO se suman a base imponible |
| 2 | Exento usa `subtotal_usd` en vez de `subtotal_bs` | NewPage:418 | Cálculo incorrecto cuando moneda es BS |
| 3 | No considera `aplica_iva` (IMPL-003) | Ambos | IVA se calcula aunque factura no aplica IVA |
| 4 | BUG-001: multiplica por `unidades_por_caja` | DetailPage:237-239 | Subtotales inflados (ya documentado) |

**Solución propuesta**: Crear una función compartida `calcularResumenFiscal()` en `lib/iva.ts` que ambos componentes usen:

```typescript
// frontend/src/lib/iva.ts — nueva función

interface ResumenFiscal {
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
```

**Reglas de la función**:
1. Si `aplica_iva = false` → todo va a exento (sin importar `tipo_iva`)
2. Si `aplica_iva = true` AND `moneda = "BS"` → **por defecto todo es GRAVADO** (independientemente del `tipo_iva` del producto en la tabla `productos`). El usuario puede marcar items individuales como EXENTO desde la UI.
3. Si `aplica_iva = true` AND `moneda = "USD"` → todo va a exento (IVA solo aplica en Bs.)
4. El subtotal usado siempre es el de la moneda de la factura (`subtotal_bs` si BS, `subtotal_usd` si USD)

**Cambio de comportamiento importante**: Antes, el `tipo_iva` se tomaba del producto (`product.tipo_iva`). Ahora, cuando la factura aplica IVA en BS, **todo es GRAVADO por defecto**. El `tipo_iva` del producto se ignora. El usuario puede cambiar items individuales a EXENTO con un toggle pequeño en la tabla de items.

**UX para marcar item como EXENTO**:
- En la tabla de items de `InvoiceNewPage`, columna junto a "Tipo" (empaque):
  - Por defecto: sin indicador visible (todo es GRAVADO)
  - Toggle pequeño o botón "Exento" que aparece solo si `aplicaIva && esBs`
  - Al activar: el item cambia a EXENTO, el resumen fiscal se recalcula
  - Estilo: botón ghost pequeño, texto "Exento" en color tenue
- En `InvoiceDetailPage`: badge "Exento" en la fila si el item es exento

**Ejemplo**:
```
Factura en BS con IVA, 3 productos:
- Producto A: GRAVADO (default) → base imponible + IVA 16%
- Producto B: GRAVADO (default) → base imponible + IVA 16%
- Producto C: EXENTO (usuario marcó) → exento

Resumen:
  Exento:           Bs. 50.00   (solo Producto C)
  Base imponible:   Bs. 200.00  (Productos A + B)
  IVA (16%):        Bs. 32.00
  Total:            Bs. 282.00
```

**Impacto**: Al implementar IMPL-003 + BUG-002 juntos, ambos componentes usan la misma función y producen el mismo resultado. Se eliminan las 4 inconsistencias.

---

## Notas de implementación

- **BUG-001 y MEJORA-001** están relacionados: al corregir el subtotal en `InvoiceDetailPage`, también se debe actualizar el header de columna para que sea consistente.
- **MEJORA-002 y MEJORA-003** son complementarias: mostrar `unidades_por_caja` en la fila y el desglose en el footer.
- El backend (`invoice_service.py`) calcula correctamente — NO requiere cambios.
- El frontend de creación (`InvoiceNewPage.tsx`) calcula correctamente con `calcularSubtotal()` — el bug es solo en la página de detalle.
- **IMPL-001** es independiente de BUG-001/MEJORAS — puede implementarse en paralelo o secuencialmente.
- **IMPL-001** reutiliza `PaymentMethod` existente — no crear métodos de pago nuevos.
- El Drawer de pago debe ser un componente separado (`PaymentDrawer.tsx`) para reutilización y testing.
