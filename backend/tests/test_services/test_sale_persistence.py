from decimal import Decimal
import pytest
from sqlalchemy import select
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.payment_method import PaymentMethod
from app.schemas.product import ProductCreate
from app.schemas.sale import SaleCreate, SaleItemCreate, SalePaymentCreate
from app.services.product_service import create_product
from app.services.sale_service import create_sale


@pytest.fixture
def test_product(db_session):
    return create_product(
        db_session,
        ProductCreate(
            nombre="Test Product",
            precio_costo_caja_usd=Decimal("12.00"),
            precio_unidad_usd=Decimal("10.00"),
            precio_caja_usd=Decimal("240.00"),
            stock_unidades=100,
            stock_cajas=0,
            unidades_por_caja=12,
            tipo_iva="EXENTO",
        ),
    )


@pytest.fixture
def test_payment_method(db_session):
    stmt = select(PaymentMethod).where(PaymentMethod.nombre == "PUNTO_DE_VENTA")
    return db_session.execute(stmt).scalars().first()


def test_create_sale_persists_non_zero_totals(db_session, test_user, test_product, test_payment_method):
    tasa = Decimal("50.0000")
    precio_unitario = Decimal("10.00")
    cantidad = 2

    # 2 unidades a $10.00 = $20.00 exento (o gravado)
    subtotal_esperado = Decimal("20.00")

    data = SaleCreate(
        tasa_bcv_aplicada=tasa,
        monto_exento_usd=subtotal_esperado,
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
        items=[
            SaleItemCreate(
                producto_id=test_product.id,
                tipo_empaque="UNIDAD",
                cantidad=cantidad,
                unidades_descontadas=cantidad,
                precio_unitario_usd=precio_unitario,
                iva_porcentaje=Decimal("0.00"),
            )
        ],
        pagos=[
            SalePaymentCreate(
                metodo_pago_id=test_payment_method.id,
                monto_usd=subtotal_esperado,
                monto_ves=Decimal("0.00"),
            )
        ],
    )

    sale = create_sale(db_session, data, usuario_id=test_user.id)

    # Refrescar desde base de datos
    db_session.expire_all()
    saved_sale = db_session.execute(select(Sale).where(Sale.id == sale.id)).scalar_one()
    saved_item = saved_sale.items[0]

    assert saved_item.subtotal_usd == Decimal("20.00")
    assert saved_sale.total_usd == Decimal("20.00")
    assert saved_sale.total_ves == (Decimal("20.00") * tasa).quantize(Decimal("0.01"))
    assert saved_sale.monto_exento_ves == (Decimal("20.00") * tasa).quantize(Decimal("0.01"))


def test_sale_item_direct_insert_with_event_listener_or_explicit_value(db_session, test_user, test_product):
    tasa = Decimal("50.0000")
    sale = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=tasa,
        monto_exento_usd=Decimal("15.00"),
        base_imponible_usd=Decimal("10.00"),
        monto_iva_usd=Decimal("1.60"),
    )
    db_session.add(sale)
    db_session.flush()

    item = SaleItem(
        venta_id=sale.id,
        producto_id=test_product.id,
        tipo_empaque="UNIDAD",
        cantidad=3,
        unidades_descontadas=3,
        precio_unitario_usd=Decimal("5.00"),
        iva_porcentaje=Decimal("0.00"),
    )
    db_session.add(item)
    db_session.commit()

    db_session.expire_all()
    reloaded_sale = db_session.execute(select(Sale).where(Sale.id == sale.id)).scalar_one()
    reloaded_item = reloaded_sale.items[0]

    # Hook must calculate totals
    assert reloaded_sale.total_usd == Decimal("26.60")
    assert reloaded_sale.total_ves == (Decimal("26.60") * tasa).quantize(Decimal("0.01"))
    assert reloaded_sale.monto_exento_ves == (Decimal("15.00") * tasa).quantize(Decimal("0.01"))
    assert reloaded_sale.base_imponible_ves == (Decimal("10.00") * tasa).quantize(Decimal("0.01"))
    assert reloaded_sale.monto_iva_ves == (Decimal("1.60") * tasa).quantize(Decimal("0.01"))
    assert reloaded_item.subtotal_usd == Decimal("15.00")


def test_explicit_totals_persisted_without_being_overwritten(db_session, test_user, test_product):
    tasa = Decimal("50.0000")
    sale = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=tasa,
        monto_exento_usd=Decimal("10.00"),
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
        total_usd=Decimal("12.34"),
        total_ves=Decimal("617.00"),
    )
    db_session.add(sale)
    db_session.flush()

    item = SaleItem(
        venta_id=sale.id,
        producto_id=test_product.id,
        tipo_empaque="UNIDAD",
        cantidad=1,
        unidades_descontadas=1,
        precio_unitario_usd=Decimal("10.00"),
        subtotal_usd=Decimal("9.99"),  # Special discounted or custom subtotal
        iva_porcentaje=Decimal("0.00"),
    )
    db_session.add(item)
    db_session.commit()

    db_session.expire_all()
    reloaded_sale = db_session.execute(select(Sale).where(Sale.id == sale.id)).scalar_one()
    reloaded_item = reloaded_sale.items[0]

    assert reloaded_item.subtotal_usd == Decimal("9.99")
    assert reloaded_sale.total_usd == Decimal("12.34")
    assert reloaded_sale.total_ves == Decimal("617.00")

