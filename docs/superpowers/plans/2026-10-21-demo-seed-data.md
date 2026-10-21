# Demo Seed Data Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone, repeatable seed script (`backend/scripts/seed_demo_data.py`) to populate the database with realistic demo data (~40 products, 30 days of exchange rates, ~75 sales with weekend peaks, 10 invoices with varied payment/due states) without exposing proprietary production data.

**Architecture:** The seeding system is structured into a clean data definition module (`demo_dataset.py`) and an execution script (`seed_demo_data.py`). The script respects the 5-tier foreign-key dependency order, handles both SQLite and PostgreSQL (Docker) seamlessly via existing `SessionLocal`, manages monetary figures strictly with `Decimal`, supports an optional `--reset` flag to wipe demo data, and ensures database computed columns (`total_usd`, `total_ves`, `subtotal_usd`) are preserved.

**Tech Stack:** Python 3.12, FastAPI / SQLAlchemy 2.0, Alembic, Decimal, pytest.

**Spec:** In-conversation design approved on 2026-10-21.

## Global Constraints

- **Decimales Estrictos:** Valores monetarios y de tasas SIEMPRE con `Decimal(str(...))` y redondeo explícito (`.quantize(Decimal("0.01"))`). Prohibido `float` en importes y tasas.
- **SQLAlchemy 2.0:** Uso exclusivo de `select()`, `scalars()`, `db.add()`, `db.flush()`, `db.commit()`. Prohibido `session.query()`.
- **Dual-Dialect:** Compatible con SQLite local y PostgreSQL en Docker sin SQL crudo incompatible.
- **Computed Columns:** `Sale.total_usd`, `Sale.total_ves`, `Sale.monto_exento_ves`, `Sale.base_imponible_ves`, `Sale.monto_iva_ves`, y `SaleItem.subtotal_usd` son columnas `Computed` en la base de datos; NO deben insertarse como valores directos al instanciar el modelo.
- **Rango de Tasas Solicitado:**
  - USD/VES: Bs 766,8603 a Bs 883,3963 (30 días).
  - EUR/VES: Bs 885,0795 a Bs 993,1760 (30 días).

---

### Task 1: Create Demo Dataset Definitions (`demo_dataset.py`)

**Files:**
- Create: `backend/scripts/demo_dataset.py`
- Test: `backend/tests/test_demo_dataset.py`

**Interfaces:**
- Produces:
  - `DEMO_SUPPLIERS: list[dict[str, str]]`
  - `DEMO_CATEGORIES: list[dict[str, str]]`
  - `DEMO_PRODUCTS: list[dict[str, Any]]` (~40 products with `nombre`, `codigo_barra`, `categoria`, `unidades_por_caja`, `stock_cajas`, `stock_unidades`, `stock_minimo`, `precio_costo_usd`, `precio_unidad_usd`, `precio_caja_usd`, `tipo_iva`)
- Consumes: None (pure data constants with typed schemas)

- [ ] **Step 1: Write the failing test for `demo_dataset`**

Create `backend/tests/test_demo_dataset.py`:
```python
from decimal import Decimal
from scripts.demo_dataset import DEMO_SUPPLIERS, DEMO_CATEGORIES, DEMO_PRODUCTS


def test_demo_dataset_structures():
    # Suppliers
    assert len(DEMO_SUPPLIERS) >= 4
    for s in DEMO_SUPPLIERS:
        assert "nombre" in s and "telefono" in s

    # Categories
    assert len(DEMO_CATEGORIES) >= 5
    cat_names = {c["nombre"] for c in DEMO_CATEGORIES}
    assert "RONES" in cat_names or "Rones" in cat_names

    # Products: exactly or approximately 40 products
    assert 38 <= len(DEMO_PRODUCTS) <= 45
    for p in DEMO_PRODUCTS:
        assert isinstance(p["precio_costo_usd"], Decimal)
        assert isinstance(p["precio_unidad_usd"], Decimal)
        assert isinstance(p["precio_caja_usd"], Decimal)
        assert p["precio_unidad_usd"] >= p["precio_costo_usd"]
        assert p["tipo_iva"] in ("GRAVADO", "EXENTO")
        assert "categoria" in p
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_demo_dataset.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scripts.demo_dataset'`

- [ ] **Step 3: Implement `demo_dataset.py`**

Create `backend/scripts/demo_dataset.py` with generic, realistic Venezuelan liquor store / bodegón products across 6 categories (Rones, Cervezas, Whiskies, Vinos, Mezcladores y Refrescos, Snacks), ensuring ~40 products, proper margin structures, and 2-3 products intentionally at 0 stock for demo KPIs.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_demo_dataset.py -v`
Expected: PASS

---

### Task 2: Implement Base Seeding (Roles, Users, Suppliers, Categories, Products, and Exchange Rates)

**Files:**
- Create: `backend/scripts/seed_demo_data.py`
- Test: `backend/tests/test_seed_base.py`

**Interfaces:**
- Produces:
  - `seed_roles_and_payment_methods(db: Session) -> dict[str, Any]`
  - `seed_admin_user(db: Session, role_id: int) -> User`
  - `seed_suppliers(db: Session) -> dict[str, Supplier]`
  - `seed_categories(db: Session) -> dict[str, Category]`
  - `seed_products(db: Session, suppliers: dict, categories: dict) -> list[Product]`
  - `seed_exchange_rates(db: Session, user_id: int, days: int = 30) -> list[ExchangeRate]`
- Consumes: `demo_dataset.py`, `app.models.*`, `app.core.database.SessionLocal`

- [ ] **Step 1: Write failing test for base seed functions**

Create `backend/tests/test_seed_base.py`:
```python
from decimal import Decimal
from scripts.seed_demo_data import (
    seed_roles_and_payment_methods,
    seed_admin_user,
    seed_suppliers,
    seed_categories,
    seed_products,
    seed_exchange_rates,
)
from app.models.product import Product
from app.models.exchange_rate import ExchangeRate


def test_seed_base_entities(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])
    suppliers = seed_suppliers(db_session)
    categories = seed_categories(db_session)
    products = seed_products(db_session, suppliers, categories)

    assert len(products) >= 38
    rates = seed_exchange_rates(db_session, admin.id, days=30)
    assert len(rates) == 30

    # Test exact bounds requested by user:
    # USD: 766.8603 - 883.3963
    # EUR: 885.0795 - 993.1760
    min_usd = min(r.tasa_usd for r in rates)
    max_usd = max(r.tasa_usd for r in rates)
    min_eur = min(r.tasa_eur for r in rates)
    max_eur = max(r.tasa_eur for r in rates)

    assert min_usd == Decimal("766.8603")
    assert max_usd == Decimal("883.3963")
    assert min_eur == Decimal("885.0795")
    assert max_eur == Decimal("993.1760")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_seed_base.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement base seed functions in `seed_demo_data.py`**

Implement `seed_roles_and_payment_methods`, `seed_admin_user`, `seed_suppliers`, `seed_categories`, `seed_products`, and `seed_exchange_rates` using SQLAlchemy 2.0 `select()` and `Mapped` models. Calculate 30 linearly interpolated daily rates between the exact limits requested.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_seed_base.py -v`
Expected: PASS

---

### Task 3: Implement Invoices and Invoice Payments Seeding

**Files:**
- Modify: `backend/scripts/seed_demo_data.py`
- Test: `backend/tests/test_seed_invoices.py`

**Interfaces:**
- Produces:
  - `seed_invoices(db: Session, suppliers: dict, products: list[Product], user_id: int, payment_methods: dict, base_rate: Decimal) -> list[Factura]`
- Consumes: `app.models.invoice.Factura`, `DetalleFactura`, `app.models.invoice_payment.InvoicePayment`

- [ ] **Step 1: Write failing test for invoice seeding**

Create `backend/tests/test_seed_invoices.py`:
```python
from scripts.seed_demo_data import (
    seed_roles_and_payment_methods,
    seed_admin_user,
    seed_suppliers,
    seed_categories,
    seed_products,
    seed_invoices,
)
from app.models.invoice import Factura


def test_seed_invoices(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])
    suppliers = seed_suppliers(db_session)
    categories = seed_categories(db_session)
    products = seed_products(db_session, suppliers, categories)

    invoices = seed_invoices(
        db_session,
        suppliers,
        products,
        admin.id,
        roles_pm["payment_methods"],
        base_rate=Decimal("880.0000"),
    )

    assert len(invoices) == 10
    pagadas = [f for f in invoices if f.estado_pago == "PAGADA"]
    parciales = [f for f in invoices if f.estado_pago == "PARCIALMENTE_PAGADA"]
    pendientes = [f for f in invoices if f.estado_pago == "PENDIENTE"]

    assert len(pagadas) == 4
    assert len(parciales) == 3
    assert len(pendientes) == 3

    # Check future due dates exist
    from datetime import date
    today = date.today()
    future_dues = [f for f in pendientes if f.fecha_limite_pago and f.fecha_limite_pago > today]
    assert len(future_dues) >= 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_seed_invoices.py -v`
Expected: FAIL with `ImportError: cannot import name 'seed_invoices'`

- [ ] **Step 3: Implement `seed_invoices` in `seed_demo_data.py`**

Create 10 invoices:
- 4 PAGADA (with `InvoicePayment` instances attached covering total + IVA)
- 3 PARCIALMENTE_PAGADA (with `InvoicePayment` instances attached covering 30-50%)
- 3 PENDIENTE (with `fecha_limite_pago` at today + 2 days, today + 5 days, today + 8 days)
- Set one invoice with an overdue deadline (today - 3 days).

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_seed_invoices.py -v`
Expected: PASS

---

### Task 4: Implement Sales and Payments Simulation (30-Day Curve)

**Files:**
- Modify: `backend/scripts/seed_demo_data.py`
- Test: `backend/tests/test_seed_sales.py`

**Interfaces:**
- Produces:
  - `seed_sales(db: Session, products: list[Product], user_id: int, rates: list[ExchangeRate], payment_methods: dict) -> list[Sale]`
- Consumes: `app.models.sale.Sale`, `SaleItem`, `app.models.sale_payment.SalePayment`

- [ ] **Step 1: Write failing test for sales simulation**

Create `backend/tests/test_seed_sales.py`:
```python
from decimal import Decimal
from scripts.seed_demo_data import (
    seed_roles_and_payment_methods,
    seed_admin_user,
    seed_suppliers,
    seed_categories,
    seed_products,
    seed_exchange_rates,
    seed_sales,
)
from app.models.sale import Sale


def test_seed_sales_distribution(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])
    suppliers = seed_suppliers(db_session)
    categories = seed_categories(db_session)
    products = seed_products(db_session, suppliers, categories)
    rates = seed_exchange_rates(db_session, admin.id, days=30)

    sales = seed_sales(db_session, products, admin.id, rates, roles_pm["payment_methods"])

    assert len(sales) >= 60
    # Every sale must have items and payments
    for sale in sales:
        assert len(sale.items) >= 1
        assert len(sale.payments) >= 1
        assert sale.tasa_bcv_aplicada >= Decimal("766.8603")
        assert sale.tasa_bcv_aplicada <= Decimal("883.3963")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_seed_sales.py -v`
Expected: FAIL with `ImportError: cannot import name 'seed_sales'`

- [ ] **Step 3: Implement `seed_sales` in `seed_demo_data.py`**

Generate sales across the 30-day window:
- Apply weekend multiplier (Friday & Saturday have 3x higher probability and volume).
- Pick 1 to 4 products per sale.
- Calculate canonical `base_imponible_usd`, `monto_exento_usd`, and `monto_iva_usd`. Do NOT write to `total_usd` / `total_ves` (computed columns in SQLite/PostgreSQL).
- Add payments matching `total_usd` distributed between Divisas, Pago Móvil, and Punto de Venta.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_seed_sales.py -v`
Expected: PASS

---

### Task 5: Add CLI Interface (`--reset`), Migration Check, and Integration Test

**Files:**
- Modify: `backend/scripts/seed_demo_data.py`
- Test: `backend/tests/test_seed_cli_integration.py`

**Interfaces:**
- Produces:
  - `main(argv: list[str] | None = None) -> int`
  - `clean_demo_data(db: Session) -> None`
- Consumes: `argparse`, `alembic.command.upgrade`, `SessionLocal`

- [ ] **Step 1: Write integration test for end-to-end execution and reset**

Create `backend/tests/test_seed_cli_integration.py`:
```python
from scripts.seed_demo_data import run_seed, clean_demo_data
from app.models.product import Product
from app.models.sale import Sale
from app.models.invoice import Factura
from sqlalchemy import select


def test_seed_e2e_and_clean(db_session):
    # Run seeding
    summary = run_seed(db_session, reset=False)
    assert summary["products"] >= 38
    assert summary["sales"] >= 60
    assert summary["invoices"] == 10

    # Verify counts in DB
    prod_count = len(db_session.execute(select(Product)).scalars().all())
    assert prod_count >= 38

    # Clean demo data
    clean_demo_data(db_session)

    # Verify operational tables are empty
    sales_left = len(db_session.execute(select(Sale)).scalars().all())
    invoices_left = len(db_session.execute(select(Factura)).scalars().all())
    assert sales_left == 0
    assert invoices_left == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_seed_cli_integration.py -v`
Expected: FAIL with `ImportError: cannot import name 'run_seed'`

- [ ] **Step 3: Implement `run_seed`, `clean_demo_data`, and CLI entrypoint**

Add `run_seed`, `clean_demo_data` (clearing operational tables in reverse FK order: `detalle_pagos`, `detalle_ventas`, `ventas`, `pagos_facturas`, `detalles_facturas`, `facturas`, `producto_categoria`, `productos`, `historico_tasas`), and the `if __name__ == "__main__":` block with `argparse`.

- [ ] **Step 4: Run all backend tests to ensure full test suite passes**

Run: `pytest backend/tests/test_seed*.py -v`
Expected: ALL PASS
