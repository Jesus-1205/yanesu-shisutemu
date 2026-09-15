from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.user import User
from app.schemas.sale import (
    CalculateRequest,
    CalculateResponse,
    SaleCreate,
    SaleOut,
    SalePaginationOut,
    TopWeekOut,
)
from app.services.audit_service import log_action
from app.services.sale_service import (
    calculate_sale,
    create_sale,
    current_day_range,
    current_week_range,
    get_sale,
    get_sales,
    get_sales_paginated,
    get_sales_summary,
    get_top_week_sales,
)

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: SaleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """POST /sales - Registrar nueva venta

    Recibe: JSON body con tasa_bcv, items y montos, cookie access_token
    Hace:   valida stock de cada item, descuenta inventario, recalcula y valida
            montos (exento/base/IVA) y cobertura de pagos, persiste venta
    Devuelve: 201 + venta creada | 422 validación | 404 producto | 409 stock |
              400 montos/pagos inconsistentes | 401/403
    """
    sale = create_sale(db, data, usuario_id=current_user.id)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CREAR", entidad="venta", entidad_id=sale.id, detalle=f"Creada venta ID {sale.id}")
    return SaleOut.model_validate(sale)


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    metodo_pago_ids: str | None = None,
    hora_desde: str | None = None,
    hora_hasta: str | None = None,
    limit: int = 50,
    page: int | None = None,
    page_size: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    pm_ids: list[int] | None = None
    if metodo_pago_ids:
        pm_ids = [int(x.strip()) for x in metodo_pago_ids.split(",") if x.strip()]

    if current_user.rol_nombre != "ADMINISTRADOR":
        if not fecha_desde and not fecha_hasta:
            fecha_desde, fecha_hasta = current_day_range()

    if page is not None and page_size is not None:
        result = get_sales_paginated(
            db,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            metodo_pago_ids=pm_ids,
            hora_desde=hora_desde,
            hora_hasta=hora_hasta,
            page=page,
            page_size=page_size,
        )
        return SalePaginationOut(
            items=[SaleOut.model_validate(s) for s in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            pages=result["pages"],
        )

    sales = get_sales(
        db,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        metodo_pago_ids=pm_ids,
        hora_desde=hora_desde,
        hora_hasta=hora_hasta,
        limit=limit,
    )
    return [SaleOut.model_validate(s) for s in sales]


@router.get("/top-week", status_code=status.HTTP_200_OK)
def top_week(
    rango: str = "semanal",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /sales/top-week - Período con mayor facturación últimos 2 meses (solo admin)

    Recibe: query param rango (semanal, quincenal, mensual, etc.), cookie access_token
    Hace:   agrupa ventas de los últimos 60 días por el período indicado,
            calcula total_usd + total_ves, retorna el período con mayor facturación
    Devuelve: 200 + {periodo, total_ventas, total_usd, total_ves} | 404 sin ventas
    """
    result = get_top_week_sales(db, rango=rango)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay ventas en los últimos 2 meses",
        )
    return result


@router.get("/summary", status_code=status.HTTP_200_OK)
def sales_summary(
    rango: str = "semanal",
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /sales/summary - Resumen de ventas agrupado (solo admin)

    Recibe: query params rango (diario/semanal/quincenal/mensual/trimestral/semestral),
            fecha_desde, fecha_hasta, cookie access_token
    Hace:   agrupa ventas por período y calcula totales
    Devuelve: 200 + lista de {periodo, total_ventas, total_usd, total_ves}
    """
    return get_sales_summary(
        db,
        rango=rango,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


@router.get("/{sale_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /sales/{sale_id} - Obtener venta por ID

    Recibe: sale_id en path, cookie access_token
    Hace:   busca venta en DB por ID, incluye items
    Devuelve: 200 + venta con items | 404 no encontrada | 401/403
    """
    sale = get_sale(db, sale_id)
    return SaleOut.model_validate(sale)


@router.post("/calculate", response_model=CalculateResponse, status_code=status.HTTP_200_OK)
def calculate(
    data: CalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """POST /sales/calculate - Calcular desglose de precios y totales para POS."""
    try:
        return calculate_sale(db, data)
    except (ConflictError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

