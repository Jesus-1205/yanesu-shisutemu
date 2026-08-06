from decimal import Decimal
from datetime import date

from sqlalchemy import asc, case, desc, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.category import Category, producto_categoria
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.product import ProductCreate, ProductUpdate


def get_products(
    db: Session,
    *,
    categoria_ids: list[int] | None = None,
    proveedor_id: int | None = None,
    precio_min: float | None = None,
    precio_max: float | None = None,
    sin_stock: bool = False,
    search: str | None = None,
    stock_status: str | None = None,
    sort_by: str | None = None,
    order: str | None = None,
    tipo_iva: str | None = None,
    es_favorito: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    base_stmt = select(Product)

    if categoria_ids:
        base_stmt = (
            base_stmt.join(producto_categoria, producto_categoria.c.producto_id == Product.id)
            .where(producto_categoria.c.categoria_id.in_(categoria_ids))
        )
    if proveedor_id is not None:
        base_stmt = base_stmt.where(Product.proveedor_id == proveedor_id)
    if sin_stock:
        base_stmt = base_stmt.where(Product.stock_unidades == 0)
    if precio_min is not None:
        base_stmt = base_stmt.where(Product.precio_unidad_usd >= precio_min)
    if precio_max is not None:
        base_stmt = base_stmt.where(Product.precio_unidad_usd <= precio_max)
    if search:
        pattern = f"%{search}%"
        base_stmt = base_stmt.where(
            or_(Product.nombre.ilike(pattern), Product.codigo_barra.ilike(pattern))
        )
    if stock_status == "disponible":
        base_stmt = base_stmt.where(
            Product.stock_unidades > Product.stock_minimo
        )
    elif stock_status == "bajo":
        base_stmt = base_stmt.where(
            (Product.stock_unidades > 0) & (Product.stock_unidades <= Product.stock_minimo)
        )
    elif stock_status == "agotado":
        base_stmt = base_stmt.where(Product.stock_unidades == 0)
    if tipo_iva:
        base_stmt = base_stmt.where(Product.tipo_iva == tipo_iva)
    if es_favorito is not None:
        base_stmt = base_stmt.where(Product.es_favorito == es_favorito)

    # Count query using subquery to support join count correctly
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    # Main query with pagination
    stmt = base_stmt.options(selectinload(Product.categories))

    sort_map = {
        "nombre": Product.nombre,
        "stock": Product.stock_unidades,
        "precio": Product.precio_unidad_usd,
        "margen": case(
            (Product.precio_unidad_usd > 0,
             ((Product.precio_unidad_usd - Product.precio_costo_usd) / Product.precio_unidad_usd) * 100),
            else_=0,
        ),
    }
    if sort_by in sort_map:
        order_fn = desc if (order or "").lower() == "desc" else asc
        stmt = stmt.order_by(order_fn(sort_map[sort_by]))
    else:
        stmt = stmt.order_by(Product.nombre)

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    items = list(db.execute(stmt).scalars().all())

    import math
    pages = math.ceil(total / page_size) if page_size > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }



def get_product(db: Session, product_id: int) -> Product:
    stmt = select(Product).options(selectinload(Product.categories)).where(Product.id == product_id)
    product = db.execute(stmt).scalars().first()
    if not product:
        raise EntityNotFoundError("Producto no encontrado")
    return product


def create_product(db: Session, data: ProductCreate) -> Product:
    codigo_barra = data.codigo_barra if data.codigo_barra else None

    if codigo_barra:
        stmt = select(Product).where(Product.codigo_barra == codigo_barra)
        if db.execute(stmt).scalars().first():
            raise ConflictError("El código de barras ya está registrado")

    precio_costo_usd = (
        data.precio_costo_caja_usd / Decimal(data.unidades_por_caja)
    ).quantize(Decimal("0.01"))

    product = Product(
        codigo_barra=codigo_barra,
        nombre=data.nombre,
        unidades_por_caja=data.unidades_por_caja,
        stock_unidades=data.stock_unidades,
        stock_minimo=data.stock_minimo,
        precio_costo_caja_usd=data.precio_costo_caja_usd,
        precio_costo_usd=precio_costo_usd,
        precio_unidad_usd=data.precio_unidad_usd,
        precio_caja_usd=data.precio_caja_usd,
        proveedor_id=data.proveedor_id,
        tipo_iva=data.tipo_iva,
    )

    if data.categoria_ids:
        stmt = select(Category).where(Category.id.in_(data.categoria_ids))
        categories = list(db.execute(stmt).scalars().all())
        product.categories = categories

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    product = get_product(db, product_id)

    update_data = data.model_dump(exclude_unset=True)

    if "precio_costo_caja_usd" in update_data or "unidades_por_caja" in update_data:
        caja = update_data.get("precio_costo_caja_usd", product.precio_costo_caja_usd)
        uds = update_data.get("unidades_por_caja", product.unidades_por_caja)
        update_data["precio_costo_usd"] = (caja / Decimal(uds)).quantize(Decimal("0.01"))

    if "codigo_barra" in update_data:
        raw = update_data["codigo_barra"]
        if not raw:
            update_data["codigo_barra"] = None
        else:
            stmt = select(Product).where(
                Product.codigo_barra == raw, Product.id != product_id
            )
            if db.execute(stmt).scalars().first():
                raise ConflictError("El código de barras ya está en uso por otro producto")

    if "categoria_ids" in update_data:
        category_ids = update_data.pop("categoria_ids")
        if category_ids:
            stmt = select(Category).where(Category.id.in_(category_ids))
            product.categories = list(db.execute(stmt).scalars().all())
        else:
            product.categories = []

    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)

    if product.sale_items:
        raise ConflictError("No se puede eliminar un producto con ventas asociadas")

    db.delete(product)
    db.commit()


def get_top_selling(db: Session, limit: int = 10) -> list[tuple[Product, int]]:
    stmt = (
        select(Product, func.count(SaleItem.id).label("total_vendido"))
        .options(selectinload(Product.categories))
        .join(SaleItem, Product.id == SaleItem.producto_id)
        .group_by(Product.id)
        .order_by(func.count(SaleItem.id).desc())
        .limit(limit)
    )
    return [(row[0], row[1]) for row in db.execute(stmt).all()]


def get_top_margin(db: Session, limit: int = 10) -> list[Product]:
    margin_pct = case(
        (Product.precio_costo_usd > 0,
         ((Product.precio_unidad_usd - Product.precio_costo_usd) / Product.precio_costo_usd) * 100),
        else_=0,
    )
    stmt = (
        select(Product).options(selectinload(Product.categories))
        .where(Product.precio_costo_usd > 0)
        .order_by(margin_pct.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def get_lowest_margin(db: Session, limit: int = 10) -> list[Product]:
    margin_pct = case(
        (Product.precio_costo_usd > 0,
         ((Product.precio_unidad_usd - Product.precio_costo_usd) / Product.precio_costo_usd) * 100),
        else_=0,
    )
    stmt = (
        select(Product).options(selectinload(Product.categories))
        .where(Product.precio_costo_usd > 0)
        .order_by(margin_pct.asc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def get_low_rotation(db: Session, limit: int = 10) -> list[tuple[Product, int]]:
    stmt = (
        select(Product, func.count(SaleItem.id).label("total_vendido"))
        .options(selectinload(Product.categories))
        .outerjoin(SaleItem, Product.id == SaleItem.producto_id)
        .group_by(Product.id)
        .order_by(func.count(SaleItem.id).asc())
        .limit(limit)
    )
    return [(row[0], row[1]) for row in db.execute(stmt).all()]


def get_favorites(db: Session, limit: int = 10) -> dict:
    stmt = (
        select(Product)
        .options(selectinload(Product.categories))
        .where(Product.es_favorito == True)
        .order_by(Product.nombre)
        .limit(limit)
    )
    items = list(db.execute(stmt).scalars().all())
    count_stmt = select(func.count()).select_from(Product).where(Product.es_favorito == True)
    total = db.execute(count_stmt).scalar() or 0
    return {"items": items, "total": total}


def toggle_favorite(db: Session, product_id: int) -> Product:
    product = get_product(db, product_id)
    product.es_favorito = not product.es_favorito
    db.commit()
    db.refresh(product)
    return product


def get_product_matrix(
    db: Session,
    *,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    limit: int = 100,
) -> list[dict]:
    sale_item_q = select(SaleItem.producto_id, func.sum(SaleItem.cantidad).label("vendidas"))
    if fecha_desde is not None:
        sale_item_q = sale_item_q.join(Sale, SaleItem.venta_id == Sale.id).where(Sale.fecha_venta >= fecha_desde)
    if fecha_hasta is not None:
        if fecha_desde is None:
            sale_item_q = sale_item_q.join(Sale, SaleItem.venta_id == Sale.id)
        sale_item_q = sale_item_q.where(Sale.fecha_venta <= fecha_hasta)
    sale_item_q = sale_item_q.group_by(SaleItem.producto_id).subquery()

    stmt = (
        select(
            Product.id,
            Product.nombre,
            Product.precio_unidad_usd,
            Product.precio_costo_usd,
            Product.stock_unidades,
            func.coalesce(sale_item_q.c.vendidas, 0).label("total_vendido"),
        )
        .outerjoin(sale_item_q, Product.id == sale_item_q.c.producto_id)
        .order_by(func.coalesce(sale_item_q.c.vendidas, 0).desc())
        .limit(limit)
    )

    rows = db.execute(stmt).all()
    result = []
    for row in rows:
        precio_costo = row.precio_costo_usd or Decimal("0")
        precio_venta = row.precio_unidad_usd or Decimal("0")
        margen = ((precio_venta - precio_costo) / precio_venta * 100).quantize(Decimal("0.1")) if precio_venta > 0 else Decimal("0")
        result.append({
            "id": row.id,
            "nombre": row.nombre,
            "total_vendido": row.total_vendido,
            "precio_unidad_usd": precio_venta,
            "precio_costo_usd": precio_costo,
            "margen_porcentaje": margen,
            "stock_unidades": row.stock_unidades,
        })
    return result
