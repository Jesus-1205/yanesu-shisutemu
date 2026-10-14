from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.category import CategoryReportItemOut
from app.schemas.product import ProductMatrixOut
from app.schemas.sale import PaymentMethodSummaryOut
from app.services.category_service import get_category_report
from app.services.product_service import get_product_matrix
from app.services.sale_service import get_payment_method_summary

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/products-matrix", response_model=list[ProductMatrixOut])
def products_matrix(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /reports/products-matrix - Matriz de rendimiento productos

    Recibe: query params fecha_desde, fecha_hasta, limit
    Hace:   LEFT JOIN products -> sale_items (con filtro fecha), retorna todos los productos
    Devuelve: lista de {id, nombre, total_vendido, precio, costo, margen_porcentaje, stock}
    """
    return get_product_matrix(db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta, limit=limit)


@router.get("/payment-methods", response_model=list[PaymentMethodSummaryOut])
def payment_methods_summary(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /reports/payment-methods - Montos recibidos por método de pago

    Recibe: query params fecha_desde, fecha_hasta, cookie access_token
    Hace:   suma montos USD/VES de pagos agrupados por método activo,
            incluyendo métodos sin pagos con totales en 0
    Devuelve: lista de {metodo_pago_id, metodo_pago_nombre, moneda_default,
              cantidad_pagos, total_usd, total_ves}
    """
    return get_payment_method_summary(db, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)


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

