"""Módulo de siembra de datos de demostración (Seed Data) para Yanesu Shisutemu.

Implementa funciones de siembra idempotentes y compatibles con SQLite y PostgreSQL
utilizando SQLAlchemy 2.0 (select(), scalars()). Maneja montos monetarios estrictamente
con Decimal.
"""

from datetime import datetime, timedelta
from decimal import Decimal
import re
from typing import Any
import unicodedata
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.timezone import VE_TZ
from app.models.category import Category
from app.models.exchange_rate import ExchangeRate
from app.models.invoice import DetalleFactura, Factura, MonedaEnum, TipoDocumentoEnum
from app.models.invoice_payment import InvoicePayment
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.role import Role
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

