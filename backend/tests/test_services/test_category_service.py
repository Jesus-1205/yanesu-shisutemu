from decimal import Decimal

from sqlalchemy import select

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.category import Category
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services.category_service import (
    create_category,
    delete_category,
    get_categories,
    get_category,
    get_category_analytics,
    get_low_rotation_categories,
    get_lowest_margin_categories,
    get_top_margin_categories,
    get_top_selling_categories,
    update_category,
)


def _create_category(db):
    data = CategoryCreate(nombre="Nueva Categoria", descripcion="Test")
    return create_category(db, data)


# --- get_categories ---

def test_get_categories_returns_seeded(db):
    result = get_categories(db)
    names = [c.nombre for c in result]
    assert "CAT" in names


def test_get_categories_returns_all(db):
    c = _create_category(db)
    result = get_categories(db)
    ids = [r.id for r in result]
    assert c.id in ids


# --- get_category ---

def test_get_category_found(db):
    c = _create_category(db)
    result = get_category(db, c.id)
    assert result is not None
    assert result.nombre == "Nueva Categoria"


def test_get_category_not_found(db):
    assert get_category(db, 999) is None


# --- create_category ---

def test_create_category_success(db):
    data = CategoryCreate(nombre="Premium", descripcion="Productos premium")
    result = create_category(db, data)
    assert result.nombre == "Premium"
    assert result.descripcion == "Productos premium"
    assert result.id is not None


def test_create_category_duplicate(db):
    _create_category(db)
    data = CategoryCreate(nombre="Nueva Categoria")
    try:
        create_category(db, data)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "ya existe" in str(e)


# --- update_category ---

def test_update_category_success(db):
    c = _create_category(db)
    data = CategoryUpdate(nombre="Modificada")
    result = update_category(db, c.id, data)
    assert result.nombre == "Modificada"


def test_update_category_partial(db):
    c = _create_category(db)
    data = CategoryUpdate(descripcion="Solo descripcion")
    result = update_category(db, c.id, data)
    assert result.descripcion == "Solo descripcion"
    assert result.nombre == "Nueva Categoria"


def test_update_category_not_found(db):
    data = CategoryUpdate(nombre="Nadie")
    try:
        update_category(db, 999, data)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Categoría no encontrada" in str(e)


def test_update_category_duplicate(db):
    _create_category(db)
    data_s2 = CategoryCreate(nombre="Otra Categoria")
    s2 = create_category(db, data_s2)
    data = CategoryUpdate(nombre="Nueva Categoria")
    try:
        update_category(db, s2.id, data)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "ya está en uso" in str(e)


# --- delete_category ---

def test_delete_category_success(db):
    c = _create_category(db)
    delete_category(db, c.id)
    assert get_category(db, c.id) is None


def test_delete_category_not_found(db):
    try:
        delete_category(db, 999)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Categoría no encontrada" in str(e)


# --- get_category_analytics ---

def test_get_category_analytics_empty(db):
    result = get_category_analytics(db)
    assert result.total_categorias == len(get_categories(db))
    assert result.total_productos == 0


def test_get_category_analytics_with_products(db):
    cat = _create_category(db)
    product = Product(
        nombre="P1",
        precio_costo_caja_usd=Decimal("120"), precio_costo_usd=Decimal("5"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"), stock_unidades=50,
        unidades_por_caja=24,
    )
    product.categories = [cat]
    db.add(product)
    db.commit()

    result = get_category_analytics(db)
    match = [c for c in result.categorias if c.id == cat.id][0]
    assert match.total_productos == 1
    assert match.stock_total == 50


def test_get_category_analytics_with_sales(db):
    cat = _create_category(db)
    product = Product(
        nombre="P",
        precio_costo_caja_usd=Decimal("120"), precio_costo_usd=Decimal("5"), precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("240"), stock_unidades=100,
        unidades_por_caja=24,
    )
    product.categories = [cat]
    db.add(product)
    db.flush()
    user = User(
        username="an", email="a@t.com", hashed_password="h",
        nombre_completo="A", rol_id=1,
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
        venta_id=sale.id, producto_id=product.id,
        tipo_empaque="UNIDAD", cantidad=2, unidades_descontadas=2,
        precio_unitario_usd=Decimal("10"),
    ))
    db.commit()

    result = get_category_analytics(db)
    match = [c for c in result.categorias if c.id == cat.id][0]
    assert match.unidades_vendidas >= 2
    assert match.ingresos_usd > 0


# --- get_top_selling_categories ---

def test_get_top_selling_categories_empty(db):
    assert get_top_selling_categories(db) == []


def test_get_top_selling_categories_with_sales(db):
    cat = _create_category(db)
    p = Product(
        nombre="P", precio_costo_caja_usd=Decimal("12"), precio_costo_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"), stock_unidades=100,
        unidades_por_caja=12,
    )
    p.categories = [cat]
    db.add(p)
    db.flush()
    user = User(
        username="u", email="u@t.com", hashed_password="h",
        nombre_completo="U", rol_id=1,
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
            venta_id=sale.id, producto_id=p.id,
            tipo_empaque="UNIDAD", cantidad=1, unidades_descontadas=1,
            precio_unitario_usd=Decimal("2"),
        ))
    db.commit()

    result = get_top_selling_categories(db)
    assert len(result) >= 1
    assert result[0][0].nombre == "Nueva Categoria"
    assert result[0][1] >= 3


# --- get_top_margin_categories ---

def test_get_top_margin_categories_empty(db):
    assert get_top_margin_categories(db) == []


def test_get_top_margin_categories_orders(db):
    cat_high = _create_category(db)
    cat_low = create_category(db, CategoryCreate(nombre="Low"))
    for cat in [cat_high, cat_low]:
        margin = Decimal("9") if cat.nombre == "Nueva Categoria" else Decimal("1")
        p = Product(
            nombre=cat.nombre,
            precio_costo_caja_usd=Decimal("12"), precio_costo_usd=Decimal("1"), precio_unidad_usd=Decimal("1") + margin,
            precio_caja_usd=Decimal("240"),
            unidades_por_caja=12,
        )
        p.categories = [cat]
        db.add(p)
    db.commit()

    result = get_top_margin_categories(db)
    assert result[0].nombre == "Nueva Categoria"


# --- get_lowest_margin_categories ---

def test_get_lowest_margin_categories_empty(db):
    assert get_lowest_margin_categories(db) == []


def test_get_lowest_margin_categories_orders(db):
    cat_mid = _create_category(db)
    cat_low = create_category(db, CategoryCreate(nombre="Lowest"))
    for cat in [cat_mid, cat_low]:
        margin = Decimal("5") if cat.nombre == "Nueva Categoria" else Decimal("1")
        p = Product(
            nombre=cat.nombre,
            precio_costo_caja_usd=Decimal("12"), precio_costo_usd=Decimal("1"), precio_unidad_usd=Decimal("1") + margin,
            precio_caja_usd=Decimal("240"),
            unidades_por_caja=12,
        )
        p.categories = [cat]
        db.add(p)
    db.commit()

    result = get_lowest_margin_categories(db)
    assert result[0].nombre == "Lowest"


# --- get_low_rotation_categories ---

def test_get_low_rotation_categories_empty(db):
    assert get_low_rotation_categories(db) == []


def test_get_low_rotation_categories_orders(db):
    cat_with_sales = _create_category(db)
    cat_without = create_category(db, CategoryCreate(nombre="SinVentas"))
    p1 = Product(
        nombre="ConVentas", precio_costo_caja_usd=Decimal("12"), precio_costo_usd=Decimal("1"), precio_unidad_usd=Decimal("2"),
        precio_caja_usd=Decimal("48"), stock_unidades=100,
        unidades_por_caja=12,
    )
    p1.categories = [cat_with_sales]
    db.add(p1)
    p2 = Product(
        nombre="SinVentas", precio_costo_caja_usd=Decimal("12"), precio_costo_usd=Decimal("1"), precio_unidad_usd=Decimal("3"),
        precio_caja_usd=Decimal("72"), stock_unidades=100,
        unidades_por_caja=12,
    )
    p2.categories = [cat_without]
    db.add(p2)
    db.flush()
    user = User(
        username="u", email="u@t.com", hashed_password="h",
        nombre_completo="U", rol_id=1,
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

    result = get_low_rotation_categories(db)
    assert result[0][0].nombre == "SinVentas"
    assert result[0][1] == 0
