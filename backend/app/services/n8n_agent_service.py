from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List

from sqlalchemy import func, select, distinct, or_
from sqlalchemy.orm import Session, selectinload

from app.core.timezone import ve_today
from app.models.category import Category, producto_categoria
from app.models.exchange_rate import ExchangeRate
from app.models.invoice import Factura, DetalleFactura
from app.models.invoice_payment import InvoicePayment
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.sale_payment import SalePayment
from app.models.supplier import Supplier
from app.models.user import User
from app.services.exchange_rate_service import get_latest_rate


def get_daily_sales_report(db: Session, target_date: date | None = None) -> Dict[str, Any]:
    query_date = target_date or ve_today()
    date_str = query_date.isoformat()

    latest_rate = get_latest_rate(db)
    tasa_bcv = latest_rate.tasa_usd if latest_rate else Decimal("1.00")

    # Sales for the day
    sales_stmt = select(Sale).options(
        selectinload(Sale.payments).selectinload(SalePayment.payment_method),
        selectinload(Sale.items).selectinload(SaleItem.product),
    ).where(func.date(Sale.fecha_venta) == date_str)
    
    sales = db.execute(sales_stmt).scalars().all()

    total_usd = Decimal("0.00")
    total_bs = Decimal("0.00")
    transactions_count = len(sales)

    sales_by_method: Dict[str, Dict[str, Any]] = {}
    product_sales_count: Dict[str, int] = {}

    for sale in sales:
        total_usd += (sale.total_usd or Decimal("0.00"))
        total_bs += (sale.total_ves or Decimal("0.00"))

        for payment in sale.payments:
            method_name = payment.payment_method.nombre if payment.payment_method else "OTRO"
            if method_name not in sales_by_method:
                sales_by_method[method_name] = {
                    "usd": Decimal("0.00"),
                    "bs": Decimal("0.00"),
                    "tx_count": 0,
                }
            sales_by_method[method_name]["usd"] += (payment.monto_usd or Decimal("0.00"))
            sales_by_method[method_name]["bs"] += (payment.monto_ves or Decimal("0.00"))
            sales_by_method[method_name]["tx_count"] += 1

        for item in sale.items:
            p_name = item.product.nombre if item.product else f"Producto #{item.producto_id}"
            product_sales_count[p_name] = product_sales_count.get(p_name, 0) + item.cantidad

    for m in sales_by_method.values():
        m["usd"] = m["usd"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        m["bs"] = m["bs"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    total_usd = total_usd.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total_bs = total_bs.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    average_ticket_usd = (
        (total_usd / Decimal(transactions_count)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if transactions_count > 0
        else Decimal("0.00")
    )

    top_products_sorted = sorted(product_sales_count.items(), key=lambda x: x[1], reverse=True)[:5]
    top_products = [{"name": name, "qty": qty} for name, qty in top_products_sorted]

    return {
        "date": date_str,
        "tasa_bcv": tasa_bcv,
        "summary": {
            "total_usd": total_usd,
            "total_bs": total_bs,
            "transactions_count": transactions_count,
            "average_ticket_usd": average_ticket_usd,
        },
        "sales_by_method": sales_by_method,
        "top_products": top_products,
    }


def search_products(
    db: Session,
    q: str | None = None,
    low_stock: bool = False,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    stmt = select(Product).options(
        selectinload(Product.supplier),
        selectinload(Product.categories),
    )

    if q:
        q_clean = q.strip()
        stmt = stmt.where(
            or_(
                Product.nombre.ilike(f"%{q_clean}%"),
                Product.codigo_barra == q_clean,
            )
        )

    if low_stock:
        stmt = stmt.where(Product.stock_unidades <= Product.stock_minimo)

    stmt = stmt.order_by(Product.nombre).limit(limit)
    products = db.execute(stmt).scalars().all()

    results = []
    for p in products:
        results.append({
            "id": p.id,
            "codigo_barra": p.codigo_barra,
            "nombre": p.nombre,
            "unidades_por_caja": p.unidades_por_caja,
            "stock_cajas": p.stock_cajas,
            "stock_unidades": p.stock_unidades,
            "precio_unidad_usd": p.precio_unidad_usd,
            "precio_caja_usd": p.precio_caja_usd,
            "proveedor": p.supplier.nombre if p.supplier else None,
            "categorias": [c.nombre for c in p.categories],
        })
    return results


def get_product_sales_history(
    db: Session,
    product_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Dict[str, Any]:
    product = db.get(Product, product_id)
    product_name = product.nombre if product else f"Producto #{product_id}"

    stmt = (
        select(SaleItem)
        .join(SaleItem.sale)
        .where(SaleItem.producto_id == product_id)
    )

    if start_date:
        stmt = stmt.where(func.date(Sale.fecha_venta) >= start_date.isoformat())
    if end_date:
        stmt = stmt.where(func.date(Sale.fecha_venta) <= end_date.isoformat())

    items = db.execute(stmt).scalars().all()

    total_units_sold = sum(item.cantidad for item in items)
    total_revenue_usd = sum(
        (item.subtotal_usd or Decimal("0.00")) for item in items
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    sales_count = len({item.venta_id for item in items})

    return {
        "product_id": product_id,
        "product_name": product_name,
        "total_units_sold": total_units_sold,
        "total_revenue_usd": total_revenue_usd,
        "sales_count": sales_count,
    }


def get_sales_metrics(
    db: Session,
    start_date: date,
    end_date: date,
) -> Dict[str, Any]:
    sales_stmt = select(Sale).options(
        selectinload(Sale.payments).selectinload(SalePayment.payment_method),
        selectinload(Sale.items).selectinload(SaleItem.product).selectinload(Product.categories),
    ).where(
        func.date(Sale.fecha_venta) >= start_date.isoformat(),
        func.date(Sale.fecha_venta) <= end_date.isoformat(),
    )
    sales = db.execute(sales_stmt).scalars().all()

    total_usd = Decimal("0.00")
    total_bs = Decimal("0.00")
    transactions_count = len(sales)
    sales_by_method: Dict[str, Dict[str, Any]] = {}
    category_counts: Dict[str, int] = {}

    for sale in sales:
        total_usd += (sale.total_usd or Decimal("0.00"))
        total_bs += (sale.total_ves or Decimal("0.00"))

        for payment in sale.payments:
            method_name = payment.payment_method.nombre if payment.payment_method else "OTRO"
            if method_name not in sales_by_method:
                sales_by_method[method_name] = {
                    "usd": Decimal("0.00"),
                    "bs": Decimal("0.00"),
                    "tx_count": 0,
                }
            sales_by_method[method_name]["usd"] += (payment.monto_usd or Decimal("0.00"))
            sales_by_method[method_name]["bs"] += (payment.monto_ves or Decimal("0.00"))
            sales_by_method[method_name]["tx_count"] += 1

        for item in sale.items:
            if item.product:
                for cat in item.product.categories:
                    category_counts[cat.nombre] = category_counts.get(cat.nombre, 0) + item.cantidad

    top_category = None
    if category_counts:
        top_category = max(category_counts.items(), key=lambda x: x[1])[0]

    for m in sales_by_method.values():
        m["usd"] = m["usd"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        m["bs"] = m["bs"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_usd": total_usd.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "total_bs": total_bs.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "transactions_count": transactions_count,
        "top_category": top_category,
        "sales_by_method": sales_by_method,
    }


def get_sales_peak_hours(
    db: Session,
    start_date: date,
    end_date: date,
) -> List[Dict[str, Any]]:
    sales_stmt = select(Sale).where(
        func.date(Sale.fecha_venta) >= start_date.isoformat(),
        func.date(Sale.fecha_venta) <= end_date.isoformat(),
    )
    sales = db.execute(sales_stmt).scalars().all()

    hours_map: Dict[int, Dict[str, Any]] = {
        h: {"hour": h, "transactions_count": 0, "total_usd": Decimal("0.00")}
        for h in range(24)
    }

    for sale in sales:
        h = sale.fecha_venta.hour if sale.fecha_venta else 0
        hours_map[h]["transactions_count"] += 1
        hours_map[h]["total_usd"] += (sale.total_usd or Decimal("0.00"))

    for item in hours_map.values():
        item["total_usd"] = item["total_usd"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return [hours_map[h] for h in range(24) if hours_map[h]["transactions_count"] > 0]


def search_sales(
    db: Session,
    target_date: date | None = None,
    start_time: time | None = None,
    end_time: time | None = None,
    product_name: str | None = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    stmt = select(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.product),
        selectinload(Sale.user),
    )

    if target_date:
        stmt = stmt.where(func.date(Sale.fecha_venta) == target_date.isoformat())

    if product_name:
        stmt = stmt.join(Sale.items).join(SaleItem.product).where(
            Product.nombre.ilike(f"%{product_name.strip()}%")
        ).distinct()

    stmt = stmt.order_by(Sale.fecha_venta.desc()).limit(limit)
    sales = db.execute(stmt).scalars().all()

    results = []
    for sale in sales:
        sale_time = sale.fecha_venta.time() if sale.fecha_venta else None
        if start_time and sale_time and sale_time < start_time:
            continue
        if end_time and sale_time and sale_time > end_time:
            continue

        item_names = [
            f"{i.cantidad}x {i.product.nombre if i.product else 'Prod'}"
            for i in sale.items
        ]
        results.append({
            "id": sale.id,
            "tipo": "POS",
            "numero": f"V-{sale.id}",
            "fecha_hora": sale.fecha_venta.isoformat() if sale.fecha_venta else "",
            "total_usd": (sale.total_usd or Decimal("0.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "cliente": sale.usuario_nombre,
            "items": item_names,
        })
    return results


def search_invoices(
    db: Session,
    q: str | None = None,
    product_name: str | None = None,
    status: str | None = None,
    due_after: date | None = None,
    due_before: date | None = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    stmt = select(Factura).options(
        selectinload(Factura.supplier),
        selectinload(Factura.detalles).selectinload(DetalleFactura.product),
        selectinload(Factura.payments),
    )

    if q:
        q_clean = q.strip()
        stmt = stmt.join(Factura.supplier).where(
            or_(
                Factura.numero_factura.ilike(f"%{q_clean}%"),
                Supplier.nombre.ilike(f"%{q_clean}%"),
            )
        )

    if status:
        stmt = stmt.where(Factura.estado_pago == status.strip().upper())

    if due_after:
        stmt = stmt.where(Factura.fecha_limite_pago >= due_after)

    if due_before:
        stmt = stmt.where(Factura.fecha_limite_pago <= due_before)

    if product_name:
        stmt = stmt.join(Factura.detalles).join(DetalleFactura.product).where(
            Product.nombre.ilike(f"%{product_name.strip()}%")
        ).distinct()

    stmt = stmt.order_by(Factura.fecha_factura.desc()).limit(limit)
    invoices = db.execute(stmt).scalars().all()

    results = []
    for inv in invoices:
        total_pagado = sum(
            (p.monto_usd or Decimal("0.00")) for p in inv.payments
        )
        saldo_pendiente = max(Decimal("0.00"), (inv.total_usd or Decimal("0.00")) - total_pagado)
        items_desc = [
            f"{d.cantidad}x {d.product.nombre if d.product else 'Prod'}"
            for d in inv.detalles
        ]
        results.append({
            "id": inv.id,
            "numero_factura": inv.numero_factura,
            "cliente_nombre": inv.supplier.nombre if inv.supplier else "Proveedor Desconocido",
            "estado": inv.estado_pago,
            "total_usd": (inv.total_usd or Decimal("0.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "saldo_pendiente_usd": saldo_pendiente.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "fecha_emision": inv.fecha_factura.isoformat() if inv.fecha_factura else "",
            "fecha_vencimiento": inv.fecha_limite_pago.isoformat() if inv.fecha_limite_pago else None,
            "items": items_desc,
        })
    return results


def get_exchange_rate_info(db: Session, history: bool = False, limit: int = 5) -> Dict[str, Any]:
    latest = get_latest_rate(db)
    if not latest:
        return {
            "tasa_usd": Decimal("0.00"),
            "tasa_eur": Decimal("0.00"),
            "fecha_actualizacion": "",
            "ultima_modificacion_por": None,
        }

    return {
        "tasa_usd": latest.tasa_usd,
        "tasa_eur": latest.tasa_eur,
        "fecha_actualizacion": latest.fecha_registro.isoformat() if latest.fecha_registro else "",
        "ultima_modificacion_por": latest.registrado_por_nombre,
    }


def get_system_users(db: Session) -> List[Dict[str, Any]]:
    stmt = select(User).options(selectinload(User.role)).order_by(User.username)
    users = db.execute(stmt).scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "nombre_completo": u.nombre_completo,
            "rol": u.rol_nombre,
            "activo": u.is_active,
        }
        for u in users
    ]


def get_top_suppliers(db: Session, limit: int = 5) -> List[Dict[str, Any]]:
    stmt = (
        select(
            Supplier.id.label("supplier_id"),
            Supplier.nombre.label("supplier_name"),
            func.coalesce(func.sum(Factura.total_usd), Decimal("0.00")).label("total_usd"),
            func.count(Factura.id).label("invoices_count"),
        )
        .join(Factura, Factura.proveedor_id == Supplier.id, isouter=True)
        .group_by(Supplier.id, Supplier.nombre)
        .order_by(func.sum(Factura.total_usd).desc().nullslast())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    results = []
    for r in rows:
        results.append({
            "supplier_id": r.supplier_id,
            "supplier_name": r.supplier_name,
            "units_sold": r.invoices_count,  # Represented as invoices/purchases count
            "total_usd": Decimal(str(r.total_usd or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        })
    return results
