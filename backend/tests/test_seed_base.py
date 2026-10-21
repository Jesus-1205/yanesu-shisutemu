from decimal import Decimal
import pytest
from sqlalchemy import select

from app.models.category import Category
from app.models.exchange_rate import ExchangeRate
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.role import Role
from app.models.supplier import Supplier
from app.models.user import User
from scripts.demo_dataset import DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SUPPLIERS
from scripts.seed_demo_data import (
    seed_admin_user,
    seed_categories,
    seed_exchange_rates,
    seed_products,
    seed_roles_and_payment_methods,
    seed_suppliers,
)


def test_seed_roles_and_payment_methods(db_session):
    result = seed_roles_and_payment_methods(db_session)

    assert "admin_role_id" in result
    assert "operator_role_id" in result
    assert "payment_methods" in result

    admin_role = db_session.get(Role, result["admin_role_id"])
    operator_role = db_session.get(Role, result["operator_role_id"])
    assert admin_role is not None and admin_role.nombre == "ADMINISTRADOR"
    assert operator_role is not None and operator_role.nombre == "OPERADOR"

    pm_dict = result["payment_methods"]
    # Check that canonical names resolve to PaymentMethod instances
    for canonical in ["Pago Móvil", "Efectivo", "Punto de Venta", "Divisas"]:
        assert canonical in pm_dict
        assert isinstance(pm_dict[canonical], PaymentMethod)

    assert pm_dict["Divisas"].moneda_default == "USD"
    assert pm_dict["Pago Móvil"].acepta_referencia is True

    # Idempotency test: calling again returns the same IDs and no duplicate rows
    result2 = seed_roles_and_payment_methods(db_session)
    assert result2["admin_role_id"] == result["admin_role_id"]
    assert result2["operator_role_id"] == result["operator_role_id"]


def test_seed_admin_user(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])

    assert isinstance(admin, User)
    assert admin.username == "admin"
    assert admin.email == "admin@yanesu.demo"
    assert admin.rol_id == roles_pm["admin_role_id"]
    assert admin.is_active is True

    # Idempotency: calling again returns the same admin without error
    admin_again = seed_admin_user(db_session, roles_pm["admin_role_id"])
    assert admin_again.id == admin.id

    # Verify count of admin users is 1
    admins = db_session.execute(select(User).where(User.username == "admin")).scalars().all()
    assert len(admins) == 1


def test_seed_suppliers(db_session):
    suppliers = seed_suppliers(db_session)

    assert len(suppliers) == len(DEMO_SUPPLIERS)
    for s_data in DEMO_SUPPLIERS:
        name = s_data["nombre"]
        assert name in suppliers
        assert isinstance(suppliers[name], Supplier)
        assert suppliers[name].telefono == s_data["telefono"]
        assert suppliers[name].email == s_data["email"]

    # Idempotency
    suppliers_again = seed_suppliers(db_session)
    assert len(suppliers_again) == len(DEMO_SUPPLIERS)
    all_db_suppliers = db_session.execute(select(Supplier)).scalars().all()
    assert len(all_db_suppliers) == len(DEMO_SUPPLIERS)


def test_seed_categories(db_session):
    categories = seed_categories(db_session)

    assert len(categories) >= len(DEMO_CATEGORIES)
    for c_data in DEMO_CATEGORIES:
        name = c_data["nombre"]
        assert name in categories
        assert isinstance(categories[name], Category)
        assert categories[name].descripcion == c_data["descripcion"]

    # Idempotency
    categories_again = seed_categories(db_session)
    assert len(categories_again) == len(categories)


def test_seed_products(db_session):
    suppliers = seed_suppliers(db_session)
    categories = seed_categories(db_session)
    products = seed_products(db_session, suppliers, categories)

    assert len(products) >= 38
    assert len(products) == len(DEMO_PRODUCTS)

    for p in products:
        assert isinstance(p, Product)
        assert p.id is not None
        assert p.proveedor_id is not None
        assert len(p.categories) >= 1
        assert isinstance(p.precio_costo_usd, Decimal)
        assert isinstance(p.precio_unidad_usd, Decimal)
        assert p.precio_unidad_usd > p.precio_costo_usd

    # Idempotency: re-running does not duplicate products
    products_again = seed_products(db_session, suppliers, categories)
    assert len(products_again) == len(products)
    total_db_products = db_session.execute(select(Product)).scalars().all()
    assert len(total_db_products) == len(products)


def test_seed_exchange_rates(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])

    rates = seed_exchange_rates(db_session, admin.id, days=30)
    assert len(rates) == 30

    min_usd = min(r.tasa_usd for r in rates)
    max_usd = max(r.tasa_usd for r in rates)
    min_eur = min(r.tasa_eur for r in rates)
    max_eur = max(r.tasa_eur for r in rates)

    assert min_usd == Decimal("766.8603")
    assert max_usd == Decimal("883.3963")
    assert min_eur == Decimal("885.0795")
    assert max_eur == Decimal("993.1760")

    # Chronological ordering check
    for idx in range(len(rates) - 1):
        assert rates[idx].fecha_registro <= rates[idx + 1].fecha_registro
        assert rates[idx].tasa_usd <= rates[idx + 1].tasa_usd

    # Idempotency check: running again does not duplicate exchange rates
    rates_again = seed_exchange_rates(db_session, admin.id, days=30)
    assert len(rates_again) == 30
    total_db_rates = db_session.execute(select(ExchangeRate)).scalars().all()
    assert len(total_db_rates) == 30


def test_seed_base_full_flow(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])
    suppliers = seed_suppliers(db_session)
    categories = seed_categories(db_session)
    products = seed_products(db_session, suppliers, categories)

    assert len(products) >= 38
    rates = seed_exchange_rates(db_session, admin.id, days=30)
    assert len(rates) == 30
