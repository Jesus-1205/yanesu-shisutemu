# Implementación de ReportsCategoriesPage (Rendimiento por Categoría)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la sub-pestaña y vista "Rendimiento por Categoría" (`/reports/categories`) dentro del Panel de Reportes, siguiendo la arquitectura desacoplada establecida en `sales`, `products` y `payments` (Hook de negocio con TDD + 4 componentes de presentación puros + orquestador de <120 líneas), conectándola a un nuevo endpoint filtrable por fechas en el backend.

**Architecture:**
- **Backend Layer:** Endpoint `GET /reports/categories` con filtros `fecha_desde` y `fecha_hasta`, que agrega ventas (`unidades_vendidas`, `ingresos_usd`, `costos_usd`, `margen_usd`, `margen_porcentaje`) por categoría usando consultas directas en SQLAlchemy 2.0 con `Decimal` estricto y límites de fecha en zona horaria venezolana (`_to_ve_boundary`).
- **Frontend State & Business Logic:** Hook `useCategoriesReport` que gestiona llamada a API con flag de cancelación, conversión monetaria dinámica (USD/VES) con redondeo financiero estricto a 2 decimales (`Math.round(val * 100) / 100`), cálculo de micro-KPIs (Total Facturado, Categoría Líder con participación %, Unidades Vendidas, Margen Promedio), filtrado por sub-pestañas (`todos`, `mas_vendidas`, `mayor_margen`, `menor_margen`) y paginación cliente.
- **Frontend Presentation:** 4 componentes desacoplados (`CategoriesKpiCards`, `CategoriesToolbar`, `CategoriesChartSection`, `CategoriesTable`) y un orquestador ligero (`ReportsCategoriesPage`) integrado con `ReportsLayout` y `router.tsx`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, pytest, React 19, TypeScript 5.7, Tailwind CSS v4, Vitest, Testing Library, Lucide React, Recharts.

---

## Global Constraints

- **Prohibido el uso de `any`** en cualquier archivo (regla de `frontend_rules.md`).
- **Redondeo monetario**: `Math.round(val * 100) / 100` en todas las conversiones de moneda y acumulaciones.
- **Decimales en Backend**: Todo cálculo financiero en Python DEBE usar `Decimal`, prohibido `float` (regla de `backend_rules.md`).
- **SQLAlchemy 2.0**: Usar sintaxis `select()`, prohibido `session.query()`.
- **Node & fnm en Windows**: Ejecutar comandos de Node anteponiendo:
  `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH;`
- **TDD Estricto**: Escribir pruebas unitarias antes de la implementación del hook y de los componentes.
- **No git push** a menos que sea explícitamente ordenado.

---

## Task Breakdown

### Task 1: Backend - Schema y Servicio `get_category_report`

**Files:**
- Modify: `backend/app/schemas/category.py`
- Modify: `backend/app/services/category_service.py`
- Test: `backend/tests/test_reports.py`

**Interfaces:**
- Consumes: `Category`, `producto_categoria`, `Product`, `Sale`, `SaleItem`, `_to_ve_boundary` de `sale_service`
- Produces: `CategoryReportItemOut` schema y `get_category_report(db, fecha_desde, fecha_hasta)`

- [ ] **Step 1: Escribir test en `backend/tests/test_reports.py` para verificar el cálculo de reporte de categorías**

```python
def test_get_category_report_service(db_session, test_user):
    from datetime import date
    from app.services.category_service import get_category_report, create_category
    from app.services.product_service import create_product
    from app.schemas.category import CategoryCreate
    from app.schemas.product import ProductCreate
    from app.models.sale import Sale, SaleItem
    from decimal import Decimal

    cat = create_category(db_session, CategoryCreate(nombre="Licores Premium"))
    prod = create_product(
        db_session,
        ProductCreate(
            nombre="Whisky 12 Años",
            precio_costo_usd=Decimal("20.00"),
            precio_unidad_usd=Decimal("30.00"),
            stock_unidades=15,
            categoria_ids=[cat.id],
        ),
    )

    sale = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("30.00"),
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
    )
    db_session.add(sale)
    db_session.flush()

    item = SaleItem(
        venta_id=sale.id,
        producto_id=prod.id,
        tipo_empaque="UNIDAD",
        cantidad=1,
        unidades_descontadas=1,
        precio_unitario_usd=Decimal("30.00"),
        iva_porcentaje=Decimal("0.00"),
    )
    db_session.add(item)
    db_session.commit()

    report = get_category_report(db_session, fecha_desde=date.today(), fecha_hasta=date.today())
    assert len(report) >= 1
    cat_entry = next(r for r in report if r["id"] == cat.id)
    assert cat_entry["nombre"] == "Licores Premium"
    assert cat_entry["unidades_vendidas"] == 1
    assert cat_entry["ingresos_usd"] == Decimal("30.00")
    assert cat_entry["costos_usd"] == Decimal("20.00")
    assert cat_entry["margen_usd"] == Decimal("10.00")
    assert cat_entry["margen_porcentaje"] == Decimal("33.3")
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

Run: `cd backend; python -m pytest tests/test_reports.py -k test_get_category_report_service`
Expected: FAIL (ImportError o `get_category_report` no existe)

- [ ] **Step 3: Agregar `CategoryReportItemOut` en `backend/app/schemas/category.py`**

```python
class CategoryReportItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    total_productos: int
    stock_total: int
    unidades_vendidas: int
    ingresos_usd: Decimal
    costos_usd: Decimal
    margen_usd: Decimal
    margen_porcentaje: Decimal
```

- [ ] **Step 4: Implementar `get_category_report` en `backend/app/services/category_service.py`**

```python
def get_category_report(
    db: Session,
    *,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
) -> list[dict]:
    from app.services.sale_service import _to_ve_boundary

    # Subquery de productos y stock por categoría
    ps = (
        select(
            producto_categoria.c.categoria_id,
            func.count(Product.id).label("total_productos"),
            func.coalesce(
                func.sum(Product.stock_cajas * Product.unidades_por_caja + Product.stock_unidades), 0
            ).label("stock_total"),
        )
        .select_from(producto_categoria)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .group_by(producto_categoria.c.categoria_id)
    ).subquery()

    # Subquery de ventas agrupadas por producto con filtro de fecha
    sales_filter = select(
        SaleItem.producto_id,
        func.coalesce(func.sum(SaleItem.unidades_descontadas), 0).label("unidades_vendidas"),
        func.coalesce(func.sum(SaleItem.subtotal_usd), 0).label("ingresos_usd"),
    ).join(Sale, Sale.id == SaleItem.venta_id)

    if fecha_desde:
        sales_filter = sales_filter.where(Sale.fecha_venta >= _to_ve_boundary(fecha_desde))
    if fecha_hasta:
        sales_filter = sales_filter.where(Sale.fecha_venta <= _to_ve_boundary(fecha_hasta, end_of_day=True))

    sales_sub = sales_filter.group_by(SaleItem.producto_id).subquery()

    # Query principal de categorías cruzadas con productos y ventas
    stmt = (
        select(
            Category.id,
            Category.nombre,
            func.coalesce(ps.c.total_productos, 0).label("total_productos"),
            func.coalesce(ps.c.stock_total, 0).label("stock_total"),
            func.coalesce(func.sum(sales_sub.c.unidades_vendidas), 0).label("unidades_vendidas"),
            func.coalesce(func.sum(sales_sub.c.ingresos_usd), 0).label("ingresos_usd"),
            func.coalesce(
                func.sum(sales_sub.c.unidades_vendidas * Product.precio_costo_usd), 0
            ).label("costos_usd"),
        )
        .outerjoin(ps, ps.c.categoria_id == Category.id)
        .outerjoin(producto_categoria, producto_categoria.c.categoria_id == Category.id)
        .outerjoin(Product, Product.id == producto_categoria.c.producto_id)
        .outerjoin(sales_sub, sales_sub.c.producto_id == Product.id)
        .group_by(Category.id, Category.nombre, ps.c.total_productos, ps.c.stock_total)
        .order_by(func.coalesce(func.sum(sales_sub.c.ingresos_usd), 0).desc(), Category.nombre)
    )

    rows = db.execute(stmt).all()
    result = []
    for r in rows:
        ingresos = Decimal(str(r.ingresos_usd)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        costos = Decimal(str(r.costos_usd)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        margen = (ingresos - costos).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        margen_pct = (
            ((ingresos - costos) / ingresos * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            if ingresos > Decimal("0")
            else Decimal("0.0")
        )
        result.append({
            "id": r.id,
            "nombre": r.nombre,
            "total_productos": int(r.total_productos),
            "stock_total": int(r.stock_total),
            "unidades_vendidas": int(r.unidades_vendidas),
            "ingresos_usd": ingresos,
            "costos_usd": costos,
            "margen_usd": margen,
            "margen_porcentaje": margen_pct,
        })
    return result
```

- [ ] **Step 5: Ejecutar test para verificar que pase**

Run: `cd backend; python -m pytest tests/test_reports.py -k test_get_category_report_service`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/category.py backend/app/services/category_service.py backend/tests/test_reports.py
git commit -m "feat(reports): add get_category_report service with date filtering"
```

---

### Task 2: Backend - Endpoint `GET /reports/categories`

**Files:**
- Modify: `backend/app/routes/reports.py`
- Test: `backend/tests/test_reports.py`

- [ ] **Step 1: Escribir test de endpoint API en `backend/tests/test_reports.py`**

```python
def test_get_reports_categories_endpoint(client, auth_headers):
    response = client.get("/reports/categories", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "id" in item
        assert "nombre" in item
        assert "unidades_vendidas" in item
        assert "ingresos_usd" in item
        assert "costos_usd" in item
        assert "margen_usd" in item
        assert "margen_porcentaje" in item
```

- [ ] **Step 2: Ejecutar test para verificar que falle (404 Not Found)**

Run: `cd backend; python -m pytest tests/test_reports.py -k test_get_reports_categories_endpoint`
Expected: FAIL 404

- [ ] **Step 3: Agregar endpoint en `backend/app/routes/reports.py`**

```python
from app.schemas.category import CategoryReportItemOut
from app.services.category_service import get_category_report

@router.get("/categories", response_model=list[CategoryReportItemOut])
def categories_report(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /reports/categories - Rendimiento financiero y de ventas por categoría
    
    Recibe: query params opcionales fecha_desde, fecha_hasta
    Hace:   agrega unidades, ingresos, costos y márgenes agrupados por categoría
    Devuelve: lista de CategoryReportItemOut ordenado por ingresos descendente
    """
    return get_category_report(db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
```

- [ ] **Step 4: Ejecutar tests de backend para verificar que pasen**

Run: `cd backend; python -m pytest tests/test_reports.py`
Expected: 100% PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/reports.py backend/tests/test_reports.py
git commit -m "feat(reports): expose GET /reports/categories endpoint"
```

---

### Task 3: Frontend - Cliente API y Tipos Compartidos

**Files:**
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/features/reports/types.ts`
- Test: `frontend/src/__tests__/services/api.extended.test.ts`

- [ ] **Step 1: Escribir test para `api.getCategoryReport` en `api.extended.test.ts`**

```typescript
it("getCategoryReport llama a /reports/categories con query params", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{
      id: 1,
      nombre: "Bebidas",
      total_productos: 5,
      stock_total: 20,
      unidades_vendidas: 10,
      ingresos_usd: 100,
      costos_usd: 60,
      margen_usd: 40,
      margen_porcentaje: 40,
    }],
  });

  const res = await api.getCategoryReport({ fecha_desde: "2026-09-01", fecha_hasta: "2026-09-30" });
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining("/reports/categories?fecha_desde=2026-09-01&fecha_hasta=2026-09-30"),
    expect.any(Object),
  );
  expect(res).toHaveLength(1);
  expect(res[0].nombre).toBe("Bebidas");
});
```

- [ ] **Step 2: Ejecutar test para verificar que falle**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec vitest run src/__tests__/services/api.extended.test.ts`
Expected: FAIL (`api.getCategoryReport` no definido)

- [ ] **Step 3: Agregar tipos en `frontend/src/types/api.ts` y método en `frontend/src/services/api.ts`**

En `frontend/src/types/api.ts`:
```typescript
export interface CategoryReportItemOut {
  id: number;
  nombre: str;
  total_productos: number;
  stock_total: number;
  unidades_vendidas: number;
  ingresos_usd: number | string;
  costos_usd: number | string;
  margen_usd: number | string;
  margen_porcentaje: number | string;
}
```

En `frontend/src/services/api.ts`:
```typescript
getCategoryReport: (params?: { fecha_desde?: string; fecha_hasta?: string }) => {
  const qs = new URLSearchParams();
  if (params?.fecha_desde) qs.set("fecha_desde", params.fecha_desde);
  if (params?.fecha_hasta) qs.set("fecha_hasta", params.fecha_hasta);
  const qStr = qs.toString();
  return request<CategoryReportItemOut[]>(`/reports/categories${qStr ? `?${qStr}` : ""}`);
},
```

- [ ] **Step 4: Agregar interfaces específicas en `frontend/src/features/reports/types.ts`**

```typescript
import type { CategoryReportItemOut } from "@/types/api";

export type CategoryChartMode = "donut" | "bars";
export type CategoryTableTab = "todos" | "mas_vendidas" | "mayor_margen" | "menor_margen";

export interface CategoryKpis {
  totalIngresos: number;
  lider: CategoryReportItemOut | null;
  totalUnidades: number;
  margenPromedio: number;
}

export interface CategoryTableRow {
  id: number;
  nombre: string;
  total_productos: number;
  stock_total: number;
  unidades_vendidas: number;
  ingresos: number;
  costos: number;
  margen: number;
  rentabilidad_pct: number;
  participacion_pct: number;
}

export interface UseCategoriesReportParams {
  from: string;
  to: string;
  currency: "USD" | "VES";
  tableTab: CategoryTableTab;
  page: number;
  pageSize: number;
}

export interface UseCategoriesReportReturn {
  rawData: CategoryReportItemOut[];
  kpis: CategoryKpis;
  tableData: CategoryTableRow[];
  paginatedData: CategoryTableRow[];
  totalPages: number;
  totalRows: number;
  conversionRate: number;
  currSymbol: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
}
```

- [ ] **Step 5: Ejecutar test y verificar compilación de TypeScript**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec vitest run src/__tests__/services/api.extended.test.ts; pnpm exec tsc -b
```
Expected: PASS y 0 errores de compilación.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/api.ts frontend/src/services/api.ts frontend/src/features/reports/types.ts frontend/src/__tests__/services/api.extended.test.ts
git commit -m "feat(reports): add API client and types for categories report"
```

---

### Task 4: Frontend - Custom Hook `useCategoriesReport` (TDD)

**Files:**
- Create: `frontend/src/features/reports/hooks/useCategoriesReport.ts`
- Test: `frontend/src/__tests__/features/reports/useCategoriesReport.test.ts`

- [ ] **Step 1: Crear archivo de pruebas para `useCategoriesReport` con los casos clave:**
  1. Estado inicial de carga y recepción exitosa de datos.
  2. Manejo de conversión monetaria (USD vs VES con `tasaBCV`).
  3. Cálculo correcto de micro-KPIs (Total Ingresos, Categoría Líder, Unidades, Margen ponderado).
  4. Filtrado correcto por sub-pestañas (`todos`, `mas_vendidas`, `mayor_margen`, `menor_margen`).
  5. Paginación cliente y cálculo de `totalPages`.
  6. Manejo de errores y reintento (`retry`).

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCategoriesReport } from "@/features/reports/hooks/useCategoriesReport";
import { api } from "@/services/api";
import { useExchangeRateStore } from "@/stores/exchangeRateStore";

vi.mock("@/services/api", () => ({
  api: {
    getCategoryReport: vi.fn(),
  },
}));

const mockCategories = [
  {
    id: 1,
    nombre: "Licores",
    total_productos: 10,
    stock_total: 50,
    unidades_vendidas: 30,
    ingresos_usd: 300,
    costos_usd: 150,
    margen_usd: 150,
    margen_porcentaje: 50,
  },
  {
    id: 2,
    nombre: "Cervezas",
    total_productos: 5,
    stock_total: 100,
    unidades_vendidas: 70,
    ingresos_usd: 200,
    costos_usd: 140,
    margen_usd: 60,
    margen_porcentaje: 30,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getCategoryReport).mockResolvedValue(mockCategories);
  useExchangeRateStore.setState({ tasa: 50 });
});

describe("useCategoriesReport", () => {
  it("inicia en loading=true y carga datos de categorías", async () => {
    const { result } = renderHook(() =>
      useCategoriesReport({
        from: "2026-09-01",
        to: "2026-09-30",
        currency: "USD",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rawData).toEqual(mockCategories);
    expect(result.current.kpis.totalIngresos).toBe(500);
    expect(result.current.kpis.totalUnidades).toBe(100);
    expect(result.current.kpis.lider?.nombre).toBe("Licores");
  });

  it("aplica tasa de conversión cuando currency es VES", async () => {
    const { result } = renderHook(() =>
      useCategoriesReport({
        from: "2026-09-01",
        to: "2026-09-30",
        currency: "VES",
        tableTab: "todos",
        page: 1,
        pageSize: 10,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.kpis.totalIngresos).toBe(25000); // 500 * 50
    expect(result.current.currSymbol).toBe("Bs ");
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falle**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec vitest run src/__tests__/features/reports/useCategoriesReport.test.ts`
Expected: FAIL (`useCategoriesReport` no existe)

- [ ] **Step 3: Implementar `useCategoriesReport.ts` en `frontend/src/features/reports/hooks/`**

Debe incluir:
- Llamada asíncrona con cleanup `cancelled = true`.
- Cálculo de KPIs memorizado con `useMemo`.
- Tabla formateada con cálculo de `participacion_pct`.
- Manejo de filtros `tableTab`:
  - `todos`: orden original (por ingresos desc).
  - `mas_vendidas`: ordenado por `unidades_vendidas` desc.
  - `mayor_margen`: ordenado por `rentabilidad_pct` desc.
  - `menor_margen`: ordenado por `rentabilidad_pct` asc.
- Paginación cliente.

- [ ] **Step 4: Ejecutar test para verificar que pase**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec vitest run src/__tests__/features/reports/useCategoriesReport.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/reports/hooks/useCategoriesReport.ts frontend/src/__tests__/features/reports/useCategoriesReport.test.ts
git commit -m "feat(reports): add useCategoriesReport hook with TDD"
```

---

### Task 5: Frontend - Componentes de Presentación

**Files:**
- Create: `frontend/src/features/reports/components/CategoriesKpiCards.tsx`
- Create: `frontend/src/features/reports/components/CategoriesToolbar.tsx`
- Create: `frontend/src/features/reports/components/CategoriesChartSection.tsx`
- Create: `frontend/src/features/reports/components/CategoriesTable.tsx`
- Test: `frontend/src/__tests__/features/reports/CategoriesComponents.test.tsx`

- [ ] **Step 1: Escribir tests para los 4 componentes de presentación en `CategoriesComponents.test.tsx`**

Verificar:
- `CategoriesKpiCards`: renderizado de skeleton cuando `loading=true`, visualización de montos formateados, categoría líder y badge de margen.
- `CategoriesToolbar`: toggle de modos de gráfico (`donut` vs `bars`), switch `Gráfico` / `Tabla`, y llamada a `onExport`.
- `CategoriesTable`: pestañas de sub-tabs (`Todos`, `Más vendidas`, `Mayor margen`, `Menor margen`), renderizado de columnas de ingresos/costos/margen y paginación.

- [ ] **Step 2: Ejecutar test para verificar que fallen los componentes aún no creados**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec vitest run src/__tests__/features/reports/CategoriesComponents.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `CategoriesKpiCards.tsx`**
  - Card 1: `TOTAL FACTURADO` (Ícono DollarSign, monto formateado).
  - Card 2: `CATEGORÍA PRINCIPAL` (Ícono Trophy, nombre en negrita + % participación).
  - Card 3: `UNIDADES VENDIDAS` (Ícono Package, total ítems vendidos).
  - Card 4: `MARGEN PROMEDIO` (Ícono TrendingUp, porcentaje con badge verde).

- [ ] **Step 4: Implementar `CategoriesToolbar.tsx`**
  - Título dinámico ("Distribución por Categoría" / "Tabla de Rendimiento de Categorías").
  - Botones de modo gráfico: `Distribución` (Pie/Donut) y `Comparativa` (Barras).
  - Botones de vista: `Gráfico` y `Tabla`.
  - Botón `Exportar Excel` (visible en modo tabla).

- [ ] **Step 5: Implementar `CategoriesChartSection.tsx`**
  - Donut Chart con `recharts` mostrando cuota de mercado por ingresos o unidades.
  - Bar Chart horizontal con ingresos y costos por categoría.
  - Integración de Tooltips limpios y legibles.

- [ ] **Step 6: Implementar `CategoriesTable.tsx`**
  - Sub-tabs de filtrado: `Todos`, `Más vendidas`, `Mayor margen`, `Menor margen`.
  - Columnas: Categoría, Productos, Unidades Vendidas, Ingresos, Costos, Margen, Rentabilidad %, Participación (barra gráfica).
  - Footer de paginación sincronizado.

- [ ] **Step 7: Ejecutar test de componentes para verificar que pase**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec vitest run src/__tests__/features/reports/CategoriesComponents.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/reports/components/Categories*.tsx frontend/src/__tests__/features/reports/CategoriesComponents.test.tsx
git commit -m "feat(reports): add category presentation components and unit tests"
```

---

### Task 6: Frontend - Orquestador `ReportsCategoriesPage` e Integración en Rutas

**Files:**
- Create: `frontend/src/features/reports/pages/ReportsCategoriesPage.tsx`
- Modify: `frontend/src/features/reports/components/ReportsLayout.tsx`
- Modify: `frontend/src/router.tsx`
- Test: `frontend/src/__tests__/features/reports/ReportsCategoriesPage.test.tsx`
- Modify: `frontend/src/__tests__/features/reports/ReportsLayout.test.tsx`

- [ ] **Step 1: Escribir test de integración para `ReportsCategoriesPage`**

Verificar:
- Renderiza KPI cards, Toolbar y Gráfico inicialmente.
- Cambia entre vista Gráfica y Tabla al pulsar el selector.
- Aplica filtros de sub-tabs en la tabla.
- Exporta a Excel al hacer clic en Exportar.
- Muestra `ErrorBanner` con botón de reintento si la API falla.

- [ ] **Step 2: Ejecutar test para verificar que falle**

Run: `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec vitest run src/__tests__/features/reports/ReportsCategoriesPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `ReportsCategoriesPage.tsx`**
  - Orquestador de ~90-100 líneas.
  - Lee search params (`currency`, `from`, `to`).
  - Llama a `useCategoriesReport`.
  - Configura columnas y exportación con `exportToExcel`.
  - Distribuye props a los componentes de presentación.

- [ ] **Step 4: Registrar ruta en `frontend/src/router.tsx` y tab en `ReportsLayout.tsx`**
  - En `ReportsLayout.tsx`: agregar `{ to: \`categories?\${searchParams.toString()}\`, label: "Categorías" }` a `navItems`.
  - En `router.tsx`: agregar hijo `{ path: "categories", lazy: adminOnly(() => import("./features/reports/pages/ReportsCategoriesPage")) }`.

- [ ] **Step 5: Actualizar `ReportsLayout.test.tsx` para validar la existencia del nuevo tab "Categorías"**

- [ ] **Step 6: Ejecutar todos los tests de reportes y verificación de TypeScript**

Run:
```powershell
$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; cd frontend; pnpm exec tsc -b; pnpm exec vitest run src/__tests__/features/reports
```
Expected: PASS en todos los 14+ archivos de prueba y 0 errores de TypeScript.

- [ ] **Step 7: Ejecutar suite completa de backend**

Run:
```powershell
cd backend; python -m pytest tests/test_reports.py
```
Expected: 100% PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/reports/pages/ReportsCategoriesPage.tsx frontend/src/features/reports/components/ReportsLayout.tsx frontend/src/router.tsx frontend/src/__tests__/features/reports/ReportsCategoriesPage.test.tsx frontend/src/__tests__/features/reports/ReportsLayout.test.tsx
git commit -m "feat(reports): implement ReportsCategoriesPage orchestrator and route integration"
```
