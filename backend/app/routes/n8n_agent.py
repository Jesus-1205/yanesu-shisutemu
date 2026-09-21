from datetime import date, time
from typing import List

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import verify_api_key
from app.core.timezone import ve_today
from app.models.api_key import ApiKey
from app.schemas.n8n_agent import (
    DailyReportOut,
    ExchangeRateToolOut,
    InvoiceSearchItem,
    PeakHoursItem,
    ProductSalesHistoryOut,
    ProductSearchToolItem,
    SaleSearchItem,
    SalesMetricsOut,
    TopSupplierItem,
    UserToolItem,
    WeeklyReportOut,
)
from app.services.audit_service import log_action
from app.services.n8n_agent_service import (
    get_daily_sales_report,
    get_exchange_rate_info,
    get_product_sales_history,
    get_sales_metrics,
    get_sales_peak_hours,
    get_system_users,
    get_top_suppliers,
    get_weekly_sales_report,
    search_invoices,
    search_products,
    search_sales,
)

router = APIRouter(prefix="/n8n", tags=["n8n-agent"])


def _audit(api_key: ApiKey, request: Request, endpoint: str, detail: str = ""):
    ip = request.client.host if request.client else "m2m"
    log_action(
        usuario=f"m2m:{api_key.name}",
        ip=ip,
        accion="CONSULTA_M2M",
        entidad="n8n_agent",
        detalle=f"{endpoint} - {detail}".strip(" -"),
    )


@router.get("/reports/daily", status_code=status.HTTP_200_OK, response_model=DailyReportOut)
def get_daily_report_endpoint(
    request: Request,
    target_date: date | None = Query(None, description="Fecha a consultar (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/reports/daily - Genera el reporte diario consolidado para Telegram."""
    _audit(api_key, request, "/reports/daily", f"date={target_date}")
    return get_daily_sales_report(db, target_date=target_date)


@router.get("/reports/weekly", status_code=status.HTTP_200_OK, response_model=WeeklyReportOut)
def get_weekly_report_endpoint(
    request: Request,
    target_date: date | None = Query(None, description="Fecha de referencia / corte (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/reports/weekly - Genera el reporte semanal consolidado (Lunes a Sábado) para Telegram."""
    _audit(api_key, request, "/reports/weekly", f"date={target_date}")
    return get_weekly_sales_report(db, target_date=target_date)


@router.get("/tools/products/search", status_code=status.HTTP_200_OK, response_model=List[ProductSearchToolItem])
def tool_search_products(
    request: Request,
    q: str | None = Query(None, description="Término de búsqueda de producto o código de barra"),
    low_stock: bool = Query(False, description="Filtrar sólo productos con stock crítico"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/products/search - Búsqueda de productos y consulta de stock."""
    _audit(api_key, request, "/tools/products/search", f"q={q} low_stock={low_stock}")
    return search_products(db, q=q, low_stock=low_stock, limit=limit)


@router.get("/tools/products/{product_id}/sales-history", status_code=status.HTTP_200_OK, response_model=ProductSalesHistoryOut)
def tool_product_sales_history(
    product_id: int,
    request: Request,
    start_date: date | None = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/products/{product_id}/sales-history - Consulta histórico de ventas de un producto específico."""
    _audit(api_key, request, f"/tools/products/{product_id}/sales-history", f"range={start_date} to {end_date}")
    return get_product_sales_history(db, product_id=product_id, start_date=start_date, end_date=end_date)


@router.get("/tools/sales/metrics", status_code=status.HTTP_200_OK, response_model=SalesMetricsOut)
def tool_sales_metrics(
    request: Request,
    start_date: date | None = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/sales/metrics - Métricas generales de ventas en un rango de fechas."""
    s_date = start_date or ve_today()
    e_date = end_date or s_date
    _audit(api_key, request, "/tools/sales/metrics", f"range={s_date} to {e_date}")
    return get_sales_metrics(db, start_date=s_date, end_date=e_date)


@router.get("/tools/sales/peak-hours", status_code=status.HTTP_200_OK, response_model=List[PeakHoursItem])
def tool_sales_peak_hours(
    request: Request,
    start_date: date | None = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    end_date: date | None = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/sales/peak-hours - Distribución y horarios pico de ventas."""
    s_date = start_date or ve_today()
    e_date = end_date or s_date
    _audit(api_key, request, "/tools/sales/peak-hours", f"range={s_date} to {e_date}")
    return get_sales_peak_hours(db, start_date=s_date, end_date=e_date)


@router.get("/tools/sales/search", status_code=status.HTTP_200_OK, response_model=List[SaleSearchItem])
def tool_search_sales(
    request: Request,
    target_date: date | None = Query(None, description="Fecha de venta (YYYY-MM-DD)"),
    start_time: time | None = Query(None, description="Hora inicial (HH:MM:SS o HH:MM)"),
    end_time: time | None = Query(None, description="Hora final (HH:MM:SS o HH:MM)"),
    product_name: str | None = Query(None, description="Filtro por nombre de producto vendido"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/sales/search - Búsqueda granular de tickets de ventas por rango horario o producto."""
    _audit(api_key, request, "/tools/sales/search", f"date={target_date} prod={product_name}")
    return search_sales(
        db,
        target_date=target_date,
        start_time=start_time,
        end_time=end_time,
        product_name=product_name,
        limit=limit,
    )


@router.get("/tools/invoices/search", status_code=status.HTTP_200_OK, response_model=List[InvoiceSearchItem])
def tool_search_invoices(
    request: Request,
    q: str | None = Query(None, description="Número de factura o nombre de proveedor"),
    product_name: str | None = Query(None, description="Nombre de producto contenido en la factura"),
    status: str | None = Query(None, description="Estado de pago: PENDIENTE, PARCIALMENTE_PAGADA, PAGADA"),
    due_after: date | None = Query(None, description="Fecha de vencimiento desde (YYYY-MM-DD)"),
    due_before: date | None = Query(None, description="Fecha de vencimiento hasta (YYYY-MM-DD)"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/invoices/search - Consulta y búsqueda de facturas de proveedores/compras."""
    _audit(api_key, request, "/tools/invoices/search", f"q={q} status={status}")
    return search_invoices(
        db,
        q=q,
        product_name=product_name,
        status=status,
        due_after=due_after,
        due_before=due_before,
        limit=limit,
    )


@router.get("/tools/system/exchange-rate", status_code=status.HTTP_200_OK, response_model=ExchangeRateToolOut)
def tool_exchange_rate(
    request: Request,
    history: bool = Query(False, description="Consultar histórico"),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/system/exchange-rate - Consulta la tasa de cambio actual y quién la actualizó."""
    _audit(api_key, request, "/tools/system/exchange-rate")
    return get_exchange_rate_info(db, history=history, limit=limit)


@router.get("/tools/system/users", status_code=status.HTTP_200_OK, response_model=List[UserToolItem])
def tool_users(
    request: Request,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/system/users - Consulta la lista de usuarios y roles del sistema."""
    _audit(api_key, request, "/tools/system/users")
    return get_system_users(db)


@router.get("/tools/system/top-suppliers", status_code=status.HTTP_200_OK, response_model=List[TopSupplierItem])
def tool_top_suppliers(
    request: Request,
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """GET /n8n/tools/system/top-suppliers - Consulta proveedores con mayor volumen de compras/facturación."""
    _audit(api_key, request, "/tools/system/top-suppliers")
    return get_top_suppliers(db, limit=limit)
