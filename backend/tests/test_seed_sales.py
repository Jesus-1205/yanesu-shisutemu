from datetime import datetime
from decimal import Decimal
import pytest
from sqlalchemy import select

from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.sale_payment import SalePayment
from scripts.seed_demo_data import (
    seed_admin_user,
    seed_categories,
    seed_exchange_rates,
    seed_products,
    seed_roles_and_payment_methods,
    seed_sales,
    seed_suppliers,
)


@pytest.fixture
def sale_seed_context(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])
    suppliers = seed_suppliers(db_session)
    categories = seed_categories(db_session)
    products = seed_products(db_session, suppliers, categories)
    rates = seed_exchange_rates(db_session, admin.id, days=30)

    return {
        "products": products,
        "admin_id": admin.id,
        "rates": rates,
        "payment_methods": roles_pm["payment_methods"],
    }


def test_seed_sales_total_count_and_idempotency(db_session, sale_seed_context):
    ctx = sale_seed_context
    sales = seed_sales(
        db=db_session,
        products=ctx["products"],
        user_id=ctx["admin_id"],
        rates=ctx["rates"],
        payment_methods=ctx["payment_methods"],
        count=75,
    )

    assert len(sales) >= 60
    assert len(sales) == 75

    # Idempotency check: calling again does not create duplicate rows
    sales_again = seed_sales(
        db=db_session,
        products=ctx["products"],
        user_id=ctx["admin_id"],
        rates=ctx["rates"],
        payment_methods=ctx["payment_methods"],
        count=75,
    )

    assert len(sales_again) == len(sales)
    db_count = db_session.execute(select(Sale)).scalars().all()
    assert len(db_count) == len(sales)


def test_seed_sales_structure_items_and_zero_stock_exclusion(db_session, sale_seed_context):
    ctx = sale_seed_context
    sales = seed_sales(
        db=db_session,
        products=ctx["products"],
        user_id=ctx["admin_id"],
        rates=ctx["rates"],
        payment_methods=ctx["payment_methods"],
        count=75,
    )

    # Identificar productos que originalmente tenían 0 stock en cajas y unidades
    zero_stock_product_ids = {
        p.id for p in ctx["products"]
        if p.stock_cajas == 0 and p.stock_unidades == 0
    }
    assert len(zero_stock_product_ids) >= 1

    for sale in sales:
        assert len(sale.items) >= 1
        assert len(sale.items) <= 4
        assert len(sale.payments) >= 1

        for item in sale.items:
            assert isinstance(item.cantidad, int)
            assert item.cantidad > 0
            assert isinstance(item.unidades_descontadas, int)
            assert item.unidades_descontadas > 0
            assert item.tipo_empaque in ("UNIDAD", "CAJA")
            assert isinstance(item.precio_unitario_usd, Decimal)
            assert isinstance(item.iva_porcentaje, Decimal)
            assert item.producto_id not in zero_stock_product_ids

            if item.tipo_empaque == "UNIDAD":
                assert item.unidades_descontadas == item.cantidad
            else:
                assert item.unidades_descontadas == item.cantidad * item.product.unidades_por_caja


def test_seed_sales_monetary_precision_and_computed_columns(db_session, sale_seed_context):
    ctx = sale_seed_context
    sales = seed_sales(
        db=db_session,
        products=ctx["products"],
        user_id=ctx["admin_id"],
        rates=ctx["rates"],
        payment_methods=ctx["payment_methods"],
        count=75,
    )

    for sale in sales:
        assert isinstance(sale.monto_exento_usd, Decimal)
        assert isinstance(sale.base_imponible_usd, Decimal)
        assert isinstance(sale.monto_iva_usd, Decimal)
        assert isinstance(sale.total_usd, Decimal)
        assert isinstance(sale.tasa_bcv_aplicada, Decimal)
        assert isinstance(sale.total_ves, Decimal)

        expected_total_usd = (sale.monto_exento_usd + sale.base_imponible_usd + sale.monto_iva_usd).quantize(Decimal("0.01"))
        assert sale.total_usd == expected_total_usd

        expected_total_ves = (expected_total_usd * sale.tasa_bcv_aplicada).quantize(Decimal("0.01"))
        assert sale.total_ves == expected_total_ves


def test_seed_sales_payments_match_total(db_session, sale_seed_context):
    ctx = sale_seed_context
    sales = seed_sales(
        db=db_session,
        products=ctx["products"],
        user_id=ctx["admin_id"],
        rates=ctx["rates"],
        payment_methods=ctx["payment_methods"],
        count=75,
    )

    divisas_count = 0
    pagomovil_count = 0
    pos_count = 0
    split_count = 0

    for sale in sales:
        assert len(sale.payments) >= 1
        for p in sale.payments:
            assert isinstance(p.monto_usd, Decimal)
            assert isinstance(p.monto_ves, Decimal)

        if len(sale.payments) == 1:
            p = sale.payments[0]
            if p.monto_usd > Decimal("0.00"):
                divisas_count += 1
                assert p.monto_usd == sale.total_usd
                assert p.monto_ves == Decimal("0.00")
            else:
                expected_ves = (sale.total_usd * sale.tasa_bcv_aplicada).quantize(Decimal("0.01"))
                assert p.monto_ves == expected_ves
                assert p.monto_usd == Decimal("0.00")
                if p.referencia and "PAGOMOVIL" in p.referencia:
                    pagomovil_count += 1
                else:
                    pos_count += 1
        else:
            # Split payment
            split_count += 1
            assert len(sale.payments) == 2
            usd_part = next(p for p in sale.payments if p.monto_usd > Decimal("0.00"))
            ves_part = next(p for p in sale.payments if p.monto_ves > Decimal("0.00"))

            equiv_usd = (ves_part.monto_ves / sale.tasa_bcv_aplicada).quantize(Decimal("0.01"))
            assert (usd_part.monto_usd + equiv_usd) == sale.total_usd

    # Verify diversity of payment methods
    assert divisas_count > 0
    assert pagomovil_count > 0
    assert pos_count > 0
    assert split_count > 0


def test_seed_sales_weekend_peaks_and_business_hours(db_session, sale_seed_context):
    ctx = sale_seed_context
    sales = seed_sales(
        db=db_session,
        products=ctx["products"],
        user_id=ctx["admin_id"],
        rates=ctx["rates"],
        payment_methods=ctx["payment_methods"],
        count=75,
    )

    fri_sat_sales = 0
    fri_sat_days = set()
    mon_thu_sales = 0
    mon_thu_days = set()

    for sale in sales:
        dt = sale.fecha_venta
        # Caracas business hours: between 10:00 and 21:00
        assert 10 <= dt.hour <= 21

        wd = dt.weekday()
        day_key = dt.date()
        if wd in (4, 5):  # Friday, Saturday
            fri_sat_sales += 1
            fri_sat_days.add(day_key)
        elif wd in (0, 1, 2, 3):  # Monday to Thursday
            mon_thu_sales += 1
            mon_thu_days.add(day_key)

    avg_fri_sat = fri_sat_sales / max(len(fri_sat_days), 1)
    avg_mon_thu = mon_thu_sales / max(len(mon_thu_days), 1)

    # Weekend peak: Friday and Saturday daily average must be higher than Monday-Thursday
    assert avg_fri_sat > avg_mon_thu
