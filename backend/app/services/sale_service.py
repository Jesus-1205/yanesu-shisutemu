from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import VE_TZ
from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.combo import Combo, ComboGroup
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.sale import Sale, SaleItem

from app.models.sale_payment import SalePayment
from app.schemas.sale import PaymentMethodSummaryOut, SaleCreate, SaleItemCreate, TopWeekOut
from app.services.price_rule_service import get_active_divisas_prices, get_divisas_payment_method_ids

IVA_RATE = Decimal("16.00")
_TOLERANCIA_MONTOS = Decimal("0.01")


def _iva_rate_for(item_data: SaleItemCreate, product: Product) -> Decimal:
    """Tasa de IVA canónica de un ítem: combos y productos exentos no pagan IVA."""
    if item_data.combo_id or product.tipo_iva != "GRAVADO":
        return Decimal("0")
    return IVA_RATE


def _dentro_tolerancia(valor: Decimal, esperado: Decimal) -> bool:
    """El frontend redondea con floats; se tolera hasta 1 céntimo de diferencia."""
    return abs(valor - esperado) <= _TOLERANCIA_MONTOS


def _compute_sale_amounts(
    item_products: list[tuple[SaleItemCreate, Product]],
    combos_by_id: dict[int, Combo] | None = None,
) -> tuple[Decimal, Decimal, Decimal]:
    """Recalcula los montos canónicos (exento, base, IVA) de la venta.

    El backend es la fuente de verdad del dinero: cada subtotal y el IVA por
    ítem se redondean a céntimos con ROUND_HALF_UP (equivalente al POS).

    Un combo se cobra como unidad a su `precio_total_usd` (los productos
    constituyentes son una asignación interna que puede no sumar exacto por el
    redondeo del reparto). Si falta `combo_cantidad`, se usa la suma de los
    subtotales constituyentes para no rechazar clientes antiguos.
    """
    combos_by_id = combos_by_id or {}
    exento = Decimal("0")
    base = Decimal("0")
    iva = Decimal("0")
    combo_exento: dict[int, Decimal] = {}
    for item_data, product in item_products:
        if item_data.combo_id:
            combo_id = item_data.combo_id
            subtotal = (Decimal(item_data.cantidad) * item_data.precio_unitario_usd).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            combo_exento[combo_id] = combo_exento.get(combo_id, Decimal("0")) + subtotal
            combo = combos_by_id.get(combo_id)
            if combo is not None and item_data.combo_cantidad:
                combo_exento[combo_id] = (
                    Decimal(item_data.combo_cantidad) * combo.precio_total_usd
                ).quantize(Decimal("0.01"))
            continue

        iva_rate = _iva_rate_for(item_data, product)
        subtotal = (Decimal(item_data.cantidad) * item_data.precio_unitario_usd).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if iva_rate > 0:
            base += subtotal
            iva += (subtotal * iva_rate / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            exento += subtotal
    exento += sum(combo_exento.values())
    return (
        exento.quantize(Decimal("0.01")),
        base.quantize(Decimal("0.01")),
        iva.quantize(Decimal("0.01")),
    )


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
    item_products: list[tuple[SaleItemCreate, Product]] = []
    for item_data in data.items:
        stmt = select(Product).where(Product.id == item_data.producto_id)
        product = db.execute(stmt).scalars().first()
        if not product:
            raise EntityNotFoundError(f"Producto ID {item_data.producto_id} no encontrado")

        if item_data.tipo_empaque == "CAJA":
            if product.stock_cajas < item_data.cantidad:
                raise ConflictError(
                    f"Stock insuficiente de cajas para '{product.nombre}': "
                    f"disponible {product.stock_cajas} cajas, requerido {item_data.cantidad}"
                )
            product.stock_cajas -= item_data.cantidad
            unidades = item_data.cantidad * product.unidades_por_caja
        else:
            needed = item_data.cantidad
            tomar_sueltas = min(needed, product.stock_unidades)
            product.stock_unidades -= tomar_sueltas
            needed -= tomar_sueltas

            while needed > 0 and product.stock_cajas > 0:
                product.stock_cajas -= 1
                nuevas_sueltas = product.unidades_por_caja
                tomar = min(needed, nuevas_sueltas)
                product.stock_unidades = nuevas_sueltas - tomar
                needed -= tomar

            if needed > 0:
                total_disponible = (
                    product.stock_unidades + (product.stock_cajas * product.unidades_por_caja)
                )
                raise ConflictError(
                    f"Stock insuficiente para '{product.nombre}': "
                    f"disponible {total_disponible} unidades, requerido {item_data.cantidad}"
                )
            unidades = item_data.cantidad

        iva_rate = _iva_rate_for(item_data, product)
        items.append(SaleItem(
            producto_id=item_data.producto_id,
            tipo_empaque=item_data.tipo_empaque,
            cantidad=item_data.cantidad,
            unidades_descontadas=unidades,
            precio_unitario_usd=item_data.precio_unitario_usd,
            iva_porcentaje=iva_rate,
            usa_precio_divisas=item_data.usa_precio_divisas,
            combo_id=item_data.combo_id,
        ))
        item_products.append((item_data, product))

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

    divisas_prices = get_active_divisas_prices(db)
    divisas_method_ids = get_divisas_payment_method_ids(db)

    combo_ids_in_sale = {item_data.combo_id for item_data in data.items if item_data.combo_id}
    combos_by_id: dict[int, Combo] = {}
    for combo_id in combo_ids_in_sale:
        combo = db.execute(
            select(Combo).options(
                selectinload(Combo.groups).selectinload(ComboGroup.products),
                selectinload(Combo.payment_methods),
            ).where(Combo.id == combo_id)
        ).scalars().first()
        if not combo:
            raise EntityNotFoundError(f"Combo ID {combo_id} no encontrado")
        if not combo.activo:
            raise ConflictError(f"El combo '{combo.nombre}' no está activo")
        combos_by_id[combo.id] = combo

        combo_pm_ids = {pm.metodo_pago_id for pm in combo.payment_methods}
        divisas_method_ids |= combo_pm_ids

        combo_items = [
            (item_data, sale_item)
            for item_data, sale_item in zip(data.items, items)
            if item_data.combo_id == combo_id
        ]

        allowed_product_ids: set[int] = set()
        for group in combo.groups:
            for gp in group.products:
                allowed_product_ids.add(gp.producto_id)
        for item_data, _ in combo_items:
            if item_data.producto_id not in allowed_product_ids:
                raise ConflictError(
                    f"Producto ID {item_data.producto_id} no pertenece al combo '{combo.nombre}'"
                )

    total_divisas_items = Decimal("0")
    for item_data, sale_item in zip(data.items, items):
        if item_data.usa_precio_divisas:
            if item_data.combo_id:
                total_divisas_items += Decimal(item_data.cantidad) * item_data.precio_unitario_usd
            else:
                expected_prices = divisas_prices.get(item_data.producto_id, {})
                expected_price = expected_prices.get(item_data.tipo_empaque)
                if expected_price is None:
                    raise ConflictError(
                        f"Producto ID {item_data.producto_id} no tiene precio divisas "
                        f"activo para empaque {item_data.tipo_empaque}"
                    )
                if expected_price != item_data.precio_unitario_usd:
                    raise ConflictError(
                        f"Precio divisas inválido para producto ID {item_data.producto_id}: "
                        f"esperado {expected_price}, recibido {item_data.precio_unitario_usd}"
                    )
                total_divisas_items += Decimal(item_data.cantidad) * item_data.precio_unitario_usd

    if total_divisas_items > 0 and divisas_method_ids:
        total_divisas_pagado = sum(
            (p.monto_usd or Decimal("0"))
            for p in pagos
            if p.metodo_pago_id in divisas_method_ids
        )
        if total_divisas_pagado < total_divisas_items:
            faltante = total_divisas_items - total_divisas_pagado
            raise ConflictError(
                f"Faltan ${faltante:.2f} en divisas para cubrir los productos con descuento"
            )

    # ── Validación de montos: el backend es la fuente de verdad del dinero ──
    exento, base, iva = _compute_sale_amounts(item_products, combos_by_id)
    errores: list[str] = []
    if not _dentro_tolerancia(data.monto_exento_usd, exento):
        errores.append(f"monto_exento_usd: esperado {exento}, recibido {data.monto_exento_usd}")
    if not _dentro_tolerancia(data.base_imponible_usd, base):
        errores.append(f"base_imponible_usd: esperado {base}, recibido {data.base_imponible_usd}")
    if not _dentro_tolerancia(data.monto_iva_usd, iva):
        errores.append(f"monto_iva_usd: esperado {iva}, recibido {data.monto_iva_usd}")

    for item_data, product in item_products:
        iva_esperado = _iva_rate_for(item_data, product)
        if not _dentro_tolerancia(item_data.iva_porcentaje, iva_esperado):
            errores.append(
                f"producto {item_data.producto_id}: iva_porcentaje esperado {iva_esperado}, "
                f"recibido {item_data.iva_porcentaje}"
            )

    if errores:
        raise ValueError(
            "Montos inválidos en la venta. Recalcula el carrito e inténtalo de nuevo: "
            + "; ".join(errores)
        )

    total_usd = (exento + base + iva).quantize(Decimal("0.01"))

    # ── Cobertura de pagos: el cobro debe cubrir el total de la venta ──
    total_pagado_usd = Decimal("0")
    for pago in pagos:
        total_pagado_usd += pago.monto_usd or Decimal("0")
        if pago.monto_ves:
            total_pagado_usd += pago.monto_ves / data.tasa_bcv_aplicada
    total_pagado_usd = total_pagado_usd.quantize(Decimal("0.01"))
    if total_pagado_usd < total_usd - _TOLERANCIA_MONTOS:
        raise ValueError(
            f"Pagos insuficientes: total {total_usd} USD, pagado {total_pagado_usd} USD"
        )

    sale = Sale(
        usuario_id=usuario_id,
        tasa_bcv_aplicada=data.tasa_bcv_aplicada,
        historico_tasa_id=data.historico_tasa_id,
        observaciones=data.observaciones,
        monto_exento_usd=exento,
        base_imponible_usd=base,
        monto_iva_usd=iva,
        items=items,
        payments=pagos,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


def _payment_method_filter(
    metodo_pago_ids: list[int] | None,
):
    """WHERE EXISTS … si metodo_pago_ids no es None ni vacío."""
    if not metodo_pago_ids:
        return None
    return Sale.id.in_(
        select(SalePayment.venta_id).where(SalePayment.metodo_pago_id.in_(metodo_pago_ids))
    )


def get_sales(
    db: Session,
    *,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    metodo_pago_ids: list[int] | None = None,
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
    pm_filter = _payment_method_filter(metodo_pago_ids)
    if pm_filter is not None:
        stmt = stmt.where(pm_filter)

    return list(db.execute(stmt).scalars().unique().all())


def get_sales_paginated(
    db: Session,
    *,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
    metodo_pago_ids: list[int] | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    base = select(Sale)
    if fecha_desde:
        base = base.where(Sale.fecha_venta >= _to_ve_boundary(fecha_desde))
    if fecha_hasta:
        base = base.where(Sale.fecha_venta <= _to_ve_boundary(fecha_hasta, end_of_day=True))
    pm_filter = _payment_method_filter(metodo_pago_ids)
    if pm_filter is not None:
        base = base.where(pm_filter)

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


def get_payment_method_summary(
    db: Session,
    *,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> list[PaymentMethodSummaryOut]:
    """Resumen de montos recibidos por método de pago activo.

    Agrega en Python con Decimal para poder convertir cada pago en VES a su
    equivalente USD usando la tasa BCV de su venta (un pago puede cobrarse en
    VES incluso en un método cuya moneda default es USD). Incluye métodos
    activos sin pagos con totales en 0.
    """
    stmt = select(SalePayment, Sale.tasa_bcv_aplicada).join(Sale, Sale.id == SalePayment.venta_id)
    if fecha_desde:
        stmt = stmt.where(Sale.fecha_venta >= _to_ve_boundary(fecha_desde))
    if fecha_hasta:
        stmt = stmt.where(Sale.fecha_venta <= _to_ve_boundary(fecha_hasta, end_of_day=True))

    rows = db.execute(stmt).all()

    metodos_stmt = select(PaymentMethod).where(PaymentMethod.activo.is_(True))
    metodos = db.execute(metodos_stmt).scalars().all()

    agg: dict[int, dict] = {}
    for payment, tasa in rows:
        entry = agg.setdefault(payment.metodo_pago_id, {
            "cantidad_pagos": 0,
            "total_usd": Decimal("0"),
            "total_ves": Decimal("0"),
            "total_equivalente_usd": Decimal("0"),
        })
        entry["cantidad_pagos"] += 1
        entry["total_usd"] += payment.monto_usd or Decimal("0")
        entry["total_ves"] += payment.monto_ves or Decimal("0")
        usd_part = payment.monto_usd or Decimal("0")
        ves_part = payment.monto_ves or Decimal("0")
        if ves_part and tasa and Decimal(str(tasa)) > 0:
            usd_part += ves_part / Decimal(str(tasa))
        entry["total_equivalente_usd"] += usd_part

    result: list[PaymentMethodSummaryOut] = []
    for metodo in metodos:
        a = agg.get(metodo.id, {
            "cantidad_pagos": 0,
            "total_usd": Decimal("0"),
            "total_ves": Decimal("0"),
            "total_equivalente_usd": Decimal("0"),
        })
        result.append(PaymentMethodSummaryOut(
            metodo_pago_id=metodo.id,
            metodo_pago_nombre=metodo.nombre,
            moneda_default=metodo.moneda_default,
            cantidad_pagos=a["cantidad_pagos"],
            total_usd=a["total_usd"].quantize(Decimal("0.01")),
            total_ves=a["total_ves"].quantize(Decimal("0.01")),
            total_equivalente_usd=a["total_equivalente_usd"].quantize(Decimal("0.01")),
        ))

    result.sort(key=lambda r: r.total_equivalente_usd, reverse=True)
    return result