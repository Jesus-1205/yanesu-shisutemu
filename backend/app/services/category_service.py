from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.category import Category, producto_categoria
from app.models.product import Product
from app.models.sale import SaleItem
from app.services.product_service import _accent_fold, _accent_fold_pattern
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryAnalyticsOut,
    CategoryAnalyticsResponse,
    CategorySummaryResponse,
    CategoryDetailAnalyticsOut,
    CategoryDetailProductOut,
)


def get_categories(db: Session) -> list[Category]:
    stmt = select(Category).order_by(Category.nombre)
    return list(db.execute(stmt).scalars().all())


def get_categories_paginated(db: Session, page: int = 1, page_size: int = 20, search: str | None = None) -> dict:
    base = select(Category)
    if search and search.strip():
        pattern = f"%{_accent_fold_pattern(search.strip())}%"
        base = base.where(or_(_accent_fold(Category.nombre).ilike(pattern), _accent_fold(Category.descripcion).ilike(pattern)))
    count_stmt = base.with_only_columns(func.count(Category.id)).order_by(None)
    total = db.execute(count_stmt).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    stmt = base.order_by(Category.nombre).offset(offset).limit(page_size)
    items = list(db.execute(stmt).scalars().all())
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def get_category(db: Session, category_id: int) -> Category | None:
    stmt = select(Category).where(Category.id == category_id)
    return db.execute(stmt).scalars().first()


def create_category(db: Session, data: CategoryCreate) -> Category:
    stmt = select(Category).where(Category.nombre == data.nombre)
    existing = db.execute(stmt).scalars().first()
    if existing:
        raise ConflictError("La categoría ya existe")

    category = Category(
        nombre=data.nombre,
        descripcion=data.descripcion,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> Category:
    category = get_category(db, category_id)
    if not category:
        raise EntityNotFoundError("Categoría no encontrada")

    update_data = data.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        stmt = select(Category).where(Category.nombre == update_data["nombre"], Category.id != category_id)
        existing = db.execute(stmt).scalars().first()
        if existing:
            raise ConflictError("El nombre de la categoría ya está en uso")

    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    category = get_category(db, category_id)
    if not category:
        raise EntityNotFoundError("Categoría no encontrada")

    db.delete(category)
    db.commit()


def get_category_analytics(db: Session) -> CategoryAnalyticsResponse:
    ps = (
        select(
            producto_categoria.c.categoria_id,
            func.count(Product.id).label("total_productos"),
            func.coalesce(func.sum(Product.stock_cajas * Product.unidades_por_caja + Product.stock_unidades), 0).label("stock_total"),
        )
        .select_from(producto_categoria)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .group_by(producto_categoria.c.categoria_id)
    ).subquery()

    ss = (
        select(
            producto_categoria.c.categoria_id,
            func.coalesce(func.sum(SaleItem.unidades_descontadas), 0).label("unidades_vendidas"),
            func.coalesce(func.sum(SaleItem.subtotal_usd), 0).label("ingresos_usd"),
        )
        .select_from(producto_categoria)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(producto_categoria.c.categoria_id)
    ).subquery()

    product_margins = (
        select(
            producto_categoria.c.categoria_id,
            Product.precio_unidad_usd,
            Product.precio_costo_usd,
            func.coalesce(func.sum(SaleItem.unidades_descontadas), 0).label("uv"),
        )
        .select_from(producto_categoria)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(producto_categoria.c.categoria_id, Product.id, Product.precio_unidad_usd, Product.precio_costo_usd)
    ).subquery()

    stmt = (
        select(
            Category,
            func.coalesce(ps.c.total_productos, 0).label("total_productos"),
            func.coalesce(ps.c.stock_total, 0).label("stock_total"),
            func.coalesce(ss.c.unidades_vendidas, 0).label("unidades_vendidas"),
            func.coalesce(ss.c.ingresos_usd, 0).label("ingresos_usd"),
        )
        .outerjoin(ps, ps.c.categoria_id == Category.id)
        .outerjoin(ss, ss.c.categoria_id == Category.id)
        .order_by(Category.nombre)
    )

    rows = db.execute(stmt).all()

    pm_rows = db.execute(select(product_margins)).all()

    margins_by_category: dict[int, list[Decimal]] = {}
    for cat_id, p_unidad, p_costo, uv in pm_rows:
        uv = int(uv)
        if uv <= 0:
            continue
        precio_costo = Decimal(str(p_costo))
        if precio_costo > 0:
            margen_pct = ((Decimal(str(p_unidad)) - precio_costo) / Decimal(str(p_unidad))) * Decimal("100")
        else:
            margen_pct = Decimal("0")
        margins_by_category.setdefault(cat_id, []).append(margen_pct)

    categorias = []
    for c, tp, st, uv, iu in rows:
        cat_margins = margins_by_category.get(c.id, [])
        margen_promedio = (
            sum(cat_margins) / len(cat_margins) if cat_margins else Decimal("0")
        )
        categorias.append(CategoryAnalyticsOut(
            id=c.id,
            nombre=c.nombre,
            descripcion=c.descripcion,
            total_productos=int(tp),
            stock_total=int(st),
            margen_promedio=margen_promedio.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP),
            unidades_vendidas=int(uv),
            ingresos_usd=Decimal(str(iu)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        ))

    total_categorias = len(categorias)
    total_productos = sum(p.total_productos for p in categorias)
    stock_total = sum(p.stock_total for p in categorias)
    unidades_vendidas = sum(p.unidades_vendidas for p in categorias)
    ingresos_usd = sum((p.ingresos_usd for p in categorias), Decimal("0")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    margenes = [p.margen_promedio for p in categorias if p.total_productos > 0]
    margen_promedio_general = (sum(margenes) / len(margenes)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP) if margenes else Decimal("0")

    return CategoryAnalyticsResponse(
        total_categorias=total_categorias,
        total_productos=total_productos,
        stock_total=stock_total,
        margen_promedio_general=margen_promedio_general,
        unidades_vendidas=unidades_vendidas,
        ingresos_usd=ingresos_usd,
        categorias=categorias,
    )


def get_category_summary(db: Session) -> CategorySummaryResponse:
    total_categorias = db.execute(select(func.count(Category.id))).scalar() or 0
    total_productos = db.execute(select(func.count(Product.id))).scalar() or 0

    lider_stmt = (
        select(Category.nombre)
        .join(producto_categoria, producto_categoria.c.categoria_id == Category.id)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .join(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(Category.id, Category.nombre)
        .order_by(func.sum(SaleItem.subtotal_usd).desc())
        .limit(1)
    )
    categoria_lider = db.execute(lider_stmt).scalar()

    product_margins = (
        select(
            producto_categoria.c.categoria_id,
            Product.precio_unidad_usd,
            Product.precio_costo_usd,
            func.coalesce(func.sum(SaleItem.unidades_descontadas), 0).label("uv"),
        )
        .select_from(producto_categoria)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(producto_categoria.c.categoria_id, Product.id, Product.precio_unidad_usd, Product.precio_costo_usd)
    ).subquery()

    pm_rows = db.execute(select(product_margins)).all()
    margins_by_category: dict[int, list[Decimal]] = {}
    for cat_id, p_unidad, p_costo, uv in pm_rows:
        if int(uv) <= 0:
            continue
        p_costo_dec = Decimal(str(p_costo))
        p_unidad_dec = Decimal(str(p_unidad))
        if p_costo_dec > 0 and p_unidad_dec > 0:
            margen_pct = ((p_unidad_dec - p_costo_dec) / p_unidad_dec) * Decimal("100")
        else:
            margen_pct = Decimal("0")
        margins_by_category.setdefault(cat_id, []).append(margen_pct)

    mayor_margen_pct: Decimal | None = None
    for cat_id, margins in margins_by_category.items():
        if margins:
            avg_m = (sum(margins) / len(margins)).quantize(Decimal("0.1"))
            if mayor_margen_pct is None or avg_m > mayor_margen_pct:
                mayor_margen_pct = avg_m

    return CategorySummaryResponse(
        total_categorias=total_categorias,
        total_productos=total_productos,
        categoria_lider_nombre=categoria_lider,
        mayor_margen_porcentaje=mayor_margen_pct,
    )


def get_top_selling_categories(db: Session, limit: int = 10) -> list[tuple[Category, int]]:
    stmt = (
        select(Category, func.count(SaleItem.id).label("total_vendido"))
        .join(producto_categoria, producto_categoria.c.categoria_id == Category.id)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .join(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(Category.id)
        .order_by(func.count(SaleItem.id).desc())
        .limit(limit)
    )
    return [(row[0], row[1]) for row in db.execute(stmt).all()]


def get_top_margin_categories(db: Session, limit: int = 10) -> list[Category]:
    stmt = (
        select(Category)
        .join(producto_categoria, producto_categoria.c.categoria_id == Category.id)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .group_by(Category.id)
        .order_by(func.avg(Product.precio_unidad_usd - Product.precio_costo_usd).desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def get_lowest_margin_categories(db: Session, limit: int = 10) -> list[Category]:
    stmt = (
        select(Category)
        .join(producto_categoria, producto_categoria.c.categoria_id == Category.id)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .group_by(Category.id)
        .order_by(func.avg(Product.precio_unidad_usd - Product.precio_costo_usd).asc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def get_low_rotation_categories(db: Session, limit: int = 10) -> list[tuple[Category, int]]:
    stmt = (
        select(Category, func.count(SaleItem.id).label("total_vendido"))
        .join(producto_categoria, producto_categoria.c.categoria_id == Category.id)
        .join(Product, Product.id == producto_categoria.c.producto_id)
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(Category.id)
        .order_by(func.count(SaleItem.id).asc())
        .limit(limit)
    )
    return [(row[0], row[1]) for row in db.execute(stmt).all()]


def get_category_detail_analytics(db: Session, category_id: int) -> CategoryDetailAnalyticsOut | None:
    category = get_category(db, category_id)
    if not category:
        return None

    product_stats = (
        select(
            Product.id,
            Product.nombre,
            Product.codigo_barra,
            Product.stock_unidades,
            Product.precio_unidad_usd,
            Product.precio_costo_usd,
            func.coalesce(func.sum(SaleItem.unidades_descontadas), 0).label("unidades_vendidas"),
            func.coalesce(func.sum(SaleItem.subtotal_usd), 0).label("ingresos_usd"),
        )
        .select_from(Product)
        .join(producto_categoria, producto_categoria.c.producto_id == Product.id)
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .where(producto_categoria.c.categoria_id == category_id)
        .group_by(Product.id, Product.nombre, Product.codigo_barra, Product.stock_unidades, Product.precio_unidad_usd, Product.precio_costo_usd)
        .order_by(func.sum(SaleItem.unidades_descontadas).desc())
    )

    rows = db.execute(product_stats).all()

    top_productos: list[CategoryDetailProductOut] = []
    total_unidades = 0
    total_ingresos = Decimal("0")
    margenes: list[Decimal] = []

    for pid, pnombre, pcodigo, p_stock, p_precio_unidad, p_precio_costo, uv, iu in rows:
        uv = int(uv)
        iu = Decimal(str(iu)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        precio_costo = Decimal(str(p_precio_costo)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        precio_unidad = Decimal(str(p_precio_unidad)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        if precio_costo > 0:
            margen_pct = ((precio_unidad - precio_costo) / precio_unidad) * Decimal("100")
        else:
            margen_pct = Decimal("0")

        top_productos.append(CategoryDetailProductOut(
            id=pid,
            nombre=pnombre,
            codigo_barra=pcodigo,
            stock_unidades=int(p_stock),
            precio_unidad_usd=precio_unidad,
            unidades_vendidas=uv,
            ingresos_usd=iu,
            margen_porcentaje=margen_pct.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP),
        ))

        total_unidades += uv
        total_ingresos += iu
        if uv > 0:
            margenes.append(margen_pct)

    margen_promedio = (
        (sum(margenes) / len(margenes)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP) if margenes else Decimal("0")
    )

    distribucion_ventas = [
        CategoryDetailProductOut(
            id=p.id,
            nombre=p.nombre,
            codigo_barra=p.codigo_barra,
            stock_unidades=p.stock_unidades,
            precio_unidad_usd=p.precio_unidad_usd,
            unidades_vendidas=p.unidades_vendidas,
            ingresos_usd=p.ingresos_usd,
            margen_porcentaje=p.margen_porcentaje,
        )
        for p in top_productos
        if p.unidades_vendidas > 0
    ]

    return CategoryDetailAnalyticsOut(
        id=category.id,
        nombre=category.nombre,
        total_productos=len(top_productos),
        unidades_vendidas=total_unidades,
        ingresos_usd=total_ingresos.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        margen_promedio=margen_promedio,
        top_productos=top_productos,
        distribucion_ventas=distribucion_ventas,
    )
