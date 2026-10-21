from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
import pytest
from sqlalchemy import func, select

from app.core.timezone import VE_TZ
from app.models.invoice import DetalleFactura, Factura
from app.models.invoice_payment import InvoicePayment
from scripts.seed_demo_data import (
    seed_admin_user,
    seed_categories,
    seed_exchange_rates,
    seed_invoices,
    seed_products,
    seed_roles_and_payment_methods,
    seed_suppliers,
)


@pytest.fixture
def invoice_seed_context(db_session):
    roles_pm = seed_roles_and_payment_methods(db_session)
    admin = seed_admin_user(db_session, roles_pm["admin_role_id"])
    suppliers = seed_suppliers(db_session)
    categories = seed_categories(db_session)
    products = seed_products(db_session, suppliers, categories)
    rates = seed_exchange_rates(db_session, admin.id, days=30)
    base_rate = rates[-1].tasa_usd

    return {
        "suppliers": suppliers,
        "products": products,
        "admin_id": admin.id,
        "payment_methods": roles_pm["payment_methods"],
        "base_rate": base_rate,
    }


def test_seed_invoices_creation_and_breakdown(db_session, invoice_seed_context):
    ctx = invoice_seed_context
    invoices = seed_invoices(
        db=db_session,
        suppliers=ctx["suppliers"],
        products=ctx["products"],
        user_id=ctx["admin_id"],
        payment_methods=ctx["payment_methods"],
        base_rate=ctx["base_rate"],
    )

    assert len(invoices) == 10

    pagadas = [inv for inv in invoices if inv.estado_pago == "PAGADA"]
    parciales = [inv for inv in invoices if inv.estado_pago == "PARCIALMENTE_PAGADA"]
    pendientes = [inv for inv in invoices if inv.estado_pago == "PENDIENTE"]

    assert len(pagadas) == 4
    assert len(parciales) == 3
    assert len(pendientes) == 3

    # Check distribution across available suppliers
    supplier_ids_used = {inv.proveedor_id for inv in invoices}
    all_supplier_ids = {s.id for s in ctx["suppliers"].values()}
    assert len(supplier_ids_used) == len(all_supplier_ids)


def test_seed_invoices_items_and_monetary_precision(db_session, invoice_seed_context):
    ctx = invoice_seed_context
    invoices = seed_invoices(
        db=db_session,
        suppliers=ctx["suppliers"],
        products=ctx["products"],
        user_id=ctx["admin_id"],
        payment_methods=ctx["payment_methods"],
        base_rate=ctx["base_rate"],
    )

    for inv in invoices:
        assert isinstance(inv.total_usd, Decimal)
        assert isinstance(inv.total_bs, Decimal)
        assert isinstance(inv.tasa_bs, Decimal)
        assert inv.total_usd > Decimal("0")
        assert inv.total_bs > Decimal("0")

        # 2 to 4 items per invoice
        assert 2 <= len(inv.detalles) <= 4

        subtotal_usd = Decimal("0")
        subtotal_gravado = Decimal("0")
        for d in inv.detalles:
            assert isinstance(d.cantidad, int)
            assert 2 <= d.cantidad <= 15
            assert d.tipo_empaque in ("CAJA", "UNIDAD")
            assert isinstance(d.costo_unitario_usd, Decimal)
            assert isinstance(d.costo_unitario_bs, Decimal)
            assert d.costo_unitario_usd > Decimal("0")
            assert d.costo_unitario_bs > Decimal("0")
            assert d.tipo_iva in ("GRAVADO", "EXENTO")

            expected_bs = (d.costo_unitario_usd * inv.tasa_bs).quantize(Decimal("0.01"))
            assert d.costo_unitario_bs == expected_bs

            line_usd = Decimal(d.cantidad) * d.costo_unitario_usd
            subtotal_usd += line_usd
            if d.tipo_iva == "GRAVADO":
                subtotal_gravado += line_usd

        iva_usd = (subtotal_gravado * Decimal("0.16")).quantize(Decimal("0.01")) if inv.aplica_iva else Decimal("0.00")
        expected_total_usd = (subtotal_usd + iva_usd).quantize(Decimal("0.01"))
        expected_total_bs = (expected_total_usd * inv.tasa_bs).quantize(Decimal("0.01"))

        assert inv.total_usd == expected_total_usd
        assert inv.total_bs == expected_total_bs


def test_seed_invoices_payments_and_deadlines(db_session, invoice_seed_context):
    ctx = invoice_seed_context
    invoices = seed_invoices(
        db=db_session,
        suppliers=ctx["suppliers"],
        products=ctx["products"],
        user_id=ctx["admin_id"],
        payment_methods=ctx["payment_methods"],
        base_rate=ctx["base_rate"],
    )

    try:
        tz = ZoneInfo("America/Caracas")
    except Exception:
        tz = VE_TZ
    today = datetime.now(tz).date()

    future_deadline_count = 0

    for inv in invoices:
        payments = inv.payments

        if inv.estado_pago == "PAGADA":
            assert 1 <= len(payments) <= 2
            sum_payments_usd = sum(p.monto_usd for p in payments)
            assert sum_payments_usd == inv.total_usd
            for p in payments:
                assert isinstance(p.monto_usd, Decimal)
                assert isinstance(p.monto_bs, Decimal)
                assert p.monto_bs == (p.monto_usd * inv.tasa_bs).quantize(Decimal("0.01"))
            assert inv.fecha_factura < today
            assert inv.fecha_limite_pago is not None and inv.fecha_limite_pago < today

        elif inv.estado_pago == "PARCIALMENTE_PAGADA":
            assert len(payments) == 1
            p = payments[0]
            assert isinstance(p.monto_usd, Decimal)
            assert isinstance(p.monto_bs, Decimal)
            assert p.monto_bs == (p.monto_usd * inv.tasa_bs).quantize(Decimal("0.01"))
            ratio = p.monto_usd / inv.total_usd
            assert Decimal("0.35") <= ratio <= Decimal("0.505")
            assert inv.fecha_factura < today

        elif inv.estado_pago == "PENDIENTE":
            assert len(payments) == 0
            if inv.fecha_limite_pago and inv.fecha_limite_pago > today:
                future_deadline_count += 1

    # At least 2 pending invoices have future deadlines
    assert future_deadline_count >= 2


def test_seed_invoices_idempotency(db_session, invoice_seed_context):
    ctx = invoice_seed_context
    invoices_first = seed_invoices(
        db=db_session,
        suppliers=ctx["suppliers"],
        products=ctx["products"],
        user_id=ctx["admin_id"],
        payment_methods=ctx["payment_methods"],
        base_rate=ctx["base_rate"],
    )
    assert len(invoices_first) == 10

    initial_facturas_count = db_session.execute(select(func.count(Factura.id))).scalar()
    initial_detalles_count = db_session.execute(select(func.count(DetalleFactura.id))).scalar()
    initial_payments_count = db_session.execute(select(func.count(InvoicePayment.id))).scalar()

    assert initial_facturas_count == 10

    # Call second time
    invoices_second = seed_invoices(
        db=db_session,
        suppliers=ctx["suppliers"],
        products=ctx["products"],
        user_id=ctx["admin_id"],
        payment_methods=ctx["payment_methods"],
        base_rate=ctx["base_rate"],
    )
    assert len(invoices_second) == 10

    second_facturas_count = db_session.execute(select(func.count(Factura.id))).scalar()
    second_detalles_count = db_session.execute(select(func.count(DetalleFactura.id))).scalar()
    second_payments_count = db_session.execute(select(func.count(InvoicePayment.id))).scalar()

    assert second_facturas_count == initial_facturas_count
    assert second_detalles_count == initial_detalles_count
    assert second_payments_count == initial_payments_count
