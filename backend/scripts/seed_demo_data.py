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
from sqlalchemy.orm import Session

from app.core.timezone import VE_TZ
from app.models.category import Category
from app.models.exchange_rate import ExchangeRate
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
