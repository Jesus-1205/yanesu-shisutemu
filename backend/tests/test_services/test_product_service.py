import pytest
from decimal import Decimal

from sqlalchemy import select

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.category import Category
from app.models.payment_method import PaymentMethod
from app.models.sale import Sale, SaleItem
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.product_service import (
    create_product,
    delete_product,
    get_low_rotation,
    get_lowest_margin,
    get_product,
    get_products,
    get_top_margin,
    get_top_selling,
    update_product,
)


def _cat(db, name="CAT"):
    return db.execute(select(Category).where(Category.nombre == name)).scalar_one().id


# --- get_products ---

def test_get_products_empty(db):
    assert get_products(db)["items"] == []


def test_get_products_returns_all(db):
    create_product(db, ProductCreate(
        nombre="A", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="B", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    assert len(get_products(db)["items"]) == 2


def test_get_products_filter_categoria_ids(db):
    cat1 = _cat(db, "CAT1")
    cat2 = _cat(db, "CAT2")
    create_product(db, ProductCreate(
        nombre="A", categoria_ids=[cat1],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="B", categoria_ids=[cat2],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, categoria_ids=[cat1])["items"]
    assert len(result) == 1
    assert result[0].nombre == "A"


def test_get_products_filter_sin_stock(db):
    create_product(db, ProductCreate(
        nombre="A", categoria_ids=[_cat(db)], stock_unidades=10,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="B", categoria_ids=[_cat(db)], stock_unidades=0,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, sin_stock=True)["items"]
    assert len(result) == 1
    assert result[0].nombre == "B"


def test_get_products_filter_precio_min(db):
    create_product(db, ProductCreate(
        nombre="A", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("5"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="B", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, precio_min=Decimal("7"))["items"]
    assert len(result) == 1
    assert result[0].nombre == "B"


def test_get_products_filter_precio_max(db):
    create_product(db, ProductCreate(
        nombre="A", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("5"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="B", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, precio_max=Decimal("7"))["items"]
    assert len(result) == 1
    assert result[0].nombre == "A"


def test_get_products_search_by_nombre(db):
    create_product(db, ProductCreate(
        nombre="Whisky Escocés", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("10"), precio_unidad_usd=Decimal("25"),
        precio_caja_usd=Decimal("600"),
    ))
    create_product(db, ProductCreate(
        nombre="Ron Añejo", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("8"), precio_unidad_usd=Decimal("20"),
        precio_caja_usd=Decimal("480"),
    ))
    result = get_products(db, search="whis")["items"]
    assert len(result) == 1
    assert "Whisky" in result[0].nombre


def test_get_products_search_by_barcode(db):
    create_product(db, ProductCreate(
        nombre="Producto", categoria_ids=[_cat(db)], codigo_barra="123456789",
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    result = get_products(db, search="123456")["items"]
    assert len(result) == 1


# --- get_product ---

def test_get_product_found(db):
    p = create_product(db, ProductCreate(
        nombre="Test", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    result = get_product(db, p.id)
    assert result.nombre == "Test"


def test_get_product_not_found(db):
    with pytest.raises(EntityNotFoundError):
        get_product(db, 999)


# --- create_product ---

def test_create_product_success(db):
    p = create_product(db, ProductCreate(
        nombre="Nuevo", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("5"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"),
    ))
    assert p.id is not None
    assert p.nombre == "Nuevo"
    assert p.categories[0].nombre == "CAT"
    assert p.stock_unidades == 0
    assert p.tipo_iva == "GRAVADO"


def test_create_product_duplicate_barcode(db):
    create_product(db, ProductCreate(
        nombre="A", categoria_ids=[_cat(db)], codigo_barra="123",
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    with pytest.raises(ConflictError, match="código de barras ya está registrado"):
        create_product(db, ProductCreate(
            nombre="B", categoria_ids=[_cat(db)], codigo_barra="123",
            precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
            precio_caja_usd=Decimal("72"),
        ))


def test_create_product_empty_barcode_normalized(db):
    p = create_product(db, ProductCreate(
        nombre="Test", categoria_ids=[_cat(db)], codigo_barra="",
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    assert p.codigo_barra is None


def test_create_product_duplicate_nombre_allowed(db):
    create_product(db, ProductCreate(
        nombre="Mismo", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    p2 = create_product(db, ProductCreate(
        nombre="Mismo", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    assert p2.id is not None


# --- update_product ---

def test_update_product_success(db):
    p = create_product(db, ProductCreate(
        nombre="Original", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    updated = update_product(db, p.id, ProductUpdate(nombre="Modificado"))
    assert updated.nombre == "Modificado"
    assert updated.categories[0].nombre == "CAT"


def test_update_product_partial(db):
    p = create_product(db, ProductCreate(
        nombre="Original", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    updated = update_product(db, p.id, ProductUpdate(precio_unidad_usd=Decimal("99")))
    assert updated.precio_unidad_usd == Decimal("99")
    assert updated.nombre == "Original"


def test_update_product_not_found(db):
    with pytest.raises(EntityNotFoundError):
        update_product(db, 999, ProductUpdate(nombre="X"))


def test_update_product_duplicate_barcode(db):
    create_product(db, ProductCreate(
        nombre="A", categoria_ids=[_cat(db)], codigo_barra="111",
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    p2 = create_product(db, ProductCreate(
        nombre="B", categoria_ids=[_cat(db)], codigo_barra="222",
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    with pytest.raises(ConflictError, match="código de barras"):
        update_product(db, p2.id, ProductUpdate(codigo_barra="111"))


def test_update_product_clear_barcode(db):
    p = create_product(db, ProductCreate(
        nombre="Test", categoria_ids=[_cat(db)], codigo_barra="999",
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    updated = update_product(db, p.id, ProductUpdate(codigo_barra=None))
    assert updated.codigo_barra is None


# --- delete_product ---

def test_delete_product_success(db):
    p = create_product(db, ProductCreate(
        nombre="Del", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    delete_product(db, p.id)
    with pytest.raises(EntityNotFoundError):
        get_product(db, p.id)


def test_delete_product_not_found(db):
    with pytest.raises(EntityNotFoundError):
        delete_product(db, 999)


def test_delete_product_with_sales(db):
    p = create_product(db, ProductCreate(
        nombre="Sales", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    user = User(
        username="su", email="s@t.com", hashed_password="h",
        nombre_completo="S", rol_id=1,
    )
    db.add(user)
    db.flush()
    pm = PaymentMethod(nombre="PUNTO_DE_VENTA", activo=True)
    db.add(pm)
    db.flush()
    sale = Sale(usuario_id=user.id, tasa_bcv_aplicada=Decimal("50"))
    db.add(sale)
    db.flush()
    item = SaleItem(
        venta_id=sale.id, producto_id=p.id,
        tipo_empaque="UNIDAD", cantidad=1, unidades_descontadas=1,
        precio_unitario_usd=Decimal("2"),
    )
    db.add(item)
    db.commit()

    with pytest.raises(ConflictError, match="ventas asociadas"):
        delete_product(db, p.id)


# --- get_top_selling ---

def test_get_top_selling_empty(db):
    assert get_top_selling(db) == []


def test_get_top_selling_no_sales_returns_empty(db):
    create_product(db, ProductCreate(
        nombre="SinVentas", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    assert get_top_selling(db) == []


def test_get_top_selling_orders_by_count(db):
    p1 = create_product(db, ProductCreate(
        nombre="Top1", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    p2 = create_product(db, ProductCreate(
        nombre="Top2", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    user = User(
        username="tsu", email="ts@t.com", hashed_password="h",
        nombre_completo="T", rol_id=1,
    )
    db.add(user)
    db.flush()
    pm = PaymentMethod(nombre="PUNTO_DE_VENTA", activo=True)
    db.add(pm)
    db.flush()
    sale = Sale(usuario_id=user.id, tasa_bcv_aplicada=Decimal("50"))
    db.add(sale)
    db.flush()
    for _ in range(3):
        db.add(SaleItem(
            venta_id=sale.id, producto_id=p1.id,
            tipo_empaque="UNIDAD", cantidad=1, unidades_descontadas=1,
            precio_unitario_usd=Decimal("2"),
        ))
    db.add(SaleItem(
        venta_id=sale.id, producto_id=p2.id,
        tipo_empaque="UNIDAD", cantidad=1, unidades_descontadas=1,
        precio_unitario_usd=Decimal("3"),
    ))
    db.commit()

    result = get_top_selling(db)
    assert len(result) == 2
    assert result[0][0].nombre == "Top1"
    assert result[0][1] >= 3


# --- get_top_margin ---

def test_get_top_margin_empty(db):
    assert get_top_margin(db) == []


def test_get_top_margin_orders_by_margin(db):
    p1 = create_product(db, ProductCreate(
        nombre="High", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"),
    ))
    create_product(db, ProductCreate(
        nombre="Low", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("8"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"),
    ))
    result = get_top_margin(db)
    assert result[0].nombre == "High"


# --- get_lowest_margin ---

def test_get_lowest_margin_empty(db):
    assert get_lowest_margin(db) == []


def test_get_lowest_margin_orders_by_margin(db):
    create_product(db, ProductCreate(
        nombre="Mid", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("5"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"),
    ))
    p_low = create_product(db, ProductCreate(
        nombre="Low", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("9"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"),
    ))
    result = get_lowest_margin(db)
    assert result[0].nombre == "Low"


# --- get_low_rotation ---

def test_get_low_rotation_empty(db):
    assert get_low_rotation(db) == []


def test_get_low_rotation_products_without_sales_first(db):
    p1 = create_product(db, ProductCreate(
        nombre="ConVentas", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"), stock_unidades=100,
    ))
    p2 = create_product(db, ProductCreate(
        nombre="SinVentas", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"), stock_unidades=100,
    ))
    user = User(
        username="lru", email="lr@t.com", hashed_password="h",
        nombre_completo="LR", rol_id=1,
    )
    db.add(user)
    db.flush()
    pm = PaymentMethod(nombre="PUNTO_DE_VENTA", activo=True)
    db.add(pm)
    db.flush()
    sale = Sale(usuario_id=user.id, tasa_bcv_aplicada=Decimal("50"))
    db.add(sale)
    db.flush()
    db.add(SaleItem(
        venta_id=sale.id, producto_id=p1.id,
        tipo_empaque="UNIDAD", cantidad=1, unidades_descontadas=1,
        precio_unitario_usd=Decimal("2"),
    ))
    db.commit()

    result = get_low_rotation(db)
    assert result[0][0].nombre == "SinVentas"
    assert result[0][1] == 0
    assert result[1][0].nombre == "ConVentas"
    assert result[1][1] >= 1


# --- stock_minimo ---

def test_create_product_default_stock_minimo(db):
    p = create_product(db, ProductCreate(
        nombre="DefaultMin", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    assert p.stock_minimo == 5


def test_create_product_custom_stock_minimo(db):
    p = create_product(db, ProductCreate(
        nombre="CustomMin", categoria_ids=[_cat(db)], stock_minimo=10,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    assert p.stock_minimo == 10


def test_update_product_stock_minimo(db):
    p = create_product(db, ProductCreate(
        nombre="UpdMin", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    updated = update_product(db, p.id, ProductUpdate(stock_minimo=20))
    assert updated.stock_minimo == 20


# --- stock_status filter ---

def test_get_products_filter_stock_status_disponible(db):
    create_product(db, ProductCreate(
        nombre="Bajo", categoria_ids=[_cat(db)], stock_unidades=2, stock_minimo=5,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="Sano", categoria_ids=[_cat(db)], stock_unidades=10, stock_minimo=5,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, stock_status="disponible")["items"]
    assert len(result) == 1
    assert result[0].nombre == "Sano"


def test_get_products_filter_stock_status_bajo(db):
    create_product(db, ProductCreate(
        nombre="Bajo", categoria_ids=[_cat(db)], stock_unidades=2, stock_minimo=5,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="Sano", categoria_ids=[_cat(db)], stock_unidades=10, stock_minimo=5,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, stock_status="bajo")["items"]
    assert len(result) == 1
    assert result[0].nombre == "Bajo"


def test_get_products_filter_stock_status_agotado(db):
    create_product(db, ProductCreate(
        nombre="Sano", categoria_ids=[_cat(db)], stock_unidades=10,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="Vacio", categoria_ids=[_cat(db)], stock_unidades=0,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, stock_status="agotado")["items"]
    assert len(result) == 1
    assert result[0].nombre == "Vacio"


# --- sort_by / order ---

def test_get_products_sort_by_precio_desc(db):
    create_product(db, ProductCreate(
        nombre="Barato", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("5"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="Caro", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("50"),
        precio_caja_usd=Decimal("120"),
    ))
    result = get_products(db, sort_by="precio", order="desc")["items"]
    assert result[0].nombre == "Caro"
    assert result[-1].nombre == "Barato"


def test_get_products_sort_by_stock_asc(db):
    create_product(db, ProductCreate(
        nombre="Mucho", categoria_ids=[_cat(db)], stock_unidades=100,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("5"),
        precio_caja_usd=Decimal("48"),
    ))
    create_product(db, ProductCreate(
        nombre="Poco", categoria_ids=[_cat(db)], stock_unidades=2,
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("5"),
        precio_caja_usd=Decimal("48"),
    ))
    result = get_products(db, sort_by="stock", order="asc")["items"]
    assert result[0].nombre == "Poco"
    assert result[-1].nombre == "Mucho"


# --- tipo_iva filter ---

def test_get_products_filter_tipo_iva(db):
    create_product(db, ProductCreate(
        nombre="Gravado", categoria_ids=[_cat(db)],
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"), tipo_iva="GRAVADO",
    ))
    create_product(db, ProductCreate(
        nombre="Exento", categoria_ids=[_cat(db)], tipo_iva="EXENTO",
        precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"),
    ))
    result = get_products(db, tipo_iva="EXENTO")["items"]
    assert len(result) == 1
    assert result[0].nombre == "Exento"


# --- pagination ---

def test_get_products_pagination(db):
    for i in range(15):
        create_product(db, ProductCreate(
            nombre=f"Prod {i:02d}", categoria_ids=[_cat(db)],
            precio_costo_caja_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
            precio_caja_usd=Decimal("48"),
        ))

    # Page 1
    p1 = get_products(db, page=1, page_size=10)
    assert p1["total"] == 15
    assert len(p1["items"]) == 10
    assert p1["page"] == 1
    assert p1["page_size"] == 10
    assert p1["pages"] == 2
    assert p1["items"][0].nombre == "Prod 00"

    # Page 2
    p2 = get_products(db, page=2, page_size=10)
    assert len(p2["items"]) == 5
    assert p2["page"] == 2
    assert p2["items"][0].nombre == "Prod 10"

