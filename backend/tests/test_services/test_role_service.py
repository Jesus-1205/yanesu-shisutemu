from sqlalchemy import select

from app.models.role import Role
from app.services.role_service import get_roles, get_role


def test_get_roles_empty(db):
    # db seeds ADMINISTRADOR and OPERADOR in conftest
    roles = get_roles(db)
    assert len(roles) == 2


def test_get_roles_returns_all(db):
    db.add(Role(nombre="VENTAS"))
    db.commit()
    roles = get_roles(db)
    assert len(roles) == 3


def test_get_role_found(db):
    role = db.execute(select(Role).where(Role.nombre == "ADMINISTRADOR")).scalars().first()
    result = get_role(db, role.id)
    assert result is not None
    assert result.nombre == "ADMINISTRADOR"


def test_get_role_not_found(db):
    assert get_role(db, 999) is None

