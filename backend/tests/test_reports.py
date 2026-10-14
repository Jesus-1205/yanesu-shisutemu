import pytest
import tempfile
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
import app.core.database as db_module
from app.core.database import Base
from app.main import app
from app.models.category import Category
from app.models.payment_method import PaymentMethod
from app.models.role import Role
from app.models.user import User


@pytest.fixture
def db_session():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    engine = create_engine(
        f"sqlite:///{tmp.name}",
        connect_args={"check_same_thread": False},
        echo=False,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)

    TestSessionLocal = sessionmaker(bind=engine)
    session = TestSessionLocal()
    session.add_all([
        Role(nombre="ADMINISTRADOR"),
        Role(nombre="OPERADOR"),
        Category(nombre="LICORES"),
        Category(nombre="VINOS"),
        Category(nombre="CERVEZAS"),
        Category(nombre="REFRESCOS"),
        Category(nombre="CAT1"),
        Category(nombre="CAT2"),
        PaymentMethod(nombre="DIVISAS", activo=True),
        PaymentMethod(nombre="EFECTIVO", activo=True),
        PaymentMethod(nombre="PUNTO_DE_VENTA", activo=True),
        PaymentMethod(nombre="PAGO_MOVIL", activo=True),
    ])
    session.commit()

    def override_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[db_module.get_db] = override_get_db

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()
    tmp.close()


@pytest.fixture
def test_user(db_session):
    user = User(
        username="report_admin",
        email="report_admin@test.com",
        hashed_password="pw",
        nombre_completo="Report Admin",
        rol_id=1,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _register_admin(client):
    client.post("/api/auth/register", json={
        "username": "admin",
        "email": "admin@test.com",
        "password": "admin123",
        "nombre_completo": "Admin",
        "rol_id": 1,
    })


def _login_as_admin(client):
    client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })


def _create_product(client, nombre="Ron"):
    r = client.post("/api/products", json={
        "nombre": nombre,
        "categoria_ids": [1],
        "precio_unidad_usd": "10.00",
        "precio_caja_usd": "100.00",
        "stock_unidades": 50,
    })
    return r.json()["id"]


class TestProductsMatrix:
    def test_empty_matrix(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_matrix_with_products(self, client):
        _register_admin(client)
        _login_as_admin(client)
        pid = _create_product(client, "Cerveza")
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        product_ids = [p["id"] for p in data]
        assert pid in product_ids

    def test_matrix_includes_margen(self, client):
        _register_admin(client)
        _login_as_admin(client)
        _create_product(client)
        response = client.get("/api/reports/products-matrix")
        data = response.json()
        assert len(data) >= 1
        item = data[0]
        assert "margen_porcentaje" in item
        assert "total_vendido" in item
        assert "precio_unidad_usd" in item
        assert "precio_costo_usd" in item

    def test_matrix_unauthenticated(self, client):
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 401

    def test_matrix_as_operator_forbidden(self, client):
        client.post("/api/auth/register", json={
            "username": "operator",
            "email": "op@test.com",
            "password": "op123",
            "nombre_completo": "Operator",
            "rol_id": 2,
        })
        client.post("/api/auth/login", json={
            "username": "operator",
            "password": "op123",
        })
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 403

    def test_matrix_with_limit(self, client):
        _register_admin(client)
        _login_as_admin(client)
        for i in range(5):
            _create_product(client, f"Prod{i}")
        response = client.get("/api/reports/products-matrix?limit=3")
        assert response.status_code == 200
        assert len(response.json()) == 3


def test_get_category_report_service(db_session, test_user):
    from datetime import date
    from app.services.category_service import get_category_report, create_category
    from app.services.product_service import create_product
    from app.schemas.category import CategoryCreate
    from app.schemas.product import ProductCreate
    from app.models.sale import Sale, SaleItem
    from decimal import Decimal

    cat = create_category(db_session, CategoryCreate(nombre="Licores Premium"))
    prod = create_product(
        db_session,
        ProductCreate(
            nombre="Whisky 12 Años",
            precio_costo_caja_usd=Decimal("20.00"),
            precio_costo_usd=Decimal("20.00"),
            precio_unidad_usd=Decimal("30.00"),
            precio_caja_usd=Decimal("30.00"),
            unidades_por_caja=1,
            stock_unidades=15,
            categoria_ids=[cat.id],
        ),
    )

    sale = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("30.00"),
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
    )
    db_session.add(sale)
    db_session.flush()

    item = SaleItem(
        venta_id=sale.id,
        producto_id=prod.id,
        tipo_empaque="UNIDAD",
        cantidad=1,
        unidades_descontadas=1,
        precio_unitario_usd=Decimal("30.00"),
        iva_porcentaje=Decimal("0.00"),
    )
    db_session.add(item)
    db_session.commit()

    report = get_category_report(db_session, fecha_desde=date.today(), fecha_hasta=date.today())
    assert len(report) >= 1
    from app.schemas.category import CategoryReportItemOut
    validated_items = [CategoryReportItemOut.model_validate(r) for r in report]
    assert len(validated_items) >= 1
    cat_entry = next(r for r in report if r["id"] == cat.id)
    assert cat_entry["nombre"] == "Licores Premium"
    assert cat_entry["unidades_vendidas"] == 1
    assert cat_entry["ingresos_usd"] == Decimal("30.00")
    assert cat_entry["costos_usd"] == Decimal("20.00")
    assert cat_entry["margen_usd"] == Decimal("10.00")
    assert cat_entry["margen_porcentaje"] == Decimal("33.3")


def test_get_category_report_service_date_filter_excludes_out_of_range(db_session, test_user):
    from datetime import date, timedelta, datetime
    from app.services.category_service import get_category_report, create_category
    from app.services.product_service import create_product
    from app.schemas.category import CategoryCreate
    from app.schemas.product import ProductCreate
    from app.models.sale import Sale, SaleItem
    from app.core.timezone import VE_TZ
    from decimal import Decimal

    cat = create_category(db_session, CategoryCreate(nombre="Cervezas Artesanales"))
    prod = create_product(
        db_session,
        ProductCreate(
            nombre="IPA Especial",
            precio_costo_caja_usd=Decimal("15.00"),
            precio_costo_usd=Decimal("15.00"),
            precio_unidad_usd=Decimal("25.00"),
            precio_caja_usd=Decimal("25.00"),
            unidades_por_caja=1,
            stock_unidades=10,
            categoria_ids=[cat.id],
        ),
    )

    # Sale 10 days ago (outside range)
    past_date = datetime.now(VE_TZ) - timedelta(days=10)
    sale_past = Sale(
        usuario_id=test_user.id,
        fecha_venta=past_date,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("25.00"),
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
    )
    db_session.add(sale_past)
    db_session.flush()

    item_past = SaleItem(
        venta_id=sale_past.id,
        producto_id=prod.id,
        tipo_empaque="UNIDAD",
        cantidad=1,
        unidades_descontadas=1,
        precio_unitario_usd=Decimal("25.00"),
        iva_porcentaje=Decimal("0.00"),
    )
    db_session.add(item_past)
    db_session.commit()

    # Query today only
    report = get_category_report(db_session, fecha_desde=date.today(), fecha_hasta=date.today())
    cat_entry = next(r for r in report if r["id"] == cat.id)
    assert cat_entry["unidades_vendidas"] == 0
    assert cat_entry["ingresos_usd"] == Decimal("0.00")
    assert cat_entry["costos_usd"] == Decimal("0.00")
    assert cat_entry["margen_usd"] == Decimal("0.00")
    assert cat_entry["margen_porcentaje"] == Decimal("0.0")
    assert cat_entry["total_productos"] == 1
    assert cat_entry["stock_total"] == 10

