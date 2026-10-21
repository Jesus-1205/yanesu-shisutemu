"""Módulo de siembra de datos de demostración (Seed Data) para Yanesu Shisutemu.

Implementa funciones de siembra idempotentes y compatibles con SQLite y PostgreSQL
utilizando SQLAlchemy 2.0 (select(), scalars()). Maneja montos monetarios estrictamente
con Decimal.
"""

import argparse
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
import re
import sys
from typing import Any
import unicodedata
from zoneinfo import ZoneInfo

# Asegurar que el directorio 'backend' esté en sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.core.database import SessionLocal
from app.core.timezone import VE_TZ
from app.models.category import Category, producto_categoria
from app.models.combo import ComboGroupProduct
from app.models.exchange_rate import ExchangeRate
from app.models.invoice import DetalleFactura, Factura, MonedaEnum, ObsequioFactura, TipoDocumentoEnum
from app.models.invoice_payment import InvoicePayment, InvoicePaymentReceipt
from app.models.payment_method import PaymentMethod
from app.models.price_rule import PriceRuleProduct
from app.models.product import Product
from app.models.retornable import RetornableProducto
from app.models.role import Role
from app.models.sale import Sale, SaleItem
from app.models.sale_payment import SalePayment
from app.models.supplier import Supplier
from app.models.user import User

try:
    from app.services.auth_service import get_password_hash
except ImportError:
    from app.services.auth_service import hash_password as get_password_hash

try:
    from scripts.demo_dataset import DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SUPPLIERS
except ImportError:
    from demo_dataset import DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SUPPLIERS


def _normalize_name(name: str) -> str:
    """Normaliza un nombre eliminando tildes, caracteres especiales y normalizando espacios."""
    n = unicodedata.normalize("NFKD", name).encode("ASCII", "ignore").decode("utf-8")
    return re.sub(r"[_\s]+", " ", n).strip().lower()


def seed_roles_and_payment_methods(db: Session) -> dict[str, Any]:
    """Siembra o reutiliza roles estándar y métodos de pago de forma idempotente."""
    # 1. Roles
    roles: dict[str, Role] = {}
    for role_name in ("ADMINISTRADOR", "OPERADOR"):
        stmt = select(Role).where(Role.nombre == role_name)
        role = db.execute(stmt).scalars().first()
        if role is None:
            role = Role(nombre=role_name)
            db.add(role)
            db.flush()
        roles[role_name] = role

    # 2. Métodos de pago estándar
    desired_pms = [
        {"canonical": "Pago Móvil", "moneda_default": "VES", "acepta_referencia": True, "activo": True},
        {"canonical": "Efectivo", "moneda_default": "VES", "acepta_referencia": False, "activo": True},
        {"canonical": "Punto de Venta", "moneda_default": "VES", "acepta_referencia": False, "activo": True},
        {"canonical": "Divisas", "moneda_default": "USD", "acepta_referencia": False, "activo": True},
    ]

    existing_pms = db.execute(select(PaymentMethod)).scalars().all()
    existing_by_norm = {_normalize_name(pm.nombre): pm for pm in existing_pms}

    pm_map: dict[str, PaymentMethod] = {}
    for item in desired_pms:
        norm = _normalize_name(item["canonical"])
        if norm in existing_by_norm:
            pm = existing_by_norm[norm]
            pm.moneda_default = item["moneda_default"]
            pm.acepta_referencia = item["acepta_referencia"]
            pm.activo = True
        else:
            pm = PaymentMethod(
                nombre=item["canonical"],
                moneda_default=item["moneda_default"],
                acepta_referencia=item["acepta_referencia"],
                activo=True,
            )
            db.add(pm)
            db.flush()
            existing_by_norm[norm] = pm

        pm_map[item["canonical"]] = pm
        pm_map[pm.nombre] = pm

    db.commit()

    return {
        "admin_role_id": roles["ADMINISTRADOR"].id,
        "operator_role_id": roles["OPERADOR"].id,
        "payment_methods": pm_map,
    }


def seed_admin_user(db: Session, role_id: int) -> User:
    """Siembra o reutiliza el usuario administrador demo."""
    stmt = select(User).where(User.username == "admin")
    admin = db.execute(stmt).scalars().first()
    if admin is not None:
        return admin

    admin = User(
        username="admin",
        email="admin@yanesu.demo",
        hashed_password=get_password_hash("admin123"),
        nombre_completo="Administrador Demo",
        rol_id=role_id,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def seed_suppliers(db: Session) -> dict[str, Supplier]:
    """Siembra proveedores del dataset demo o reutiliza existentes."""
    existing_suppliers = db.execute(select(Supplier)).scalars().all()
    by_name = {s.nombre: s for s in existing_suppliers}

    for s_data in DEMO_SUPPLIERS:
        name = s_data["nombre"]
        if name not in by_name:
            supplier = Supplier(
                nombre=name,
                telefono=s_data.get("telefono"),
                email=s_data.get("email"),
            )
            db.add(supplier)
            by_name[name] = supplier
        else:
            supplier = by_name[name]
            supplier.telefono = s_data.get("telefono")
            supplier.email = s_data.get("email")

    db.commit()
    all_suppliers = db.execute(select(Supplier)).scalars().all()
    return {s.nombre: s for s in all_suppliers}


def seed_categories(db: Session) -> dict[str, Category]:
    """Siembra categorías del dataset demo o reutiliza existentes."""
    existing_categories = db.execute(select(Category)).scalars().all()
    by_name = {c.nombre: c for c in existing_categories}

    for c_data in DEMO_CATEGORIES:
        name = c_data["nombre"]
        if name not in by_name:
            category = Category(
                nombre=name,
                descripcion=c_data.get("descripcion"),
            )
            db.add(category)
            by_name[name] = category
        else:
            category = by_name[name]
            if c_data.get("descripcion"):
                category.descripcion = c_data["descripcion"]

    db.commit()
    all_categories = db.execute(select(Category)).scalars().all()
    return {c.nombre: c for c in all_categories}


def seed_products(
    db: Session,
    suppliers: dict[str, Supplier],
    categories: dict[str, Category],
) -> list[Product]:
    """Siembra productos del dataset demo asociando proveedor y categoría."""
    existing_products = db.execute(select(Product)).scalars().all()
    by_name = {p.nombre: p for p in existing_products}
    by_code = {p.codigo_barra: p for p in existing_products if p.codigo_barra}

    created_or_found: list[Product] = []

    for p_data in DEMO_PRODUCTS:
        name = p_data["nombre"]
        barcode = p_data.get("codigo_barra")

        product = by_name.get(name) or (by_code.get(barcode) if barcode else None)

        supplier = suppliers.get(p_data.get("proveedor_nombre"))
        supplier_id = supplier.id if supplier else None
        category = categories.get(p_data.get("categoria"))

        if product is None:
            product = Product(
                nombre=name,
                codigo_barra=barcode,
                unidades_por_caja=p_data.get("unidades_por_caja", 1),
                stock_cajas=p_data.get("stock_cajas", 0),
                stock_unidades=p_data.get("stock_unidades", 0),
                stock_minimo=p_data.get("stock_minimo", 5),
                precio_costo_usd=p_data["precio_costo_usd"],
                precio_costo_caja_usd=p_data["precio_costo_caja_usd"],
                precio_unidad_usd=p_data["precio_unidad_usd"],
                precio_caja_usd=p_data["precio_caja_usd"],
                tipo_iva=p_data.get("tipo_iva", "GRAVADO"),
                es_favorito=p_data.get("es_favorito", False),
                proveedor_id=supplier_id,
            )
            if category:
                product.categories.append(category)
            db.add(product)
            by_name[name] = product
            if barcode:
                by_code[barcode] = product
        else:
            if category and category not in product.categories:
                product.categories.append(category)
            if supplier_id and product.proveedor_id != supplier_id:
                product.proveedor_id = supplier_id

        created_or_found.append(product)

    db.commit()
    for p in created_or_found:
        db.refresh(p)

    return created_or_found


def seed_exchange_rates(
    db: Session,
    user_id: int,
    days: int = 30,
) -> list[ExchangeRate]:
    """Siembra historial de tasas de cambio con interpolación lineal diaria."""
    try:
        tz = ZoneInfo("America/Caracas")
    except Exception:
        tz = VE_TZ

    now = datetime.now(tz)

    existing_rates = db.execute(
        select(ExchangeRate).order_by(ExchangeRate.fecha_registro.asc())
    ).scalars().all()

    if len(existing_rates) >= days:
        return existing_rates[:days]

    min_usd = Decimal("766.8603")
    max_usd = Decimal("883.3963")
    min_eur = Decimal("885.0795")
    max_eur = Decimal("993.1760")

    divisor = Decimal(str(days - 1)) if days > 1 else Decimal("1")
    step_usd = (max_usd - min_usd) / divisor
    step_eur = (max_eur - min_eur) / divisor

    rates_to_add: list[ExchangeRate] = []
    for i in range(days):
        tasa_usd = (min_usd + Decimal(str(i)) * step_usd).quantize(Decimal("0.0001"))
        tasa_eur = (min_eur + Decimal(str(i)) * step_eur).quantize(Decimal("0.0001"))
        fecha = now - timedelta(days=(days - 1 - i))

        rate = ExchangeRate(
            tasa_usd=tasa_usd,
            tasa_eur=tasa_eur,
            fecha_registro=fecha,
            registrado_por=user_id,
        )
        db.add(rate)
        rates_to_add.append(rate)

    db.commit()

    all_rates = db.execute(
        select(ExchangeRate).order_by(ExchangeRate.fecha_registro.asc())
    ).scalars().all()
    return all_rates


def _resolve_payment_method(
    payment_methods: dict[str, PaymentMethod],
    db: Session,
    hint: str,
) -> PaymentMethod:
    """Busca un método de pago por coincidencia en payment_methods o en la base de datos."""
    hint_norm = _normalize_name(hint)
    for name, pm in payment_methods.items():
        if hint_norm in _normalize_name(name):
            return pm
    if payment_methods:
        return next(iter(payment_methods.values()))
    pm = db.execute(
        select(PaymentMethod).where(PaymentMethod.activo.is_(True))
    ).scalars().first()
    if pm:
        return pm
    return db.execute(select(PaymentMethod)).scalars().first()


def seed_invoices(
    db: Session,
    suppliers: dict[str, Supplier],
    products: list[Product],
    user_id: int,
    payment_methods: dict[str, PaymentMethod],
    base_rate: Decimal,
) -> list[Factura]:
    """Siembra 10 facturas de proveedores con renglones y pagos de forma idempotente.

    Distribución:
    - 4 facturas PAGADA (fechas pasadas, pagos totales).
    - 3 facturas PARCIALMENTE_PAGADA (abonos del 35% al 50%).
    - 3 facturas PENDIENTE (recientes, con fechas límite futuras).
    """
    try:
        tz = ZoneInfo("America/Caracas")
    except Exception:
        tz = VE_TZ

    today = datetime.now(tz).date()
    rate_bs = Decimal(str(base_rate)).quantize(Decimal("0.01"))

    supplier_list = sorted(list(suppliers.values()), key=lambda s: s.id)
    if not supplier_list:
        supplier_list = list(db.execute(select(Supplier).order_by(Supplier.id)).scalars().all())

    # Agrupar productos por proveedor
    products_by_supplier: dict[int, list[Product]] = {}
    for p in products:
        if p.proveedor_id:
            products_by_supplier.setdefault(p.proveedor_id, []).append(p)

    invoices_config: list[dict[str, Any]] = [
        # 4 Facturas PAGADA
        {
            "supplier_idx": 0,
            "invoice_seq": 1,
            "fecha_factura": today - timedelta(days=25),
            "fecha_limite_pago": today - timedelta(days=10),
            "estado_pago": "PAGADA",
            "num_items": 2,
            "payments": [{"pct": Decimal("1.00"), "method": "Divisas", "day_offset": 5}],
        },
        {
            "supplier_idx": 1,
            "invoice_seq": 1,
            "fecha_factura": today - timedelta(days=20),
            "fecha_limite_pago": today - timedelta(days=5),
            "estado_pago": "PAGADA",
            "num_items": 3,
            "payments": [
                {"pct": Decimal("0.60"), "method": "Pago Móvil", "day_offset": 3},
                {"pct": Decimal("0.40"), "method": "Punto de Venta", "day_offset": 10},
            ],
        },
        {
            "supplier_idx": 2,
            "invoice_seq": 1,
            "fecha_factura": today - timedelta(days=15),
            "fecha_limite_pago": today - timedelta(days=3),
            "estado_pago": "PAGADA",
            "num_items": 4,
            "payments": [{"pct": Decimal("1.00"), "method": "Divisas", "day_offset": 4}],
        },
        {
            "supplier_idx": 3,
            "invoice_seq": 1,
            "fecha_factura": today - timedelta(days=10),
            "fecha_limite_pago": today - timedelta(days=1),
            "estado_pago": "PAGADA",
            "num_items": 2,
            "payments": [
                {"pct": Decimal("0.50"), "method": "Divisas", "day_offset": 2},
                {"pct": Decimal("0.50"), "method": "Pago Móvil", "day_offset": 5},
            ],
        },
        # 3 Facturas PARCIALMENTE_PAGADA
        {
            "supplier_idx": 4,
            "invoice_seq": 1,
            "fecha_factura": today - timedelta(days=12),
            "fecha_limite_pago": today + timedelta(days=5),
            "estado_pago": "PARCIALMENTE_PAGADA",
            "num_items": 2,
            "payments": [{"pct": Decimal("0.40"), "method": "Pago Móvil", "day_offset": 2}],
        },
        {
            "supplier_idx": 0,
            "invoice_seq": 2,
            "fecha_factura": today - timedelta(days=7),
            "fecha_limite_pago": today + timedelta(days=10),
            "estado_pago": "PARCIALMENTE_PAGADA",
            "num_items": 3,
            "payments": [{"pct": Decimal("0.35"), "method": "Divisas", "day_offset": 1}],
        },
        {
            "supplier_idx": 1,
            "invoice_seq": 2,
            "fecha_factura": today - timedelta(days=4),
            "fecha_limite_pago": today - timedelta(days=2),  # Vencida
            "estado_pago": "PARCIALMENTE_PAGADA",
            "num_items": 2,
            "payments": [{"pct": Decimal("0.50"), "method": "Punto de Venta", "day_offset": 1}],
        },
        # 3 Facturas PENDIENTE
        {
            "supplier_idx": 2,
            "invoice_seq": 2,
            "fecha_factura": today - timedelta(days=3),
            "fecha_limite_pago": today + timedelta(days=2),
            "estado_pago": "PENDIENTE",
            "num_items": 2,
            "payments": [],
        },
        {
            "supplier_idx": 3,
            "invoice_seq": 2,
            "fecha_factura": today - timedelta(days=1),
            "fecha_limite_pago": today + timedelta(days=5),
            "estado_pago": "PENDIENTE",
            "num_items": 3,
            "payments": [],
        },
        {
            "supplier_idx": 4,
            "invoice_seq": 2,
            "fecha_factura": today,
            "fecha_limite_pago": today + timedelta(days=8),
            "estado_pago": "PENDIENTE",
            "num_items": 2,
            "payments": [],
        },
    ]

    target_factura_ids: list[int] = []

    for i, cfg in enumerate(invoices_config):
        supplier = supplier_list[cfg["supplier_idx"] % len(supplier_list)]
        numero_factura = f"FAC-{supplier.id:02d}-{cfg['invoice_seq']:03d}"

        # Verificar si la factura ya existe (idempotencia)
        stmt_existing = select(Factura).where(
            Factura.proveedor_id == supplier.id,
            Factura.numero_factura == numero_factura,
        )
        existing = db.execute(stmt_existing).scalars().first()
        if existing is not None:
            target_factura_ids.append(existing.id)
            continue

        # Seleccionar productos para los renglones
        avail_products = products_by_supplier.get(supplier.id, [])
        if len(avail_products) < cfg["num_items"]:
            avail_products = avail_products + [p for p in products if p not in avail_products]

        num_items = min(cfg["num_items"], len(avail_products))
        chosen_products = avail_products[:num_items]

        # Crear renglones (DetalleFactura)
        detalles: list[DetalleFactura] = []
        quantities = [6, 4, 10, 8]

        for item_idx, prod in enumerate(chosen_products):
            cant = quantities[item_idx % len(quantities)]
            # Alternar tipo de empaque cuando haya costo por caja disponible
            if (
                item_idx % 2 == 0
                and prod.precio_costo_caja_usd is not None
                and prod.precio_costo_caja_usd > Decimal("0")
            ):
                tipo_empaque = "CAJA"
                costo_usd = prod.precio_costo_caja_usd
            else:
                tipo_empaque = "UNIDAD"
                costo_usd = prod.precio_costo_usd

            costo_bs = (costo_usd * rate_bs).quantize(Decimal("0.01"))
            tipo_iva = prod.tipo_iva if prod.tipo_iva in ("GRAVADO", "EXENTO") else "GRAVADO"

            detalle = DetalleFactura(
                producto_id=prod.id,
                tipo_empaque=tipo_empaque,
                cantidad=cant,
                costo_unitario_usd=costo_usd,
                costo_unitario_bs=costo_bs,
                tipo_iva=tipo_iva,
            )
            detalles.append(detalle)

        # Totales
        subtotal_usd = sum((Decimal(d.cantidad) * d.costo_unitario_usd for d in detalles), Decimal("0"))
        subtotal_gravado = sum(
            (Decimal(d.cantidad) * d.costo_unitario_usd for d in detalles if d.tipo_iva == "GRAVADO"),
            Decimal("0"),
        )
        iva_usd = (subtotal_gravado * Decimal("0.16")).quantize(Decimal("0.01"))
        total_usd = (subtotal_usd + iva_usd).quantize(Decimal("0.01"))
        total_bs = (total_usd * rate_bs).quantize(Decimal("0.01"))

        factura = Factura(
            proveedor_id=supplier.id,
            numero_factura=numero_factura,
            tipo_documento=TipoDocumentoEnum.FACTURA,
            fecha_factura=cfg["fecha_factura"],
            fecha_limite_pago=cfg["fecha_limite_pago"],
            usuario_id=user_id,
            moneda_principal=MonedaEnum.USD,
            tasa_bs=rate_bs,
            total_usd=total_usd,
            total_bs=total_bs,
            aplica_iva=True,
            estado_pago=cfg["estado_pago"],
            observaciones=f"Factura demo {cfg['estado_pago'].lower()} de {supplier.nombre}",
        )
        factura.detalles = detalles
        db.add(factura)
        db.flush()

        # Generar pagos asociados
        payments_cfg = cfg["payments"]
        cumulative_usd = Decimal("0.00")
        for p_idx, p_info in enumerate(payments_cfg):
            if cfg["estado_pago"] == "PAGADA" and p_idx == len(payments_cfg) - 1:
                # El último pago absorbe cualquier diferencia de centavos
                p_usd = total_usd - cumulative_usd
            else:
                p_usd = (total_usd * p_info["pct"]).quantize(Decimal("0.01"))
                cumulative_usd += p_usd

            p_bs = (p_usd * rate_bs).quantize(Decimal("0.01"))
            pm = _resolve_payment_method(payment_methods, db, p_info["method"])
            pay_date = cfg["fecha_factura"] + timedelta(days=p_info["day_offset"])
            pay_datetime = datetime.combine(pay_date, datetime.min.time(), tzinfo=tz)

            pago = InvoicePayment(
                factura_id=factura.id,
                metodo_pago_id=pm.id,
                monto_usd=p_usd,
                monto_bs=p_bs,
                tasa_bs=rate_bs,
                monto_mora=Decimal("0.00"),
                referencia=f"REF-{factura.numero_factura}-{p_idx + 1:02d}",
                observaciones=f"Pago demo ({p_info['method']})",
                fecha_pago=pay_datetime,
                usuario_id=user_id,
            )
            db.add(pago)

        target_factura_ids.append(factura.id)

    db.commit()

    # Cargar y retornar las 10 facturas con detalles y pagos precargados
    stmt_final = (
        select(Factura)
        .where(Factura.id.in_(target_factura_ids))
        .options(selectinload(Factura.detalles), selectinload(Factura.payments))
        .order_by(Factura.id.asc())
    )
    return list(db.execute(stmt_final).scalars().all())


def seed_sales(
    db: Session,
    products: list[Product],
    user_id: int,
    rates: list[ExchangeRate],
    payment_methods: dict[str, PaymentMethod],
    count: int = 75,
) -> list[Sale]:
    """Siembra ventas simuladas en una ventana de 30 días con distribución realista.

    Reglas:
    - Ponderación de fin de semana (Viernes y Sábado peso 3x, Domingo 2x, Lun-Jue 1x).
    - Horarios de venta entre 10:00 y 21:00 (hora local de Caracas).
    - Filtrado de productos disponibles (precio_unidad_usd > 0, excluyendo stock 0).
    - Entre 1 y 4 renglones por venta con desglose de empaque UNIDAD y CAJA.
    - Desglose estricto de base imponible, exento e IVA (16%).
    - Omisión estricta de columnas SQL Computed en la instanciación.
    - Métodos de pago (Divisas ~40%, Pago Móvil ~35%, Punto de Venta ~15%, Mixto ~10%).
    - Idempotencia: si ya existen >= 60 ventas, retorna las existentes.
    """
    existing_sales = db.execute(
        select(Sale)
        .options(
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.payments).selectinload(SalePayment.payment_method),
        )
        .order_by(Sale.fecha_venta.asc())
    ).scalars().all()

    if len(existing_sales) >= 60:
        return list(existing_sales)

    try:
        tz = ZoneInfo("America/Caracas")
    except Exception:
        tz = VE_TZ

    rates_by_date = {}
    for r in rates:
        dt_val = r.fecha_registro
        if hasattr(dt_val, "date"):
            rates_by_date[dt_val.date()] = r

    fallback_rate = rates[-1] if rates else None

    # Filtrar productos disponibles: precio_unidad_usd > 0 y stock > 0
    available_products = [
        p
        for p in products
        if p.precio_unidad_usd is not None
        and p.precio_unidad_usd > Decimal("0")
        and not (p.stock_cajas == 0 and p.stock_unidades == 0)
    ]
    if not available_products:
        return []

    available_products.sort(key=lambda p: p.id)

    # Fechas de los 30 días
    days_dates = sorted(rates_by_date.keys())
    if not days_dates:
        today = datetime.now(tz).date()
        days_dates = [today - timedelta(days=29 - i) for i in range(30)]

    def _day_weight(d) -> int:
        wd = d.weekday()
        if wd in (4, 5):  # Viernes y Sábado (3x)
            return 3
        elif wd == 6:     # Domingo (2x)
            return 2
        else:             # Lunes a Jueves (1x)
            return 1

    total_weight = sum(_day_weight(d) for d in days_dates)
    if total_weight == 0:
        total_weight = 1

    # Asignación de número de ventas por día con el método del resto mayor
    raw_counts = [(count * _day_weight(d)) / total_weight for d in days_dates]
    int_counts = [int(rc) for rc in raw_counts]
    remainders = [(raw_counts[idx] - int_counts[idx], idx) for idx in range(len(days_dates))]
    remainders.sort(key=lambda x: x[0], reverse=True)
    needed = count - sum(int_counts)
    for i in range(needed):
        int_counts[remainders[i][1]] += 1

    global_sale_idx = 0
    for day_idx, d in enumerate(days_dates):
        num_sales_today = int_counts[day_idx]
        rate_for_day = rates_by_date.get(d, fallback_rate)
        tasa_bcv = rate_for_day.tasa_usd if rate_for_day else Decimal("850.0000")
        historico_tasa_id = rate_for_day.id if rate_for_day else None

        for k in range(num_sales_today):
            sale_idx = global_sale_idx
            global_sale_idx += 1

            # Distribución de horas comerciales entre 10:00 y 20:50 Caracas
            minute_offset = int(15 + (k * 620) / max(num_sales_today, 1))
            hour = 10 + (minute_offset // 60)
            minute = minute_offset % 60
            second = (k * 17 + (d.day % 10)) % 60
            fecha_venta = datetime(d.year, d.month, d.day, hour, minute, second, tzinfo=tz)

            # Renglones por venta (1 a 4)
            num_items = 1 + (sale_idx % 4)
            chosen_products: list[Product] = []
            for it_i in range(num_items):
                prod = available_products[(sale_idx * 2 + it_i) % len(available_products)]
                if prod not in chosen_products:
                    chosen_products.append(prod)
            if not chosen_products:
                chosen_products = [available_products[0]]

            sale_items: list[SaleItem] = []
            item_exentos: list[Decimal] = []
            item_bases: list[Decimal] = []
            item_ivas: list[Decimal] = []

            for it_idx, prod in enumerate(chosen_products):
                can_caja = (
                    prod.precio_caja_usd is not None
                    and prod.precio_caja_usd > Decimal("0")
                    and prod.unidades_por_caja > 1
                )
                if can_caja and (sale_idx + it_idx) % 5 == 0:
                    tipo_empaque = "CAJA"
                    cantidad = 1 if ((sale_idx + it_idx) % 2 == 0) else 2
                    precio_unitario_usd = prod.precio_caja_usd
                    unidades_descontadas = cantidad * prod.unidades_por_caja
                else:
                    tipo_empaque = "UNIDAD"
                    cantidad = 1 + ((sale_idx + it_idx) % 4)
                    precio_unitario_usd = prod.precio_unidad_usd
                    unidades_descontadas = cantidad

                subtotal = (Decimal(str(cantidad)) * precio_unitario_usd).quantize(Decimal("0.01"))
                tipo_iva = prod.tipo_iva if prod.tipo_iva in ("GRAVADO", "EXENTO") else "GRAVADO"

                if tipo_iva == "GRAVADO":
                    iva_porcentaje = Decimal("16.00")
                    base_item = subtotal
                    exento_item = Decimal("0.00")
                    iva_item = (subtotal * Decimal("0.16")).quantize(Decimal("0.01"))
                else:
                    iva_porcentaje = Decimal("0.00")
                    base_item = Decimal("0.00")
                    exento_item = subtotal
                    iva_item = Decimal("0.00")

                item_exentos.append(exento_item)
                item_bases.append(base_item)
                item_ivas.append(iva_item)

                sale_item = SaleItem(
                    producto_id=prod.id,
                    tipo_empaque=tipo_empaque,
                    cantidad=cantidad,
                    unidades_descontadas=unidades_descontadas,
                    precio_unitario_usd=precio_unitario_usd,
                    iva_porcentaje=iva_porcentaje,
                    usa_precio_divisas=False,
                )
                sale_items.append(sale_item)

            monto_exento_usd = sum(item_exentos, Decimal("0.00"))
            base_imponible_usd = sum(item_bases, Decimal("0.00"))
            monto_iva_usd = sum(item_ivas, Decimal("0.00"))
            total_usd = (monto_exento_usd + base_imponible_usd + monto_iva_usd).quantize(Decimal("0.01"))

            sale = Sale(
                fecha_venta=fecha_venta,
                usuario_id=user_id,
                tasa_bcv_aplicada=tasa_bcv,
                historico_tasa_id=historico_tasa_id,
                observaciones=f"Venta demo #{sale_idx + 1:04d}",
                monto_exento_usd=monto_exento_usd,
                base_imponible_usd=base_imponible_usd,
                monto_iva_usd=monto_iva_usd,
            )
            sale.items = sale_items

            # Pagos
            pay_pattern = sale_idx % 20
            if pay_pattern < 8:  # 40% -> Divisas
                pm = _resolve_payment_method(payment_methods, db, "Divisas")
                sale.payments = [
                    SalePayment(
                        metodo_pago_id=pm.id,
                        referencia=None,
                        monto_usd=total_usd,
                        monto_ves=Decimal("0.00"),
                    )
                ]
            elif pay_pattern < 15:  # 35% -> Pago Móvil
                pm = _resolve_payment_method(payment_methods, db, "Pago Móvil")
                monto_ves = (total_usd * tasa_bcv).quantize(Decimal("0.01"))
                sale.payments = [
                    SalePayment(
                        metodo_pago_id=pm.id,
                        referencia=f"PAGOMOVIL-{sale_idx + 1:04d}",
                        monto_usd=Decimal("0.00"),
                        monto_ves=monto_ves,
                    )
                ]
            elif pay_pattern < 18:  # 15% -> Punto de Venta
                pm = _resolve_payment_method(payment_methods, db, "Punto de Venta")
                monto_ves = (total_usd * tasa_bcv).quantize(Decimal("0.01"))
                sale.payments = [
                    SalePayment(
                        metodo_pago_id=pm.id,
                        referencia=None,
                        monto_usd=Decimal("0.00"),
                        monto_ves=monto_ves,
                    )
                ]
            else:  # 10% -> Split (50% Divisas, 50% Pago Móvil)
                pm_usd = _resolve_payment_method(payment_methods, db, "Divisas")
                pm_ves = _resolve_payment_method(payment_methods, db, "Pago Móvil")
                half_usd = (total_usd / Decimal("2")).quantize(Decimal("0.01"))
                rem_usd = total_usd - half_usd
                rem_ves = (rem_usd * tasa_bcv).quantize(Decimal("0.01"))
                sale.payments = [
                    SalePayment(
                        metodo_pago_id=pm_usd.id,
                        referencia=None,
                        monto_usd=half_usd,
                        monto_ves=Decimal("0.00"),
                    ),
                    SalePayment(
                        metodo_pago_id=pm_ves.id,
                        referencia=f"PAGOMOVIL-{sale_idx + 1:04d}",
                        monto_usd=Decimal("0.00"),
                        monto_ves=rem_ves,
                    ),
                ]

            db.add(sale)

    db.commit()

    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.payments).selectinload(SalePayment.payment_method),
        )
        .order_by(Sale.fecha_venta.asc())
    )
    return list(db.execute(stmt).scalars().all())


def clean_demo_data(db: Session) -> dict[str, int]:
    """Elimina datos operacionales de demostración en orden inverso de claves foráneas.

    Orden de borrado:
    1. comprobantes_pago_facturas (InvoicePaymentReceipt)
    2. pagos_facturas (InvoicePayment)
    3. detalles_facturas (DetalleFactura)
    4. obsequios_factura (ObsequioFactura si existe)
    5. facturas (Factura)
    6. detalle_pagos (SalePayment)
    7. detalle_ventas (SaleItem)
    8. ventas (Sale)
    9. producto_categoria (tabla asociativa)
    10. productos (Product)
    11. historico_tasas (ExchangeRate)
    """
    cleaned: dict[str, int] = {}

    r = db.execute(delete(InvoicePaymentReceipt))
    cleaned["comprobantes_pago_facturas"] = max(0, r.rowcount or 0)

    r = db.execute(delete(InvoicePayment))
    cleaned["pagos_facturas"] = max(0, r.rowcount or 0)

    r = db.execute(delete(DetalleFactura))
    cleaned["detalles_facturas"] = max(0, r.rowcount or 0)

    try:
        r = db.execute(delete(ObsequioFactura))
        cleaned["obsequios_factura"] = max(0, r.rowcount or 0)
    except Exception:
        cleaned["obsequios_factura"] = 0

    r = db.execute(delete(Factura))
    cleaned["facturas"] = max(0, r.rowcount or 0)

    r = db.execute(delete(SalePayment))
    cleaned["detalle_pagos"] = max(0, r.rowcount or 0)

    r = db.execute(delete(SaleItem))
    cleaned["detalle_ventas"] = max(0, r.rowcount or 0)

    r = db.execute(delete(Sale))
    cleaned["ventas"] = max(0, r.rowcount or 0)

    r = db.execute(delete(producto_categoria))
    cleaned["producto_categoria"] = max(0, r.rowcount or 0)

    try:
        r = db.execute(delete(PriceRuleProduct))
        cleaned["price_rule_products"] = max(0, r.rowcount or 0)
    except Exception:
        cleaned["price_rule_products"] = 0

    try:
        r = db.execute(delete(ComboGroupProduct))
        cleaned["combo_group_products"] = max(0, r.rowcount or 0)
    except Exception:
        cleaned["combo_group_products"] = 0

    try:
        r = db.execute(delete(RetornableProducto))
        cleaned["retornable_productos"] = max(0, r.rowcount or 0)
    except Exception:
        cleaned["retornable_productos"] = 0

    r = db.execute(delete(Product))
    cleaned["productos"] = max(0, r.rowcount or 0)

    r = db.execute(delete(ExchangeRate))
    cleaned["historico_tasas"] = max(0, r.rowcount or 0)

    db.commit()
    return cleaned


def run_seed(db: Session, reset: bool = False) -> dict[str, int]:
    """Orquesta la siembra completa de datos de demostración en estricto orden de dependencias.

    Orden de ejecución:
    1. seed_roles_and_payment_methods(db)
    2. seed_admin_user(db, roles["admin_role_id"])
    3. seed_suppliers(db)
    4. seed_categories(db)
    5. seed_products(db, suppliers, categories)
    6. seed_exchange_rates(db, admin.id, days=30)
    7. seed_invoices(db, suppliers, products, admin.id, payment_methods, base_rate=latest_rate)
    8. seed_sales(db, products, admin.id, rates, payment_methods, count=75)
    """
    if reset:
        clean_demo_data(db)

    # 1. Roles y métodos de pago
    roles_info = seed_roles_and_payment_methods(db)
    payment_methods = roles_info["payment_methods"]

    # 2. Usuario administrador demo
    admin = seed_admin_user(db, roles_info["admin_role_id"])

    # 3. Proveedores
    suppliers = seed_suppliers(db)

    # 4. Categorías
    categories = seed_categories(db)

    # 5. Productos
    products = seed_products(db, suppliers, categories)

    # 6. Tasas de cambio (últimos 30 días)
    rates = seed_exchange_rates(db, admin.id, days=30)
    latest_rate = rates[-1].tasa_usd if rates else Decimal("850.0000")

    # 7. Facturas de compra
    invoices = seed_invoices(
        db,
        suppliers=suppliers,
        products=products,
        user_id=admin.id,
        payment_methods=payment_methods,
        base_rate=latest_rate,
    )

    # 8. Ventas simuladas
    sales = seed_sales(
        db,
        products=products,
        user_id=admin.id,
        rates=rates,
        payment_methods=payment_methods,
        count=75,
    )

    return {
        "suppliers": len(suppliers),
        "categories": len(categories),
        "products": len(products),
        "exchange_rates": len(rates),
        "invoices": len(invoices),
        "sales": len(sales),
    }


def run_migrations() -> None:
    """Ejecuta las migraciones pendientes de Alembic si el archivo alembic.ini existe."""
    backend_root = Path(__file__).resolve().parent.parent
    ini_path = backend_root / "alembic.ini"
    if ini_path.exists():
        try:
            from alembic.config import Config
            from alembic import command

            alembic_cfg = Config(str(ini_path))
            alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))
            command.upgrade(alembic_cfg, "head")
        except Exception as e:
            print(f"[!] Advertencia al ejecutar migraciones Alembic: {e}")


def main(argv: list[str] | None = None) -> int:
    """Punto de entrada CLI para la siembra de datos de demostración."""
    parser = argparse.ArgumentParser(
        description="Siembra de datos de demostración para Yanesu Shisutemu"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Limpia datos operacionales existentes antes de sembrar",
    )
    parser.add_argument(
        "--no-migrate",
        action="store_true",
        help="Omite la ejecución automática de migraciones Alembic",
    )
    args = parser.parse_args(argv)

    if not args.no_migrate:
        run_migrations()

    db = SessionLocal()
    try:
        summary = run_seed(db, reset=args.reset)

        print("=" * 60)
        print("          YANESU SHISUTEMU - DEMO SEED DATA")
        print("=" * 60)
        print("[*] Datos sembrados exitosamente:")
        print(f"    - Proveedores:        {summary['suppliers']}")
        print(f"    - Categorías:         {summary['categories']}")
        print(f"    - Productos:          {summary['products']}")
        print(f"    - Tasas de cambio:    {summary['exchange_rates']}")
        print(f"    - Facturas proveedor: {summary['invoices']}")
        print(f"    - Ventas simuladas:   {summary['sales']}")
        print("-" * 60)
        print("Credenciales de acceso demo:")
        print("    Usuario:    admin")
        print("    Contraseña: admin123")
        print("=" * 60)

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())



