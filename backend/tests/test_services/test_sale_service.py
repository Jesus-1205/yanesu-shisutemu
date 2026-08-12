from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import VE_TZ
from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.user import User
from app.schemas.product import ProductCreate
from app.schemas.sale import SaleCreate, SaleItemCreate, SalePaymentCreate
from app.services.product_service import create_product
from app.services.sale_service import (
    create_sale,
    current_week_range,
    get_sale,
    get_sales,
    get_sales_summary,
    get_top_week_sales,
)


def _product(db, nombre="Test", stock=100, caja=12, cajas=0):
    return create_product(db, ProductCreate(
        nombre=nombre,
        precio_costo_caja_usd=Decimal(str(caja)), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"), stock_unidades=stock,
        stock_cajas=cajas, unidades_por_caja=caja,
    ))


def _payment_method(db, nombre="PUNTO_DE_VENTA"):
    stmt = select(PaymentMethod).where(PaymentMethod.nombre == nombre)
    pm = db.execute(stmt).scalars().first()
    if pm:
        return pm
    pm = PaymentMethod(nombre=nombre, activo=True)
    db.add(pm)
    db.flush()
    return pm


def _pago(metodo_pago_id, monto_usd=20, monto_ves=0):
    return SalePaymentCreate(metodo_pago_id=metodo_pago_id, monto_usd=monto_usd, monto_ves=monto_ves)


def _user(db):
    u = User(username="su", email="su@t.com", hashed_password="h",
             nombre_completo="SU", rol_id=1)
    db.add(u)
    db.flush()
    return u


def _item(product_id, tipo="UNIDAD", cantidad=2, precio=Decimal("10")):
    return SaleItemCreate(
        producto_id=product_id, tipo_empaque=tipo, cantidad=cantidad,
        unidades_descontadas=cantidad, precio_unitario_usd=precio,
    )


def _sale_data(pm, items, tasa=Decimal("50"), observaciones=None):
    """SaleCreate válido: montos/IVA canónicos y pago que cubre el total."""
    exento = Decimal("0")
    base = Decimal("0")
    iva = Decimal("0")
    for it in items:
        subtotal = (Decimal(it.cantidad) * it.precio_unitario_usd).quantize(Decimal("0.01"))
        if it.iva_porcentaje and it.iva_porcentaje > 0:
            base += subtotal
            iva += (subtotal * it.iva_porcentaje / Decimal("100")).quantize(Decimal("0.01"))
        else:
            exento += subtotal
    total = exento + base + iva
    return SaleCreate(
        tasa_bcv_aplicada=tasa,
        items=items,
        pagos=[_pago(pm.id, monto_usd=total)],
        monto_exento_usd=exento,
        base_imponible_usd=base,
        monto_iva_usd=iva,
        observaciones=observaciones,
    )


# --- create_sale ---

def test_create_sale_success_unidad(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)], observaciones="Venta test")

    sale = create_sale(db, data, usuario_id=u.id)

    assert sale.id is not None
    assert sale.usuario_id == u.id
    assert sale.tasa_bcv_aplicada == Decimal("50")
    assert sale.observaciones == "Venta test"
    assert len(sale.items) == 1
    item = sale.items[0]
    assert item.producto_id == p.id
    assert item.tipo_empaque == "UNIDAD"
    assert item.cantidad == 2
    assert item.unidades_descontadas == 2


def test_create_sale_success_caja(db):
    p = _product(db, caja=12, cajas=10)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id, tipo="CAJA", cantidad=3)])

    sale = create_sale(db, data, usuario_id=u.id)

    assert len(sale.items) == 1
    item = sale.items[0]
    assert item.tipo_empaque == "CAJA"
    assert item.cantidad == 3
    assert item.unidades_descontadas == 36
    db.refresh(p)
    assert p.stock_cajas == 7


def test_create_sale_deducts_stock(db):
    p = _product(db, stock=50)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id, cantidad=5)])

    create_sale(db, data, usuario_id=u.id)
    db.refresh(p)
    assert p.stock_unidades == 45


def test_create_sale_mixed_items(db):
    p1 = _product(db, nombre="A", stock=100, caja=10)
    p2 = _product(db, nombre="B", stock=100, caja=24, cajas=10)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [
        _item(p1.id, tipo="UNIDAD", cantidad=3),
        _item(p2.id, tipo="CAJA", cantidad=2),
    ])

    sale = create_sale(db, data, usuario_id=u.id)

    assert len(sale.items) == 2
    db.refresh(p1)
    db.refresh(p2)
    assert p1.stock_unidades == 97
    assert p2.stock_cajas == 8


def test_create_sale_empty_items_rejected(db):
    from pydantic import ValidationError
    pm = _payment_method(db)
    with pytest.raises(ValidationError):
        SaleCreate(tasa_bcv_aplicada=Decimal("50"), items=[], pagos=[_pago(pm.id)])


def test_create_sale_product_not_found(db):
    u = _user(db)
    pm = _payment_method(db)
    data = SaleCreate(tasa_bcv_aplicada=Decimal("50"), items=[_item(999)], pagos=[_pago(pm.id)])

    with pytest.raises(EntityNotFoundError):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_insufficient_stock(db):
    p = _product(db, stock=3)
    u = _user(db)
    pm = _payment_method(db)
    data = SaleCreate(tasa_bcv_aplicada=Decimal("50"), items=[_item(p.id, cantidad=5)], pagos=[_pago(pm.id)])

    with pytest.raises(ConflictError, match="Stock insuficiente"):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_stock_edge_zero(db):
    p = _product(db, stock=0)
    u = _user(db)
    pm = _payment_method(db)
    data = SaleCreate(tasa_bcv_aplicada=Decimal("50"), items=[_item(p.id, cantidad=1)], pagos=[_pago(pm.id)])

    with pytest.raises(ConflictError, match="Stock insuficiente"):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_observaciones_none(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])

    sale = create_sale(db, data, usuario_id=u.id)

    assert sale.observaciones is None


def test_create_sale_observaciones_persisted(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)], observaciones="Nota importante")

    sale = create_sale(db, data, usuario_id=u.id)
    fetched = get_sale(db, sale.id)

    assert fetched.observaciones == "Nota importante"


# --- validación de montos (fuente de verdad = backend) ---

def test_create_sale_persists_canonical_amounts(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])  # 2x10 gravado → base 20, iva 3.20

    sale = create_sale(db, data, usuario_id=u.id)
    db.refresh(sale)

    assert sale.monto_exento_usd == Decimal("0")
    assert sale.base_imponible_usd == Decimal("20.00")
    assert sale.monto_iva_usd == Decimal("3.20")
    assert sale.total_usd == Decimal("23.20")
    assert sale.items[0].iva_porcentaje == Decimal("16.00")


def test_create_sale_exento_product_zero_iva(db):
    p = _product(db)
    p.tipo_iva = "EXENTO"
    db.commit()
    u = _user(db)
    pm = _payment_method(db)
    item = _item(p.id)  # 2x10 exento → exento 20, base/iva 0
    data = SaleCreate(
        tasa_bcv_aplicada=Decimal("50"),
        items=[item],
        pagos=[_pago(pm.id, monto_usd=Decimal("20.00"))],
        monto_exento_usd=Decimal("20.00"),
        base_imponible_usd=Decimal("0"),
        monto_iva_usd=Decimal("0"),
    )
    data.items[0].iva_porcentaje = Decimal("0")

    sale = create_sale(db, data, usuario_id=u.id)
    db.refresh(sale)

    assert sale.monto_exento_usd == Decimal("20.00")
    assert sale.base_imponible_usd == Decimal("0")
    assert sale.monto_iva_usd == Decimal("0")
    assert sale.total_usd == Decimal("20.00")
    assert sale.items[0].iva_porcentaje == Decimal("0")


def test_create_sale_rejects_iva_tampered(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    data.monto_iva_usd = Decimal("0")

    with pytest.raises(ValueError, match="monto_iva_usd: esperado 3.20, recibido 0"):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_rejects_base_tampered(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    data.base_imponible_usd = Decimal("19.98")

    with pytest.raises(ValueError, match="base_imponible_usd: esperado 20.00, recibido 19.98"):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_accepts_one_cent_tolerance(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    data.monto_iva_usd = Decimal("3.21")  # 1 céntimo de diferencia

    sale = create_sale(db, data, usuario_id=u.id)
    db.refresh(sale)
    assert sale.monto_iva_usd == Decimal("3.20")  # persiste el canónico


def test_create_sale_rejects_two_cents_diff(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    data.monto_iva_usd = Decimal("3.22")

    with pytest.raises(ValueError, match="monto_iva_usd"):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_rejects_wrong_iva_percentage(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    data.items[0].iva_porcentaje = Decimal("5")

    with pytest.raises(ValueError, match="iva_porcentaje esperado 16.00, recibido 5"):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_rejects_insufficient_payment(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    data.pagos = [_pago(pm.id, monto_usd=Decimal("20.00"))]  # total es 23.20

    with pytest.raises(ValueError, match="Pagos insuficientes"):
        create_sale(db, data, usuario_id=u.id)


def test_create_sale_accepts_ves_payment_coverage(db):
    p = _product(db)
    u = _user(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    # 23.20 USD a tasa 50 → 1160 Bs cubren el total
    data.pagos = [_pago(pm.id, monto_usd=Decimal("0"), monto_ves=Decimal("1160"))]

    sale = create_sale(db, data, usuario_id=u.id)
    assert sale.id is not None


# --- get_sales ---

def test_get_sales_empty(db):
    assert get_sales(db) == []


def test_get_sales_returns_all(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    create_sale(db, data, usuario_id=u.id)
    create_sale(db, data, usuario_id=u.id)

    result = get_sales(db)
    assert len(result) == 2


def test_get_sales_order_desc(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    create_sale(db, data, usuario_id=u.id)
    create_sale(db, data, usuario_id=u.id)

    result = get_sales(db)
    assert result[0].fecha_venta >= result[1].fecha_venta


def test_get_sales_limit(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    create_sale(db, data, usuario_id=u.id)
    create_sale(db, data, usuario_id=u.id)
    create_sale(db, data, usuario_id=u.id)

    assert len(get_sales(db, limit=2)) == 2


def _sale_con_fecha(db, u, fecha):
    s = Sale(
        usuario_id=u.id,
        tasa_bcv_aplicada=Decimal("50"),
        fecha_venta=fecha,
        monto_exento_usd=Decimal("10"), base_imponible_usd=Decimal("0"),
        monto_iva_usd=Decimal("0"),
    )
    db.add(s)
    db.commit()
    return s


def test_get_sales_fecha_desde_inclusivo_ve(db):
    u = _user(db)
    previa = _sale_con_fecha(db, u, datetime(2026, 7, 31, 0, 0, 0, tzinfo=VE_TZ))
    limite = _sale_con_fecha(db, u, datetime(2026, 7, 31, 23, 59, 59, tzinfo=VE_TZ))
    anterior = _sale_con_fecha(db, u, datetime(2026, 7, 30, 23, 59, 59, tzinfo=VE_TZ))

    # El frontend envía "2026-07-31" → FastAPI lo parsea como datetime naive
    result = get_sales(db, fecha_desde=datetime(2026, 7, 31))
    ids = {s.id for s in result}
    assert previa.id in ids
    assert limite.id in ids
    assert anterior.id not in ids


def test_get_sales_fecha_desde_acepta_date(db):
    u = _user(db)
    previa = _sale_con_fecha(db, u, datetime(2026, 7, 31, 0, 0, 0, tzinfo=VE_TZ))
    anterior = _sale_con_fecha(db, u, datetime(2026, 7, 30, 23, 59, 59, tzinfo=VE_TZ))

    result = get_sales(db, fecha_desde=date(2026, 7, 31))
    ids = {s.id for s in result}
    assert previa.id in ids
    assert anterior.id not in ids


def test_get_sales_fecha_hasta_inclusivo_ve(db):
    u = _user(db)
    limite = _sale_con_fecha(db, u, datetime(2026, 7, 31, 23, 59, 59, tzinfo=VE_TZ))
    posterior = _sale_con_fecha(db, u, datetime(2026, 8, 1, 0, 0, 0, tzinfo=VE_TZ))

    result = get_sales(db, fecha_hasta=datetime(2026, 7, 31))
    ids = {s.id for s in result}
    assert limite.id in ids
    assert posterior.id not in ids


def test_get_sales_filtro_rango_completo_ve(db):
    u = _user(db)
    anterior = _sale_con_fecha(db, u, datetime(2026, 7, 30, 12, 0, 0, tzinfo=VE_TZ))
    dentro = _sale_con_fecha(db, u, datetime(2026, 7, 31, 12, 0, 0, tzinfo=VE_TZ))
    posterior = _sale_con_fecha(db, u, datetime(2026, 8, 1, 12, 0, 0, tzinfo=VE_TZ))

    result = get_sales(
        db,
        fecha_desde=datetime(2026, 7, 31),
        fecha_hasta=datetime(2026, 7, 31),
    )
    ids = {s.id for s in result}
    assert dentro.id in ids
    assert anterior.id not in ids
    assert posterior.id not in ids


# --- get_sale ---

def test_get_sale_found(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    data = _sale_data(pm, [_item(p.id)])
    sale = create_sale(db, data, usuario_id=u.id)

    result = get_sale(db, sale.id)
    assert result.id == sale.id
    assert len(result.items) == 1


def test_get_sale_not_found(db):
    with pytest.raises(EntityNotFoundError):
        get_sale(db, 999)


# --- current_week_range ---

def test_current_week_range_returns_monday_to_sunday(db):
    desde, hasta = current_week_range()
    assert desde.weekday() == 0
    assert hasta.weekday() == 6
    assert desde <= hasta


# --- get_sales_summary ---

def test_get_sales_summary_empty(db):
    assert get_sales_summary(db) == []


def test_get_sales_summary_diario(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    s1 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 13, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("100"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    s2 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("200"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    db.add_all([s1, s2])
    db.commit()

    result = get_sales_summary(db, rango="diario")

    assert len(result) == 2
    assert result[0]["periodo"] == "2026-07-13"
    assert result[0]["total_ventas"] == 1
    assert result[1]["periodo"] == "2026-07-14"
    assert result[1]["total_ventas"] == 1


def test_get_sales_summary_mensual(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    s1 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 1, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("100"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    s2 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("200"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    s3 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 8, 5, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("300"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    db.add_all([s1, s2, s3])
    db.commit()

    result = get_sales_summary(db, rango="mensual")

    assert len(result) == 2
    assert result[0]["periodo"] == "2026-07"
    assert result[0]["total_ventas"] == 2
    assert result[0]["total_usd"] == Decimal("300")
    assert result[1]["periodo"] == "2026-08"
    assert result[1]["total_ventas"] == 1
    assert result[1]["total_usd"] == Decimal("300")


def test_get_sales_summary_con_montos(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    s = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
             fecha_venta=datetime(2026, 7, 13, 10, 0, tzinfo=timezone.utc),
             monto_exento_usd=Decimal("50"), base_imponible_usd=Decimal("30"),
             monto_iva_usd=Decimal("20"))
    db.add(s)
    db.commit()

    result = get_sales_summary(db, rango="diario")

    assert len(result) == 1
    assert result[0]["total_usd"] == Decimal("100")
    assert result[0]["total_ves"] == Decimal("5000")


# --- get_top_week_sales ---

def test_get_top_week_sales_empty(db):
    assert get_top_week_sales(db) is None


def test_get_top_week_sales_returns_highest_revenue_week(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    s1 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 6, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("200"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    s2 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 13, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("100"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    s3 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("50"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    db.add_all([s1, s2, s3])
    db.commit()

    result = get_top_week_sales(db)
    assert result is not None
    assert result.periodo == "2026-07-06"
    assert result.total_ventas == 1
    assert result.total_usd == Decimal("200")
    assert result.total_ves == Decimal("10000")


def test_get_top_week_sales_with_mixed_amounts(db):
    u = _user(db)
    p = _product(db)
    pm = _payment_method(db)
    s1 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("60"),
              fecha_venta=datetime(2026, 7, 6, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("100"), base_imponible_usd=Decimal("0"),
              monto_iva_usd=Decimal("0"))
    s2 = Sale(usuario_id=u.id,  tasa_bcv_aplicada=Decimal("50"),
              fecha_venta=datetime(2026, 7, 13, 10, 0, tzinfo=timezone.utc),
              monto_exento_usd=Decimal("80"), base_imponible_usd=Decimal("30"),
              monto_iva_usd=Decimal("10"))
    db.add_all([s1, s2])
    db.commit()

    result = get_top_week_sales(db)
    assert result is not None
    assert result.periodo == "2026-07-13"
    assert result.total_ventas == 1
    assert result.total_usd == Decimal("120")
