from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.product import ProductMatrixOut
from app.services.product_service import get_product_matrix

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
