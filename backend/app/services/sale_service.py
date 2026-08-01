from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import VE_TZ
from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.sale import Sale, SaleItem

from app.models.sale_payment import SalePayment
from app.schemas.sale import SaleCreate, TopWeekOut


def _to_ve_boundary(
    value: datetime | date | None, *, end_of_day: bool = False
) -> datetime | None:
    """Convierte una fecha (string/date/datetime naive) al límite VE timezone-aware.

    `end_of_day=False` → 00:00:00 VE (para filtro `>=`).
    `end_of_day=True`  → 23:59:59.999999 VE (para filtro `<=`).
    """
    if value is None:
        return None
    day = value.date() if isinstance(value, datetime) else value
    if end_of_day:
        return datetime.combine(day, time.max, tzinfo=VE_TZ)
    return datetime.combine(day, time.min, tzinfo=VE_TZ)


def create_sale(db: Session, data: SaleCreate, usuario_id: int) -> Sale:
    items: list[SaleItem] = []
    for item_data in data.items:
        stmt = select(Product).where(Product.id == item_data.producto_id)
        product = db.execute(stmt).scalars().first()
        if not product:
            raise EntityNotFoundError(f"Producto ID {item_data.producto_id} no encontrado")

        if item_data.tipo_empaque == "CAJA":
            unidades = item_data.cantidad * product.unidades_por_caja
        else:
            unidades = item_data.cantidad

        if product.stock_unidades < unidades:
            raise ConflictError(
                f"Stock insuficiente para '{product.nombre}': "
                f"disponible {product.stock_unidades}, requerido {unidades}"
            )

        product.stock_unidades -= unidades

        items.append(SaleItem(
            producto_id=item_data.producto_id,
            tipo_empaque=item_data.tipo_empaque,
            cantidad=item_data.cantidad,
            unidades_descontadas=unidades,
            precio_unitario_usd=item_data.precio_unitario_usd,
            iva_porcentaje=item_data.iva_porcentaje,
        ))

    pagos: list[SalePayment] = []
    for pago_data in data.pagos:
        stmt = select(PaymentMethod).where(PaymentMethod.id == pago_data.metodo_pago_id)
        metodo = db.execute(stmt).scalars().first()
        if not metodo:
            raise EntityNotFoundError(f"Método de pago ID {pago_data.metodo_pago_id} no encontrado")
        if not metodo.activo:
            raise ConflictError(f"El método de pago '{metodo.nombre}' no está activo")

        pagos.append(SalePayment(
            metodo_pago_id=pago_data.metodo_pago_id,
            referencia=pago_data.referencia,
            monto_usd=pago_data.monto_usd,
            monto_ves=pago_data.monto_ves,
        ))

    sale = Sale(
        usuario_id=usuario_id,
        tasa_bcv_aplicada=data.tasa_bcv_aplicada,
        historico_tasa_id=data.historico_tasa_id,
        observaciones=data.observaciones,
        monto_exento_usd=data.monto_exento_usd,
        base_imponible_usd=data.base_imponible_usd,
        monto_iva_usd=data.monto_iva_usd,
        items=items,
        payments=pagos,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


def get_sales(
    db: Session,
    *,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    limit: int = 50,
) -> list[Sale]:
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.user),
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.payments),
        )
        .order_by(Sale.fecha_venta.desc())
        .limit(limit)
    )

    if fecha_desde:
        stmt = stmt.where(Sale.fecha_venta >= _to_ve_boundary(fecha_desde))
    if fecha_hasta:
        stmt = stmt.where(Sale.fecha_venta <= _to_ve_boundary(fecha_hasta, end_of_day=True))

    return list(db.execute(stmt).scalars().unique().all())


def get_sales_paginated(
    db: Session,
    *,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    base = select(Sale)
    if fecha_desde:
        base = base.where(Sale.fecha_venta >= _to_ve_boundary(fecha_desde))
    if fecha_hasta:
        base = base.where(Sale.fecha_venta <= _to_ve_boundary(fecha_hasta, end_of_day=True))

    total = db.execute(select(func.count()).select_from(base.subquery())).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    stmt = (
        base
        .options(
            selectinload(Sale.user),
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.payments),
        )
        .order_by(Sale.fecha_venta.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = list(db.execute(stmt).scalars().unique().all())
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def get_sale(db: Session, sale_id: int) -> Sale:
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.user),
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.payments),
        )
        .where(Sale.id == sale_id)
    )
    sale = db.execute(stmt).scalars().first()
    if not sale:
        raise EntityNotFoundError("Venta no encontrada")
    return sale


def _period_key(dt: datetime, rango: str) -> str:
    if dt.tzinfo is not None:
        dt = dt.astimezone(VE_TZ)
    if rango == "diario":
        return dt.strftime("%Y-%m-%d")
    if rango == "semanal":
        monday = dt - timedelta(days=dt.weekday())
        return monday.strftime("%Y-%m-%d")
    if rango == "quincenal":
        return dt.strftime("%Y-%m-01") if dt.day <= 15 else dt.strftime("%Y-%m-16")
    if rango == "mensual":
        return dt.strftime("%Y-%m")
    if rango == "trimestral":
        q = (dt.month - 1) // 3 + 1
        return f"{dt.year}-Q{q}"
    if rango == "semestral":
        h = 1 if dt.month <= 6 else 2
        return f"{dt.year}-H{h}"
    raise ValueError(f"Rango no válido: {rango}")


def get_sales_summary(
    db: Session,
    *,
    rango: str = "semanal",
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[dict]:
    stmt = select(Sale).order_by(Sale.fecha_venta)

    if fecha_desde:
        stmt = stmt.where(Sale.fecha_venta >= _to_ve_boundary(fecha_desde))
    if fecha_hasta:
        stmt = stmt.where(Sale.fecha_venta <= _to_ve_boundary(fecha_hasta, end_of_day=True))

    sales = list(db.execute(stmt).scalars().all())

    groups: dict[str, dict] = {}
    for sale in sales:
        key = _period_key(sale.fecha_venta, rango)
        if key not in groups:
            groups[key] = {
                "periodo": key,
                "total_ventas": 0,
                "total_usd": Decimal("0"),
                "total_ves": Decimal("0"),
            }
        groups[key]["total_ventas"] += 1
        groups[key]["total_usd"] += sale.total_usd or Decimal("0")
        groups[key]["total_ves"] += sale.total_ves or Decimal("0")

    return sorted(groups.values(), key=lambda x: x["periodo"])


def current_week_range() -> tuple[datetime, datetime]:
    now = datetime.now(VE_TZ)
    today = now.date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return (
        datetime.combine(monday, time.min, tzinfo=VE_TZ),
        datetime.combine(sunday, time.max, tzinfo=VE_TZ),
    )


def current_day_range() -> tuple[datetime, datetime]:
    now = datetime.now(VE_TZ)
    today = now.date()
    return (
        datetime.combine(today, time.min, tzinfo=VE_TZ),
        datetime.combine(today, time.max, tzinfo=VE_TZ),
    )


def get_top_week_sales(db: Session, rango: str = "semanal") -> TopWeekOut | None:
    dos_meses = datetime.now(timezone.utc) - timedelta(days=60)
    stmt = select(Sale).where(Sale.fecha_venta >= dos_meses)
    sales = list(db.execute(stmt).scalars().all())

    if not sales:
        return None

    groups: dict[str, dict] = {}
    for sale in sales:
        key = _period_key(sale.fecha_venta, rango)
        if key not in groups:
            groups[key] = {
                "periodo": key,
                "total_ventas": 0,
                "total_usd": Decimal("0"),
                "total_ves": Decimal("0"),
            }
        groups[key]["total_ventas"] += 1
        total_usd = (sale.monto_exento_usd or Decimal("0")) + (sale.base_imponible_usd or Decimal("0")) + (sale.monto_iva_usd or Decimal("0"))
        groups[key]["total_usd"] += total_usd
        groups[key]["total_ves"] += (total_usd * sale.tasa_bcv_aplicada).quantize(Decimal("0.01"))

    top = max(groups.values(), key=lambda x: x["total_usd"])
    return TopWeekOut(**top)