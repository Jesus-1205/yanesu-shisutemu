from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleCreate
from app.services.role_service import (
    get_roles, get_role, create_role, update_role, delete_role,
)


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
    role = db.query(Role).filter_by(nombre="ADMINISTRADOR").first()
    result = get_role(db, role.id)
    assert result is not None
    assert result.nombre == "ADMINISTRADOR"


def test_get_role_not_found(db):
    assert get_role(db, 999) is None


def test_create_role_success(db):
    data = RoleCreate(nombre="VENTAS")
    result = create_role(db, data)
    assert result.nombre == "VENTAS"
    assert result.id is not None


def test_create_role_duplicate(db):
    data = RoleCreate(nombre="ADMINISTRADOR")
    try:
        create_role(db, data)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "ya existe" in str(e)


def test_update_role_success(db):
    role = db.query(Role).filter_by(nombre="OPERADOR").first()
    data = RoleCreate(nombre="OPERADOR_V2")
    result = update_role(db, role.id, data)
    assert result.nombre == "OPERADOR_V2"


def test_update_role_not_found(db):
    data = RoleCreate(nombre="NUEVO")
    try:
        update_role(db, 999, data)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Rol no encontrado" in str(e)


def test_update_role_duplicate(db):
    role = db.query(Role).filter_by(nombre="OPERADOR").first()
    data = RoleCreate(nombre="ADMINISTRADOR")
    try:
        update_role(db, role.id, data)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "ya está en uso" in str(e)


def test_delete_role_success(db):
    role = db.query(Role).filter_by(nombre="OPERADOR").first()
    delete_role(db, role.id)
    assert get_role(db, role.id) is None


def test_delete_role_not_found(db):
    try:
        delete_role(db, 999)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Rol no encontrado" in str(e)


def test_delete_role_with_users(db):
    role = db.query(Role).filter_by(nombre="ADMINISTRADOR").first()
    user = User(username="admin_u", email="admin_u@test.com",
                hashed_password="x", nombre_completo="Admin U", rol_id=role.id)
    db.add(user)
    db.commit()
    try:
        delete_role(db, role.id)
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "usuarios asociados" in str(e)
