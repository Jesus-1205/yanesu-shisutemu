from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product
from app.models.supplier import Supplier


def get_dashboard_stats(db: Session) -> dict:
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
