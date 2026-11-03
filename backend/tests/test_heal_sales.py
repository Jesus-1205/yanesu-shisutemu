from decimal import Decimal
import logging
from unittest.mock import MagicMock
import pytest
from sqlalchemy import text, select, bindparam, DECIMAL
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.schemas.product import ProductCreate
from app.services.product_service import create_product
from app.core.first_run import heal_sales_totals, initialize_database


@pytest.fixture
def test_product(db_session):
    return create_product(
        db_session,
        ProductCreate(
            nombre="Producto Heal Test",
            precio_costo_caja_usd=Decimal("12.00"),
            precio_unidad_usd=Decimal("1.00"),
            precio_caja_usd=Decimal("12.00"),
            stock_unidades=100,
            stock_cajas=0,
            unidades_por_caja=12,
            tipo_iva="EXENTO",
        ),
    )


def test_heal_sales_totals_repairs_zero_records(db_session, test_user, test_product):
    # Insertar registros raw con subtotal y total en 0
    tasa = Decimal("100.0000")
    db_session.execute(
        text("""
        INSERT INTO ventas (id, usuario_id, tasa_bcv_aplicada, monto_exento_usd, base_imponible_usd, monto_iva_usd, total_usd, total_ves, monto_exento_ves, base_imponible_ves, monto_iva_ves)
        VALUES (999, :uid, :tasa, 5.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
        """).bindparams(bindparam("tasa", type_=DECIMAL)),
        {"uid": test_user.id, "tasa": tasa}
    )
    db_session.execute(
        text("""
        INSERT INTO detalle_ventas (id, venta_id, producto_id, tipo_empaque, cantidad, unidades_descontadas, precio_unitario_usd, subtotal_usd, iva_porcentaje, usa_precio_divisas)
        VALUES (999, 999, :pid, 'UNIDAD', 5, 5, 1.00, 0.00, 0.00, 0)
        """),
        {"pid": test_product.id}
    )
    db_session.commit()
    
    # Ejecutar reparador
    heal_sales_totals(db_session)
    
    sale = db_session.execute(select(Sale).where(Sale.id == 999)).scalar_one()
    item = db_session.execute(select(SaleItem).where(SaleItem.id == 999)).scalar_one()
    
    assert item.subtotal_usd == Decimal("5.00")
    assert sale.total_usd == Decimal("5.00")
    assert sale.total_ves == Decimal("500.00")
    assert sale.monto_exento_ves == Decimal("500.00")


def test_heal_sales_totals_repairs_gravado_with_iva(db_session, test_user, test_product):
    # Insertar registros con base_imponible_usd y monto_iva_usd pero total_usd = 0
    tasa = Decimal("50.0000")
    db_session.execute(
        text("""
        INSERT INTO ventas (id, usuario_id, tasa_bcv_aplicada, monto_exento_usd, base_imponible_usd, monto_iva_usd, total_usd, total_ves, monto_exento_ves, base_imponible_ves, monto_iva_ves)
        VALUES (888, :uid, :tasa, 0.00, 10.00, 1.60, 0.00, 0.00, 0.00, 0.00, 0.00)
        """).bindparams(bindparam("tasa", type_=DECIMAL)),
        {"uid": test_user.id, "tasa": tasa}
    )
    db_session.execute(
        text("""
        INSERT INTO detalle_ventas (id, venta_id, producto_id, tipo_empaque, cantidad, unidades_descontadas, precio_unitario_usd, subtotal_usd, iva_porcentaje, usa_precio_divisas)
        VALUES (888, 888, :pid, 'UNIDAD', 2, 2, 5.00, 0.00, 16.00, 0)
        """),
        {"pid": test_product.id}
    )
    db_session.commit()

    heal_sales_totals(db_session)

    sale = db_session.execute(select(Sale).where(Sale.id == 888)).scalar_one()
    item = db_session.execute(select(SaleItem).where(SaleItem.id == 888)).scalar_one()

    assert item.subtotal_usd == Decimal("10.00")
    assert sale.total_usd == Decimal("11.60")
    assert sale.base_imponible_ves == Decimal("500.00")
    assert sale.monto_iva_ves == Decimal("80.00")
    assert sale.total_ves == Decimal("580.00")


def test_heal_sales_totals_ignores_already_valid_records(db_session, test_user, test_product):
    # Si la venta ya tiene total_usd > 0, no debe alterarse
    tasa = Decimal("50.0000")
    db_session.execute(
        text("""
        INSERT INTO ventas (id, usuario_id, tasa_bcv_aplicada, monto_exento_usd, base_imponible_usd, monto_iva_usd, total_usd, total_ves, monto_exento_ves, base_imponible_ves, monto_iva_ves)
        VALUES (777, :uid, :tasa, 20.00, 0.00, 0.00, 20.00, 1000.00, 1000.00, 0.00, 0.00)
        """).bindparams(bindparam("tasa", type_=DECIMAL)),
        {"uid": test_user.id, "tasa": tasa}
    )
    db_session.execute(
        text("""
        INSERT INTO detalle_ventas (id, venta_id, producto_id, tipo_empaque, cantidad, unidades_descontadas, precio_unitario_usd, subtotal_usd, iva_porcentaje, usa_precio_divisas)
        VALUES (777, 777, :pid, 'UNIDAD', 2, 2, 10.00, 20.00, 0.00, 0)
        """),
        {"pid": test_product.id}
    )
    db_session.commit()

    heal_sales_totals(db_session)

    sale = db_session.execute(select(Sale).where(Sale.id == 777)).scalar_one()
    item = db_session.execute(select(SaleItem).where(SaleItem.id == 777)).scalar_one()

    assert item.subtotal_usd == Decimal("20.00")
    assert sale.total_usd == Decimal("20.00")
    assert sale.total_ves == Decimal("1000.00")


def test_heal_sales_totals_defensive_on_error(caplog):
    # Simular una sesión que arroja excepción al ejecutar SQL
    broken_session = MagicMock()
    broken_session.execute.side_effect = RuntimeError("Simulated DB connection failure")

    with caplog.at_level(logging.WARNING):
        heal_sales_totals(broken_session)

    broken_session.rollback.assert_called_once()
    assert "No se pudo ejecutar heal_sales_totals" in caplog.text


def test_initialize_database_invokes_heal_sales(db_session, test_user, test_product):
    # Verificar que initialize_database repara registros automáticamente
    tasa = Decimal("60.0000")
    db_session.execute(
        text("""
        INSERT INTO ventas (id, usuario_id, tasa_bcv_aplicada, monto_exento_usd, base_imponible_usd, monto_iva_usd, total_usd, total_ves, monto_exento_ves, base_imponible_ves, monto_iva_ves)
        VALUES (666, :uid, :tasa, 15.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
        """).bindparams(bindparam("tasa", type_=DECIMAL)),
        {"uid": test_user.id, "tasa": tasa}
    )
    db_session.execute(
        text("""
        INSERT INTO detalle_ventas (id, venta_id, producto_id, tipo_empaque, cantidad, unidades_descontadas, precio_unitario_usd, subtotal_usd, iva_porcentaje, usa_precio_divisas)
        VALUES (666, 666, :pid, 'UNIDAD', 3, 3, 5.00, 0.00, 0.00, 0)
        """),
        {"pid": test_product.id}
    )
    db_session.commit()

    initialize_database(db_session)

    sale = db_session.execute(select(Sale).where(Sale.id == 666)).scalar_one()
    item = db_session.execute(select(SaleItem).where(SaleItem.id == 666)).scalar_one()

    assert item.subtotal_usd == Decimal("15.00")
    assert sale.total_usd == Decimal("15.00")
    assert sale.total_ves == Decimal("900.00")
