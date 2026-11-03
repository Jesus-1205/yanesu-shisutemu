# Corrección de Migración PostgreSQL en Alembic y Persistencia de Totales de Venta

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver el fallo de arranque en Docker Compose (migración de Alembic en PostgreSQL) y corregir la omisión de persistencia de `total_usd`, `total_ves` y `subtotal_usd` en ventas, auto-reparando los registros existentes con totales en `$0,00`.

**Architecture:** 
1. Limpiar la migración `0b042186523d` eliminando el bloque redundante que intenta borrar restricciones de nombres legacy inexistentes en PostgreSQL.
2. Eliminar la directiva `Computed(...)` en los modelos SQLAlchemy de `Sale` y `SaleItem`, convirtiéndolos en columnas `DECIMAL` estándar que reciben los valores calculados en memoria por `sale_service.py`.
3. Incorporar una rutina de auto-reparación (`heal_sales_totals`) en `first_run.py` para recalcular y actualizar en la base de datos local SQLite y en PostgreSQL cualquier venta histórica que haya quedado en `$0,00`.

**Tech Stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL 16 (Docker), SQLite (Desktop), pytest.

**Spec:** Contexto y directrices de `.opencode/rules/backend_rules.md`, `.opencode/rules/architecture.md` y skill `alembic-workflow`.

## Global Constraints
- Estricto uso de `Decimal` con `.quantize(Decimal("0.01"))` para importes y totales; prohibido el uso de `float` (Regla 0 de `backend_rules.md`).
- Compatibilidad multi-dialecto: cualquier cambio DDL o migración debe funcionar tanto en SQLite como en PostgreSQL 16.
- Mantener intactas las interfaces de entrada y salida de las rutas FastAPI y las pantallas de React (sin alteraciones de contratos de API).

---

### Task 1: Corregir migración Alembic `0b042186523d` para PostgreSQL

**Files:**
- Modify: `backend/alembic/versions/0b042186523d_add_retornable_inventory_tables.py:84-124`

**Interfaces:**
- Consumes: Migración `a1b2c3d4e5f6` (que ya define `uq_categorias_nombre`, `uq_metodos_pago_nombre`, `uq_productos_codigo_barra`, `uq_roles_nombre`).
- Produces: Cadena de migraciones continua sin fallos DDL en PostgreSQL.

- [ ] **Step 1: Inspeccionar y eliminar bloque de renombrado de constraints en `0b042186523d`**

En `backend/alembic/versions/0b042186523d_add_retornable_inventory_tables.py`, eliminar el bloque condicional en `upgrade()`:
```python
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.batch_alter_table('categorias', schema=None) as batch_op:
            batch_op.drop_constraint('categorias_nombre_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_categorias_nombre'), ['nombre'])

        with op.batch_alter_table('metodos_pago', schema=None) as batch_op:
            batch_op.drop_constraint('metodos_pago_nombre_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_metodos_pago_nombre'), ['nombre'])

        with op.batch_alter_table('productos', schema=None) as batch_op:
            batch_op.drop_constraint('productos_codigo_barra_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_productos_codigo_barra'), ['codigo_barra'])

        with op.batch_alter_table('roles', schema=None) as batch_op:
            batch_op.drop_constraint('roles_nombre_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_roles_nombre'), ['nombre'])
```
Y eliminar su bloque inverso en `downgrade()`:
```python
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.batch_alter_table('roles', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_roles_nombre'), type_='unique')
            batch_op.create_unique_constraint('roles_nombre_key', ['nombre'])

        with op.batch_alter_table('productos', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_productos_codigo_barra'), type_='unique')
            batch_op.create_unique_constraint('productos_codigo_barra_key', ['codigo_barra'])

        with op.batch_alter_table('metodos_pago', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_metodos_pago_nombre'), type_='unique')
            batch_op.create_unique_constraint('metodos_pago_nombre_key', ['nombre'])

        with op.batch_alter_table('categorias', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_categorias_nombre'), type_='unique')
            batch_op.create_unique_constraint('categorias_nombre_key', ['nombre'])
```

- [ ] **Step 2: Verificar la migración completa contra PostgreSQL en contenedor Docker**

Ejecutar:
```powershell
$env:DATABASE_URL="postgresql+psycopg://yanesu_user:Yanesudeine26.@127.0.0.1:5432/yanesudb"
cd backend
python -m alembic upgrade head
```
Verificar que la salida sea:
`Running upgrade a1b2c3d4e5f6 -> 0b042186523d...`
`Running upgrade 0b042186523d -> 801064583bca...`
con código de salida `0` y sin excepciones.

- [ ] **Step 3: Verificar compatibilidad en SQLite (Desktop)**

Ejecutar la suite de tests de migraciones SQLite:
```powershell
python -m pytest backend/tests/test_migrations_sqlite.py -v
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/0b042186523d_add_retornable_inventory_tables.py
git commit -m "fix(alembic): remover eliminacion de restricciones inexistentes en postgresql"
```

---

### Task 2: Eliminar `Computed` de los Modelos `Sale` y `SaleItem`

**Files:**
- Modify: `backend/app/models/sale.py:1-125`

**Interfaces:**
- Consumes: `DECIMAL`, `Mapped`, `mapped_column` de SQLAlchemy.
- Produces: Modelos `Sale` y `SaleItem` con columnas regulares `DECIMAL` que aceptan valores explícitos en `INSERT`.

- [ ] **Step 1: Escribir test fallido que verifique la persistencia de `total_usd` y `subtotal_usd`**

Crear archivo `backend/tests/test_services/test_sale_persistence.py`:
```python
from decimal import Decimal
import pytest
from sqlalchemy import select
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.payment_method import PaymentMethod
from app.schemas.sale import SaleCreate, SaleItemCreate, SalePaymentCreate
from app.services.sale_service import create_sale

def test_create_sale_persists_non_zero_totals(db_session, test_user, test_product, test_payment_method):
    tasa = Decimal("50.0000")
    precio_unitario = Decimal("10.00")
    cantidad = 2
    
    # 2 unidades a $10.00 = $20.00 exento (o gravado)
    subtotal_esperado = Decimal("20.00")
    
    data = SaleCreate(
        tasa_bcv_aplicada=tasa,
        monto_exento_usd=subtotal_esperado,
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
        items=[
            SaleItemCreate(
                producto_id=test_product.id,
                tipo_empaque="UNIDAD",
                cantidad=cantidad,
                precio_unitario_usd=precio_unitario,
                iva_porcentaje=Decimal("0.00"),
            )
        ],
        pagos=[
            SalePaymentCreate(
                metodo_pago_id=test_payment_method.id,
                monto_usd=subtotal_esperado,
                monto_ves=Decimal("0.00"),
            )
        ]
    )
    
    sale = create_sale(db_session, data, usuario_id=test_user.id)
    
    # Refrescar desde base de datos
    db_session.expire_all()
    saved_sale = db_session.execute(select(Sale).where(Sale.id == sale.id)).scalar_one()
    saved_item = saved_sale.items[0]
    
    assert saved_item.subtotal_usd == Decimal("20.00")
    assert saved_sale.total_usd == Decimal("20.00")
    assert saved_sale.total_ves == (Decimal("20.00") * tasa).quantize(Decimal("0.01"))
    assert saved_sale.monto_exento_ves == (Decimal("20.00") * tasa).quantize(Decimal("0.01"))
```

- [ ] **Step 2: Ejecutar test para verificar fallo o comportamiento actual**

Run: `pytest backend/tests/test_services/test_sale_persistence.py -v`

- [ ] **Step 3: Actualizar `backend/app/models/sale.py`**

Modificar `Sale` y `SaleItem` en `backend/app/models/sale.py`:
1. Remover `Computed` de los imports de `sqlalchemy`.
2. En `Sale`:
```python
    monto_exento_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
    base_imponible_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
    monto_iva_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
    total_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))

    monto_exento_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))
    base_imponible_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))
    monto_iva_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))
    total_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))
```
3. En `SaleItem`:
```python
    precio_unitario_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    subtotal_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
```
4. Agregar hook defensivo `@event.listens_for` (o fallback en `__init__`) para que si `subtotal_usd` o `total_usd` vienen en `0` o `None`, se autocalculen en memoria antes del flush:
```python
from sqlalchemy import event

@event.listens_for(SaleItem, "before_insert")
def _calculate_sale_item_subtotal(mapper, connection, target):
    if not target.subtotal_usd or target.subtotal_usd == Decimal("0.00"):
        if target.cantidad and target.precio_unitario_usd:
            target.subtotal_usd = (Decimal(str(target.cantidad)) * Decimal(str(target.precio_unitario_usd))).quantize(Decimal("0.01"))

@event.listens_for(Sale, "before_insert")
def _calculate_sale_totals(mapper, connection, target):
    exento = target.monto_exento_usd or Decimal("0.00")
    base = target.base_imponible_usd or Decimal("0.00")
    iva = target.monto_iva_usd or Decimal("0.00")
    tasa = target.tasa_bcv_aplicada or Decimal("1.0000")
    
    if not target.total_usd or target.total_usd == Decimal("0.00"):
        target.total_usd = (exento + base + iva).quantize(Decimal("0.01"))
    if not target.monto_exento_ves or target.monto_exento_ves == Decimal("0.00"):
        target.monto_exento_ves = (exento * tasa).quantize(Decimal("0.01"))
    if not target.base_imponible_ves or target.base_imponible_ves == Decimal("0.00"):
        target.base_imponible_ves = (base * tasa).quantize(Decimal("0.01"))
    if not target.monto_iva_ves or target.monto_iva_ves == Decimal("0.00"):
        target.monto_iva_ves = (iva * tasa).quantize(Decimal("0.01"))
    if not target.total_ves or target.total_ves == Decimal("0.00"):
        target.total_ves = (target.total_usd * tasa).quantize(Decimal("0.01"))
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/sale.py
git commit -m "fix(sales): descomputar columnas de total y permitir persistencia explicita"
```

---

### Task 3: Actualizar Servicios y Semillas (`sale_service.py` y `seed_demo_data.py`)

**Files:**
- Modify: `backend/app/services/sale_service.py:170-184, 305-330`
- Modify: `backend/scripts/seed_demo_data.py:733-760`
- Test: `backend/tests/test_services/test_sale_service.py`

**Interfaces:**
- Consumes: Modelos `Sale`, `SaleItem` sin `Computed`.
- Produces: Asignación explícita de `subtotal_usd`, `total_usd`, `total_ves` y componentes VES en el flujo de creación.

- [ ] **Step 1: Enviar valores explícitos en `sale_service.py`**

1. En la construcción de cada `SaleItem` (línea ~173 de `sale_service.py`):
```python
        subtotal_item = (Decimal(str(item_data.cantidad)) * item_data.precio_unitario_usd).quantize(Decimal("0.01"))
        items.append(SaleItem(
            producto_id=item_data.producto_id,
            tipo_empaque=item_data.tipo_empaque,
            cantidad=item_data.cantidad,
            unidades_descontadas=unidades,
            precio_unitario_usd=item_data.precio_unitario_usd,
            subtotal_usd=subtotal_item,
            iva_porcentaje=iva_rate,
            usa_precio_divisas=item_data.usa_precio_divisas,
            combo_id=item_data.combo_id,
        ))
```
2. En la construcción de `Sale` (línea ~319 de `sale_service.py`):
```python
    total_usd = (exento + base + iva).quantize(Decimal("0.01"))
    total_ves = (total_usd * data.tasa_bcv_aplicada).quantize(Decimal("0.01"))
    monto_exento_ves = (exento * data.tasa_bcv_aplicada).quantize(Decimal("0.01"))
    base_imponible_ves = (base * data.tasa_bcv_aplicada).quantize(Decimal("0.01"))
    monto_iva_ves = (iva * data.tasa_bcv_aplicada).quantize(Decimal("0.01"))

    sale = Sale(
        usuario_id=usuario_id,
        tasa_bcv_aplicada=data.tasa_bcv_aplicada,
        historico_tasa_id=data.historico_tasa_id,
        observaciones=data.observaciones,
        monto_exento_usd=exento,
        base_imponible_usd=base,
        monto_iva_usd=iva,
        total_usd=total_usd,
        total_ves=total_ves,
        monto_exento_ves=monto_exento_ves,
        base_imponible_ves=base_imponible_ves,
        monto_iva_ves=monto_iva_ves,
        items=items,
        payments=pagos,
    )
```

- [ ] **Step 2: Actualizar `backend/scripts/seed_demo_data.py`**

1. En `SaleItem` de `seed_sales`:
```python
                subtotal_item = (Decimal(str(cantidad)) * precio_unitario_usd).quantize(Decimal("0.01"))
                sale_item = SaleItem(
                    producto_id=prod.id,
                    tipo_empaque=tipo_empaque,
                    cantidad=cantidad,
                    unidades_descontadas=unidades_descontadas,
                    precio_unitario_usd=precio_unitario_usd,
                    subtotal_usd=subtotal_item,
                    iva_porcentaje=iva_porcentaje,
                    usa_precio_divisas=False,
                )
```
2. En `Sale` de `seed_sales`:
```python
            total_ves = (total_usd * tasa_bcv).quantize(Decimal("0.01"))
            sale = Sale(
                fecha_venta=fecha_venta,
                usuario_id=user_id,
                tasa_bcv_aplicada=tasa_bcv,
                historico_tasa_id=historico_tasa_id,
                observaciones=f"Venta demo #{sale_idx + 1:04d}",
                monto_exento_usd=monto_exento_usd,
                base_imponible_usd=base_imponible_usd,
                monto_iva_usd=monto_iva_usd,
                total_usd=total_usd,
                total_ves=total_ves,
                monto_exento_ves=(monto_exento_usd * tasa_bcv).quantize(Decimal("0.01")),
                base_imponible_ves=(base_imponible_usd * tasa_bcv).quantize(Decimal("0.01")),
                monto_iva_ves=(monto_iva_usd * tasa_bcv).quantize(Decimal("0.01")),
            )
```

- [ ] **Step 3: Ejecutar suite de pruebas de ventas**

Run: `pytest backend/tests/test_services/test_sale_service.py backend/tests/test_services/test_sale_persistence.py backend/tests/test_sales.py backend/tests/test_seed_sales.py -v`
Expected: PASS en todas las pruebas.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/sale_service.py backend/scripts/seed_demo_data.py backend/tests/test_services/test_sale_persistence.py
git commit -m "fix(sales): asignar explicitamente subtotales y totales al crear ventas"
```

---

### Task 4: Auto-reparación de Ventas Históricas en `first_run.py`

**Files:**
- Modify: `backend/app/core/first_run.py`
- Test: `backend/tests/test_heal_sales.py`

**Interfaces:**
- Consumes: Sesión activa de SQLAlchemy (`SessionLocal`).
- Produces: `heal_sales_totals(db: Session)` ejecutado en el arranque que recalcula y corrige filas con `total_usd = 0` o `subtotal_usd = 0`.

- [ ] **Step 1: Escribir test para la función de reparación**

Crear `backend/tests/test_heal_sales.py`:
```python
from decimal import Decimal
from sqlalchemy import text, select
from app.models.sale import Sale, SaleItem
from app.core.first_run import heal_sales_totals

def test_heal_sales_totals_repairs_zero_records(db_session, test_user, test_product):
    # Insertar registros raw con subtotal y total en 0
    tasa = Decimal("100.0000")
    db_session.execute(
        text("""
        INSERT INTO ventas (id, usuario_id, tasa_bcv_aplicada, monto_exento_usd, base_imponible_usd, monto_iva_usd, total_usd, total_ves, monto_exento_ves, base_imponible_ves, monto_iva_ves)
        VALUES (999, :uid, :tasa, 5.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
        """),
        {"uid": test_user.id, "tasa": tasa}
    )
    db_session.execute(
        text("""
        INSERT INTO detalle_ventas (id, venta_id, producto_id, tipo_empaque, cantidad, unidades_descontadas, precio_unitario_usd, subtotal_usd, iva_porcentaje, usa_precio_divisas)
        VALUES (999, 999, :pid, 'UNIDAD', 5, 5, 1.00, 0.00, 0.00, 0)
        """),
        {"pid": test_product.id}
    )
    db_session.commit()
    
    # Ejecutar reparador
    heal_sales_totals(db_session)
    
    sale = db_session.execute(select(Sale).where(Sale.id == 999)).scalar_one()
    item = db_session.execute(select(SaleItem).where(SaleItem.id == 999)).scalar_one()
    
    assert item.subtotal_usd == Decimal("5.00")
    assert sale.total_usd == Decimal("5.00")
    assert sale.total_ves == Decimal("500.00")
    assert sale.monto_exento_ves == Decimal("500.00")
```

- [ ] **Step 2: Implementar `heal_sales_totals` en `backend/app/core/first_run.py`**

Agregar función:
```python
def heal_sales_totals(db: Session) -> None:
    """Repara ventas históricas que tengan total_usd o subtotal_usd en 0 por falta de persistencia."""
    try:
        # 1. Reparar subtotales en detalle_ventas
        db.execute(text("""
            UPDATE detalle_ventas
            SET subtotal_usd = ROUND(cantidad * precio_unitario_usd, 2)
            WHERE (subtotal_usd = 0 OR subtotal_usd IS NULL)
              AND cantidad > 0
              AND precio_unitario_usd > 0
        """))
        
        # 2. Reparar ventas con total_usd en 0
        db.execute(text("""
            UPDATE ventas
            SET 
                total_usd = ROUND(monto_exento_usd + base_imponible_usd + monto_iva_usd, 2),
                monto_exento_ves = ROUND(monto_exento_usd * tasa_bcv_aplicada, 2),
                base_imponible_ves = ROUND(base_imponible_usd * tasa_bcv_aplicada, 2),
                monto_iva_ves = ROUND(monto_iva_usd * tasa_bcv_aplicada, 2),
                total_ves = ROUND((monto_exento_usd + base_imponible_usd + monto_iva_usd) * tasa_bcv_aplicada, 2)
            WHERE (total_usd = 0 OR total_usd IS NULL)
              AND (monto_exento_usd > 0 OR base_imponible_usd > 0 OR monto_iva_usd > 0)
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"No se pudo ejecutar heal_sales_totals (ignorado): {e}")
```
Y llamar a `heal_sales_totals(db)` dentro de `initialize_database(db)`.

- [ ] **Step 3: Ejecutar test y verificar que pase**

Run: `pytest backend/tests/test_heal_sales.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/first_run.py backend/tests/test_heal_sales.py
git commit -m "feat(sales): incorporar auto-reparacion de ventas historicas en first_run"
```

---

### Task 5: Verificación Integral en Docker Compose y en la Base Local

**Files:**
- Execute verification: Docker Compose stack y SQLite local.

- [ ] **Step 1: Ejecutar la reparación directamente en la base SQLite local (`yanesu.db`)**

Ejecutar en PowerShell:
```powershell
python -c "from app.core.database import SessionLocal; from app.core.first_run import heal_sales_totals; db = SessionLocal(); heal_sales_totals(db); db.close()"
```
Verificar el registro de la Venta #1 en SQLite:
```powershell
python -c "import sqlite3, os; p = os.path.expandvars('%LOCALAPPDATA%\\YanesuShisutemu\\data\\yanesu.db'); conn = sqlite3.connect(p); print('Venta 1:', conn.execute('SELECT id, total_usd, total_ves, monto_exento_usd FROM ventas WHERE id=1').fetchone()); print('Item 1:', conn.execute('SELECT id, precio_unitario_usd, cantidad, subtotal_usd FROM detalle_ventas WHERE venta_id=1').fetchone())"
```
Expected: `Venta 1: (1, 3.0, 2673.32, 3.0)` e `Item 1: (1, 1.0, 3, 3.0)`.

- [ ] **Step 2: Probar contenedor backend en Docker Compose**

Reconstruir e iniciar contenedor backend en Docker Compose con los cambios aplicados:
```powershell
docker compose build backend
docker compose up -d backend
```
Verificar estado y logs del backend:
```powershell
docker compose logs backend --tail 30
docker compose ps
```
Expected: `yanesu-shisutemu-backend-1` en estado `Up (healthy)`, sin errores de Alembic ni de PostgreSQL.

- [ ] **Step 3: Ejecutar la suite completa de tests de backend**

```powershell
python -m pytest backend/tests/ -v
```
Expected: Todos los tests pasando (0 fallos).
