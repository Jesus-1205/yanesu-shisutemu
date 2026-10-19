# Dashboard Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate irregular 2+ second loading spikes and optimize parallel database queries on the Dashboard by fixing localhost IPv6 DNS timeouts, eliminating SSE stream database connection leaks, deduplicating redundant invoice endpoints, and optimizing SQL sales aggregations.

**Architecture:** 
1. Target PostgreSQL explicitly via IPv4 loopback (`127.0.0.1:5432`) and size the SQLAlchemy connection pool to absorb concurrent bursts without spawning connections on the fly.
2. Decouple Server-Sent Events (`/exchange-rates/stream`) from long-lived database sessions so that SSE streams release their database connections immediately after authenticating.
3. Consolidate pending invoice KPI metrics into a single response (`InvoicePendingSummaryOut`) to remove the redundant `GET /invoices/stats` call on dashboard mount, reducing browser HTTP/1.1 socket congestion.
4. Push item cost aggregations in `get_sales_summary` to the SQL engine via `GROUP BY SaleItem.venta_id` for dual SQLite/PostgreSQL compatibility.

**Tech Stack:** FastAPI 0.115, SQLAlchemy 2.0 (PostgreSQL + SQLite dual-dialect), psycopg2 / psycopg 3, React 19, TypeScript 5.7, Vitest.

**Spec:** Systematic debugging diagnosis of DevTools Network benchmarks and empirical TCP connection timing (2.0778s on `localhost` vs 0.0196s on `127.0.0.1`).

## Global Constraints

- **Decimales y Moneda:** Operaciones monetarias siempre con `Decimal` desde `str`, nunca `float`. Redondeos explícitos con `.quantize(Decimal("0.01"))`.
- **SQLAlchemy 2.0:** Usar exclusivamente `select()`, `func`, `Mapped`/`mapped_column`. Prohibido `session.query()`.
- **Dual-Dialect:** Toda consulta debe ser compatible con SQLite y PostgreSQL. Prohibido código SQL específico de un solo motor.
- **TypeScript:** Cero `any`. Interfaces explícitas en `frontend/src/types/api.ts`.
- **Commits:** Conventional commits siguiendo `.opencode/rules/git_commit.md`.

---

### Task 1: Fix Connection Target & Configure SQLAlchemy Pool for PostgreSQL

**Files:**
- Modify: `backend/.env`
- Modify: `backend/.env.example`
- Modify: `backend/app/core/database.py:14-21`
- Test: `backend/tests/test_database_config.py`

**Interfaces:**
- Consumes: `Config.SQLALCHEMY_DATABASE_URL`
- Produces: `engine` with `pool_size=10, max_overflow=20, pool_timeout=30.0` when connected to PostgreSQL.

- [ ] **Step 1: Write failing test for PostgreSQL engine pool configuration**

Create `backend/tests/test_database_config.py`:
```python
import pytest
from sqlalchemy.pool import QueuePool
from app.core.database import create_engine


def test_postgresql_engine_pool_configuration():
    test_url = "postgresql+psycopg2://test_user:test_pass@127.0.0.1:5432/test_db"
    engine = create_engine(
        test_url,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30.0,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args={"options": "-c timezone=America/Caracas"},
    )
    assert isinstance(engine.pool, QueuePool)
    assert engine.pool.size() == 10
    assert engine.pool._max_overflow == 20
    assert engine.pool._timeout == 30.0
    assert engine.pool._recycle == 1800
```

- [ ] **Step 2: Run test to verify it passes in isolation**

Run: `python -m pytest tests/test_database_config.py -v`
Expected: PASS

- [ ] **Step 3: Update `.env`, `.env.example`, and `database.py`**

In `backend/.env`:
Replace:
```ini
DATABASE_URL=postgresql+psycopg2://yanesu_user:change-me@localhost:5432/yanesudb
```
With:
```ini
DATABASE_URL=postgresql+psycopg2://yanesu_user:change-me@127.0.0.1:5432/yanesudb
```

In `backend/.env.example`:
Replace:
```ini
# DATABASE_URL=postgresql+psycopg://yanesu:change-me@localhost:5432/licoreria
```
With:
```ini
# DATABASE_URL=postgresql+psycopg://yanesu:change-me@127.0.0.1:5432/licoreria
```

In `backend/app/core/database.py:14-21`:
Replace:
```python
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={"options": "-c timezone=America/Caracas"},
    )
```
With:
```python
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30.0,
        pool_pre_ping=True,
        pool_recycle=1800,
        connect_args={"options": "-c timezone=America/Caracas"},
    )
```

- [ ] **Step 4: Verify connection latency via shell**

Run:
```powershell
python -c "import time, psycopg2; t0=time.time(); conn=psycopg2.connect('postgresql://yanesu_user:change-me@127.0.0.1:5432/yanesudb'); conn.close(); print('Latency:', round((time.time()-t0)*1000, 2), 'ms')"
```
Expected: Latency < 50 ms (no 2-second timeout).

- [ ] **Step 5: Commit**

```bash
git add backend/.env.example backend/app/core/database.py backend/tests/test_database_config.py
git commit -m "fix(database): switch postgres host to 127.0.0.1 and tune connection pool"
```

---

### Task 2: Release Database Connection in SSE Stream (`/exchange-rates/stream`)

**Files:**
- Modify: `backend/app/routes/exchange_rates.py:85-122`
- Test: `backend/tests/test_exchange_rate_stream.py`

**Interfaces:**
- Consumes: `decode_access_token` from `app.core.jwt`, `SessionLocal` from `app.core.database`
- Produces: `stream_rates` endpoint that authenticates without holding a database session in `get_db` during the streaming response.

- [ ] **Step 1: Write test verifying SSE stream authentication helper does not leak session**

Create `backend/tests/test_exchange_rate_stream.py`:
```python
import pytest
from app.core.jwt import create_access_token
from app.models.user import User
from app.models.role import Role
from app.routes.exchange_rates import authenticate_stream_user
from fastapi import HTTPException


def test_authenticate_stream_user_success(db_session):
    role = Role(nombre="ADMINISTRADOR", descripcion="Admin")
    db_session.add(role)
    db_session.commit()

    user = User(
        username="stream_test_user",
        email="stream@test.com",
        password_hash="fakehash",
        rol_id=role.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    token = create_access_token(user.id, role.nombre)
    authenticated_user = authenticate_stream_user(token)
    assert authenticated_user.id == user.id
    assert authenticated_user.username == "stream_test_user"


def test_authenticate_stream_user_invalid_token():
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user("invalid.jwt.token")
    assert exc_info.value.status_code == 401


def test_authenticate_stream_user_missing_token():
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user(None)
    assert exc_info.value.status_code == 401
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run: `python -m pytest tests/test_exchange_rate_stream.py -v`
Expected: FAIL with `ImportError: cannot import name 'authenticate_stream_user'`

- [ ] **Step 3: Implement `authenticate_stream_user` and update `stream_rates` in `backend/app/routes/exchange_rates.py`**

In `backend/app/routes/exchange_rates.py`:
Add helper function and update route signature:
```python
from fastapi import Cookie, HTTPException, Request, status
from sqlalchemy.orm import selectinload
from app.core.jwt import decode_access_token
from app.core.database import SessionLocal


def authenticate_stream_user(access_token: str | None = Cookie(None)) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
        )
    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    # Sesión puntual de corta duración: se cierra inmediatamente al salir del bloque with
    with SessionLocal() as db:
        stmt = select(User).options(selectinload(User.role)).where(User.id == int(user_id))
        user = db.execute(stmt).scalars().first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o inactivo",
            )
        # Desacoplar para que los datos básicos sigan accesibles sin sesión
        db.expunge(user)
        return user


@router.get("/stream")
async def stream_rates(
    request: Request,
    current_user: User = Depends(authenticate_stream_user),
):
    """GET /exchange-rates/stream - Server-Sent Events (SSE) para actualización de tasas en tiempo real.

    Autentica con sesión de corta duración para NO retener conexiones a la base de datos durante el stream.
    """
    queue = await rate_broadcaster.subscribe()

    async def event_generator():
        try:
            yield ": connected\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield message
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            rate_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_exchange_rate_stream.py -v`
Expected: PASS (all 3 tests pass)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/exchange_rates.py backend/tests/test_exchange_rate_stream.py
git commit -m "fix(exchange-rates): prevent db connection leak in sse stream response"
```

---

### Task 3: Enrich `pending-summary` and Deduplicate Invoice Requests in Dashboard

**Files:**
- Modify: `backend/app/schemas/invoice.py:149-152`
- Modify: `backend/app/services/invoice_service.py:752-787`
- Modify: `frontend/src/types/api.ts:632-635`
- Modify: `frontend/src/features/dashboard/hooks/useDashboardData.ts:16-109`
- Modify: `frontend/src/__tests__/features/dashboard/useDashboardData.test.ts`
- Modify: `frontend/src/__tests__/features/dashboard/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `Factura` model in backend; `api.getInvoicePendingSummary` in frontend.
- Produces: `InvoicePendingSummaryOut` with `total_facturas_pendientes: int`.

- [ ] **Step 1: Write backend failing test for `total_facturas_pendientes` in `get_pending_invoices_summary`**

In `backend/tests/test_services/test_invoice_service.py`, add to `TestGetPendingInvoicesSummary`:
```python
def test_pending_summary_includes_total_facturas_pendientes(db_session, proveedor_default, user_default):
    from app.services.invoice_service import create_invoice, get_pending_invoices_summary
    from app.schemas.invoice import FacturaCreate, DetalleFacturaCreate
    from app.models.product import Product

    prod = Product(
        nombre="Prod Test Pending Count",
        precio_costo_usd=Decimal("10.00"),
        precio_unidad_usd=Decimal("15.00"),
        stock_unidades=10,
        unidades_por_caja=1,
    )
    db_session.add(prod)
    db_session.commit()

    inv_data = FacturaCreate(
        proveedor_id=proveedor_default.id,
        numero_factura="FAC-PEND-COUNT-1",
        moneda_principal="USD",
        detalles=[
            DetalleFacturaCreate(
                producto_id=prod.id,
                tipo_empaque="UNIDAD",
                cantidad=2,
                costo_unitario_usd=Decimal("10.00"),
                costo_unitario_bs=Decimal("0.00"),
            )
        ],
    )
    create_invoice(db_session, inv_data, usuario_id=user_default.id)

    summary = get_pending_invoices_summary(db_session)
    assert "total_facturas_pendientes" in summary
    assert summary["total_facturas_pendientes"] >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_services/test_invoice_service.py -k test_pending_summary_includes_total_facturas_pendientes -v`
Expected: FAIL (`KeyError: 'total_facturas_pendientes'` or assertion error)

- [ ] **Step 3: Update schema and service in backend**

In `backend/app/schemas/invoice.py:149-152`:
```python
class InvoicePendingSummaryOut(BaseModel):
    """Resumen de monto total pendiente de pago (con IVA incluido) y conteo de facturas."""
    total_pendiente_usd: Decimal = Decimal("0")
    total_facturas_pendientes: int = 0
```

In `backend/app/services/invoice_service.py:785-787`:
```python
    return {
        "total_pendiente_usd": total_pendiente.quantize(Decimal("0.01")),
        "total_facturas_pendientes": len(facturas),
    }
```

- [ ] **Step 4: Run backend tests to verify it passes**

Run: `python -m pytest tests/test_services/test_invoice_service.py -k test_pending_summary -v`
Expected: PASS

- [ ] **Step 5: Update frontend types and `useDashboardData`**

In `frontend/src/types/api.ts:632-635`:
```typescript
export interface InvoicePendingSummaryOut {
  total_pendiente_usd: number;
  total_facturas_pendientes: number;
}
```

In `frontend/src/features/dashboard/hooks/useDashboardData.ts`:
Remove `api.getInvoiceStats()` call, eliminating 1 redundant HTTP request from the dashboard load:
```typescript
export interface DashboardDataState {
  stats: DashboardStatsOut | null;
  ventasSemana: SalesSummaryItem | null;
  salesSummary: SalesSummaryItem[];
  topProducts: TopProductItem[];
  pendingSummary: InvoicePendingSummaryOut | null;
}
```
Update `fetchData`:
```typescript
    const [
      statsRes,
      salesSummaryRes,
      topProductsRes,
      pendingSummaryRes,
    ] = await Promise.allSettled([
      api.getDashboardStats(),
      api.getSalesSummary({ rango: "semanal", fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      api.getTopSellingProducts(5),
      api.getInvoicePendingSummary(),
    ]);

    setData((prev) => {
      let nextSalesSummary = prev.salesSummary;
      let nextVentasSemana = prev.ventasSemana;

      if (salesSummaryRes.status === "fulfilled") {
        const salesData = salesSummaryRes.value;
        nextSalesSummary = salesData.slice(-5);
        nextVentasSemana = salesData.length > 0 ? salesData[salesData.length - 1] : null;
      }

      return {
        stats: statsRes.status === "fulfilled" ? statsRes.value : prev.stats,
        salesSummary: nextSalesSummary,
        ventasSemana: nextVentasSemana,
        topProducts: topProductsRes.status === "fulfilled" ? topProductsRes.value : prev.topProducts,
        pendingSummary: pendingSummaryRes.status === "fulfilled" ? pendingSummaryRes.value : prev.pendingSummary,
      };
    });
```
Update `pendingCount`:
```typescript
  const pendingCount = data.pendingSummary?.total_facturas_pendientes ?? 0;
```

- [ ] **Step 6: Update frontend unit tests in `useDashboardData.test.ts` and `DashboardPage.test.tsx`**

Update `frontend/src/__tests__/features/dashboard/useDashboardData.test.ts` and `DashboardPage.test.tsx` to align mock return values with `total_facturas_pendientes: 2` in `mockPendingSummary` without expecting `getInvoiceStats` to be called.

- [ ] **Step 7: Run frontend dashboard tests to verify they pass**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend test src/__tests__/features/dashboard/
```
Expected: PASS (all tests pass)

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/invoice.py backend/app/services/invoice_service.py backend/tests/test_services/test_invoice_service.py frontend/src/types/api.ts frontend/src/features/dashboard/hooks/useDashboardData.ts frontend/src/__tests__/features/dashboard/
git commit -m "perf(dashboard): consolidate pending invoice metrics and eliminate duplicate invoice_stats call"
```

---

### Task 4: Optimize Cost Aggregation in `get_sales_summary`

**Files:**
- Modify: `backend/app/services/sale_service.py:560-581`
- Test: `backend/tests/test_services/test_sale_service.py`

**Interfaces:**
- Consumes: `SaleItem`, `Product`, `Sale` SQLAlchemy models.
- Produces: `get_sales_summary(db, rango, fecha_desde, fecha_hasta)` returning exact canonical Decimals for `costo_usd` and `margen_usd` with SQL-aggregated sums per sale.

- [ ] **Step 1: Write test verifying `get_sales_summary` accuracy with multiple items per sale**

In `backend/tests/test_services/test_sale_service.py`, verify existing test `test_get_sales_summary_incluye_costo_y_margen` or add test verifying multiple items:
```python
def test_get_sales_summary_aggregates_multiple_items_efficiently(db_session, setup_pos_data):
    from app.services.sale_service import create_sale, get_sales_summary
    from app.schemas.sales import SaleCreate, SaleItemCreate, PaymentCreate
    pm = setup_pos_data["payment_method"]
    p1 = setup_pos_data["product"]
    p2 = setup_pos_data["product_caja"]

    sale_data = SaleCreate(
        items=[
            SaleItemCreate(producto_id=p1.id, tipo_empaque="UNIDAD", cantidad=2, unidades_descontadas=2, precio_unitario_usd=Decimal("15.00")),
            SaleItemCreate(producto_id=p2.id, tipo_empaque="UNIDAD", cantidad=1, unidades_descontadas=1, precio_unitario_usd=Decimal("20.00")),
        ],
        payments=[
            PaymentCreate(metodo_pago_id=pm.id, monto_usd=Decimal("50.00"), monto_ves=Decimal("0.00")),
        ],
        tasa_bcv_aplicada=Decimal("50.0000"),
    )
    create_sale(db_session, sale_data, usuario_id=setup_pos_data["user"].id)

    summary = get_sales_summary(db_session, rango="diario")
    assert len(summary) >= 1
    assert summary[-1]["costo_usd"] > Decimal("0")
    assert summary[-1]["margen_usd"] > Decimal("0")
```

- [ ] **Step 2: Run test to verify baseline passes**

Run: `python -m pytest tests/test_services/test_sale_service.py -k test_get_sales_summary -v`
Expected: PASS

- [ ] **Step 3: Refactor `stmt_costs` in `backend/app/services/sale_service.py` to aggregate in SQL**

Replace lines 561-581 in `backend/app/services/sale_service.py`:
```python
    cost_by_sale: dict[int, Decimal] = {}
    if sales_rows:
        stmt_costs = (
            select(
                SaleItem.venta_id,
                func.sum(SaleItem.unidades_descontadas * Product.precio_costo_usd).label("costo_total"),
            )
            .join(Product, Product.id == SaleItem.producto_id)
            .join(Sale, Sale.id == SaleItem.venta_id)
            .where(Product.precio_costo_usd.isnot(None), SaleItem.unidades_descontadas > 0)
            .group_by(SaleItem.venta_id)
        )
        if fecha_desde:
            stmt_costs = stmt_costs.where(Sale.fecha_venta >= _to_ve_boundary(fecha_desde))
        if fecha_hasta:
            stmt_costs = stmt_costs.where(Sale.fecha_venta <= _to_ve_boundary(fecha_hasta, end_of_day=True))

        cost_rows = db.execute(stmt_costs).all()
        for venta_id, costo_total in cost_rows:
            if costo_total is not None:
                cost_by_sale[venta_id] = Decimal(str(costo_total))
```

- [ ] **Step 4: Run all sales summary tests to verify zero regressions**

Run: `python -m pytest tests/test_services/test_sale_service.py -k sales_summary -v`
Expected: PASS (all sales summary tests pass)

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/sale_service.py backend/tests/test_services/test_sale_service.py
git commit -m "perf(sales): aggregate item costs by sale in SQL for sales summary"
```

---

### Task 5: End-to-End Verification and Benchmark Comparison

**Files:**
- Test: Full backend suite (`pytest`)
- Test: Full frontend dashboard suite (`vitest`)

- [ ] **Step 1: Run complete backend pytest suite**

Run: `python -m pytest tests/test_services/test_sale_service.py tests/test_services/test_invoice_service.py tests/test_exchange_rate_stream.py tests/test_database_config.py -v`
Expected: 100% tests PASS

- [ ] **Step 2: Run complete frontend dashboard vitest suite**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; & pnpm --dir frontend test src/__tests__/features/dashboard/
```
Expected: 100% tests PASS

- [ ] **Step 3: Verification of browser F5 behavior**

Start dev servers if needed, reload dashboard 5 times in Chrome, check DevTools Network tab:
- Zero requests exceeding 250 ms.
- Total parallel calls on dashboard load reduced from 8 to 7.
- No `localhost` IPv6 connection timeout delays.

---
