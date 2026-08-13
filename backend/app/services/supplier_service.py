from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.product import Product
from app.models.sale import SaleItem
from app.models.supplier import Supplier
from app.services.product_service import _accent_fold, _accent_fold_pattern
from app.schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierAnalyticsOut,
    SupplierAnalyticsResponse,
    SupplierDetailAnalyticsOut,
    SupplierDetailProductOut,
)


def get_suppliers(db: Session, search: str | None = None) -> list[Supplier]:
    stmt = select(Supplier)
    if search:
        pattern = f"%{_accent_fold_pattern(search)}%"
        stmt = stmt.where(
            or_(
                _accent_fold(Supplier.nombre).ilike(pattern),
                Supplier.telefono.ilike(pattern),
                Supplier.email.ilike(pattern),
            )
        )
    stmt = stmt.order_by(Supplier.nombre)
    return list(db.execute(stmt).scalars().all())


def get_suppliers_paginated(db: Session, page: int = 1, page_size: int = 20) -> dict:
    total = db.execute(select(func.count(Supplier.id))).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    stmt = select(Supplier).order_by(Supplier.nombre).offset(offset).limit(page_size)
    items = list(db.execute(stmt).scalars().all())
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def get_supplier(db: Session, supplier_id: int) -> Supplier | None:
    stmt = select(Supplier).where(Supplier.id == supplier_id)
    return db.execute(stmt).scalars().first()


def create_supplier(db: Session, data: SupplierCreate) -> Supplier:
    stmt = select(Supplier).where(Supplier.nombre == data.nombre)
    if db.execute(stmt).scalars().first():
        raise ConflictError("El proveedor ya existe")

    supplier = Supplier(
        nombre=data.nombre,
        telefono=data.telefono,
        email=data.email,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def update_supplier(db: Session, supplier_id: int, data: SupplierUpdate) -> Supplier:
    supplier = get_supplier(db, supplier_id)
    if not supplier:
        raise EntityNotFoundError("Proveedor no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        stmt = select(Supplier).where(Supplier.nombre == update_data["nombre"], Supplier.id != supplier_id)
        if db.execute(stmt).scalars().first():
            raise ConflictError("El nombre del proveedor ya está en uso")

    for field, value in update_data.items():
        setattr(supplier, field, value)

    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(db: Session, supplier_id: int) -> None:
    supplier = get_supplier(db, supplier_id)
    if not supplier:
        raise EntityNotFoundError("Proveedor no encontrado")

    if supplier.products:
        raise ConflictError("No se puede eliminar un proveedor con productos asociados")

    db.delete(supplier)
    db.commit()


def get_supplier_analytics(db: Session) -> SupplierAnalyticsResponse:
    ps = (
        select(
            Product.proveedor_id,
            func.count(Product.id).label("total_productos"),
            func.coalesce(func.sum(Product.stock_unidades), 0).label("stock_total"),
        )
        .group_by(Product.proveedor_id)
    ).subquery()

    ss = (
        select(
            Product.proveedor_id,
            func.coalesce(func.sum(SaleItem.unidades_descontadas), 0).label("unidades_vendidas"),
            func.coalesce(func.sum(SaleItem.subtotal_usd), 0).label("ingresos_usd"),
        )
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(Product.proveedor_id)
    ).subquery()

    product_margins = (
        select(
            Product.proveedor_id,
            Product.precio_unidad_usd,
            Product.precio_costo_usd,
            func.coalesce(func.sum(SaleItem.unidades_descontadas), 0).label("uv"),
        )
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .group_by(Product.id, Product.proveedor_id, Product.precio_unidad_usd, Product.precio_costo_usd)
    ).subquery()

    stmt = (
        select(
            Supplier,
            func.coalesce(ps.c.total_productos, 0).label("total_productos"),
            func.coalesce(ps.c.stock_total, 0).label("stock_total"),
            func.coalesce(ss.c.unidades_vendidas, 0).label("unidades_vendidas"),
            func.coalesce(ss.c.ingresos_usd, 0).label("ingresos_usd"),
        )
        .outerjoin(ps, ps.c.proveedor_id == Supplier.id)
        .outerjoin(ss, ss.c.proveedor_id == Supplier.id)
        .order_by(Supplier.nombre)
    )

    rows = db.execute(stmt).all()

    pm_rows = db.execute(select(product_margins)).all()

    margins_by_supplier: dict[int, list[Decimal]] = {}
    for prov_id, p_unidad, p_costo, uv in pm_rows:
        uv = int(uv)
        if uv <= 0:
            continue
        precio_costo = Decimal(str(p_costo))
        if precio_costo > 0:
            margen_pct = ((Decimal(str(p_unidad)) - precio_costo) / Decimal(str(p_unidad))) * Decimal("100")
        else:
            margen_pct = Decimal("0")
        margins_by_supplier.setdefault(prov_id, []).append(margen_pct)

    proveedores = []
    for s, tp, st, uv, iu in rows:
        supplier_margins = margins_by_supplier.get(s.id, [])
        margen_promedio = (
            sum(supplier_margins) / len(supplier_margins) if supplier_margins else Decimal("0")
        )
        proveedores.append(SupplierAnalyticsOut(
            id=s.id,
            nombre=s.nombre,
            telefono=s.telefono,
            email=s.email,
            total_productos=int(tp),
            stock_total=int(st),
            margen_promedio=margen_promedio.quantize(Decimal("0.1")),
            unidades_vendidas=int(uv),
            ingresos_usd=Decimal(str(iu)),
        ))

    total_proveedores = len(proveedores)
    total_productos = sum(p.total_productos for p in proveedores)
    stock_total = sum(p.stock_total for p in proveedores)
    unidades_vendidas = sum(p.unidades_vendidas for p in proveedores)
    ingresos_usd = sum(p.ingresos_usd for p in proveedores)
    margenes = [p.margen_promedio for p in proveedores if p.total_productos > 0]
    margen_promedio_general = sum(margenes) / len(margenes) if margenes else Decimal("0")

    return SupplierAnalyticsResponse(
        total_proveedores=total_proveedores,
        total_productos=total_productos,
        stock_total=stock_total,
        margen_promedio_general=margen_promedio_general,
        unidades_vendidas=unidades_vendidas,
        ingresos_usd=ingresos_usd,
        proveedores=proveedores,
    )


def get_supplier_detail_analytics(db: Session, supplier_id: int) -> SupplierDetailAnalyticsOut | None:
    supplier = get_supplier(db, supplier_id)
    if not supplier:
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
        .outerjoin(SaleItem, SaleItem.producto_id == Product.id)
        .where(Product.proveedor_id == supplier_id)
        .group_by(Product.id, Product.nombre, Product.codigo_barra, Product.stock_unidades, Product.precio_unidad_usd, Product.precio_costo_usd)
        .order_by(func.sum(SaleItem.unidades_descontadas).desc())
    )

    rows = db.execute(product_stats).all()

    top_productos: list[SupplierDetailProductOut] = []
    total_stock = 0
    total_unidades = 0
    total_ingresos = Decimal("0")
    margenes: list[Decimal] = []

    for pid, pnombre, pcodigo, p_stock, p_precio_unidad, p_precio_costo, uv, iu in rows:
        uv = int(uv)
        iu = Decimal(str(iu))
        precio_costo = Decimal(str(p_precio_costo))
        precio_unidad = Decimal(str(p_precio_unidad))
        stock = int(p_stock)

        if precio_costo > 0:
            margen_pct = ((precio_unidad - precio_costo) / precio_unidad) * Decimal("100")
        else:
            margen_pct = Decimal("0")

        top_productos.append(SupplierDetailProductOut(
            id=pid,
            nombre=pnombre,
            codigo_barra=pcodigo,
            stock_unidades=stock,
            precio_unidad_usd=precio_unidad,
            unidades_vendidas=uv,
            ingresos_usd=iu,
            margen_porcentaje=margen_pct.quantize(Decimal("0.1")),
        ))

        total_stock += stock
        total_unidades += uv
        total_ingresos += iu
        if uv > 0:
            margenes.append(margen_pct)

    margen_promedio = (
        sum(margenes) / len(margenes) if margenes else Decimal("0")
    )

    return SupplierDetailAnalyticsOut(
        id=supplier.id,
        nombre=supplier.nombre,
        total_productos=len(top_productos),
        stock_total=total_stock,
        unidades_vendidas=total_unidades,
        ingresos_usd=total_ingresos,
        margen_promedio=margen_promedio.quantize(Decimal("0.1")),
        top_productos=top_productos,
    )
