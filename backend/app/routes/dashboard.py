from fastapi import APIRouter, Depends, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.models.supplier import Supplier
from app.schemas.dashboard import DashboardStatsOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsOut, status_code=status.HTTP_200_OK)
def dashboard_stats(db: Session = Depends(get_db)):
    """GET /dashboard/stats - Métricas del dashboard resueltas en una sola sentencia.

    Devuelve conteos de productos, sin stock, categorías y proveedores
    usando COUNTs y subconsultas escalares, sin cargar relaciones.
    """
    stock_total_expr = (
        Product.stock_cajas * Product.unidades_por_caja + Product.stock_unidades
    )

    stmt = select(
        func.count(Product.id).label("total_productos"),
        func.count(
            case((stock_total_expr == 0, Product.id), else_=None)
        ).label("sin_stock"),
        select(func.count(Category.id)).scalar_subquery().label("total_categorias"),
        select(func.count(Supplier.id)).scalar_subquery().label("total_proveedores"),
    )

    result = db.execute(stmt).mappings().one()

    return {
        "total_productos": result["total_productos"] or 0,
        "sin_stock": result["sin_stock"] or 0,
        "total_categorias": result["total_categorias"] or 0,
        "total_proveedores": result["total_proveedores"] or 0,
    }
