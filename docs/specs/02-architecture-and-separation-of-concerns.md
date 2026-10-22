# Capítulo 02: Arquitectura del Sistema y Separación de Responsabilidades

Este documento detalla la arquitectura global de software de **Yanesu Shisutemu**, especificando la delimitación estricta de responsabilidades entre capas, los contratos de interfaz, los patrones de diseño adoptados y el flujo de datos integral (*end-to-end*). Cada componente aquí descrito ha sido verificado en el código fuente de los directorios `backend/app/`, `frontend/src/` y `licoreria-desktop/src-tauri/`.

---

## 1. Resumen Ejecutivo y Filosofía de Diseño

El sistema está diseñado bajo una arquitectura desacoplada y orientada a dominios (*Domain-Oriented & Feature-Sliced Architecture*), estructurada para operar tanto en modalidad web cliente-servidor (con base de datos PostgreSQL en VPS) como en modalidad cliente de escritorio autónomo (*standalone desktop*) sobre Windows (utilizando un backend Python empaquetado como subproceso *sidecar* y base de datos relacional SQLite).

```
+---------------------------------------------------------------------------------------+
|                                    CAPA DE USUARIO                                    |
|   +-------------------------------------------------------------------------------+   |
|   |                          React 19 SPA (TypeScript 5.7)                        |   |
|   |   +----------------------------------+   +--------------------------------+   |   |
|   |   |   19 Features Modulares          |   |   UI Components Agnósticos     |   |   |
|   |   |   (sales, products, invoices...) |   |   (Button, Modal, Table, etc.) |   |   |
|   |   +----------------------------------+   +--------------------------------+   |   |
|   |   +----------------------------------+   +--------------------------------+   |   |
|   |   |   Estado Reactivo Zustand        |   |   Cliente HTTP Centralizado    |   |   |
|   |   |   (cartStore, exchangeRate...)   |   |   (services/api.ts)            |   |   |
|   |   +----------------------------------+   +--------------------------------+   |   |
|   +-------------------------------------------------------------------------------+   |
+------------------------------------------+--------------------------------------------+
                                           | Fetch / Cookie httpOnly (access_token)
                                           v
+---------------------------------------------------------------------------------------+
|                               CONTENEDOR TAURI 2 (DESKTOP)                            |
|   +-----------------------------+         +---------------------------------------+   |
|   |   Splashscreen Window       |         |   Main Webview Window                 |   |
|   |   (/splash.html)            |         |   (http://127.0.0.1:{port})           |   |
|   +--------------+--------------+         +-------------------+-------------------+   |
|                  |                                            |                       |
|                  | Poll .port & Health Check                  | IPC Shell             |
|                  v                                            v                       |
|   +-------------------------------------------------------------------------------+   |
|   |   Rust Core (src-tauri/src/lib.rs): Process Spawner, Port Bridge & Watchdog   |   |
|   +-------------------------------------------------------------------------------+   |
+------------------------------------------+--------------------------------------------+
                                           | Gestiona proceso sidecar (yanesu_shisutemu)
                                           v
+---------------------------------------------------------------------------------------+
|                              BACKEND FASTAPI (PYTHON 3.12)                            |
|   +-------------------------------------------------------------------------------+   |
|   |   1. Transporte HTTP (routes/): Routers delgados, RBAC, Status Codes, OpenAPI  |   |
|   +-------------------------------------------------------------------------------+   |
|                                          |
|                                          v
|   +-------------------------------------------------------------------------------+   |
|   |   2. Negocio & Dominio (services/): Reglas de inventario, desempaque, Decimal |   |
|   +-------------------------------------------------------------------------------+   |
|                  |                                        |                           |
|                  v                                        v                           |
|   +-----------------------------+         +---------------------------------------+   |
|   |   3. Validación & Contratos |         |   4. Persistencia ORM                 |   |
|   |      (schemas/ Pydantic v2) |         |      (models/ SQLAlchemy 2.0)         |   |
|   +-----------------------------+         +---------------------------------------+   |
|                                                           |                           |
|                                                           v                           |
|   +-------------------------------------------------------------------------------+   |
|   |   5. Core e Infraestructura: SQLite (PRAGMA foreign_keys=ON) / PostgreSQL     |   |
|   |      Log de Auditoría Asíncrono (audit_service), Scraping BCV, Gemini AI OCR  |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

### 1.1. Principios Arquitectónicos Fundamentales

1. **Separación Estricta de Capas (SoC):** Cada capa técnica tiene límites inviolables. Las rutas nunca ejecutan consultas directas a la base de datos ni implementan matemática de inventario; los servicios de negocio son agnósticos a los protocolos de transporte HTTP; los modelos de datos no conocen los esquemas de visualización; y la interfaz de usuario no asume la autoridad sobre el cálculo del dinero.
2. **Autoridad Monetaria Centralizada (Single Source of Truth):** Debido a la naturaleza transaccional de una licorería y al contexto bimonetario venezolano (USD/VES), el cálculo canónico de impuestos (IVA), subtotales, totales, redondeos y cobertura de pagos es ejecutado y validado de manera irrevocable por el backend utilizando aritmética exacta con `Decimal` y redondeo `ROUND_HALF_UP`. El frontend realiza cálculos locales únicamente para fines de retroalimentación inmediata al cajero.
3. **Dualidad Multi-Dialecto Sin Fuga de Abstracción:** El sistema garantiza paridad funcional absoluta entre SQLite (despliegue local y de escritorio) y PostgreSQL 16 (despliegue en la nube mediante Docker). Esto se logra utilizando la convención declarativa de SQLAlchemy 2.0 y directivas de Alembic con modo batch (`render_as_batch=True`).
4. **Diseño Modular Feature-Sliced en Frontend:** El cliente web/desktop organiza su código en 19 módulos de dominio de alta cohesión. Los componentes reutilizables de diseño gráfico se aíslan en `ui-components/`, completamente libres de lógica de negocio o referencias a entidades del modelo de datos.

---

## 2. Backend: Arquitectura por Capas Técnicas

El backend implementa una arquitectura multicapa desacoplada y orientada a servicios estructurada en `backend/app/`:

```
backend/app/
├── core/            # Infraestructura base, configuración, base de datos y utilitarios
├── routes/          # Transporte HTTP, serialización y control de acceso
├── services/        # Reglas de negocio puras y orquestación transaccional
├── models/          # Definición de entidades relacionales (SQLAlchemy 2.0)
└── schemas/         # Esquemas de validación, entrada y salida (Pydantic v2)
```

---

### 2.1. Capa de Transporte HTTP (`backend/app/routes/`)

Los enrutadores de FastAPI actúan como controladores de transporte delegados. Su única función es recibir peticiones HTTP, verificar permisos y autenticación, delegar la ejecución a los servicios correspondientes y emitir respuestas estructuradas.

#### Responsabilidades Permitidas:
- Mapear verbos y rutas REST mediante `APIRouter(prefix="/api/<dominio>", tags=["<dominio>"])`.
- Declarar códigos de estado HTTP explícitos (`status_code=status.HTTP_...`).
- Parsear y validar parámetros de ruta (`path`), filtros de consulta (`query`) y cuerpos de solicitud (`body`) utilizando esquemas de Pydantic v2.
- Aplicar control de acceso e inyección de dependencias (`Depends(get_db)`, `Depends(get_current_user)`, `Depends(require_role(...))`).
- Registrar eventos de auditoría en operaciones de mutación invocando `audit_service.log_action()`.
- Producir docstrings estructurados en español con las secciones `Recibe`, `Hace` y `Devuelve` para documentación Swagger/OpenAPI.

#### Responsabilidades Prohibidas:
- **PROHIBIDO** invocar directamente métodos de sesión de SQLAlchemy para mutaciones (`db.add()`, `db.commit()`, `db.rollback()`, `db.delete()`).
- **PROHIBIDO** implementar validaciones de stock, lógica de desempaquetado o conversiones de divisas en las funciones de ruta.
- **PROHIBIDO** ejecutar consultas SQL crudas o constructores `select()` complejos dentro de los endpoints.

#### Orden Jerárquico de Definición de Rutas:
Para evitar colisiones de enrutamiento en FastAPI (donde un parámetro dinámico `/{id}` puede interceptar rutas fijas como `/summary` o `/calculate` provocando fallos de validación HTTP 422), todas las rutas siguen el orden estricto:
1. `create()` — `POST /`
2. `list_all()` — `GET /`
3. Endpoints fijos de consulta — `GET /summary`, `GET /top-week`, `POST /calculate`
4. `get_by_id()` — `GET /{id}`
5. `update()` — `PUT /{id}`
6. `delete()` — `DELETE /{id}`

#### Catálogo de Routers Registrados en `backend/app/main.py`:
| Router | Prefijo | Dominio Técnico | Seguridad / RBAC |
| :--- | :--- | :--- | :--- |
| `health_router` | `/api/health` | Diagnóstico del sistema y estado de BD | Público |
| `auth_router` | `/api/auth` | Login, setup inicial, refresh y perfil de usuario | Cookies httpOnly |
| `sales_router` | `/api/sales` | Transacciones POS, cálculo de ticket, histórico | `ADMINISTRADOR`, `OPERADOR` |
| `products_router` | `/api/products` | Catálogo de productos, stock, precios y empaques | `ADMINISTRADOR`, `OPERADOR` |
| `categories_router`| `/api/categories` | Clasificación taxonómica y reportes de categoría | `ADMINISTRADOR` |
| `suppliers_router` | `/api/suppliers` | Gestión de proveedores y analítica de compras | `ADMINISTRADOR` |
| `combos_router` | `/api/combos` | Promociones agrupadas, paquetes y restricciones | `ADMINISTRADOR` |
| `invoices_router` | `/api/invoices` | Carga de facturas de compra, OCR Gemini y pagos | `ADMINISTRADOR`, `OPERADOR` |
| `retornable_router`| `/api/retornable` | Control de envases y botellas retornables | `ADMINISTRADOR` |
| `exchange_rates_router`| `/api/exchange-rates` | Tasas oficiales BCV y fijaciones manuales | `ADMINISTRADOR`, `OPERADOR` |
| `payment_methods_router`| `/api/payment-methods` | Métodos de pago permitidos en POS y compras | `ADMINISTRADOR` |
| `price_rules_router`| `/api/price-rules` | Reglas de descuento por pago en divisas | `ADMINISTRADOR` |
| `reports_router` | `/api/reports` | Analítica consolidada de ventas, productos y pagos | `ADMINISTRADOR` |
| `dashboard_router`| `/api/dashboard` | KPIs de la pantalla principal y métricas en vivo | `ADMINISTRADOR` |
| `users_router` | `/api/users` | Administración de usuarios, claves y activación | `ADMINISTRADOR` |
| `roles_router` | `/api/roles` | Catálogo de roles del sistema | `ADMINISTRADOR` |
| `system_settings_router`| `/api/system-settings` | Claves API (Gemini, n8n), configuraciones | `ADMINISTRADOR` |
| `webhooks_router` | `/api/webhooks` | Recepción de eventos automatizados externos | Firma de seguridad |
| `n8n_agent_router`| `/api/n8n` | Interacción M2M para consultas por Telegram/Bot | `X-API-Key` Header |

---

### 2.2. Capa de Negocio y Dominio (`backend/app/services/`)

La capa de servicios contiene toda la lógica de dominio del negocio. Es la única capa autorizada para orquestar transacciones relacionales, gestionar el ciclo de vida de los datos y aplicar reglas matemáticas de inventario.

#### Patrones de Diseño Implementados:
1. **Orquestación Transaccional Unitaria:** Las operaciones complejas que abarcan múltiples tablas (ej. crear una venta, insertar detalles, registrar cobros, descontar inventario y asentar envases retornables) ocurren dentro de la misma sesión `db: Session`. La confirmación (`db.commit()`) se produce al finalizar exitosamente la secuencia. Si ocurre cualquier error, la transacción se revierte automáticamente garantizando atomicidad (ACID).
2. **Algoritmo de Desempaquetado Automático (Bimodal Stock Management):**
   El sistema maneja productos en formato bimodal: cajas (`stock_cajas`) y unidades sueltas (`stock_unidades`), vinculados por el factor `unidades_por_caja`.
   - Si se vende por **UNIDAD** y no hay suficientes `stock_unidades`, el servicio abre cajas (`stock_cajas -= 1`) y transfiere `unidades_por_caja` a `stock_unidades` de manera automática e indivisible.
   - Si se vende por **CAJA** y no hay suficientes cajas completas, el servicio consolida unidades sueltas si alcanzan a formar una caja completa.
   - Si el stock total disponible (`stock_cajas * unidades_por_caja + stock_unidades`) es inferior a la cantidad solicitada, se interrumpe la operación lanzando `ConflictError` sin alterar la base de datos.
3. **Manejo Estricto de Moneda y Tolerancia Financiera:**
   - Todo valor monetario se procesa mediante la clase `Decimal` de Python.
   - El backend revalida independientemente los montos enviados por el cliente (`monto_exento_usd`, `base_imponible_usd`, `monto_iva_usd`).
   - Se admite una tolerancia máxima de $0.01 USD (`_TOLERANCIA_MONTOS = Decimal("0.01")`) para mitigar desfases derivados del redondeo de punto flotante de JavaScript en el navegador.
   - Si la discrepancia supera el centavo, se rechaza la transacción con `ValueError` indicando la divergencia exacta.
4. **Verificación de Cobertura de Pagos en Múltiples Monedas:**
   - El total de pagos registrados (USD directo + VES convertido a USD mediante la `tasa_bcv_aplicada`) debe cubrir el total de la venta (`total_pagado_usd >= total_usd - 0.01`).
   - Si la venta incluye productos con regla de precio en divisas (`usa_precio_divisas = True`), el servicio comprueba que los pagos realizados con métodos catalogados como divisa alcancen o superen el subtotal de dichos productos.
5. **Auditoría Asíncrona sin Bloqueo de E/S (`backend/app/services/audit_service.py`):**
   - Para no degradar la latencia de las respuestas HTTP ni competir por el bloqueo de escritura de SQLite, las acciones de auditoría (`log_action`) se encolan en memoria en una `queue.Queue` concurrente con capacidad para 10,000 eventos.
   - Un hilo dedicado en segundo plano (`_writer_loop`) extrae los eventos por lotes y los añade al archivo `audit.log` en el directorio de datos del sistema, implementando rotación automática por tamaño (`AUDIT_MAX_BYTES = 5 MB`) y retención de hasta 5 archivos históricos (`AUDIT_MAX_ROTATED`).

---

### 2.3. Capa de Persistencia y Modelos Relacionales (`backend/app/models/`)

Todos los modelos heredan de `Base = DeclarativeBase` (declarado en `backend/app/core/database.py`) y utilizan estrictamente la sintaxis moderna de SQLAlchemy 2.0.

#### Estándares de Modelado:
- Tipado declarativo mediante `Mapped[T]` y `mapped_column()`.
- Precisión decimal explícita para valores monetarios y stock:
  - Importes en USD: `DECIMAL(12, 2)`.
  - Importes en VES y totales en moneda nacional: `DECIMAL(14, 2)`.
  - Tasas de cambio: `DECIMAL(10, 4)`.
- Columnas computadas y persistidas a nivel de base de datos (`Computed(..., persisted=True)`):
  - Ejemplo en `ventas`: `total_usd = Computed("monto_exento_usd + base_imponible_usd + monto_iva_usd", persisted=True)`.
  - Ejemplo en `detalle_ventas`: `subtotal_usd = Computed("ROUND(cantidad * precio_unitario_usd, 2)", persisted=True)`.
- Restricciones referenciales explícitas:
  - Todo `ForeignKey` incluye `ondelete="RESTRICT"` para entidades maestras (`productos`, `proveedores`, `categorias`, `users`, `metodos_pago`) para evitar borrados accidentales de registros vinculados a ventas.
  - Se utiliza `ondelete="CASCADE"` únicamente en entidades dependientes de detalle subordinadas a su maestro (`detalle_ventas` respecto a `ventas`, `detalle_facturas` respecto a `facturas`, `combo_productos` respecto a `combos`).
- Convención de nombres determinista (`POSTGRES_SQLITE_CONVENTION`) para compatibilidad entre SQLite y PostgreSQL:
  ```python
  POSTGRES_SQLITE_CONVENTION = {
      "ix": "ix_%(column_0_label)s",
      "uq": "uq_%(table_name)s_%(column_0_name)s",
      "ck": "ck_%(table_name)s_%(constraint_name)s",
      "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
      "pk": "pk_%(table_name)s",
  }
  ```

---

### 2.4. Capa de Validación y Esquemas (`backend/app/schemas/`)

Pydantic v2 gobierna los contratos de entrada y salida del backend, eliminando cualquier discrepancia de tipos en tiempo de ejecución.

#### Reglas de Validación:
1. **Configuración de Modelos (`model_config = ConfigDict(...)`):**
   - En esquemas de entrada (`Create` / `Update`): `str_strip_whitespace=True` elimina automáticamente espacios iniciales y finales en cadenas.
   - En esquemas de salida (`Out`): `from_attributes=True` permite la serialización directa de instancias de SQLAlchemy hacia JSON sin necesidad de diccionarios intermedios.
2. **Validaciones Numéricas Estrictas:**
   - Cantidades y stock: `Field(gt=0)` o `Field(ge=0)`.
   - Precios y tasas: `Decimal` con restricciones `max_digits` y `decimal_places`.
   - Listas obligatorias no vacías: `Field(min_length=1)` en ítems de venta y facturas.
3. **Seguridad y Ocultamiento de Campos Sensibles:**
   - Los esquemas `UserOut` excluyen explícitamente el hash de contraseña (`password_hash`).
   - Los esquemas de configuración y API Keys enmascaran las claves y secretos, devolviendo únicamente el estado operativo o los últimos 4 caracteres.
4. **Mapeo de Nombres de Campo (`validation_alias`):**
   - Permite vincular nombres de propiedades del modelo ORM con las claves esperadas en el protocolo JSON (ej. `pagos: list[SalePaymentOut] = Field(default=[], validation_alias="payments")`).

---

### 2.5. Capa Core y de Infraestructura (`backend/app/core/`)

La capa core suministra los servicios fundamentales de runtime a todas las demás capas:

```
backend/app/core/
├── config.py         # Carga de variables de entorno, directorios de datos y constantes
├── database.py       # Creación del engine, sessionmaker y pragma de SQLite
├── dependencies.py   # Inyectores de FastAPI (get_db, get_current_user, require_role)
├── error_handler.py  # Manejo centralizado y logging de excepciones HTTP
├── exceptions.py     # Jerarquía de excepciones de dominio (AppError)
├── logging_setup.py  # Configuración del formato y manejadores de log estándar
├── port_manager.py   # Sondeo dinámico de puertos libres para ejecución standalone
├── timezone.py       # Definición de huso horario America/Caracas (VE_TZ, VE_NOW)
└── bcv_scraper.py    # Scraping resiliente de cotizaciones del portal oficial del BCV
```

#### Manejo Centralizado de Excepciones:
El sistema define una jerarquía de errores semánticos en `exceptions.py` que son capturados de forma transparente por FastAPI en `main.py` y `error_handler.py`:

```
AppError (Excepción base de dominio)
├── EntityNotFoundError  --> Mapeado a HTTP 404 NOT FOUND {"detail": "..."}
├── ConflictError        --> Mapeado a HTTP 409 CONFLICT {"detail": "..."}
└── PermissionDeniedError--> Mapeado a HTTP 403 FORBIDDEN {"detail": "..."}
```
Adicionalmente:
- `ValueError` se traduce en HTTP 400 Bad Request.
- `IntegrityError` de SQLAlchemy se traduce en HTTP 409 Conflict.
- Cualquier excepción no controlada emite HTTP 500 Internal Server Error registrando la traza completa en los logs del sistema sin exponer detalles internos al cliente.

---

## 3. Frontend: Arquitectura Modular Feature-Sliced

El cliente está estructurado como una Single Page Application (SPA) en React 19 y TypeScript 5.7, organizada bajo la metodología *Feature-Sliced Design* dentro de `frontend/src/features/`.

```
frontend/src/
├── features/         # 19 módulos funcionales autocontenidos por dominio de negocio
├── ui-components/    # Sistema de componentes de presentación agnósticos del dominio
├── components/ui/    # Componentes de presentación utilitarios (SortableHeader)
├── stores/           # Estado global cross-cutting (exchangeRateStore)
├── hooks/            # Custom hooks globales
├── services/         # Cliente HTTP centralizado (api.ts)
├── lib/              # Funciones auxiliares puras (formatCurrency, normalizeDecimals, tauri)
└── types/            # Tipos globales y definiciones TypeScript compartidas
```

---

### 3.1. Anatomía Estándar de una Feature

Cada uno de los 19 dominios en `frontend/src/features/` sigue un patrón modular uniforme que fomenta la alta cohesión y el bajo acoplamiento:

```
frontend/src/features/<modulo>/
├── components/       # Componentes de UI con conocimiento exclusivo de este dominio
├── hooks/            # Custom hooks con la lógica reactiva y consumo de API del módulo
├── pages/            # Vistas completas enlazadas al enrutador de React Router
├── store/ (opcional) # Máquina de estado local de Zustand específica de la feature
└── types.ts          # Tipos e interfaces exclusivas de este dominio
```

#### Matriz de los 19 Módulos Funcionales:
| Feature | Ruta en Repositorio | Páginas Principales | Alcance de Negocio |
| :--- | :--- | :--- | :--- |
| **sales** | `features/sales/` | `POSPage.tsx`, `SalesPage.tsx`, `SaleDetailPage.tsx` | Punto de venta reactivo, cola de carritos en espera, desglose de impuestos e histórico de ventas. |
| **products** | `features/products/` | `ProductsPage.tsx`, `ProductNewPage.tsx`, `ProductEditPage.tsx` | Catálogo de inventario, stock bimodal (cajas/unidades), precios de costo y márgenes. |
| **invoices** | `features/invoices/` | `ComprasHubPage.tsx`, `InvoicesPage.tsx`, `InvoiceNewPage.tsx`, `InvoiceDetailPage.tsx`, `InvoicePaymentPage.tsx` | Gestión de compras a proveedores, escaneo OCR con IA de facturas, cuentas por pagar y abonos. |
| **categories** | `features/categories/`| `CategoriesPage.tsx` | Clasificación de licores y víveres, estadísticas y reportes por categoría. |
| **suppliers** | `features/suppliers/` | `SuppliersPage.tsx` | Catálogo de distribuidores y proveedores, deuda acumulada y analítica de compras. |
| **combos** | `features/combos/` | `CombosPage.tsx` | Creación de promociones y combos de múltiples productos con precio bundle cerrado. |
| **retornables** | `features/retornables/`| `RetornablesPage.tsx` | Control de stock físico de cajas y botellas retornables (cervezas/refrescos). |
| **exchange-rates**| `features/exchange-rates/`| `ExchangeRatesPage.tsx` | Monitor de tasas BCV oficiales, histórico de cotizaciones y sincronización manual/automática. |
| **payment-methods**| `features/payment-methods/`| `PaymentMethodsPage.tsx` | Configuración de pasarelas y métodos de pago (efectivo USD/VES, Pago Móvil, Zelle, Punto). |
| **price-rules** | `features/price-rules/`| `PriceRulesPage.tsx` | Reglas automáticas de descuento o precio especial por pago exclusivo en divisas. |
| **reports** | `features/reports/` | `ReportsSalesPage.tsx`, `ReportsProductsPage.tsx`, `ReportsPaymentsPage.tsx`, `ReportsCategoriesPage.tsx` | Visualización analítica con Recharts de rentabilidad, dispersión y distribución de ingresos. |
| **dashboard** | `features/dashboard/` | `DashboardPage.tsx` | Tablero ejecutivo con KPIs en tiempo real, alertas de stock bajo y ventas del día. |
| **users** | `features/users/` | `UsersPage.tsx`, `UserFormPage.tsx` | Administración de usuarios cajeros y administradores, reseteo de credenciales. |
| **roles** | `features/roles/` | *(Componentes compartidos)* | Consulta de permisos asignados a roles del sistema. |
| **auth** | `features/auth/` | `LoginPage.tsx`, `SetupPage.tsx` | Formulario de autenticación, setup del primer usuario administrador y guardias de ruta. |
| **settings** | `features/settings/` | `SettingsPage.tsx`, `SettingsUsersPage.tsx`, `SettingsPaymentMethodsPage.tsx`, `SettingsSystemPage.tsx` | Centro unificado de administración y navegación lateral de ajustes del sistema. |
| **system-settings**| `features/system-settings/`| `SystemSettingsPage.tsx` | Gestión segura de llaves API externas (Gemini, n8n), pruebas de conexión y tokens. |
| **design-system**| `features/design-system/`| `DesignSystemPage.tsx` | Galería interactiva para desarrollo y prueba de los componentes atómicos de UI. |
| **not-found** | `features/not-found/` | `NotFoundPage.tsx` | Manejo de rutas inexistentes (Error 404 de navegación). |
| **shared** | `features/shared/` | Componentes transversales | Diálogos de confirmación, cabeceras y filtros compartidos entre módulos de negocio. |

---

### 3.2. Enrutamiento y Control de Acceso (`frontend/src/router.tsx`)

El enrutamiento se gestiona mediante `react-router-dom` v7 utilizando `createBrowserRouter`. La arquitectura implementa carga diferida (*code splitting*) y barreras de seguridad multinivel:

1. **Lazy Loading Asíncrono (`lazyRoute`):**
   - Cada página se importa dinámicamente mediante `lazyRoute(() => import(...))`, garantizando que el paquete inicial de JavaScript sea mínimo y cargue en fracciones de segundo.
2. **Guardia de Autenticación (`PrivateRoute`):**
   - Envuelve el diseño maestro (`AppLayout`). Comprueba el estado de sesión del usuario; si la sesión no es válida, redirige automáticamente a `/login`.
3. **Guardia de Roles Administrativos (`adminOnly` / `RoleGuard`):**
   - Rutas como `/dashboard`, `/users`, `/categories`, `/suppliers`, `/reports`, `/settings` y `/price-rules` están protegidas por la función de orden superior `adminOnly(...)`.
   - Si un usuario con rol `OPERADOR` intenta acceder a una ruta administrativa, `RoleGuard` bloquea el renderizado y muestra una pantalla de acceso denegado.
4. **Redirección Contextual por Rol (`RoleRedirect`):**
   - Al autenticarse en la raíz (`/`), `RoleRedirect` inspecciona el rol del usuario:
     - Un `ADMINISTRADOR` es dirigido a `/dashboard`.
     - Un `OPERADOR` (cajero) es dirigido directamente a la terminal POS (`/sales/new`).

---

### 3.3. Gestión del Estado: Zustand Global vs Estado Local

Para evitar la complejidad y el sobrecosto de renderizado de Redux o Context API con estados masivos, el frontend utiliza **Zustand 5** particionado según el ciclo de vida del dato:

```
Zustand Stores del Sistema (8 tiendas identificadas)
├── Global Cross-Cutting:
│   └── stores/exchangeRateStore.ts        # Tasa oficial BCV activa y función de recarga
└── Feature-Scoped:
    ├── features/sales/store/cartStore.ts          # Carrito POS, cálculo de totales e ítems
    ├── features/sales/store/holdQueueStore.ts     # Carritos en espera (persistido en LocalStorage)
    ├── features/sales/store/salesFiltersStore.ts  # Filtros de búsqueda en historial de ventas
    ├── features/products/stores/useProductsStore.ts # Caché local del catálogo y búsqueda rápida
    ├── features/invoices/store/invoiceFormStore.ts# Borrador de factura de compra y datos OCR
    ├── features/invoices/store/invoiceFiltersStore.ts # Filtros de compras por proveedor y estado
    └── features/invoices/store/paymentFormStore.ts# Modal de abono y pagos a facturas
```

#### Criterio de Selección de Estado:
- **Zustand:** Se utiliza exclusivamente cuando el dato debe compartirse entre vistas desconectadas (ej. la tasa BCV consultada en el header y utilizada en el carrito POS) o cuando el estado debe sobrevivir a cambios de navegación (ej. la cola de carritos en espera que utiliza el middleware `persist` sobre `localStorage`).
- **React State (`useState`, `useReducer`, Custom Hooks):** Se utiliza para todo estado transitorio o local de vista (ej. inputs de formularios, toggles de acordeones, paginación local de tablas, visibilidad de modales y estados de carga `saving`).

---

### 3.4. Capa de Presentación Reutilizable (`frontend/src/ui-components/`)

El directorio `ui-components/` conforma el *Design System* propio de la aplicación. Estos componentes son componentes puramente presentacionales (*dumb components*):

- **Agnósticos del Negocio:** Ningún archivo en `ui-components/` importa tipos de negocio como `Product`, `Sale`, `Invoice` o `User`.
- **Contratos Vía Props e Interfaces Explícitas:** Reciben datos primitivos (`string`, `number`, `boolean`), funciones *callback* para eventos (`onClick`, `onClose`, `onChange`) y nodos React (`children`).
- **Consistencia Visual con Tailwind CSS v4:** Estandarizan bordes, tipografías, estados `:focus`, elevaciones `shadow-sm`, y colores semánticos (`emerald` para éxito/dinero, `indigo` para acciones primarias, `rose` para errores, `amber` para advertencias).

---

### 3.5. Cliente de Transporte HTTP (`frontend/src/services/api.ts`)

Todas las comunicaciones hacia el backend están centralizadas en el objeto `api` de `frontend/src/services/api.ts`.

#### Características del Cliente:
1. **Credenciales en Cookies:** Toda petición se envía con `credentials: "include"`, permitiendo que el navegador transmita automáticamente la cookie httpOnly segura `access_token` sin requerir almacenamiento manual de tokens en `localStorage` (mitigando riesgos de robo vía XSS).
2. **Interceptación de Errores y Sesión Expirada:** Si el servidor responde con código `HTTP 401 Unauthorized` y el usuario no se encuentra ya en `/login`, la función de transporte redirige inmediatamente a la pantalla de acceso.
3. **Extracción Automática de Mensajes de Error:** Normaliza las respuestas de FastAPI (`err.detail`, errores de validación de Pydantic o errores genéricos) transformándolas en instancias de `Error` legibles que son capturadas por los componentes para mostrar alertas mediante `Toast`.
4. **Normalización Numérica (`normalizeDecimals`):** Para evitar fallos en cálculos matemáticos de JavaScript cuando el backend devuelve valores numéricos serializados como cadenas o tipos decimales de alta precisión, la respuesta atraviesa una función recursiva de normalización antes de ser devuelta a la capa de UI.

---

## 4. Desktop: Contenedor Tauri 2 y Puente IPC Nativo

En el entorno de escritorio de Windows, la aplicación no corre sobre un navegador convencional ni requiere un servidor web externo. Se ejecuta como un binario nativo empaquetado mediante **Tauri v2 (Rust)** que coordina el ciclo de vida del frontend y del backend.

```
+---------------------------------------------------------------------------------------+
|                              PROCESO NATIVO TAURI 2 (RUST)                            |
|                                                                                       |
|   1. Startup: tauri::Builder::default()                                               |
|      - Inicializa plugins: tauri_plugin_shell, dialog, opener                         |
|      - Inicializa estado global: SidecarState(Mutex<Option<CommandChild>>)            |
|                                                                                       |
|   2. Spawning del Sidecar Python:                                                     |
|      - app.shell().sidecar("yanesu_shisutemu").spawn()                                |
|      - Registra child PID en SidecarState                                             |
|                                                                                       |
|   3. Watchdog Thread (Background Polling):                                            |
|      - Sondea %LOCALAPPDATA%/YanesuShisutemu/.port (hasta 40 intentos cada 500ms)     |
|      - Envía petición HTTP blocking: GET http://127.0.0.1:{port}/api/health           |
|      - Al recibir 200 OK:                                                             |
|          * main_window.navigate("http://127.0.0.1:{port}")                            |
|          * main_window.show() & set_focus()                                           |
|          * splashscreen_window.close()                                                |
|                                                                                       |
|   4. Teardown Seguro (ExitRequested / Exit):                                          |
|      - Invoca kill_sidecar_tree(child)                                                |
|      - Windows Taskkill síncrono: taskkill /IM yanesu_shisutemu.exe /T /F (NO WINDOW)  |
|      - Fallback por PID: taskkill /PID {pid} /T /F                                    |
|      - Garantiza 0 procesos huérfanos de PyInstaller o Python en Windows              |
+---------------------------------------------------------------------------------------+
```

### 4.1. Protocolo de Handshake y Detección Dinámica de Puertos

1. El binario compilado de Python (`yanesu_shisutemu.exe`) arranca como proceso secundario (*sidecar*) invocado por Rust.
2. Al iniciar, `backend/app/core/port_manager.py` sondea el rango de puertos TCP del `8000` al `8010` hasta enlazar un socket libre.
3. El puerto asignado y el PID del backend se persisten en:
   - `%LOCALAPPDATA%/YanesuShisutemu/.port`
   - `%LOCALAPPDATA%/YanesuShisutemu/.port.pid`
4. Mientras tanto, Tauri muestra la ventana ligera `splashscreen` (`/splash.html`), manteniendo oculta la ventana principal `main`.
5. Un hilo en segundo plano en Rust sondea periódicamente el archivo `.port` e interroga el endpoint de diagnóstico `http://127.0.0.1:{port}/api/health`.
6. En cuanto el backend responde con estado HTTP 200 OK, Tauri instruye a la ventana principal a navegar a la URL del backend local (el cual sirve los archivos estáticos de React compilados en `frontend/dist`), visibiliza la ventana principal y destruye la ventana de carga.

### 4.2. Prevención de Procesos Zombies en el Apagado

Cuando una aplicación empaquetada con PyInstaller corre en modo sin consola (`console=False`), la terminación habitual del proceso padre puede dejar subprocesos hijos de Python corriendo en segundo plano, reteniendo sockets abiertos y bloqueando la base de datos SQLite.

Para resolver esto de forma irrevocable, `licoreria-desktop/src-tauri/src/lib.rs` implementa el procedimiento `kill_sidecar_tree`:
- Se interceptan los eventos globales de salida de la aplicación (`RunEvent::ExitRequested` y `RunEvent::Exit`).
- Se invoca el método nativo de Tauri `child.kill()`.
- En sistemas Windows, se despacha de inmediato un comando de sistema mediante `std::process::Command` ejecutando:
  ```cmd
  taskkill /IM yanesu_shisutemu.exe /T /F
  ```
  configurado con la bandera `CREATE_NO_WINDOW = 0x0800_0000` para evitar parpadeos visuales en el monitor del usuario.
- Como segundo mecanismo de seguridad, se ejecuta un intento de terminación forzada por PID:
  ```cmd
  taskkill /PID <pid> /T /F
  ```
  garantizando que ninguna instancia huérfana de Python o del servidor Uvicorn permanezca en ejecución tras cerrar la ventana.

---

## 5. Traza End-to-End: Flujo Transaccional de Cobro POS

Para evidenciar la cooperación entre todas las capas arquitectónicas, a continuación se detalla la traza completa de una venta en el Punto de Venta (POS):

```
[Usuario / Cajero]
      |
      | 1. Pulsa "Cobrar" (F2) en POSPage.tsx
      v
[useCheckout.ts Hook]
      |
      | 2. Valida cobertura de pagos (USD/VES) y calcula totales
      | 3. Prepara payload SaleCreate ({ items, pagos, tasa_bcv... })
      v
[services/api.ts (HTTP Client)]
      |
      | 4. POST /api/sales con Cookie httpOnly y JSON
      v
[FastAPI Router: routes/sales.py]
      |
      | 5. Inyecta Depends(get_db) y Depends(require_role("OPERADOR", "ADMINISTRADOR"))
      | 6. Valida contrato de entrada SaleCreate vía Pydantic v2
      | 7. Invoca create_sale(db, data, usuario_id)
      v
[Dominio / Negocio: services/sale_service.py]
      |
      | 8. Verifica existencia de productos (EntityNotFoundError si falta)
      | 9. Evalúa stock bimodal: Desempaqueta cajas a unidades si es necesario
      |    (Lanza ConflictError si stock_total < requerido)
      | 10. Valida reglas de divisas y precios de combos
      | 11. Recalcula montos con Decimal y ROUND_HALF_UP (exento, base, IVA)
      | 12. Verifica cobertura de pagos en USD y VES contra tasa BCV aplicada
      | 13. Instancia entidades ORM: Sale, SaleItem, SalePayment
      | 14. db.add(sale) & db.commit()
      | 15. Dispara procesar_venta() en retornable_service para control de envases
      v
[Persistencia: models/sale.py & SQLite Engine]
      |
      | 16. Asienta registros con llaves foráneas validadas (PRAGMA foreign_keys=ON)
      | 17. Evalúa columnas calculadas persistidas (total_usd, total_ves, subtotal_usd)
      v
[Auditoría: services/audit_service.py]
      |
      | 18. routes/sales.py llama a log_action()
      | 19. Encola evento sin bloqueo en Queue en memoria para volcado a audit.log
      v
[Serialización & Respuesta HTTP]
      |
      | 20. Convierte entidad a SaleOut vía SaleOut.model_validate(sale)
      | 21. Retorna HTTP 201 Created al cliente
      v
[Frontend React: useCheckout.ts & cartStore.ts]
      |
      | 22. Despiega Toast de confirmación ("Venta registrada")
      | 23. Invoca clearCart() en useCartStore limpiando la interfaz
      | 24. Refresca catálogo y ventas recientes en la pantalla del cajero
```

---

## 6. Matriz de Separación de Responsabilidades y Buenas Prácticas

| Capa / Módulo | Artefacto | Responsabilidad Principal | Responsabilidades Excluidas / Prohibidas |
| :--- | :--- | :--- | :--- |
| **HTTP Transport** | `backend/app/routes/*.py` | Recepción HTTP, validación de parámetros, verificación de permisos (RBAC), serialización de respuestas y registro de auditoría. | **Prohibido:** Consultas SQL directas, llamadas a `db.commit()`, lógica de desempaquetado de stock, validación matemática de inventario. |
| **Domain Services** | `backend/app/services/*.py` | Lógica de negocio pura, cálculo canónico de dinero con `Decimal`, orquestación transaccional ACID, desempaquetado de cajas y control de divisas. | **Prohibido:** Acceso a objetos de transporte HTTP (`Request`, `Response`, `Cookie`), manejo directo de UI. |
| **Data Models** | `backend/app/models/*.py` | Definición de tablas relacionales, llaves foráneas (`ondelete`), tipos de columnas, índices y columnas persistidas calculadas en BD. | **Prohibido:** Lógica de validación de negocio, interacción con el usuario, cálculos que dependan de estado de sesión. |
| **Validation Contracts**| `backend/app/schemas/*.py`| Contratos de entrada y salida, validación de tipos, rangos numéricos y proyección segura de datos sin exponer secretos. | **Prohibido:** Ejecución de queries a base de datos, mutación de estado del sistema. |
| **Infrastructure** | `backend/app/core/*.py` | Ciclo de vida ASGI, configuración de conexión de base de datos, pragma SQLite, logging, timezone y gestión de sockets de red. | **Prohibido:** Reglas de negocio específicas de productos o facturas. |
| **Desktop Host** | `licoreria-desktop/src-tauri/`| Coordinación del runtime nativo, spawn del proceso sidecar de Python, splashscreen de carga y eliminación forzada de procesos zombies. | **Prohibido:** Implementación de lógica de negocio o renderizado visual propio más allá del splashscreen. |
| **UI Presentational** | `frontend/src/ui-components/`| Componentes de visualización y control atómico (botones, modales, tablas, drawers, inputs) estilizados con Tailwind CSS v4. | **Prohibido:** Referencias a tipos del negocio (`Sale`, `Product`), llamadas directas a la API del servidor. |
| **Domain Features** | `frontend/src/features/*/` | Vistas especializadas, hooks de consumo de datos, formularios y máquinas de estado reactivas propias de cada módulo. | **Prohibido:** Acoplamiento directo cruzado entre módulos no relacionados; manipulación no declarativa del DOM. |
| **State Management** | `frontend/src/stores/` & `store/`| Almacenamiento reactivo de carritos en memoria, colas de espera persistidas y tasa de cambio del día. | **Prohibido:** Almacenar tokens de autenticación en texto plano (gestionados exclusivamente por cookies httpOnly). |
