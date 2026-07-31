import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.category import Category
from app.models.role import Role


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    session.add_all([
        Role(nombre="ADMINISTRADOR"),
        Role(nombre="OPERADOR"),
        Category(nombre="CAT"),
        Category(nombre="CAT1"),
        Category(nombre="CAT2"),
        Category(nombre="LICOR"),
        Category(nombre="LICORES"),
    ])
    session.commit()
    try:
        yield session
    finally:
        session.close()
