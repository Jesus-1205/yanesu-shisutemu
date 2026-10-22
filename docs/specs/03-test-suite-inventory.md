# Capítulo 03: Catálogo Exhaustivo e Inventario del Conjunto de Tests

Este documento constituye el inventario técnico y catálogo formal exhaustivo de la infraestructura de pruebas automatizadas y benchmarking de **Yanesu Shisutemu**. Cada cifra, ruta de archivo, clasificación de suite, patrón de aserción y fixture aquí documentado ha sido validado empíricamente sobre el código fuente del repositorio mediante recolección analítica en tiempo real (`pytest --collect-only -q` y análisis sintáctico de suites en Vitest).

---

## 1. Resumen Ejecutivo del Conjunto de Pruebas

El sistema cuenta con una cobertura integral de pruebas automatizadas que abarca desde la validación atómica de componentes visuales en React hasta la simulación transaccional con aislamiento estricto de base de datos en FastAPI y pruebas de rendimiento cross-branch para endpoints críticos.

| Ecosistema | Framework Principal | Motor de Aislamiento | Total Archivos de Test | Total Casos de Prueba | Alcance Principal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend API & Services** | `pytest 8.3.4` + `httpx 0.28.1` | SQLite en memoria / DB temporal (`NamedTemporaryFile`) con rollback por fixture | **48 archivos** | **972 casos** | Integración de endpoints REST, RBAC, validación Pydantic, precisión `Decimal`, scraping BCV, webhooks M2M y servicios de negocio. |
| **Frontend SPA** | `vitest 2.1.8` + `@testing-library/react` | Entorno simulado `jsdom` con mocks de URLs y supresión controlada de flags | **249 archivos** | **1.690 casos** | Vistas de usuario, modales, drawers, hooks reactivos, stores Zustand, helpers de formato de moneda y componentes de diseño. |
| **Benchmarking & Rendimiento** | Scripts personalizados Python (`httpx.ASGITransport`) | Modo in-process ASGI y llamadas HTTP reales | **2 scripts + 1 suite unitaria** | **21 endpoints evaluados** | Medición de percentiles de latencia (avg, p50, p95), concurrencia, tamaño de payload y verificación pre vs post optimización. |
| **TOTAL CONSOLIDADO** | — | — | **297 archivos** | **2.662 casos** | **Cobertura integral de calidad, estabilidad funcional y rendimiento del sistema.** |

---

## 2. Suite de Backend: Python, Pytest y FastAPI TestClient

### 2.1. Arquitectura de Aislamiento y Estrategia de Fixtures (`backend/tests/conftest.py`)

La suite de pruebas del backend garantiza un aislamiento completo e idempotencia matemática entre ejecuciones. Cada prueba corre en su propia base de datos efímera para evitar colisiones de estado o fugas de persistencia (*state bleeding*).

```python
# Extracto del patrón de ciclo de vida en backend/tests/conftest.py
@pytest.fixture
def db_session():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    engine = create_engine(
        f"sqlite:///{tmp.name}",
        connect_args={"check_same_thread": False},
        echo=False,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestSessionLocal = sessionmaker(bind=engine)
    session = TestSessionLocal()
    # Inserción de semillas deterministas (Roles, Categorías, Métodos de Pago)...
    ...
```

#### Pilares de la Configuración del Entorno de Pruebas:

1. **Base de Datos Efímera por Test:**
   - La fixture `db_session` crea un archivo SQLite temporal independiente mediante `tempfile.NamedTemporaryFile(suffix=".db", delete=False)`.
   - Se crea el motor `create_engine` con `connect_args={"check_same_thread": False}`.
2. **Activación Obligatoria de Claves Foráneas:**
   - Mediante el evento `@event.listens_for(engine, "connect")`, se inyecta la instrucción `PRAGMA foreign_keys=ON` en cada conexión abierta. Esto asegura que SQLite emule con total rigor las restricciones de integridad relacional de PostgreSQL (violaciones de foreign key disparan excepciones inmediatas).
3. **Sembrado Determinista de Datos Iniciales (*Seeds*):**
   - Antes de entregar la sesión al test, `conftest.py` inserta de manera automática:
     - **Roles:** `ADMINISTRADOR` (ID 1) y `OPERADOR` (ID 2).
     - **Categorías Base:** `LICORES`, `VINOS`, `CERVEZAS`, `REFRESCOS`, `CAT1`, `CAT2`.
     - **Métodos de Pago Activos:** `DIVISAS`, `EFECTIVO`, `PUNTO_DE_VENTA`, `PAGO_MOVIL`.
4. **Sustitución de Dependencias (`dependency_overrides`):**
   - El generador de sesiones del backend (`app.core.database.get_db`) es sustituido por `override_get_db`, garantizando que cualquier petición que ingrese a través de `TestClient` consuma exactamente la misma base de datos temporal asignada al test.
5. **Autenticación en Entorno de Pruebas:**
   - En `conftest.py`, se establece `os.environ["SECURE_COOKIE"] = "False"` debido a que `TestClient` opera sobre el esquema `http://testserver`. Si la cookie tuviera el flag `Secure=True`, el cliente HTTP interno (`httpx`) descartaría el token `access_token` en subsiguientes peticiones.
   - Las pruebas inician sesión llamando a `client.post("/api/auth/register", json=...)` o `client.post("/api/auth/login", data=...)`, lo que deposita automáticamente la cookie en la sesión del cliente de pruebas.
6. **Teardown y Destrucción Limpia:**
   - Al finalizar cada test, el bloque `finally/yield` ejecuta:
     ```python
     session.close()
     Base.metadata.drop_all(bind=engine)
     app.dependency_overrides.clear()
     tmp.close()
     ```
   - Esto libera la memoria, borra las tablas y restablece los overrides de FastAPI.

---

### 2.2. Inventario y Clasificación de las 28 Suites de Integración (`backend/tests/`)

En el directorio raíz de pruebas (`backend/tests/`) residen **28 archivos** que ejecutan **488 casos de prueba** recolectados por Pytest, categorizados en 5 dominios técnicos:

```
backend/tests/ (28 archivos, 488 tests)
├── 1. Integración de API y Rutas (18 archivos, 376 tests)
├── 2. M2M, Webhooks y Automatización (2 archivos, 27 tests)
├── 3. Precisión Financiera y Reglas Críticas (1 archivo, 17 tests)
├── 4. Auditoría, Dependencias y Errores (3 archivos, 23 tests)
└── 5. Configuración de Base de Datos y Consultas Especiales (4 archivos, 45 tests)
```

| Archivo de Prueba | Casos de Prueba | Dominio / Categoría | Alcance Funcional y Aserciones Críticas |
| :--- | :---: | :--- | :--- |
| `test_auth.py` | 16 | Integración API | Registro, login, emisión de cookie JWT, refresh, logout, contraseñas inválidas, usuario inactivo y validación de esquemas Pydantic. |
| `test_products.py` | 46 | Integración API | CRUD de productos, validación de códigos de barra duplicados, cálculo de precios con IVA y margen, normalización de strings, filtros de paginación y soft-delete. |
| `test_sales.py` | 43 | Integración API | Checkout de ventas en efectivo y divisas, validación de stock disponible, integridad canónica de base/IVA, cálculo de vueltos, pagos mixtos y transaccionalidad. |
| `test_invoices.py` | 43 | Integración API | Registro de facturas de compra, incremento de stock, actualización de costo promedio/último costo, conversión multimoneda (USD/VES) y manejo de obsequios. |
| `test_invoice_payments.py` | 27 | Integración API | Pagos totales y parciales a facturas de proveedores, recalculo de estado (`PENDIENTE`, `PARCIAL`, `PAGADA`), validación de sobrepago y pagos en bolívares. |
| `test_combos.py` | 20 | Integración API | Creación y venta de combos promocionales, validación de existencia de productos miembros, distribución proporcional de ingresos y reglas de precios. |
| `test_categories.py` | 30 | Integración API | CRUD de categorías, endpoints de analítica (`/analytics`, `/summary`), ordenamiento jerárquico de rutas para evitar colisiones con `/{id}`, y filtros de búsqueda. |
| `test_suppliers.py` | 24 | Integración API | Gestión de proveedores, validación de RIF/identificación única, resumen analítico de compras y protección contra eliminación si existen productos asociados. |
| `test_roles.py` | 5 | Integración API | Listado de roles del sistema, consulta por identificador y verificación de permisos RBAC para `ADMINISTRADOR` y `OPERADOR`. |
| `test_users.py` | 23 | Integración API | Gestión de operadores y administradores, hashing de credenciales, alternancia de estado activo/inactivo (`toggle-active`) y restricción de autoeliminación. |
| `test_retornable.py` | 34 | Integración API | Control de envases y casilleros retornables, conteo físico vs teórico, movimientos por ventas/compras, arqueo de botellas sobrantes y balance de cajas. |
| `test_payment_methods.py` | 24 | Integración API | Catálogo de formas de pago (efectivo, divisas, punto, pago móvil), monedas por defecto, requerimiento de número de referencia y activación/desactivación. |
| `test_price_rules.py` | 23 | Integración API | Reglas de precios diferenciales por método de pago (ej. descuento especial en divisas en efectivo), asignación multi-producto y vigencia de reglas. |
| `test_dashboard.py` | 5 | Integración API | Consolidación de métricas generales (`/dashboard/stats`), cálculo de ventas del día, productos bajo stock y balance financiero rápido. |
| `test_reports.py` | 12 | Integración API | Matriz consolidada de productos, reporte de métodos de pago utilizados, reportes de rotación de inventario y filtros por rangos de fechas. |
| `test_system_settings.py` | 7 | Integración API | Configuración global, almacenamiento seguro de la API Key de Google Gemini mediante cifrado Fernet, y verificación de conectividad con la IA. |
| `test_exchange_rate.py` | 17 | Integración API | Registro manual de tasas BCV (USD/EUR), consulta de última tasa activa, historial cronológico e idempotencia de almacenamiento. |
| `test_exchange_rate_stream.py` | 9 | Integración API | Difusión de eventos en tiempo real / polling de actualización de tasas, soporte de clientes concurrentes y control de desconexión. |
| `test_webhooks.py` | 11 | M2M & Webhooks | Sincronización automática de tasa BCV vía Webhook asegurado con token `X-Webhook-Secret`, verificación de idempotencia y rechazo 401 sin cabecera. |
| `test_n8n_agent.py` | 16 | M2M & Webhooks | Interfaz M2M para automatizaciones externas con n8n, soporte de comandos vía bot de mensajería (Telegram), parsing de payloads y seguridad HMAC/Bearer. |
| `test_decimal_precision.py` | 17 | Precisión Crítica | **Regla de Cero Tolerancia a Flotantes:** Rechazo de 4 decimales en precios de venta (HTTP 422), preservación de 4 decimales en tasas BCV, redondeo exacto `ROUND_HALF_UP` a 2 decimales y ausencia de ruido binario en agregaciones SQL (`func.sum`). |
| `test_audit.py` | 5 | Auditoría & Seg. | Cola asíncrona de eventos de auditoría, encolamiento JSON no bloqueante, descarte seguro si la cola se llena y rotación de archivos de log. |
| `test_dependencies.py` | 10 | Auditoría & Seg. | Inyección de dependencias `get_current_user`, decodificación de JWT, expiración de tokens (`exp`), rechazo de tokens corruptos y enforcement de roles RBAC. |
| `test_error_handler.py` | 8 | Auditoría & Seg. | Handlers globales de excepción: conversión de `EntityNotFoundError` a 404, `ConflictError` a 409, y respuestas uniformes con estructura `{"detail": "..."}`. |
| `test_database_config.py` | 1 | Base de Datos | Verificación de los parámetros del pool en PostgreSQL (`QueuePool`, `pool_size=10`, `max_overflow=20`, `pool_timeout=30`, `pool_recycle=1800`, `pre_ping=True`). |
| `test_benchmark_suite.py` | 4 | Benchmarking | Pruebas unitarias sobre el cálculo de diferencias de latencia (speedup), detección de mejoras y regresiones, y serialización del reporte Markdown. |
| `test_payment_method_summary.py` | 6 | Consultas Especiales| Cálculo agregado y desglosado de ingresos por método de pago con agrupaciones temporales y consistencia decimal en moneda extranjera y local. |
| `test_sales_pagination_kpis.py` | 2 | Consultas Especiales| Comprobación de que la paginación de ventas (`/sales?page=1&page_size=20`) devuelve en los metadatos los acumulados agregados de todo el dataset sin depender del límite por página. |
| **Subtotal Suites Raíz** | **488** | **28 archivos** | **Pruebas de extremo a extremo a través del cliente HTTP de FastAPI.** |

---

### 2.3. Inventario de Pruebas Unitarias de Servicios (`backend/tests/test_services/`)

En el subdirectorio `backend/tests/test_services/` residen **20 archivos** que ejecutan **484 casos de prueba**, centrados estrictamente en la lógica de negocio pura, algoritmos de inventario, descomposición de unidades, scraping y criptografía, sin sobrecarga de capas HTTP.

| Archivo de Prueba de Servicio | Casos de Prueba | Componente Evaluado | Lógica de Negocio Probada |
| :--- | :---: | :--- | :--- |
| `test_invoice_service.py` | 86 | `invoice_service.py` | Desempaque automático de cajas a unidades, cálculo de costos promedio ponderados, reglas de IVA mixto (gravado + exento), gestión de estados de pago y notas de crédito. |
| `test_retornable_service.py` | 88 | `retornable_service.py` | Fórmulas de conversión botellas ➔ cajas completas + sobrantes para presentaciones 222ml y 333ml, arqueos de inventario físico, cálculo de deltas automáticos y auditoría de envases rotos. |
| `test_sale_service.py` | 55 | `sale_service.py` | Lógica central de facturación POS, validación estricta de stock disponible (cajas vs unidades individuales), desempaque reactivo al vender unidades sueltas, rangos de fecha y hora bajo zona `America/Caracas`. |
| `test_product_service.py` | 45 | `product_service.py` | Creación, actualización y filtrado avanzado de productos, cálculo de precios con margen de ganancia automático, reglas de stock mínimo y alertas de reposición. |
| `test_combo_service.py` | 30 | `combo_service.py` | Algoritmo de distribución proporcional de ingresos de combos sobre los productos miembros, preservando los centavos restantes mediante asignación determinista. |
| `test_price_rule_service.py` | 29 | `price_rule_service.py` | Cálculo y aplicación de descuentos por divisa o reglas de precio preferencial según la forma de pago utilizada en la venta. |
| `test_category_service.py` | 27 | `category_service.py` | Búsqueda insensible a mayúsculas/acentos, agregación de KPIs por categoría, rotación de inventario y margen bruto acumulado. |
| `test_supplier_service.py` | 19 | `supplier_service.py` | Integración analítica de proveedores, historial de órdenes de compra, productos suministrados y métricas de abastecimiento. |
| `test_payment_method_service.py` | 18 | `payment_method_service.py`| Validación de estados de métodos de pago, alternancia de visibilidad en POS y consistencia con las reglas monetarias. |
| `test_invoice_ai.py` | 16 | `invoice_service.py` (AI) | Optimización de imágenes (Pillow LANCZOS), compresión JPEG, conversión de perfiles RGBA/Palette a RGB, extracción de texto OCR con Gemini y resiliencia ante fallos de red. |
| `test_system_setting_service.py` | 11 | `system_setting_service.py` | Cifrado y descifrado de llaves de sistema (AES Fernet), persistencia en base de datos y recuperación sin exponer el texto plano. |
| `test_audit_service.py` | 11 | `audit_service.py` | Manejo de buffer de log asíncrono, descarte cuando se alcanza la capacidad máxima, rotación atómica de archivos y limpieza de registros antiguos. |
| `test_user_service.py` | 10 | `user_service.py` | Creación segura de usuarios, validación de unicidad de username/email, actualización de credenciales y soft-delete de cuentas. |
| `test_auth_service.py` | 9 | `auth_service.py` | Algoritmo de hashing bcrypt, verificación de firmas JWT HS256, expiración matemática de tokens y autenticación segura. |
| `test_exchange_rate_service.py` | 8 | `exchange_rate_service.py` | Persistencia idempotente de cotizaciones del BCV, desempate temporal de tasas y cálculo de variaciones porcentuales. |
| `test_daily_status.py` | 5 | `exchange_rate_service.py` | Lógica de estado diario: verificación de si se requiere actualización de tasa según la hora oficial (cierre bancario a las 17:00 hora Caracas) y fines de semana. |
| `test_gemini_service.py` | 5 | `gemini_service.py` | Peticiones HTTP al modelo de Google Gemini, manejo de cuotas, timeouts y validación de conectividad. |
| `test_bcv_scraper.py` | 5 | `bcv_scraper.py` | Scraping del portal oficial del Banco Central de Venezuela con `BeautifulSoup4`, extracción de valores USD/EUR, conversión de formato numérico venezolano (`.` miles, `,` decimales) y manejo de caídas de red. |
| `test_role_service.py` | 4 | `role_service.py` | Recuperación y filtrado de roles del sistema y validación de identificadores canónicos. |
| `test_encryption_service.py` | 3 | `encryption_service.py` | Generación de vector de inicialización, salting y pruebas de invariancia criptográfica con Fernet. |
| **Subtotal Suites Servicios** | **484** | **20 archivos** | **Lógica de negocio aislada y pruebas algorítmicas de alta velocidad.** |
| **TOTAL BACKEND** | **972** | **48 archivos** | **972 casos de prueba ejecutados y aprobados con pytest.** |

---

## 3. Suite de Frontend: React 19, TypeScript, Vitest y JSDOM

### 3.1. Entorno de Ejecución y Configuración (`vitest.config.ts`, `setup.ts`)

La infraestructura de pruebas del frontend está optimizada para la velocidad y determinismo utilizando el motor nativo de Vite con Vitest, interactuando con el DOM simulado mediante `jsdom` y `@testing-library/react`.

```typescript
// frontend/vitest.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
  },
});
```

#### Estrategia del Archivo de Inicialización (`setup.ts`):
1. **Matchers DOM Ampliados:** Importa `@testing-library/jest-dom` para proveer aserciones semánticas (`toBeInTheDocument()`, `toHaveValue()`, `toBeDisabled()`).
2. **Supresión Selectiva de Warnings del Router:** Intercepta `console.warn` para filtrar advertencias no críticas relativas a banderas de transición (*future flags*) de React Router v7, manteniendo limpios los logs de test.
3. **Mocks de APIs del Navegador en JSDOM:**
   - JSDOM no implementa de forma nativa `URL.createObjectURL` ni `URL.revokeObjectURL`.
   - `setup.ts` inyecta implementaciones mock simuladas (`vi.fn(() => 'mocked-url')`) para permitir la previsualización y renderizado seguro de facturas escaneadas y comprobantes sin generar excepciones.

---

### 3.2. Distribución y Conteo Exhaustivo por Capas Técnicas

El directorio `frontend/src/__tests__/` contiene un total de **249 archivos de test** que suman **1.690 casos de prueba** estructurados en 7 dominios funcionales:

```
frontend/src/__tests__/ (249 archivos, 1.690 tests)
├── 1. Features de Negocio (189 archivos, 1.238 tests)
├── 2. UI Components Agnósticos (42 archivos, 232 tests)
├── 3. Utilidades y Formateadores Lib (7 archivos, 116 tests)
├── 4. Cliente de Servicios HTTP (2 archivos, 63 tests)
├── 5. Layout y Navegación (5 archivos, 21 tests)
├── 6. Raíz de la Aplicación (2 archivos, 9 tests)
├── 7. Hooks Transversales (1 archivo, 6 tests)
└── 8. Estado Global Stores (1 archivo, 5 tests)
```

| Capa Técnica | Directorio Base | Archivos | Casos de Prueba | Alcance y Tecnologías Evaluadas |
| :--- | :--- | :---: | :---: | :--- |
| **Features de Negocio** | `src/__tests__/features/` | 189 | 1.238 | Páginas completas, modales de captura, drawers de detalle, hooks de datos y stores acoplados al dominio de negocio. |
| **Componentes UI** | `src/__tests__/ui-components/` | 42 | 232 | Componentes atómicos reutilizables (Botones, Modales, Tablas, Drawers, Comboboxes, Sidebar y Gráficos Recharts). |
| **Librería y Helpers** | `src/__tests__/lib/` | 7 | 116 | Formateo de moneda (`money.ts`), normalización decimal, IVA venezolano, manipulación de fechas y exportación a Excel. |
| **Servicios de Red** | `src/__tests__/services/` | 2 | 63 | Cliente HTTP `api.ts`, manejo de respuestas, interceptores de credenciales, parsing de errores y endpoints extendidos. |
| **Layout del Sistema** | `src/__tests__/layout/` | 5 | 21 | Barra superior (`LayoutHeader`), superposición móvil (`LayoutOverlay`), navegación activa y generador de migas de pan (`Breadcrumbs`). |
| **Raíz SPA** | `src/__tests__/` (raíz) | 2 | 9 | Inicialización de la aplicación (`App.test.tsx`) y configuración general del enrutador central (`router.test.tsx`). |
| **Hooks Transversales** | `src/__tests__/hooks/` | 1 | 6 | Detección reactiva de puntos de quiebre responsivos (`useBreakpoint.test.ts` para sm, md, lg, xl). |
| **Stores Globales** | `src/__tests__/stores/` | 1 | 5 | Store reactivo global de tasas de cambio (`exchangeRateStore.test.ts`). |
| **TOTAL FRONTEND** | — | **249** | **1.690** | **1.690 casos de prueba funcionales y de componentes en React 19.** |

---

### 3.3. Inventario Detallado de los 19 Módulos de Feature (`frontend/src/__tests__/features/`)

El diseño del frontend sigue estrictamente el patrón *Feature-Sliced Design*, concentrando las pruebas dentro de sus respectivos dominios.

| Módulo de Feature | Archivos | Tests | Componentes, Hooks y Flujos Evaluados |
| :--- | :---: | :---: | :--- |
| **sales** (POS y Ventas) | 35 | 252 | Pantalla de punto de venta (`POSPage`), catálogo reactivo de productos, carrito de compras (`cartStore` con soporte de combos y split), drawer de cobro (`CheckoutDrawer`), cola de carritos en espera (`holdQueueStore`), scanner de código de barras (`useBarcodeScanner`), atajos de teclado y visualización de detalle fiscal. |
| **invoices** (Compras) | 35 | 206 | Hub de compras (`ComprasHubPage`), visualizador de imagen escaneada (`InvoiceImageViewer`), panel de revisión de OCR por IA (`AIReviewPanel`), cálculo dinámico de retenciones e IVA, persistencia del formulario de compra (`invoiceFormStore`), y modal de registro de pagos parciales/totales. |
| **products** (Inventario) | 24 | 176 | Catálogo de productos en modo cuadrícula y tabla, cálculo reactivo de márgenes y precios en tiempo real (`calcAndMargin`), drawer de filtros multicriterio, modal de edición rápida (`QuickEditModal`), creación de ítems y exportación a Excel. |
| **reports** (Analítica) | 16 | 107 | Reporte de ventas diarias/mensuales, reporte de rotación de categorías, analítica de métodos de pago con gráficos de dona y barras (`Recharts`), matriz global de productos y filtros por rangos de fecha. |
| **shared** (Compartidos) | 11 | 59 | Modales compartidos entre múltiples features: modal de creación de producto rápido desde compras, modal de proveedores, campos de precios compactos y utilidades de extracción de unidades. |
| **retornables** (Envases) | 8 | 79 | Módulo de envases vacíos y casilleros, tabla de arqueo físico vs teórico, registro de entradas/salidas de cajas, comparación de diferencias y asociación de productos retornables. |
| **users** (Usuarios) | 6 | 57 | Listado de operadores y administradores, formulario de alta con validación de contraseñas, asignación de roles y activación/desactivación de accesos. |
| **categories** (Categorías) | 8 | 46 | Vista principal de categorías, tabla con ordenamiento por columnas, modal de edición/creación, hooks de mutación y exportación de categorías a XLSX. |
| **suppliers** (Proveedores) | 7 | 43 | Directorio de proveedores, resumen analítico de compras por proveedor, formulario de edición con validación de teléfono/RIF y exportación. |
| **exchange-rates** (Tasas BCV) | 7 | 42 | Panel de visualización de tasa oficial BCV, gráfica de tendencia histórica de divisas (`RateTrendChart`), panel de actualización rápida de tasa y cálculo de variaciones porcentuales. |
| **dashboard** (Métricas) | 6 | 40 | Pantalla de inicio con KPIs en tarjetas (`StatCard`), skeleton screens de carga, hooks de consumo de analíticas y gráficos analíticos de facturación semanal. |
| **auth** (Autenticación) | 5 | 32 | Pantalla de inicio de sesión (`LoginPage`), contexto de autenticación (`authContext`), guards de protección de rutas privadas y redirecciones automáticas según rol. |
| **combos** (Promociones) | 4 | 25 | Gestión de combos promocionales, selector de ítems agrupados, asignación de precios promocionales fijos y tabla de administración de ofertas. |
| **payment-methods** (Pagos) | 4 | 22 | Catálogo de formas de pago aceptadas, modal de configuración de moneda por defecto, switches de activación y requerimiento de comprobante de referencia. |
| **price-rules** (Reglas Divisas) | 6 | 21 | Listado y formulario de asignación de precios diferenciales en moneda extranjera para clientes que pagan en divisas en efectivo. |
| **system-settings** (Ajustes) | 4 | 18 | Configuración de credenciales de Google Gemini, badge indicador de conectividad y tarjeta de asistencia para la obtención de llaves API. |
| **settings** (Configuración) | 1 | 11 | Formularios de ajustes de usuario, personalización de temas y preferencias locales del sistema. |
| **not-found** (Página 404) | 1 | 1 | Vista de error para rutas inexistentes con botón de retorno al dashboard. |
| **design-system** (Guía UI) | 1 | 1 | Página de prueba y validación visual de la paleta semántica, botones y componentes interactivos del sistema. |
| **Total Features** | **189** | **1.238** | **Cobertura integral de todas las funcionalidades operativas del frontend.** |

---

### 3.4. Pruebas de Componentes UI Agnósticos (`frontend/src/__tests__/ui-components/`)

Los componentes ubicados en `src/ui-components/` son completamente desacoplados de la lógica de negocio y cuentan con una suite de **42 archivos** y **232 casos de prueba**:

1. **Componentes Atómicos de Formulario y Navegación (35 archivos, 199 tests):**
   - `AsyncCombobox.test.tsx` (9 tests): Búsqueda asíncrona, debounce de pulsaciones y teclado.
   - `Table.test.tsx` (16 tests): Paginación visual, estados vacíos, ordenamiento ascendente/descendente de columnas y rendering accesible.
   - `Sidebar.test.tsx` (11 tests): Colapso lateral, navegación interactiva y rendering semántico.
   - `Combobox.test.tsx` (8 tests), `Select.test.tsx` (8 tests), `Button.test.tsx` (8 tests), `Pagination.test.tsx` (8 tests).
   - `Input.test.tsx` (7 tests), `SearchInput.test.tsx` (7 tests), `Modal.test.tsx` (7 tests).
   - `MultiSelectTags.test.tsx` (6 tests), `Drawer.test.tsx` (6 tests), `ErrorBanner.test.tsx` (6 tests), `Skeleton.test.tsx` (6 tests), `Tabs.test.tsx` (6 tests), `Textarea.test.tsx` (6 tests).
   - `ConfirmDialog.test.tsx` (5 tests), `FileUpload.test.tsx` (5 tests), `StatCard.test.tsx` (5 tests), `Toast.test.tsx` (5 tests).
   - `Breadcrumbs.test.tsx` (4 tests), `EmptyState.test.tsx` (4 tests), `ImagePreview.test.tsx` (4 tests), `Spinner.test.tsx` (4 tests), `TasaBcvIndicator.test.tsx` (4 tests), `Tooltip.test.tsx` (4 tests).
   - `Badge.test.tsx` (3 tests), `Card.test.tsx` (3 tests), `Checkbox.test.tsx` (3 tests), `DropdownMenu.test.tsx` (3 tests), `HamburgerButton.test.tsx` (3 tests), `LogoutButton.test.tsx` (3 tests), `PageHeader.test.tsx` (3 tests), `ToggleSwitch.test.tsx` (3 tests).
   - `BrandLogo.test.tsx` (2 tests).
2. **Subárbol de Gráficos (`charts/`, 1 archivo, 5 tests):**
   - `Charts.test.tsx` (5 tests): Pruebas de renderizado responsivo y contenedor de gráficas basadas en Recharts.
3. **Subárbol Modular del Menú Lateral (`sidebar/`, 6 archivos, 28 tests):**
   - `SidebarNavigationComponents.test.tsx` (5 tests) y `SidebarPresentational.test.tsx` (7 tests).
   - Custom hooks aislados del sidebar: `useHoverFlyout.test.ts` (7 tests), `useTooltipPosition.test.ts` (5 tests), `useSidebarAccordion.test.ts` (4 tests), `useSidebarCollapse.test.ts` (4 tests).

---

### 3.5. Pruebas de Estado Reactivo con Zustand

El estado reactivo complejo se concentra en stores de Zustand. Se cuenta con **7 archivos de prueba dedicados** que ejecutan **107 casos de prueba** que validan mutaciones inmutables, cálculos reactivos y persistencia en memoria:

| Archivo de Test del Store | Tienda Evaluada | Casos de Prueba | Lógica Reactiva Verificada |
| :--- | :--- | :---: | :--- |
| `src/__tests__/features/sales/cartStore.test.ts` | `useCartStore` | 32 | Adición de productos al carrito, incremento/decremento de cantidades, alternancia entre venta por caja o por unidad suelta, cálculo de subtotales con redondeo a 2 decimales y vaciado de canasta. |
| `src/__tests__/features/sales/cartStore.extended.test.ts` | `useCartStore` | 17 | Manejo de pagos mixtos, validación de vuelto (*change*), desglose entre base imponible e IVA (16%), y sincronización de precios al cambiar la tasa BCV. |
| `src/__tests__/features/sales/cartStore.combos.test.ts` | `useCartStore` | 10 | Integración de combos dentro del carrito del POS, selección de productos sustitutos en grupos y validación de stock global combinado. |
| `src/__tests__/features/invoices/stores.test.ts` | `useInvoiceFormStore` | 26 | Gestión reactiva de renglones de facturación de compras, cálculo de costos unitarios derivados, asignación de obsequios y sumatorias de subtotales gravados/exentos. |
| `src/__tests__/features/sales/holdQueueStore.test.ts` | `useHoldQueueStore` | 14 | Poner ventas en espera (*hold cart*), recuperación de carritos congelados con su estado intacto, expiración y límite máximo de carritos simultáneos. |
| `src/__tests__/features/invoices/invoiceFormStore.extended.test.ts` | `useInvoiceFormStore` | 6 | Desglose multimoneda avanzado en compras y persistencia temporal del formulario ante cambios de pestaña. |
| `src/__tests__/stores/exchangeRateStore.test.ts` | `useExchangeRateStore` | 5 | Almacenamiento global de la tasa de cambio vigente, bandera de sincronización activa y propagación inmediata a todos los componentes suscriptores. |
| `src/__tests__/features/sales/salesFiltersStore.test.ts` | `useSalesFiltersStore` | 3 | Almacenamiento en memoria de filtros de búsqueda, fechas y ordenamiento para el historial de transacciones. |
| **Total Pruebas de Stores** | **Zustand Reactive Stores** | **107** | **107 pruebas enfocadas exclusivamente en la consistencia de estado reactivo.** |

---

### 3.6. Pruebas de Precisión y Utilidades Monetarias (`frontend/src/__tests__/lib/`)

En cumplimiento con la directriz obligatoria de precisión financiera, las utilidades en `src/lib/` cuentan con **7 archivos** y **116 casos de prueba**:

1. `utils.test.ts` (35 tests): Clases CSS dinámicas (`cn()`), manipulación de arrays y saneamiento de cadenas.
2. `dateUtils.test.ts` (22 tests): Formateo de fechas y horas bajo zona `America/Caracas` (formato venezolano `DD/MM/YYYY hh:mm A`).
3. `text.test.ts` (19 tests): Búsqueda fuzzy, resaltado de coincidencias y normalización sin diacríticos.
4. `iva.test.ts` (13 tests): Cálculo exacto del 16% de IVA sobre bases imponibles con redondeo por ítem (`Math.round(...) / 100`) para evitar descuadres de centavos.
5. `money.test.ts` (12 tests): Formateo monetario en Bolívares (`formatBs`) y Dólares (`formatUsd`), admitiendo prefijos semánticos y separadores de miles estándar `es-VE`.
6. `normalizeDecimals.test.ts` (10 tests): Truncado y redondeo seguro de entradas numéricas de usuario en campos de texto de precios.
7. `exportToExcel.test.ts` (5 tests): Generación determinista de libros Excel binarios (`.xlsx`) a partir de datasets planos sin corrupción de caracteres Unicode.

---

## 4. Suite de Benchmarks y Rendimiento Cross-Branch

### 4.1. Arquitectura de Benchmark (`backend/scripts/benchmark_suite.py`)

Para evitar regresiones de rendimiento y auditar los tiempos de respuesta del inventario, el repositorio cuenta con una suite especializada de benchmarking capaz de evaluar hasta 21 endpoints críticos.

#### Características Clave del Motor de Benchmark:
1. **Ejecución ASGI In-Process (`--in-process`):**
   - Utiliza `httpx.ASGITransport(app=app)`. Esto permite que el benchmark se ejecute directamente en memoria sobre el bucle de eventos de Python sin requerir que un puerto de red esté abierto ni que un servidor Uvicorn independiente esté corriendo.
2. **Evaluación de Percentiles de Latencia y Rendimiento:**
   - Para cada endpoint se miden 30 peticiones concurrentes (concurrencia $c=5$).
   - Se registran métricas estructuradas: media (`avg_ms`), percentil 50 (`p50_ms`), percentil 95 (`p95_ms`), mínimo, máximo, peticiones por segundo (`rps`) y tamaño transferido en kilobytes (`payload_kb`).
3. **Persistencia Estructurada y Comparación Cross-Branch:**
   - Los resultados se exportan a archivos JSON estructurados (`benchmark_results/benchmark_pre.json` y `benchmark_post.json`).
   - El modo `--mode compare` calcula la variación porcentual de latencia ($\Delta\text{ Lat}$), aceleración relativa (*Speedup* $= \text{Lat}_{\text{pre}} / \text{Lat}_{\text{post}}$) y ahorro en ancho de banda ($\Delta\text{ Payload}$).
   - Clasifica los endpoints en: `MEJORA SIGNIFICATIVA` ($\le -20\%$), `MEJORA` ($-20\%$ a $-5\%$), `NEUTRO` ($\pm 5\%$) o `REGRESIÓN` ($> +5\%$).

---

### 4.2. Resultados Comparativos Reales (`benchmark_results/comparison_report.md`)

Auditoría oficial registrada en la suite de benchmarks evaluando la latencia y payload antes y después de aplicar las optimizaciones de arquitectura, base de datos y red:

```
RESUMEN EJECUTIVO (DOMINIOS Y ENDPOINTS OPTIMIZADOS)
Latencia Promedio Ponderada: 184.18 ms ➔ 63.04 ms  | Δ -65.8% (2.92x speedup)
Transferencia de Datos Total: 112.89 KB ➔ 26.80 KB  | Δ -76.3% (-86.09 KB de ahorro)
Handshake TCP Inicial (DB):   ~2,047 ms ➔ ~8-20 ms  | Δ -98.9% (elimina picos de 2s)
```

#### A. Endpoints con Optimización Activa (Trabajo de Rendimiento Real)
Endpoints pertenecientes a los dominios optimizados (**Ventas**, **Facturas / Compras**, **Dashboard / Micro-KPIs** e **Infraestructura**) donde se reestructuraron consultas SQL, se agregaron sumatorias matemáticas en motor de DB o se normalizaron payloads:

| Módulo | Endpoint / Recurso Optimizado | Path Evaluado | Latencia Pre (Base) | Latencia Post (Optimizada) | Variación Latencia | Aceleración (*Speedup*) | Ahorro Payload | Clasificación |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Facturas** | Facturas (Página 1, size 20) | `/invoices?page=1&page_size=20` | 352.6 ms | **58.0 ms** | **-83.6%** | **6.1x** | -84.8% | MEJORA SIGNIFICATIVA |
| **Ventas** | Reporte Resumen Ventas | `/sales/summary?rango=diario` | 863.6 ms | **184.7 ms** | **-78.6%** | **4.7x** | +0.0% | MEJORA SIGNIFICATIVA |
| **Facturas** | Facturas Próximas a Vencer | `/invoices?sort_by=fecha_limite_pago...` | 216.6 ms | **53.2 ms** | **-75.4%** | **4.1x** | -86.3% | MEJORA SIGNIFICATIVA |
| **Facturas** | Resumen de Facturas Pendientes | `/invoices/pending-summary` | 75.8 ms | **43.7 ms** | **-42.3%** | **1.7x** | +0.03 KB | MEJORA SIGNIFICATIVA |
| **Reportes** | Reporte de Métodos de Pago | `/reports/payment-methods` | 221.0 ms | **133.5 ms** | **-39.6%** | **1.7x** | +0.0% | MEJORA SIGNIFICATIVA |
| **Facturas** | Estadísticas Globales Facturas | `/invoices/stats` | 49.6 ms | **30.2 ms** | **-39.2%** | **1.6x** | +0.0% | MEJORA SIGNIFICATIVA |
| **Ventas** | Historial de Ventas (Paginado) | `/sales?page=1&page_size=20` | 96.1 ms | **64.4 ms** | **-33.0%** | **1.5x** | -59.7% | MEJORA SIGNIFICATIVA |
| **Proveedores** | Resumen KPIs Proveedores | `/suppliers/summary` | 44.1 ms | **33.8 ms** | **-23.4%** | **1.3x** | -95.4% | MEJORA SIGNIFICATIVA |
| **Inventario** | Productos (Top 5 Más Vendidos) | `/products/top-selling?limit=5` | 35.6 ms | **28.1 ms** | **-21.0%** | **1.3x** | -77.5% | MEJORA SIGNIFICATIVA |
| **Categorías** | Resumen KPIs Categorías | `/categories/summary` | 53.3 ms | **46.5 ms** | **-12.8%** | **1.1x** | -97.7% | MEJORA |
| **Dashboard** | Métricas Globales del Inicio | `/dashboard/stats` | 17.7 ms | **17.3 ms** | **-1.9%** | **1.0x** | +0.0% | NEUTRO |

#### B. Endpoints de Referencia y Control (Sin Modificaciones)
Endpoints correspondientes a catálogos estándar, entidades CRUD básicas o configuraciones donde no se realizaron cambios de arquitectura. Se evaluaron para verificar ausencia de regresiones en el sistema:

| Módulo | Endpoint / Recurso de Control | Path Evaluado | Latencia Pre (Base) | Latencia Post | Variación | Estado |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Usuarios** | Listado de Usuarios | `/users` | 31.7 ms | 29.4 ms | -7.3% | Estable |
| **Configuración** | Métodos de Pago | `/payment-methods` | 25.7 ms | 24.3 ms | -5.4% | Estable |
| **Inventario** | Productos (Paginado Base) | `/products?page=1&page_size=20` | 62.3 ms | 60.5 ms | -2.8% | Estable |
| **Reportes** | Matriz de Productos (200 ítems) | `/reports/products-matrix?limit=200` | 44.2 ms | 43.3 ms | -2.1% | Estable |
| **Inventario** | Combos (Listado Completo) | `/combos` | 44.9 ms | 45.2 ms | +0.7% | Estable |
| **Facturas** | Ranking de Proveedores Compras | `/invoices/top-suppliers` | 37.5 ms | 37.9 ms | +1.0% | Estable |
| **Retornables** | Comparación Arqueo Envases | `/retornable/comparacion` | 27.7 ms | 28.4 ms | +2.6% | Estable |
| **Categorías** | Reporte General de Categorías | `/reports/categories` | 48.4 ms | 50.6 ms | +4.5% | Estable |
| **Configuración** | Reglas de Precio Divisas | `/price-rules` | 37.9 ms | 39.7 ms | +4.6% | Estable |
| **Configuración** | Tasas de Cambio (Última Tasa) | `/exchange-rates/latest` | 23.8 ms | 25.7 ms | +8.1% | Variación de red |

---

## 5. Guía de Ejecución y Comandos Reproducibles

### 5.1. Ejecución de la Suite de Backend (Python / Pytest)

Todas las pruebas del backend se ejecutan desde el directorio `backend/`:

```powershell
# 1. Ejecutar la totalidad de los 972 tests del backend:
cd backend
python -m pytest -v

# 2. Recolección rápida para conteo exacto de casos:
python -m pytest --collect-only -q

# 3. Ejecutar solo las pruebas de integración de API (28 archivos raíz):
python -m pytest tests/test_*.py -v

# 4. Ejecutar solo las pruebas unitarias de servicios (20 archivos):
python -m pytest tests/test_services/ -v

# 5. Ejecutar la prueba crítica de precisión financiera:
python -m pytest tests/test_decimal_precision.py -v

# 6. Generar reporte de cobertura de código sobre el paquete app:
python -m pytest --cov=app --cov-report=term-missing tests/
cd ..
```

---

### 5.2. Ejecución de la Suite de Frontend (React / Vitest)

Dado que Node.js está gestionado mediante `fnm`, en shells no interactivos de Windows debe inyectarse la versión en el `PATH`:

```powershell
# 1. Configurar entorno fnm y ejecutar suite completa una vez:
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH
cd frontend
pnpm test

# 2. Ejecutar pruebas en modo interactivo watch:
pnpm run test:watch

# 3. Ejecutar un módulo específico (ejemplo: ventas y POS):
pnpm test src/__tests__/features/sales/

# 4. Ejecutar pruebas de los componentes de UI:
pnpm test src/__tests__/ui-components/

# 5. Ejecutar pruebas de utilidades monetarias y decimales:
pnpm test src/__tests__/lib/money.test.ts src/__tests__/lib/iva.test.ts
cd ..
```

---

### 5.3. Ejecución de la Suite de Benchmarking

Para medir tiempos de respuesta y regenerar reportes comparativos:

```powershell
# 1. Ejecutar benchmark in-process sobre la rama actual (30 peticiones, concurrencia 5):
python backend/scripts/benchmark_suite.py --in-process --mode post -n 30 -c 5

# 2. Inspección rápida de un único request sin carga:
python backend/scripts/benchmark_suite.py --in-process --mode post --inspect-only

# 3. Comparar resultados pre vs post y regenerar comparación en Markdown:
python backend/scripts/benchmark_suite.py --mode compare

# 4. Probar endpoints bajo un servidor local HTTP en vivo:
python backend/scripts/benchmark_api.py -u admin -p admin123 -e "/sales?page=1&page_size=20" -n 100 -c 10
```
