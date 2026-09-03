# Backend: Python 3.12 / FastAPI 0.115 / SQLite

## 0. Decimales y Precisión Monetaria (Crítica del Sistema)

Es un sistema de **inventario y dinero**: un descuadre de centavos o de stock es un fallo grave. La regla es **SIEMPRE `Decimal`, NUNCA `float`** para valores monetarios (precios, costos, IVA, totales, tasas) y para cálculos de inventario.

- **PROHIBIDO** usar `float` o `int` para dinero, stock, tasas o porcentajes. Prohibido también operar con valores que vienen de la BD como `float`.
- Construir `Decimal` **siempre desde `str`**, nunca desde `float` (evita errores binarios): `Decimal(str(x))`, `Decimal("0.01")`.
- Operaciones aritméticas siempre con `Decimal`, con redondeo explícito vía `.quantize(Decimal("0.01"))` (o `Decimal("0.1")`/`Decimal("0.0001")` según el caso) y el modo de redondeo adecuado (`ROUND_HALF_UP`, `ROUND_FLOOR`, etc.).
- En la base de datos, los importes son columnas `DECIMAL(precision, scale)` anotadas como `Mapped[Decimal]`. Nunca `Float`.
- En Pydantic v2, los importes se declaran `Decimal` con `max_digits` y `decimal_places`.
- Al convertir a respuesta JSON, serializar como `Decimal` (Pydantic lo maneja); no convertir a `float`.
- Si detectas `float` operando con dinero/stock, corrígelo de inmediato: **no es negociable**.

```python
from decimal import Decimal, ROUND_HALF_UP

# CORRECTO
precio = Decimal(str(item["precio_unitario"]))
subtotal = (Decimal(cantidad) * precio).quantize(Decimal("0.01"))
total = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

# PROHIBIDO
# precio = float(item["precio_unitario"])
# subtotal = round(cantidad * precio, 2)
# total = 0.1 + 0.2  # → 0.30000000000000004
```

## 1. SQLAlchemy 2.0 (Estándar Obligatorio)

Prohibido el uso de sintaxis legacy 1.x (`session.query()` o `Model.query`).

### 1.1. Definición de Modelos

- Usar anotaciones de tipo nativas de Python 3.12 con `Mapped[...]` y `mapped_column()`.
- Todo `ForeignKey` debe incluir `ondelete='RESTRICT'` o `ondelete='CASCADE'`.
- Valores monetarios y de stock: columna `DECIMAL(precision, scale)` anotada como `Mapped[Decimal]`. Prohibido `Float` para importes (ver sección 0).

```python
from decimal import Decimal
from sqlalchemy import String, Integer, DECIMAL, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class Product(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    precio_costo_usd: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    stock_unidades: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    proveedor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("proveedores.id", ondelete="RESTRICT"), nullable=True)

    supplier: Mapped["Supplier | None"] = relationship("Supplier", back_populates="products")
```

### 1.2. Ejecución de Consultas

Usar exclusivamente `select()` con `db.execute().scalars()`.

```python
# CORRECTO
from sqlalchemy import select
from app.core.database import SessionLocal

stmt = select(Product).where(Product.stock_unidades > 0).order_by(Product.nombre)
products = db.execute(stmt).scalars().all()

# PROHIBIDO (Legacy 1.x)
# products = Product.query.filter(Product.stock_unidades > 0).all()
# products = session.query(Product).filter(Product.stock_unidades > 0).all()
```

## 2. Validación con Pydantic v2

- Prohibido usar `.dict()`. Usar exclusivamente `.model_dump()` o `.model_validate()`.
- Usar `ConfigDict` para configuración del esquema.
- Valores monetarios: `Decimal` con `max_digits` y `decimal_places`. Prohibido `float` (ver sección 0).

```python
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

class ProductCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str
    categoria: str
    precio_costo_usd: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock_unidades: int = Field(default=0, ge=0)
    tipo_iva: Literal["GRAVADO", "EXENTO"] = "GRAVADO"

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    precio_costo_usd: Decimal
    stock_unidades: int
```

## 3. Diseño de Rutas (routes/) con FastAPI

### 3.1. Estructura de Router

Cada módulo de rutas crea un `APIRouter` con `prefix` y `tags`.

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role

router = APIRouter(prefix="/products", tags=["products"])
```

### 3.2. Separación de Responsabilidades (Routes vs Services)

Las rutas solo contienen lógica de transporte HTTP: parseo de parámetros, inyección de dependencias, llamadas a servicios y construcción de respuesta.

Toda lógica de negocio, validaciones complejas y manipulación de datos reside en `services/`.

```python
# CORRECTO: Ruta delgada, delega a servicios
@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    try:
        product = create_product(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return {"id": product.id, "nombre": product.nombre, ...}
```

### 3.3. Status Code Explícito

Todo endpoint debe declarar `status_code` en el decorador usando `from fastapi import status`:

```python
@router.post("", status_code=status.HTTP_201_CREATED)
@router.get("", status_code=status.HTTP_200_OK)
@router.get("/{id}", status_code=status.HTTP_200_OK)
@router.put("/{id}", status_code=status.HTTP_200_OK)
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
```

### 3.4. Documentación de Endpoints

Cada función de ruta debe incluir un docstring estructurado en español:

```python
def create():
    """POST /products - Crear nuevo producto

    Recibe: JSON body con nombre, categoría, precio costo, stock inicial
    Hace:   valida esquema, verifica duplicados, persiste en DB
    Devuelve: 201 + producto | 422 validación | 409 duplicado
    """
```

FastAPI utiliza este docstring para generar la documentación OpenAPI.

### 3.5. Orden Jerárquico Interno

Dentro de cada archivo de rutas, las funciones deben organizarse en este orden:

1. `create()` — POST
2. `list_all()` — GET
3. Endpoints adicionales de consulta con paths fijos (ej. `/analytics`, `/top-selling`, `/latest`, `/history`)
4. `get_by_id()` — GET /{id}
5. `update()` — PUT /{id}
6. `delete()` — DELETE /{id}

> **Importante:** Los paths fijos (paso 3) deben declararse SIEMPRE antes que `/{id}` (paso 4). FastAPI matchea rutas en orden de definición: si `GET /{id}` está antes que `GET /analytics`, una petición a `/analytics` será capturada por `/{id}` con `id="analytics"`, causando un error 422 de validación.

## 4. Seguridad y Entorno

- **Contraseñas**: Hashing con `passlib[bcrypt]` (1.7.4). Nunca almacenar texto plano.
- **Autenticación**: JWT con `python-jose` (3.3.0), token en cookie httpOnly `access_token`, tiempo de expiración (`exp`) y firma HS256.
- **Protección de rutas**: `Depends(get_current_user)` para autenticación, `Depends(require_role("ADMIN"))` para control de acceso por rol.
- **Configuración**: Carga de credenciales vía `python-dotenv` (1.0.1). Jamás subir `.env` al repositorio.

## 5. Servidor y Despliegue

Desarrollo:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Producción:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 6. Base de Datos SQLite

La aplicación usa **SQLite** (archivo `yanesu.db` en `%LOCALAPPDATA%/YanesuShisutemu/data/`), no PostgreSQL. La migración desde PostgreSQL está documentada en `docs/MIGRATION_SQLITE.md`.

- Motor configurado en `app/core/database.py` con `connect_args={"check_same_thread": False}`.
- Habilitar foreign keys en cada conexión:

```python
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```

- No usar dialecto PostgreSQL (tipos `SERIAL`, `JSONB`, `ILIKE`, etc.) ni drivers psycopg.
- La ruta de la DB se resuelve con `app.core.config.get_db_path()`.

## 7. Testing Backend (pytest)

Ejecutar tests desde `backend/`:

```bash
pytest -v                       # Todos los tests
pytest --cov=app tests/         # Con cobertura
pytest tests/test_auth.py       # Test específico
```

- Framework: `pytest` + `httpx` (para TestClient de FastAPI).
- Cobertura: `pytest-cov`.
- Integración: SQLite en memoria mediante fixture `db_session` en `conftest.py`.
- Unitarios: no requieren base de datos.
- Nombrar archivos: `test_<modulo>.py` dentro de `tests/`.
- Cada test debe ser independiente.

## 8. Migraciones Alembic (compatibilidad multi-dialecto)

Alembic es el **único** mecanismo de creación de tablas en producción. `create_all()` solo se usa en tests.

Las migraciones deben funcionar en SQLite Y PostgreSQL. Prohibido usar sintaxis específica de un solo dialecto.

### 8.0. Reglas de oro

- **`render_as_batch=True`** en `alembic/env.py`: Obligatorio para compatibilidad SQLite.
- **`naming_convention`** en `Base.metadata`: Todos los constraints deben tener nombres deterministas.
- **Siempre generar migraciones contra PostgreSQL**: La fuente de verdad. `render_as_batch` hace que funcionen en SQLite.
- **Usar `sa.func.now()`** (no `sa.text('now()')`): Multi-dialecto.
- **Prohibido `create_all()` en producción**: Solo en tests.

### 8.1. Defaults de timestamp

Usar `sa.func.now()` (SQLAlchemy lo compila a `CURRENT_TIMESTAMP` en SQLite y `now()` en PostgreSQL).

```python
# CORRECTO
sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)

# PROHIBIDO
# sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("datetime('now')"))  # Solo SQLite
# sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("now()"))  # Solo PostgreSQL
```

### 8.2. Defaults de boolean

Usar `sa.text('true')` o `sa.text('false')` (válido en ambos dialectos).

```python
# CORRECTO
sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('true'))

# PROHIBIDO
# sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.text('1'))  # Solo SQLite
```

### 8.3. Otros dialectos prohibidos en migraciones

- `ILIKE` → usar `ilike()` de SQLAlchemy (lo compila según el dialecto)
- `JSONB` → usar `JSON` de SQLAlchemy
- `SERIAL` → usar `Integer` con `autoincrement=True`
- `psycopg` → no importar drivers directamente en migraciones
