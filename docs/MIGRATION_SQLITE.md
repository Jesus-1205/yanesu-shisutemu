# Migración PostgreSQL → SQLite

**Fecha:** Julio 2026
**Rama:** `feature/sqlite-migration`
**Objetivo:** Adaptar el backend de un despliegue VPS+Docker+PostgreSQL a un ejecutable local con SQLite + PyInstaller + Tauri.

---

## 1. Contexto

El proyecto fue diseñado originalmente como un sistema web desplegado en VPS con Docker Compose, PostgreSQL como base de datos y la extensión `pg_trgm` para fuzzy matching de facturas. El nuevo alcance (V1) es un ejecutable de escritorio local, lo que exige:

- **Eliminar dependencias de servidor:** Docker, PostgreSQL, pgAdmin.
- **Base de datos embebida:** SQLite no requiere proceso separado.
- **Sin migraciones externas:** Alembic se elimina; `create_all()` gestiona el esquema.
- **Fuzzy matching sin pg_trgm:** La extensión `pg_trgm` es exclusiva de PostgreSQL y no existe en SQLite.

---

## 2. Archivos eliminados

### 2.1 Infraestructura Docker
| Archivo | Razón |
|---------|-------|
| `docker-compose.yml` | Orquestación de servicios PostgreSQL + pgAdmin + app. No aplica en ejecutable local. |
| `backend/Dockerfile` | Construcción de imagen Docker. El ejecutable se genera con PyInstaller. |
| `backend/.dockerignore` | Configuración de exclusión para Docker build. |

### 2.2 Migraciones y esquema SQL
| Archivo | Razón |
|---------|-------|
| `backend/alembic/` (14 archivos) | Sistema de migraciones PostgreSQL. SQLite usa `create_all()` para crear tablas desde los modelos SQLAlchemy. |
| `backend/alembic.ini` | Configuración de Alembic. |
| `backend/sql/schema.sql` | Esquema SQL manual PostgreSQL. Los modelos SQLAlchemy son la fuente de verdad. |
| `backend/sql/migrations/` | Migraciones SQL manuales. |

### 2.3 Seeds y datos de prueba
| Archivo | Razón |
|---------|-------|
| `backend/seed.py` | Script de inicialización de roles/usuarios por defecto. Se ejecutaba en el Dockerfile CMD. |
| `backend/seed_sales.py` | Generador de datos de prueba masivos (482 líneas). Solo para desarrollo. |

### 2.4 Documentación obsoleta
| Archivo | Razón |
|---------|-------|
| `docs/requirements.md` | Especificación original del sistema (228 líneas). Describe arquitectura cliente-servidor que ya no aplica. |
| `docs/frontend-roadmap.md` | Roadmap de frontend. Contenido obsolete para el nuevo enfoque. |
| `docs/implementacion_analitycs.md` | Documentación de analytics. Se conserva el concepto pero la implementación cambia. |
| `docs/RESPONSIVE_PLAN.md` | Plan de diseño responsive. Se mantiene en el frontend pero la doc no es relevante para la migración. |
| `docs/Evaluacion_escaner_ai.md` | Evaluación de escáner AI. La funcionalidad se conserva, pero el contexto de despliegue cambió. |

> **Nota:** La carpeta `docs/` se mantiene vacía para documentar futuros cambios de la migración.

---

## 3. Archivos modificados

### 3.1 `backend/app/core/config.py`

**Cambio:** Eliminación de configuración PostgreSQL, adopción de SQLite.

```python
# ANTES: Configuración PostgreSQL con 6 variables de entorno
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_DB = os.getenv("POSTGRES_DB", "licoreria")
SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg2://{USER}:{PASS}@{HOST}:{PORT}/{DB}"

# DESPUÉS: Configuración SQLite con 1 variable de entorno
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "licoreria.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
```

**Razón:** SQLite es un archivo embebido que no requiere credenciales, host ni puerto. `BASE_DIR` calcula la ruta raíz del proyecto para ubicar la base de datos de forma predecible.

### 3.2 `backend/app/core/database.py`

**Cambio:** Eliminación de pool de conexiones PostgreSQL, adición de PRAGMA SQLite.

```python
# ANTES: Pool de conexiones PostgreSQL
engine = create_engine(
    Config.SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,    # Verifica conexiones muertas
    pool_recycle=3600,     # Recicla conexiones cada hora
)

# DESPUÉS: SQLite con check_same_thread y foreign keys
engine = create_engine(
    Config.SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```

**Razón:**
- `pool_pre_ping` y `pool_recycle` son mecanismos de reconexión para servidores de BD remotos. SQLite es un archivo local, no aplica.
- `check_same_thread=False` permite que FastAPI (async) acceda a SQLite desde múltiples hilos.
- `PRAGMA foreign_keys=ON` habilita restricciones de llave foránea (SQLite las desactiva por defecto).

### 3.3 `backend/app/models/invoice.py`

**Cambio:** `JSONB` → `JSON` de SQLAlchemy estándar.

```python
# ANTES
from sqlalchemy.dialects.postgresql import JSONB
raw_json_ia: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

# DESPUÉS
from sqlalchemy import JSON
raw_json_ia: Mapped[dict | None] = mapped_column(JSON, nullable=True)
```

**Razón:** `JSONB` es un tipo binario optimizado de PostgreSQL para almacenar y consultar JSON. El campo `raw_json_ia` solo se almacena y recupera como dict completo (sin consultas por path), por lo que `JSON` estándar es suficiente. SQLite almacena JSON como TEXT; SQLAlchemy maneja la serialización automáticamente.

### 3.4 `backend/app/services/invoice_service.py`

**Cambio:** Reemplazo completo del fuzzy matching de `pg_trgm` por `rapidfuzz`.

| Función | Antes (PostgreSQL) | Después (rapidfuzz) |
|---------|--------------------|--------------------|
| `_similarity_threshold()` | Retorna `0.3` (escala 0-1) | Retorna `30.0` (escala 0-100) |
| `fuzzy_match_proveedor()` | `func.similarity()` + `ORDER BY sim DESC` | `process.extract()` + `fuzz.token_set_ratio` |
| `fuzzy_match_productos_batch()` | CTE + `unnest(ARRAY[])` + operador `%` + `similarity()` | Carga de catálogo completo + `process.extract()` |

**SQL eliminado (PostgreSQL):**
```sql
-- CTE con unnest y operador % de pg_trgm
WITH nombres_ia AS (
    SELECT unnest(ARRAY[:n0, :n1, ...]) AS nombre_busqueda
)
SELECT p.*, similarity(p.nombre, n.nombre_busqueda) AS sim
FROM productos p
JOIN nombres_ia n ON p.nombre % n.nombre_busqueda
WHERE similarity(p.nombre, n.nombre_busqueda) > :umbral
```

**Reemplazo (Python + rapidfuzz):**
```python
# Una sola query: cargar catálogo completo
stmt = select(Product)
all_products = db.execute(stmt).scalars().all()
catalogo = {p.nombre: p for p in all_products}

# Para cada ítem de IA: fuzzy matching en memoria
matches = process.extract(
    nombre_limpio,
    catalogo.keys(),
    scorer=fuzz.token_set_ratio,
    limit=3,
)
```

**Razón:**
- `pg_trgm` es una extensión exclusiva de PostgreSQL que no existe en SQLite.
- `rapidfuzz` implementa `token_set_ratio` en C++, lo que lo suficientemente rápido para catálogos de licorería (~50-200 productos).
- `token_set_ratio` ignora el orden de las palabras ("Cerveza Polar" = "Polar Cerveza") y es tolerante a errores de OCR.
- Sin pre-filtros SQL con LIKE: si el OCR lee "Polr Pilsn", un LIKE fallaría y descartaría el producto antes del fuzzy matching.

### 3.5 `backend/requirements.txt`

**Cambio:** Eliminación de dependencias PostgreSQL, adición de rapidfuzz.

```
# Eliminados
psycopg2-binary==2.9.10   # Driver PostgreSQL
alembic==1.14.1            # Sistema de migraciones

# Agregados
rapidfuzz>=3.10.0          # Fuzzy matching en C++
```

### 3.6 `backend/.env.example`

**Cambio:** Variables PostgreSQL → variable SQLite.

```bash
# ANTES
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=licoreria

# DESPUÉS
DATABASE_PATH=./licoreria.db
```

### 3.7 `backend/tests/conftest.py`

**Cambio:** Eliminación del hack de compatibilidad JSONB→SQLite.

```python
# ANTES
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(element, compiler, **kw):
    return "JSON"

# DESPUÉS
# (imports simplificados, sin hack)
```

**Razón:** El hack compilaba `JSONB` a `JSON` solo para SQLite. Ahora que el modelo usa `JSON` directamente, el hack es innecesario.

---

## 4. Archivos nuevos

### 4.1 `backend/tests/test_services/test_invoice_fuzzy.py`

21 tests para las nuevas funciones de fuzzy matching:

| Clase | Tests | Cobertura |
|-------|-------|-----------|
| `TestSimilarityThreshold` | 1 | Verifica umbral = 30.0 |
| `TestStripUnidades` | 5 | Eliminación de patrones de unidades |
| `TestFuzzyMatchProveedor` | 6 | EXACT, PARTIAL, NOT_FOUND, case-insensitive, empty DB |
| `TestFuzzyMatchProductosBatch` | 9 | EXACT, PARTIAL, OCR errors, NOT_FOUND, empty input, suggestions |

---

## 5. Funcionalidad preservada (sin cambios)

| Componente | Estado | Razón |
|------------|--------|-------|
| `timezone.py` (VE_NOW) | ✅ Ya tenía compilador SQLite | `datetime('now', '-4 hours')` funciona en SQLite |
| `Computed` columns en `sale.py` | ✅ Funciona en SQLite 3.31+ | `ROUND()` y generated columns soportados |
| `.ilike()` en queries | ✅ SQLAlchemy traduce | `LOWER(col) LIKE LOWER(val)` en SQLite |
| `SAEnum` en modelos | ✅ SQLAlchemy genera CHECK | `CHECK (col IN ('VAL1', 'VAL2'))` |
| `DECIMAL` columns | ✅ SQLite NUMERIC type | Almacenamiento correcto de precisión |
| Frontend | ✅ API_BASE sin prefijo `/api` | El prefijo era manejado por nginx en Docker; se eliminó para ejecutable local |
| `main.py` startup | ✅ `create_all()` | Crea tablas en SQLite automáticamente |

---

## 6. Verificación

```
pytest tests/ -v
================= 432 passed, 1 failed, 1331 warnings in 125.77s =================
```

- **432 tests pasan** (incluidos 21 nuevos de fuzzy matching)
- **1 fallo pre-existente** en `test_invoice_ai.py::TestOptimizeImage` (bug de Pillow, no relacionado con la migración)

---

## 7. Empaquetado de escritorio (PyInstaller + Tauri)

### 7.1 Arquitectura

```
Sistema Licoreria_1.0.0_x64-setup.exe (NSIS, ~56 MB)
├── licoreria-desktop.exe          ← Tauri (ventana webview, ~11 MB)
├── sistema_licoreria.exe          ← PyInstaller onefile (~54 MB)
│   ├── FastAPI + uvicorn
│   ├── SQLite (AppData/Local/SistemaLicoreria/licoreria.db)
│   ├── Frontend React compilado (embebido en el .exe)
│   └── uploads/ (imágenes de facturas)
└── uninstall.exe
```

### 7.2 Flujo de ejecución

1. Tauri inicia → lanza `sistema_licoreria.exe` como sidecar
2. Sidecar ejecuta `run.py`:
   - Crea tablas con `create_all()` si no existen
   - Busca puerto libre (8000-8010)
   - Monta `frontend/dist/` como archivos estáticos
   - Inicia FastAPI en `127.0.0.1:{port}`
   - Guarda puerto en `AppData/Local/SistemaLicoreria/.port`
3. Tauri lee el archivo `.port` y navega el webview al backend
4. El usuario interactúa con la app web embebida

### 7.3 Almacenamiento de datos

| Ubicación | Contenido |
|-----------|-----------|
| `AppData/Local/SistemaLicoreria/licoreria.db` | Base de datos SQLite |
| `AppData/Local/SistemaLicoreria/uploads/` | Imágenes de facturas subidas |
| `AppData/Local/SistemaLicoreria/.port` | Puerto del servidor (para que Tauri lo lea) |

### 7.4 Primer inicio (Setup)

1. Backend retorna `needs_setup: true` si no hay usuario admin
2. Frontend redirige a `/setup` (SetupPage)
3. Usuario crea admin con nombre, email, contraseña
4. Se guardan roles y usuario admin en SQLite

### 7.5 Build completo

```bat
:: 1. Frontend
cd frontend
pnpm install
pnpm build

:: 2. Backend (PyInstaller onefile)
cd ..\backend
pyinstaller build.spec --clean --noconfirm
copy /Y dist\sistema_licoreria.exe dist\sistema_licoreria-x86_64-pc-windows-msvc.exe

:: 3. Instalador NSIS
cd ..\licoreria-desktop\src-tauri
cargo tauri build

:: Resultado:
:: licoreria-desktop\src-tauri\target\release\bundle\nsis\Sistema Licoreria_1.0.0_x64-setup.exe
```

O ejecutar `backend\build.bat` que hace los pasos 1 y 2.

### 7.6 Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `backend/run.py` | Entry point PyInstaller: init DB, find port, mount frontend, start uvicorn |
| `backend/build.spec` | Spec de PyInstaller para empaquetar backend + frontend |
| `backend/build.bat` | Script de build completo |
| `backend/app/core/first_run.py` | Inicialización pasiva de DB + roles + needs_setup check |
| `backend/app/core/port_manager.py` | Búsqueda de puerto libre + archivo `.port` |
| `frontend/src/features/auth/pages/SetupPage.tsx` | Pantalla de primer inicio |

---

## 8. Pendiente (Fase futura)

| Tarea | Prioridad | Notas |
|-------|-----------|-------|
| Generar iconos reales | Media | Reemplazar placeholders PNG con icono del negocio |
| Ajuste de umbral | Media | Evaluar con datos reales si 30.0 es el umbral óptimo |
| Migraciones SQLite | Baja | Si el esquema cambia, considerar Alembic para SQLite |

> Para documentación completa de errores durante el empaquetado, ver `docs/DESKTOP_BUILD_LOG.md`.
