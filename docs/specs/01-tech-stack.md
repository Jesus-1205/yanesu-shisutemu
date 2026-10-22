# Capítulo 01: Stack Tecnológico, Dependencias y Runtimes

Este documento constituye la auditoría técnica exhaustiva del stack tecnológico utilizado en **Yanesu Shisutemu**. Cada dependencia, versión, motor de ejecución y patrón de consumo ha sido validado contra los archivos de configuración (`requirements.txt`, `package.json`, `Cargo.toml`, `docker-compose.yml`, `alembic.ini`) y el código fuente real del repositorio (`backend/app/`, `frontend/src/`, `licoreria-desktop/`).

---

## 1. Resumen Ejecutivo del Stack

| Capa / Dominio | Tecnología Principal | Versión Base | Propósito Clave |
| :--- | :--- | :--- | :--- |
| **Backend API** | Python / FastAPI | Python 3.12+ / FastAPI 0.115.6 | API REST reactiva, inyección de dependencias, auditoría y orquestación. |
| **ORM & Database** | SQLAlchemy / Alembic | SQLAlchemy 2.0.51 / Alembic 1.14.1 | Acceso a datos multi-dialecto (SQLite / PostgreSQL), migraciones batch seguras. |
| **Validación & Datos** | Pydantic v2 | Pydantic 2.13.4 | Validación estricta de esquemas, coerción de tipos y precisión monetaria con `Decimal`. |
| **Frontend SPA** | React 19 / TypeScript | React 19.2.7 / TS 5.7.2 | UI declarativa, componentes funcionales, hooks especializados y tipos estrictos sin `any`. |
| **Estilos & UI** | Tailwind CSS v4 | Tailwind 4.3.3 / Vite Plugin | Motor CSS nativo de alto rendimiento con `@theme` semántico y animaciones fluidas. |
| **Estado Global** | Zustand | Zustand 5.0.14 | Stores reactivos livianos para tasas, carrito POS, filtros y cola de espera. |
| **Visualización** | Recharts | Recharts 3.10.1 | Gráficos analíticos de barras, áreas, dispersión y dona para KPIs de negocio. |
| **App Desktop** | Tauri v2 (Rust) | Tauri 2.11.5 / Rust 2021 | Contenedor de escritorio ultraligero con IPC nativo y orquestación de sidecar backend. |
| **Empaquetado** | PyInstaller & NSIS | PyInstaller 6.0+ / NSIS 3.x | Compilación en binario monolítico ejecutable e instalador de escritorio para Windows. |
| **Infraestructura** | Docker / n8n / Nginx | Postgres 16 / Nginx Alpine / n8n | Despliegue en VPS, proxy inverso y automatizaciones de tasas cambiarias vía Telegram/M2M. |

---

## 2. Backend: Python, FastAPI y Ecosistema de Datos

### 2.1. Matriz de Dependencias Declaradas (`backend/requirements.txt`)

Todas las dependencias del backend están fijadas con operadores de versión estrictos (`==`) para garantizar determinismo absoluto en builds locales y contenedores Docker.

| Paquete | Versión Declarada | Versión Instalada / Lock | Categoría | Archivos de Uso Comprobado | Propósito Técnico en el Sistema |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `fastapi` | `0.115.6` | `0.115.6` | Core Framework | `backend/app/main.py`, `backend/app/routes/*.py` | Definición de rutas, inyección de dependencias, lifespan y serialización JSON. |
| `uvicorn[standard]` | `0.34.0` | `0.34.0` | Servidor ASGI | `backend/run.py`, `backend/entrypoint.sh` | Servidor HTTP de alto rendimiento con `uvloop` y `httptools`. |
| `sqlalchemy` | `2.0.51` | `2.0.51` | ORM / Core DB | `backend/app/core/database.py`, `backend/app/models/*.py`, `backend/app/services/*.py` | Capa de abstracción relacional mediante sintaxis SQLAlchemy 2.0 moderna. |
| `alembic` | `1.14.1` | `1.14.1` | Migraciones DB | `backend/alembic/env.py`, `backend/run.py` | Control de versiones del esquema relacional compatible con SQLite y PostgreSQL. |
| `pydantic[email]` | `2.13.4` | `2.13.4` | Validación de Datos | `backend/app/schemas/*.py` | Esquemas de entrada/salida, `@computed_field`, `ConfigDict` y validación de emails. |
| `passlib[bcrypt]` | `1.7.4` | `1.7.4` | Criptografía / Auth | `backend/app/services/auth_service.py` | Hashing unidireccional y verificación de contraseñas de usuarios. |
| `bcrypt` | `4.0.1` | `4.0.1` | Criptografía / Auth | `backend/app/services/auth_service.py` | Backend nativo de hashing utilizado por el contexto de `passlib`. |
| `python-jose[cryptography]`| `3.3.0` | `3.3.0` | Seguridad JWT | `backend/app/services/auth_service.py`, `backend/app/core/dependencies.py` | Emisión, firma HS256 y decodificación de tokens de sesión en cookies httpOnly. |
| `cryptography` | `44.0.3` | `44.0.3` | Cifrado Simétrico | `backend/app/services/encryption_service.py`, `backend/app/core/config.py` | Cifrado simétrico AES (Fernet) de secretos, llaves API y configuraciones del sistema. |
| `python-multipart` | `0.0.20` | `0.0.20` | Transporte HTTP | `backend/app/routes/invoices.py` | Procesamiento de formularios `multipart/form-data` para subida de facturas e imágenes. |
| `psycopg[binary]` | `3.2.9` | `3.2.9` | Driver PostgreSQL | `backend/scripts/migrate_sqlite_to_postgres.py`, `docker-compose.yml` | Conector nativo de alto rendimiento para despliegues con base de datos PostgreSQL 16. |
| `python-dotenv` | `1.0.1` | `1.0.1` | Configuración | `backend/app/core/config.py` | Carga de variables de entorno desde archivos `.env`. |
| `requests` | `2.32.3` | `2.32.3` | Cliente HTTP | `backend/app/core/bcv_scraper.py` | Peticiones HTTP síncronas hacia el portal web del Banco Central de Venezuela. |
| `beautifulsoup4` | `4.12.3` | `4.12.3` | Scraping HTML | `backend/app/core/bcv_scraper.py` | Parseo del DOM HTML para extraer las cotizaciones del Dólar y Euro oficial. |
| `Pillow` | `11.1.0` | `11.1.0` | Procesamiento Imagen | `backend/app/services/invoice_service.py` | Redimensión (LANCZOS), conversión RGBA→RGB y compresión JPEG para OCR con IA. |
| `tzdata` | `2025.2` | `2025.2` | Base Horaria IANA | `backend/app/core/config.py`, `backend/app/core/timezone.py` | Base de datos de husos horarios para soporte nativo de `America/Caracas` en Windows. |
| `httpx` | `0.28.1` | `0.28.1` | Cliente HTTP / Tests | `backend/app/services/gemini_service.py`, `backend/tests/conftest.py` | Peticiones asíncronas/síncronas hacia la API de Google Gemini y base para `TestClient`. |
| `pytest` | `8.3.4` | `8.3.4` | Testing | `backend/tests/*.py`, `backend/pytest.ini` | Framework principal de ejecución de pruebas unitarias y de integración. |
| `pytest-cov` | `6.0.0` | `6.0.0` | Cobertura | Utilizado en pipeline y análisis | Generación de reportes de cobertura de código sobre `backend/app/`. |
| `pyinstaller` | `>=6.0` | `6.11.1` | Empaquetado Binario | `backend/build.spec`, `backend/build.bat` | Empaquetado de la aplicación Python en un ejecutable standalone para Windows. |

---

### 2.2. FastAPI y Arquitectura del Transporte HTTP

El archivo `backend/app/main.py` define la instancia de FastAPI y coordina los middlewares, el ciclo de vida del servicio y la incorporación modular de enrutadores.

```python
# app = FastAPI(title="Yanesu Shisutemu API", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
```

1. **Seguridad y Endpoints de Documentación:**
   - En entornos de producción y escritorio, la documentación automática Swagger UI (`docs_url=None`), ReDoc (`redoc_url=None`) y el esquema JSON (`openapi_url=None`) se encuentran explícitamente deshabilitados para evitar exposición de la superficie interna de ataque.
2. **Ciclo de Vida (Lifespan Context Manager):**
   - Se utiliza `@asynccontextmanager` para inicializar el hilo de auditoría asíncrono (`audit_service.start_writer()`) al iniciar la aplicación y asegurar el volcado completo de logs (`audit_service.stop_writer()`) antes del apagado.
3. **Manejo Centralizado de Excepciones:**
   - La función `register_error_handlers(app)` vincula handlers globales para capturar excepciones de dominio (`EntityNotFoundError` → 404, `ConflictError` → 409, `ValueError` → 400/422) y transformarlas en respuestas JSON consistentes con estructura `{"detail": "..."}`.
4. **CORS Dinámico:**
   - Configurado con `CORSMiddleware`, leyendo los orígenes permitidos desde `Config.CORS_ORIGINS` (por defecto `http://localhost:5173` en desarrollo y orígenes locales en desktop), admitiendo credenciales de cookies (`allow_credentials=True`).
5. **Catálogo de 19 Módulos de Enrutamiento (`APIRouter`):**
   - Todas las rutas están agrupadas bajo el prefijo unificado `/api` y organizadas por dominio:
     - Operativos: `/api/sales`, `/api/products`, `/api/categories`, `/api/suppliers`, `/api/combos`, `/api/invoices`, `/api/retornable`.
     - Financieros y Configuración: `/api/exchange-rates`, `/api/payment-methods`, `/api/price-rules`, `/api/system-settings`.
     - Analítica y Reportes: `/api/dashboard`, `/api/reports`.
     - Seguridad y Accesos: `/api/auth`, `/api/users`, `/api/roles`, `/api/health`.
     - M2M y Automatización: `/api/webhooks`, `/api/n8n`.

---

### 2.3. Uvicorn y Ejecución en el Entorno de Escritorio

1. **Gestión Dinámica de Puertos (`backend/app/core/port_manager.py`):**
   - En el entorno de escritorio no es seguro asumir que el puerto `8000` esté siempre libre. El runtime implementa un selector dinámico que sondea el rango de puertos del `8000` al `8010` intentando enlazar un socket TCP temporal.
   - Una vez localizado un puerto libre, este se registra en el archivo `%LOCALAPPDATA%/YanesuShisutemu/.port`, el cual sirve de handshake para la ventana de Tauri.
2. **Corrección de Bug de Consola en PyInstaller (`backend/run.py`):**
   - Al compilar con la bandera `console=False` en Windows, PyInstaller establece `sys.stdout` y `sys.stderr` en `None`. Esto provoca que el formateador interno de `uvicorn` falle al ejecutar `stream.isatty()`.
   - La aplicación detecta esta condición y redirige ambos flujos hacia `os.devnull`:
     ```python
     if sys.stdout is None:
         sys.stdout = open(os.devnull, "w")
     if sys.stderr is None:
         sys.stderr = open(os.devnull, "w")
     ```
3. **Servicio Estático de SPA con Fallback:**
   - Si la carpeta compilada de React existe en `frontend/dist`, el backend monta `/assets` vía `StaticFiles` y sirve cualquier ruta inexistente devolviendo `index.html`, permitiendo que el binario de FastAPI funcione como servidor web autónomo sin requerir Nginx en modo desktop.

---

### 2.4. SQLAlchemy 2.0 y Dualidad Multi-Dialecto (SQLite / PostgreSQL)

El proyecto prohíbe taxativamente el uso de sintaxis legacy 1.x (`session.query()`, `Model.query`). La persistencia se fundamenta en los siguientes estándares de SQLAlchemy 2.0:

1. **Definición Declarativa de Modelos:**
   - Todos los modelos heredan de `DeclarativeBase` configurado con una convención de nombres determinista (`POSTGRES_SQLITE_CONVENTION`):
     ```python
     POSTGRES_SQLITE_CONVENTION = {
         "ix": "ix_%(column_0_label)s",
         "uq": "uq_%(table_name)s_%(column_0_name)s",
         "ck": "ck_%(table_name)s_%(constraint_name)s",
         "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
         "pk": "pk_%(table_name)s",
     }
     ```
   - Tipado nativo con `Mapped[...]` y `mapped_column(...)`.
   - Todas las relaciones foráneas (`ForeignKey`) declaran de forma explícita `ondelete="RESTRICT"` o `ondelete="CASCADE"`.
2. **Ejecución Exclusiva con `select()` y `scalars()`:**
   - Las consultas se construyen como sentencias ejecutables (`stmt = select(Product).where(...)`) y se evalúan mediante `db.execute(stmt).scalars().all()`.
3. **Manejo de Llaves Foráneas en SQLite:**
   - Por defecto, SQLite no aplica constraints de claves foráneas. El motor registra un hook en el evento `connect`:
     ```python
     @event.listens_for(engine, "connect")
     def set_sqlite_pragma(dbapi_connection, connection_record):
         cursor = dbapi_connection.cursor()
         cursor.execute("PRAGMA foreign_keys=ON")
         cursor.close()
     ```
4. **Compilación Condicional Multi-Dialecto (`backend/app/core/timezone.py`):**
   - Para evitar incompatibilidades entre SQLite y PostgreSQL en funciones de fecha y hora, se implementaron elementos SQL personalizados compilados vía `@compiles`:
     - `VE_NOWClause`: Compila como `now()` en PostgreSQL y como `datetime('now', '-4 hours')` en SQLite.
     - `HORA_DIAClause`: Compila como `TO_CHAR(col, 'HH24:MI:SS')` en PostgreSQL y como `time(col)` en SQLite.

---

### 2.5. Pydantic v2 y Precisión Monetaria Estricta (`Decimal`)

1. **Política de Cero Flotantes (`float` prohibido):**
   - Al tratarse de un sistema financiero de inventario, todos los campos de precios, costos, subtotales, totales, inventario y tasas cambiarias se modelan utilizando la clase `decimal.Decimal` de Python, tanto en base de datos (`DECIMAL(10, 2)` / `DECIMAL(12, 4)`) como en Pydantic (`Field(max_digits=..., decimal_places=...)`).
   - Se prohíbe construir `Decimal` a partir de tipos flotantes de punto binario; siempre se inicializan desde cadenas de texto (`Decimal(str(x))` o `Decimal("0.01")`).
2. **Métodos y Sintaxis Pydantic v2:**
   - Uso de `ConfigDict(str_strip_whitespace=True)` para sanitización automática de entradas de texto.
   - Reemplazo de `.dict()` por `.model_dump()` y `.model_validate()`.
   - Propiedades calculadas en tiempo de serialización mediante `@computed_field`.

---

### 2.6. Migraciones con Alembic en Modo Batch

El archivo `backend/alembic/env.py` implementa soporte nativo para modificaciones de esquema en SQLite:

- **`render_as_batch=True`:** Es obligatorio en la configuración de Alembic (`context.configure(..., render_as_batch=True)`). Dado que SQLite carece de soporte para muchas operaciones `ALTER TABLE` directas (como eliminar o alterar columnas con constraints), el modo batch genera tablas intermedias temporales, migra los datos y reconstruye la estructura sin corromper la integridad referencial.
- **Resolución Dinámica de URL:** Alembic no depende de una URL estática en `alembic.ini`, sino que lee en tiempo de ejecución `Config.SQLALCHEMY_DATABASE_URL`, permitiendo migrar tanto la base de datos de desarrollo SQLite como la base PostgreSQL de producción.
- **Migración Automática en Arranque:** La función `run_migrations()` en `run.py` ejecuta automáticamente `command.upgrade(alembic_cfg, "head")` antes de levantar el servidor web, eliminando pasos manuales en las instalaciones de clientes.

---

### 2.7. Seguridad, Autenticación y Criptografía

1. **Tokens JWT en Cookies `httpOnly`:**
   - La autenticación se realiza mediante tokens JWT firmados con algoritmo simétrico HS256 utilizando `python-jose`.
   - Los tokens no se almacenan en `localStorage` (evitando ataques de Cross-Site Scripting / XSS). Se transmiten exclusivamente mediante una cookie segura con banderas `httpOnly=True`, `samesite="lax"`, `secure=Config.SECURE_COOKIE` y expiración fijada por `ACCESS_TOKEN_EXPIRE_MINUTES = 240`.
2. **Autenticación Máquina a Máquina (M2M) con API Keys:**
   - Para integraciones con n8n y webhooks externos, el sistema admite autenticación vía encabezado `X-API-Key`.
   - Las llaves en crudo (`ys_<token>`) jamás se almacenan en texto plano en la base de datos. Se computa su hash criptográfico SHA-256 (`hash_api_key`) para validación rápida en tiempo constante.
3. **Cifrado Simétrico Fernet (AES-128 en modo CBC con HMAC):**
   - El servicio `encryption_service.py` utiliza la librería `cryptography` para cifrar datos sensibles en la tabla `system_settings` (como la clave secreta de la API de Google Gemini o llaves de sincronización).
   - La llave de cifrado se genera derivando 32 bytes de la `SECRET_KEY` del sistema mediante SHA-256 si no se provee una `ENCRYPTION_KEY` específica en las variables de entorno.

---

### 2.8. Scraping Oficial del BCV y Procesamiento de Imágenes

1. **Web Scraper BCV (`bcv_scraper.py`):**
   - Consulta directamente `https://www.bcv.org.ve` mediante `requests.get()` configurando headers realistas de navegador.
   - Utiliza `BeautifulSoup` con el parser `html.parser` para localizar los contenedores `<div id="dolar">` y `<div id="euro">`, extrayendo las etiquetas `<strong class="strong-tb">`.
   - Limpia comas, espacios y símbolos, convirtiendo los valores a `Decimal` redondeados a 4 decimales (`Decimal("0.0001")`).
2. **Preprocesamiento de Imágenes para OCR (`invoice_service.py`):**
   - Utiliza `Pillow` (PIL) para optimizar facturas y comprobantes antes de enviarlos a la API de visión de Google Gemini:
     - Si la imagen contiene canal alfa (`RGBA`), la compone sobre un lienzo blanco sólido para no distorsionar el reconocimiento de texto.
     - Si la dimensión máxima supera los 1600 píxeles, la reduce mediante el filtro de remuestreo `Image.LANCZOS`.
     - Comprime la imagen en formato JPEG con calidad 85% en memoria (`io.BytesIO`), minimizando la latencia de red y el consumo de ancho de banda.

---

### 2.9. Hallazgos Técnicos y Normalización de Búsqueda (Sin RapidFuzz)

- **Auditoría de Dependencias No Declaradas / Eliminadas:**
  - En documentos previos de planificación se mencionaba el uso de `rapidfuzz` para la búsqueda difusa de productos en facturas.
  - La inspección exhaustiva del código fuente revela que **`rapidfuzz` no está presente en `backend/requirements.txt` ni importado en ningún módulo de Python**.
  - En su lugar, el sistema implementa una solución de normalización pura sin dependencias binarias externas:
    - En base de datos (`product_service.py`): la función `_accent_fold()` encadena operaciones SQL `func.replace()` sobre las vocales acentuadas (`á, é, í, ó, ú, ñ`) combinadas con `func.lower()`.
    - En Python: la función `_accent_fold_pattern()` utiliza el módulo estándar `unicodedata` para normalización NFKD eliminando caracteres diacríticos combinables.
    - En reconocimiento de facturas: la extracción y asociación de productos es delegada íntegramente a las capacidades multimodales de la API de visión de Google Gemini, ofreciendo tolerancia semántica superior sin necesidad de dependencias C++ compiladas en el cliente.

---

## 3. Frontend: React 19, TypeScript y Tailwind CSS v4

### 3.1. Matriz de Dependencias Declaradas (`frontend/package.json`)

El frontend está estructurado sobre Node.js utilizando `pnpm` como gestor de paquetes de alto rendimiento.

| Paquete | Versión Declarada | Versión Bloqueada (`pnpm-lock.yaml`) | Tipo | Archivos de Uso Comprobado | Propósito Técnico en la Aplicación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `react` | `^19.0.0` | `19.2.7` | Producción | Todo `src/` | Biblioteca principal de interfaz de usuario, componentes funcionales y hooks. |
| `react-dom` | `^19.0.0` | `19.2.7` | Producción | `src/main.tsx` | Montaje en el DOM raíz del navegador. |
| `react-router-dom` | `^6.28.0` | `6.30.4` | Producción | `src/router.tsx`, `src/layout/` | Enrutamiento del lado del cliente, rutas protegidas y layouts anidados. |
| `zustand` | `^5.0.14` | `5.0.14` | Producción | `src/stores/`, `src/features/*/store/` | Gestión de estado global atómico y reactivo sin boilerplate de Redux. |
| `recharts` | `3.10.1` | `3.10.1` | Producción | `src/features/dashboard/`, `src/features/reports/` | Renderizado de gráficos analíticos SVG interactivos con diseño responsivo. |
| `lucide-react` | `^1.25.0` | `1.25.0` | Producción | Más de 100 archivos en `src/` | Sistema unificado de iconografía SVG liviana. |
| `clsx` | `^2.1.1` | `2.1.1` | Producción | `src/lib/utils.ts` | Construcción condicional de clases CSS. |
| `tailwind-merge` | `^3.6.0` | `3.6.0` | Producción | `src/lib/utils.ts` | Resolución inteligente de conflictos entre utilidades de Tailwind CSS. |
| `xlsx` | `^0.18.5` | `0.18.5` | Producción | `src/lib/exportToExcel.ts` | Generación y descarga directa en cliente de hojas de cálculo de Microsoft Excel (`.xlsx`). |
| `@tauri-apps/plugin-opener` | `^2.5.4` | `2.5.4` | Producción | `src/lib/tauri.ts` | Apertura de URLs y enlaces externos en el navegador por defecto desde la app de escritorio. |
| `class-variance-authority` | `^0.7.1` | `0.7.1` | Producción | Declarado en manifiesto | *(Hallazgo: Dependencia no importada en el código fuente actual).* |
| `file-saver` | `^2.0.5` | `2.0.5` | Producción | Declarado en manifiesto | *(Hallazgo: Dependencia no importada en el código fuente actual; reemplazada por `XLSX.writeFile`).* |
| `vite` | `^6.0.5` | `6.4.3` | Desarrollo | `vite.config.ts` | Bundler y servidor de desarrollo ultra-rápido basado en ESM y Rollup. |
| `typescript` | `^5.7.2` | `5.7.2` | Desarrollo | `tsconfig.json` | Tipado estático estricto del proyecto. |
| `@tailwindcss/vite` | `^4.0.0` | `4.3.3` | Desarrollo | `vite.config.ts`, `src/index.css` | Plugin oficial de Vite para el compilador nativo de Tailwind CSS v4. |
| `tailwindcss` | `^4.0.0` | `4.3.3` | Desarrollo | `src/index.css` | Motor CSS basado en utilidades de última generación. |
| `tailwindcss-animated` | `^1.1.2` | `1.1.2` | Desarrollo | `src/index.css` | Colección de animaciones fluidas preconfiguradas para Tailwind. |
| `vitest` | `^2.1.8` | `2.1.8` | Desarrollo | `vitest.config.ts` | Framework de pruebas unitarias nativo de Vite. |
| `@testing-library/react` | `^16.1.0` | `16.3.2` | Desarrollo | `src/__tests__/**/*.tsx` | Renderizado y pruebas de comportamiento en componentes de React. |
| `@testing-library/jest-dom` | `^6.6.3` | `6.6.3` | Desarrollo | `src/__tests__/setup.ts` | Matchers semánticos de aserción para el DOM virtual. |
| `@testing-library/user-event` | `^14.5.2` | `14.5.2` | Desarrollo | `src/__tests__/**/*.tsx` | Simulación realista de eventos de interacción del usuario. |
| `jsdom` | `^25.0.1` | `25.0.1` | Desarrollo | `vitest.config.ts` | Entorno de simulación del navegador web en memoria para Node.js. |
| `@vitest/coverage-v8` | `^2.1.9` | `2.1.9` | Desarrollo | Cobertura en Vitest | Proveedor nativo V8 para medición de cobertura de código. |

---

### 3.2. Configuración y Bundler con Vite 6

El archivo `frontend/vite.config.ts` implementa la siguiente arquitectura de compilación:

1. **Integración con Tailwind v4:** Se utiliza `@tailwindcss/vite` en el arreglo de plugins (`plugins: [react(), tailwindcss()]`), permitiendo que Tailwind se compile directamente dentro del pipeline de Vite sin intermediarios PostCSS ni archivo `tailwind.config.js`.
2. **Aliases de Módulos:** Mapeo `@/` apuntando a `./src` para importaciones limpias e inmunes a reubicaciones de carpetas.
3. **Pre-empaquetado de Dependencias Críticas (`optimizeDeps`):** Se fuerzan `recharts` y `react-is` en `optimizeDeps.include` para asegurar compatibilidad perfecta CommonJS/ESM en desarrollo y evitar problemas de renderizado de gráficos.
4. **Proxy Reverso Integrado:** En modo de desarrollo, el servidor local en el puerto `5173` redirige todas las peticiones con prefijo `/api` hacia `http://localhost:8000`, evitando bloqueos de CORS y permitiendo el transporte de cookies `httpOnly` en `localhost`.

---

### 3.3. Sistema de Diseño con Tailwind CSS v4

La migración a Tailwind CSS v4 elimina completamente las directivas `@tailwind` de v3. El archivo `frontend/src/index.css` adopta la sintaxis moderna:

```css
@import "tailwindcss";
@plugin "tailwindcss-animated";

@theme {
  /* Brand Tokens */
  --color-brand-blue: #1E40AF;
  --color-accent-orange: #EA580C;

  /* Surface Tokens */
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text-main: #0F172A;

  /* Semantic Tokens */
  --color-success: #16A34A;
  --color-danger: #DC2626;
  --color-info: #2563EB;
}
```

- **Variables CSS Dinámicas:** El bloque `@theme` genera tokens de diseño accesibles mediante clases de utilidad estándar de Tailwind (`bg-brand-blue`, `text-accent-orange`, `border-surface`).
- **Animaciones Integradas:** Definición de keyframes específicos para flyouts y tooltips de la barra lateral (`sidebarFlyoutIn`, `sidebarTooltipIn`) con curvas cúbicas de Bezier optimizadas.

---

### 3.4. Arquitectura de Estado Global con Zustand v5

Zustand gestiona el estado transaccional sin requerir contextos anidados pesados ni re-renderizados innecesarios del árbol de componentes:

1. **`exchangeRateStore.ts`:**
   - Almacena la cotización oficial activa del BCV (USD/EUR) y la marca de tiempo de la última sincronización.
   - Es actualizado automáticamente por el hook global `useRateStream.ts`, el cual mantiene una conexión unidireccional persistente mediante `EventSource` (`/api/exchange-rates/stream`).
2. **`cartStore.ts` (Punto de Venta / POS):**
   - Maneja el carrito de compras en tiempo real: ítems de productos simples, combos promocionales con productos sustitutos y registro de botellas retornables recibidas o vendidas.
   - Implementa redondeo monetario estricto en cada cálculo intermedio:
     ```typescript
     const subtotal = Math.round(item.cantidad * item.precio_unitario_usd * 100) / 100;
     const total = Math.round((base + iva) * 100) / 100;
     ```
3. **`holdQueueStore.ts`:**
   - Permite pausar ("aparcar") múltiples ventas en curso con nombre o número de cliente y reanudarlas instantáneamente, liberando el POS para atender a otros clientes.
4. **`invoiceFormStore.ts` & `paymentFormStore.ts`:**
   - Gestiona el asistente multi-paso de carga de facturas de proveedores, almacenando las filas extraídas por Gemini OCR y permitiendo el mapeo visual contra el catálogo de productos local.
5. **`salesFiltersStore.ts` & `invoiceFiltersStore.ts`:**
   - Centraliza los filtros de fecha, rangos de montos, métodos de pago y paginación para las tablas de historial de transacciones.
6. **`useProductsStore.ts`:**
   - Almacena los filtros del catálogo de productos (categorías seleccionadas, búsqueda textual, estado de stock, favoritos) y la preferencia de visualización (modo tabla o cuadrícula de tarjetas).

---

### 3.5. Visualización de Datos con Recharts

El sistema aprovecha Recharts 3.10.1 con componentes completamente responsivos encerrados en `ResponsiveContainer`:

- **Dashboard:**
  - `SalesTrendChart.tsx`: Gráfico de área (`AreaChart`) con degradado suave para la evolución temporal de ingresos.
  - `TopProductsBarChart.tsx`: Gráfico de barras horizontal (`BarChart`) destacando los artículos con mayor volumen de ventas.
- **Reportes Analíticos:**
  - `PaymentMethodsDonut.tsx`: Gráfico de dona (`PieChart`) que representa la distribución porcentual de cobros por método de pago (Divisas, Efectivo Bs, Punto de Venta, Pago Móvil).
  - `RentabilityScatterChart.tsx`: Gráfico de dispersión (`ScatterChart`) correlacionando margen de ganancia porcentual contra volumen de rotación para análisis de matriz BCG.
  - `RateTrendChart.tsx`: Gráfico de líneas y áreas para el historial de fluctuación de la tasa cambiaria BCV.

---

### 3.6. Generación de Reportes Excel con XLSX

El módulo `src/lib/exportToExcel.ts` centraliza la exportación de datos a hojas de cálculo Microsoft Excel:

- **Procesamiento de Celdas Complejas:** Extrae automáticamente texto limpio a partir de nodos de React (`extractText`) si una columna contiene badges o componentes visuales.
- **Nomenclatura Contextualizada:** Genera nombres de archivo dinámicos con fecha y hora basada exclusivamente en el huso de Venezuela (`America/Caracas`) vía `Intl.DateTimeFormat`.
- **Descarga Directa:** Utiliza `XLSX.writeFile(workbook, fullFilename)`, lo cual crea y dispara el enlace blob en el navegador de manera nativa sin requerir librerías externas de descarga.

---

### 3.7. Hallazgos Técnicos en Frontend: Dependencias Huérfanas

1. **`file-saver` (`^2.0.5`) y `@types/file-saver` (`^2.0.7`):**
   - Declaradas en `frontend/package.json`. La búsqueda estática en `frontend/src/` confirma cero importaciones. El motor de descarga de `xlsx` (`XLSX.writeFile`) asumió completamente la responsabilidad de guardar los archivos binarios.
2. **`class-variance-authority` (`^0.7.1`):**
   - Declarada en `frontend/package.json`. No registra ninguna llamada en el código. Los estilos de botones y badges se resolvieron mediante el helper `cn()` (`twMerge(clsx(...))`) sin necesidad de constructores de variantes formales.

---

## 4. Aplicación de Escritorio: Tauri 2 y Ecosistema Rust

### 4.1. Arquitectura y Matriz de Dependencias Rust (`licoreria-desktop/src-tauri/Cargo.toml`)

En lugar de utilizar Electron (cuyo consumo de memoria suele superar los 350 MB debido a instancias completas de Chromium y Node.js), la versión desktop se construyó sobre **Tauri v2**, reduciendo drásticamente la huella de memoria a menos de 50 MB en reposo y utilizando el motor WebView2 nativo de Windows.

| Crate / Dependencia | Versión Declarada | Versión Bloqueada (`Cargo.lock`) | Propósito Técnico en la Aplicación Desktop |
| :--- | :--- | :--- | :--- |
| `tauri` | `2` | `2.11.5` | Framework principal de Tauri para gestión de ventanas, eventos de ciclo de vida e IPC. |
| `tauri-build` | `2` | `2.5.5` | Herramienta de compilación para generar bindings nativos. |
| `tauri-plugin-shell` | `2` | `2.3.5` | Lanzamiento y gestión del ciclo de vida del proceso hijo (sidecar backend). |
| `tauri-plugin-dialog` | `2` | `2.7.2` | Diálogos modales nativos del sistema operativo para errores fatales. |
| `tauri-plugin-opener` | `2` | `2.5.4` | Invocación de programas externos y apertura de URLs en el navegador del sistema. |
| `reqwest` | `0.12 (blocking)` | `0.12.28` | Cliente HTTP síncrono para ejecutar el health check del backend local. |
| `dirs` | `6` | `6.0.0` | Resolución multiplataforma del directorio estándar `AppData/Local`. |
| `serde` & `serde_json` | `1` | `1.0.228 / 1.0.149` | Serialización y deserialización de mensajes JSON entre Rust y JavaScript. |

---

### 4.2. Ciclo de Vida del Sidecar Backend y Transición de Ventanas

El archivo `licoreria-desktop/src-tauri/src/lib.rs` implementa una orquestación robusta del backend:

```
+-----------------------------------------------------------------------------------+
|                            Tauri Desktop Application                              |
|                                                                                   |
| 1. App Launch --> Spawns Splashscreen Window (visible: true, center, frameless)   |
| 2. App Launch --> Spawns Sidecar (yanesu_shisutemu.exe)                           |
| 3. App Launch --> Creates Hidden Main Window (visible: false)                     |
|                                                                                   |
|                    Background Health Check Thread (reqwest)                       |
|         +-------------------------------------------------------------+           |
|         | Polls %LOCALAPPDATA%/YanesuShisutemu/.port (up to 40 retries) |         |
|         | Sends GET http://127.0.0.1:{port}/api/health                |           |
|         +-------------------------------------------------------------+           |
|                                        |                                          |
|                               [Backend Responding OK]                             |
|                                        v                                          |
|         +-------------------------------------------------------------+           |
|         | 1. Main Window navigates to http://127.0.0.1:{port}         |           |
|         | 2. Main Window shows and gains focus (main.show())          |           |
|         | 3. Splashscreen Window is closed (splash.close())           |           |
|         +-------------------------------------------------------------+           |
|                                                                                   |
|                          Clean Exit and Process Cleanup                           |
|         +-------------------------------------------------------------+           |
|         | Event::ExitRequested --> kill_sidecar_tree()                |           |
|         | Executes: taskkill /IM yanesu_shisutemu.exe /T /F           |           |
|         | (with CREATE_NO_WINDOW: 0x0800_0000)                        |           |
|         +-------------------------------------------------------------+           |
+-----------------------------------------------------------------------------------+
```

1. **Ventana Splashscreen Temprana:** Al iniciarse el instalador o la app, el usuario visualiza inmediatamente una ventana de carga (`splashscreen`, 500x400 píxeles, centrada, sin bordes ni sombras de ventana) que muestra `/splash.html`.
2. **Lanzamiento del Sidecar:** El proceso Rust ejecuta `app.shell().sidecar("yanesu_shisutemu")`, el cual corresponde al binario empaquetado con PyInstaller.
3. **Sondeo de Salud HTTP (`reqwest`):**
   - Un hilo dedicado en segundo plano lee periódicamente el archivo `.port` en `AppData/Local/YanesuShisutemu/`.
   - Una vez obtenido el puerto, realiza peticiones HTTP con timeout de 2 segundos a `http://127.0.0.1:{puerto}/api/health` durante un máximo de 40 intentos (20 segundos).
   - Al recibir status 200, la ventana principal navega hacia la dirección del servidor, se maximiza y se enfoca, mientras la ventana splashscreen se destruye.
4. **Prevención de Procesos Huérfanos en Windows:**
   - Los binarios generados por PyInstaller pueden bifurcar procesos hijos de Python.
   - La función `kill_sidecar_tree()` intercepta tanto el evento `ExitRequested` como fallos del handshake y ejecuta un `taskkill` forzoso de todo el árbol de procesos:
     ```rust
     StdCommand::new("taskkill")
         .args(["/IM", "yanesu_shisutemu.exe", "/T", "/F"])
         .creation_flags(CREATE_NO_WINDOW)
         .status();
     ```
   - La bandera `CREATE_NO_WINDOW = 0x0800_0000` evita el destello de ventanas negras de consola en el escritorio del usuario final.

---

### 4.3. Empaquetado NSIS y Hooks de Desinstalación (`hooks.nsh`)

La configuración en `tauri.conf.json` define:

- Identificador único de aplicación: `com.yanesu.shisutemu`.
- Ventana principal: Tamaño inicial 1280x800 (mínimo 1024x600), resizable, maximizada.
- Políticas de Seguridad de Contenido (CSP): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:*`.
- Hooks de Desinstalador (`licoreria-desktop/windows/hooks.nsh`):
  ```nsis
  !macro NSIS_HOOK_PREUNINSTALL
    nsExec::ExecToLog 'taskkill /IM "yanesu-desktop.exe" /F'
    nsExec::ExecToLog 'taskkill /IM "yanesu_shisutemu.exe" /F'
  !macroend
  ```
  Esto garantiza que antes de que el desinstalador de Windows proceda a borrar archivos, cualquier proceso en ejecución sea terminado, evitando bloqueos de archivos en la base de datos `yanesu.db` o ejecutables en uso.

---

## 5. Runtimes de Infraestructura, Base de Datos y Docker

### 5.1. SQLite (Entorno de Escritorio)

- **Ubicación:** `%LOCALAPPDATA%/YanesuShisutemu/data/yanesu.db` (en Windows), resuelto mediante `get_db_path()`.
- **Modo de Conexión:** `check_same_thread=False` permitiendo que los hilos concurrentes de Uvicorn utilicen la misma instancia de conexión compartida.
- **Integridad Referencial:** Habilitación estricta de claves foráneas mediante el pragma `PRAGMA foreign_keys=ON` en cada nueva conexión establecida.

---

### 5.2. PostgreSQL 16 (Entorno Servidor / VPS / Docker)

- **Imagen Oficial:** `postgres:16-alpine`.
- **Configuración de Idioma:** Parámetros de inicialización `--encoding=UTF8 --lc-collate=C --lc-ctype=C` para garantizar consistencia en la ordenación alfabética y máximo rendimiento en comparaciones de cadenas.
- **Manejo de Conexiones:** Pool configurado con `pool_size=10`, `max_overflow=20`, `pool_timeout=30.0`, `pool_pre_ping=True` (comprobación preventiva de desconexión) y `pool_recycle=1800` (reciclaje de conexiones cada 30 minutos).
- **Huso Horario Forzado:** Parámetro de conexión `connect_args={"options": "-c timezone=America/Caracas"}` para que cualquier operación de fecha/hora se evalúe de manera nativa en la zona horaria del negocio.
- **Script de Migración de Datos (`migrate_sqlite_to_postgres.py`):**
  - Mapea tablas y datos desde SQLite existente hacia PostgreSQL.
  - Reajusta las secuencias autoincrementales al valor máximo insertado mediante `SELECT setval(pg_get_serial_sequence(table, 'id'), COALESCE(MAX(id), 1))`.

---

### 5.3. Gestión del Runtime de Node.js (`fnm`)

- **Versión Oficial:** Node.js **v24.18.0** fijada en el archivo raíz `.node-version`.
- **Gestor:** `fnm` (Fast Node Manager).
- **Inyección en Scripts de Automatización:** En shells no interactivos de Windows, el script `backend/build.bat` detecta automáticamente la ruta `%APPDATA%\fnm\node-versions\!NODE_VERSION!\installation` y la antepone a la variable `PATH`, garantizando la disponibilidad de `node`, `pnpm` y `tsc` durante la compilación del frontend.

---

### 5.4. Orquestación con Docker Compose (`docker-compose.yml`)

El entorno contenerizado orquesta cuatro servicios interconectados a través de una red bridge privada (`yanesu_net`):

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    ports: ["127.0.0.1:5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  backend:
    image: ghcr.io/jesus-1205/sistema_inventario_local-backend:master
    depends_on:
      db: { condition: service_healthy }
    volumes: [yanesu_data:/data]

  nginx:
    image: ghcr.io/jesus-1205/sistema_inventario_local-frontend:master
    ports: ["80:80"]
    depends_on:
      backend: { condition: service_healthy }

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    ports: ["${N8N_BIND_PORT:-127.0.0.1:5678}:5678"]
    environment:
      - GENERIC_TIMEZONE=America/Caracas
      - TZ=America/Caracas
    volumes: [n8n_data:/home/node/.n8n]
```

- **Healthchecks Automáticos:** El backend espera a que PostgreSQL reporte salud operativa antes de iniciar; a su vez, Nginx espera a que el endpoint `/api/health` del backend responda exitosamente antes de abrir el puerto 80.
- **Automatizaciones n8n:** La instancia de n8n ejecuta flujos programados (cron) para scraping y reenvío de la tasa BCV hacia `/api/webhooks/bcv-sync` y generación de reportes automáticos para canales de Telegram mediante la API M2M (`/api/n8n/*`).
