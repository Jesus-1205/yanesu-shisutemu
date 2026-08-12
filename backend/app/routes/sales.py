from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.product import Product
from app.models.user import User
from app.schemas.sale import (
    CalculateRequest,
    CalculateResponse,
    CalculateResponseItem,
    SaleCreate,
    SaleOut,
    SalePaginationOut,
    TopWeekOut,
)
from app.services.audit_service import log_action
from app.services.price_rule_service import get_active_divisas_prices, get_divisas_payment_method_ids
from app.services.combo_service import distribute_combo_price, get_combo as get_combo_by_id
from app.services.sale_service import (
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


@router.post("/calculate", status_code=status.HTTP_200_OK)
def calculate(
    data: CalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    divisas_prices = get_active_divisas_prices(db)
    divisas_method_ids = get_divisas_payment_method_ids(db)

    response_items: list[CalculateResponseItem] = []
    combo_items: list[CalculateResponseItem] = []
    total_usd = Decimal("0")
    total_divisas_usd = Decimal("0")
    total_normal_usd = Decimal("0")
    ahorro_usd = Decimal("0")

    for combo_req in data.combos:
        combo = get_combo_by_id(db, combo_req.combo_id)
        if not combo.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Combo '{combo.nombre}' no está activo",
            )

        combo_pm_ids = {pm.metodo_pago_id for pm in combo.payment_methods}
        divisas_method_ids |= combo_pm_ids

        selections: dict[int, list[tuple[int, int]]] = {}
        for sel in combo_req.selecciones:
            selections[sel.grupo_id] = list(zip(sel.productos, sel.cantidades))

        total_qtys = sum(sum(cantidad for _, cantidad in product_selections) for product_selections in selections.values())
        for qty_multiplier in range(combo_req.cantidad):
            distributed = distribute_combo_price(db, combo, selections)

            for d in distributed:
                producto_id = d["producto_id"]
                cantidad = d["cantidad"]
                precio_final = d["precio_unitario"]

                stmt = select(Product).where(Product.id == producto_id)
                product = db.execute(stmt).scalars().first()
                precio_normal = product.precio_unidad_usd if product else Decimal("0")

                total_divisas_usd += precio_final * Decimal(cantidad)
                total_usd += precio_final * Decimal(cantidad)
                ahorro_usd += (precio_normal - precio_final) * Decimal(cantidad)

                combo_items.append(CalculateResponseItem(
                    producto_id=producto_id,
                    producto_nombre=d.get("producto_nombre", ""),
                    tipo_empaque="UNIDAD",
                    cantidad=cantidad,
                    precio_unitario_usd=precio_final,
                    precio_original_usd=precio_normal,
                    usa_precio_divisas=True,
                ))

    for item in data.items:
        stmt = select(Product).where(Product.id == item.producto_id)
        product = db.execute(stmt).scalars().first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto ID {item.producto_id} no encontrado",
            )

        precio_normal = (
            product.precio_unidad_usd
            if item.tipo_empaque == "UNIDAD"
            else product.precio_caja_usd
        )

        if item.usa_precio_divisas:
            dp = divisas_prices.get(item.producto_id, {})
            precio_divisas = dp.get(item.tipo_empaque)
            if precio_divisas is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Producto ID {item.producto_id} no tiene precio divisas activo para {item.tipo_empaque}",
                )
            precio_final = precio_divisas
            ahorro_item = (precio_normal - precio_divisas) * Decimal(item.cantidad)
            total_divisas_usd += precio_final * Decimal(item.cantidad)
            ahorro_usd += ahorro_item
        else:
            precio_final = precio_normal
            total_normal_usd += precio_final * Decimal(item.cantidad)

        total_usd += precio_final * Decimal(item.cantidad)

        response_items.append(CalculateResponseItem(
            producto_id=item.producto_id,
            producto_nombre=product.nombre,
            tipo_empaque=item.tipo_empaque,
            cantidad=item.cantidad,
            precio_unitario_usd=precio_final,
            precio_original_usd=precio_normal,
            usa_precio_divisas=item.usa_precio_divisas,
        ))

    return CalculateResponse(
        items=response_items,
        total_usd=total_usd,
        total_divisas_usd=total_divisas_usd,
        total_normal_usd=total_normal_usd,
        ahorro_usd=ahorro_usd,
        metodos_divisas_disponibles=list(divisas_method_ids),
        combo_items=combo_items,
    )
