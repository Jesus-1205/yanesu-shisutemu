import os
import tempfile

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# El TestClient corre sobre http://testserver; httpx no reenvía cookies con
# flag Secure en http. Los tests usan cookies sin Secure.
os.environ["SECURE_COOKIE"] = "False"

import app.core.database as db_module
from app.core.database import Base
from app.core.dependencies import require_role
from app.main import app
from app.models.category import Category
from app.models.payment_method import PaymentMethod
from app.models.role import Role
from app.models.user import User


@app.get("/admin-only")
def _admin_only(current_user=Depends(require_role("ADMINISTRADOR"))):
    return {"ok": True}


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
        username="test_admin",
        email="test_admin@test.com",
        hashed_password="pw",
        nombre_completo="Test Admin",
        rol_id=1,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def client(db_session):
    with TestClient(app) as c:
        yield c
