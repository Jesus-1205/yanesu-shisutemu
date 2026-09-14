from decimal import Decimal

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.services.supplier_service import (
    get_suppliers, get_supplier, create_supplier, update_supplier, delete_supplier,
    get_supplier_analytics,
)


def _create_supplier(db):
    data = SupplierCreate(nombre="Proveedor A", telefono="04121234567")
    return create_supplier(db, data)


def test_get_suppliers_empty(db):
    assert get_suppliers(db) == []


def test_get_suppliers_returns_all(db):
    s = _create_supplier(db)
    result = get_suppliers(db)
    assert len(result) == 1
    assert result[0].id == s.id


def test_get_supplier_found(db):
    s = _create_supplier(db)
    result = get_supplier(db, s.id)
    assert result is not None
    assert result.nombre == "Proveedor A"


def test_get_supplier_not_found(db):
    assert get_supplier(db, 999) is None


def test_create_supplier_success(db):
    data = SupplierCreate(nombre="Nuevo Proveedor", email="proveedor@test.com")
    result = create_supplier(db, data)
    assert result.nombre == "Nuevo Proveedor"
    assert result.email == "proveedor@test.com"
    assert result.id is not None


def test_create_supplier_duplicate(db):
    _create_supplier(db)
    data = SupplierCreate(nombre="Proveedor A")
    try:
        create_supplier(db, data)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "ya existe" in str(e)


def test_update_supplier_success(db):
    s = _create_supplier(db)
    data = SupplierUpdate(nombre="Proveedor A Modificado")
    result = update_supplier(db, s.id, data)
    assert result.nombre == "Proveedor A Modificado"


def test_update_supplier_partial(db):
    s = _create_supplier(db)
    data = SupplierUpdate(telefono="04169876543")
    result = update_supplier(db, s.id, data)
    assert result.telefono == "04169876543"
    assert result.nombre == "Proveedor A"


def test_update_supplier_not_found(db):
    data = SupplierUpdate(nombre="Nadie")
    try:
        update_supplier(db, 999, data)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Proveedor no encontrado" in str(e)


def test_update_supplier_duplicate(db):
    _create_supplier(db)
    data_s2 = SupplierCreate(nombre="Proveedor B")
    s2 = create_supplier(db, data_s2)
    data = SupplierUpdate(nombre="Proveedor A")
    try:
        update_supplier(db, s2.id, data)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "ya está en uso" in str(e)


def test_delete_supplier_success(db):
    s = _create_supplier(db)
    delete_supplier(db, s.id)
    assert get_supplier(db, s.id) is None


def test_delete_supplier_not_found(db):
    try:
        delete_supplier(db, 999)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Proveedor no encontrado" in str(e)


def test_delete_supplier_with_products(db):
    s = _create_supplier(db)
    product = Product(
        nombre="Test Product",
        precio_costo_caja_usd=120, precio_costo_usd=10, precio_unidad_usd=15, precio_caja_usd=360,
        proveedor_id=s.id,
        unidades_por_caja=12,
    )
    db.add(product)
    db.commit()
    try:
        delete_supplier(db, s.id)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "productos asociados" in str(e)


# --- get_supplier_analytics ---

def test_get_supplier_analytics_empty(db):
    result = get_supplier_analytics(db)
    assert result.total_proveedores == 0
    assert result.proveedores == []


def test_get_supplier_analytics_single(db):
    s = _create_supplier(db)
    product = Product(
        nombre="Test Product",
        precio_costo_caja_usd=Decimal("120"), precio_costo_usd=Decimal("10"), precio_unidad_usd=Decimal("15"),
        precio_caja_usd=Decimal("360"), stock_unidades=50,
        proveedor_id=s.id,
        unidades_por_caja=12,
    )
    db.add(product)
    db.commit()

    result = get_supplier_analytics(db)
    assert result.total_proveedores == 1
    assert result.total_productos == 1
    assert result.stock_total == 50
    assert len(result.proveedores) == 1
    assert result.proveedores[0].nombre == "Proveedor A"
    assert result.proveedores[0].total_productos == 1
    assert result.proveedores[0].stock_total == 50


def test_get_supplier_analytics_multiple(db):
    s1_data = SupplierCreate(nombre="Prov A")
    s1 = create_supplier(db, s1_data)
    s2_data = SupplierCreate(nombre="Prov B")
    s2 = create_supplier(db, s2_data)

    p1 = Product(
        nombre="P1",
        precio_costo_caja_usd=Decimal("120"), precio_costo_usd=Decimal("5"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"), stock_unidades=100,
        proveedor_id=s1.id,
        unidades_por_caja=24,
    )
    db.add(p1)
    p2 = Product(
        nombre="P2",
        precio_costo_caja_usd=Decimal("192"), precio_costo_usd=Decimal("8"), precio_unidad_usd=Decimal("12"),
        precio_caja_usd=Decimal("288"), stock_unidades=200,
        proveedor_id=s1.id,
        unidades_por_caja=24,
    )
    db.add(p2)
    p3 = Product(
        nombre="P3",
        precio_costo_caja_usd=Decimal("240"), precio_costo_usd=Decimal("10"), precio_unidad_usd=Decimal("20"),
        precio_caja_usd=Decimal("480"), stock_unidades=300,
        proveedor_id=s2.id,
        unidades_por_caja=24,
    )
    db.add(p3)
    db.commit()

    result = get_supplier_analytics(db)
    assert result.total_proveedores == 2
    assert result.total_productos == 3
    assert result.stock_total == 600

    prov_a = [p for p in result.proveedores if p.nombre == "Prov A"][0]
    assert prov_a.total_productos == 2
    assert prov_a.stock_total == 300

    prov_b = [p for p in result.proveedores if p.nombre == "Prov B"][0]
    assert prov_b.total_productos == 1
    assert prov_b.stock_total == 300


def test_get_supplier_analytics_with_sales(db):
    s = _create_supplier(db)
    p = Product(
        nombre="P",
        precio_costo_caja_usd=Decimal("120"), precio_costo_usd=Decimal("5"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"), stock_unidades=100,
        proveedor_id=s.id,
        unidades_por_caja=24,
    )
    db.add(p)
    db.flush()
    user = User(
        username="an", email="a@t.com", hashed_password="h",
        nombre_completo="AN", rol_id=1,
    )
    db.add(user)
    db.flush()
    pm = PaymentMethod(nombre="PUNTO_DE_VENTA", activo=True)
    db.add(pm)
    db.flush()
    sale = Sale(usuario_id=user.id, tasa_bcv_aplicada=Decimal("50"),
                monto_exento_usd=Decimal("0"), base_imponible_usd=Decimal("40"),
                monto_iva_usd=Decimal("0"))
    db.add(sale)
    db.flush()
    db.add(SaleItem(
        venta_id=sale.id, producto_id=p.id,
        tipo_empaque="UNIDAD", cantidad=4, unidades_descontadas=4,
        precio_unitario_usd=Decimal("10"),
    ))
    db.commit()

    result = get_supplier_analytics(db)
    assert result.unidades_vendidas == 4
    assert result.ingresos_usd == Decimal("40")
    prov = result.proveedores[0]
    assert prov.unidades_vendidas == 4
    assert prov.ingresos_usd == Decimal("40")


def test_get_supplier_detail_analytics(db):
    from app.services.supplier_service import get_supplier_detail_analytics
    s = create_supplier(db, SupplierCreate(nombre="PROV DETALLE"))
    p = Product(
        nombre="Prod Detalle",
        precio_costo_caja_usd=Decimal("120"), precio_costo_usd=Decimal("5"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"), stock_unidades=50,
        proveedor_id=s.id,
        unidades_por_caja=24,
    )
    db.add(p)
    db.commit()

    detail = get_supplier_detail_analytics(db, s.id)
    assert detail is not None
    assert detail.id == s.id
    assert detail.total_productos == 1
    assert detail.stock_total == 50

    none_detail = get_supplier_detail_analytics(db, 99999)
    assert none_detail is None


def test_get_suppliers_paginated(db):
    from app.services.supplier_service import get_suppliers_paginated
    create_supplier(db, SupplierCreate(nombre="Prov Pagi A"))
    create_supplier(db, SupplierCreate(nombre="Prov Pagi B"))
    create_supplier(db, SupplierCreate(nombre="Prov Pagi C"))

    res = get_suppliers_paginated(db, page=1, page_size=2)
    assert res["total"] == 3
    assert len(res["items"]) == 2
    assert res["pages"] == 2


