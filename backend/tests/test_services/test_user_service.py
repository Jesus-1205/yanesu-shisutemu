from app.core.exceptions import EntityNotFoundError
from app.models.user import User
from app.schemas.user import UserUpdate
from app.services.user_service import get_users, get_user, update_user, toggle_user_active


def _create_user(db):
    user = User(username="testuser", email="test@example.com",
                hashed_password="hashed", nombre_completo="Test User", rol_id=1)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_get_users_empty(db):
    assert get_users(db) == []


def test_get_users_returns_all(db):
    user = _create_user(db)
    result = get_users(db)
    assert len(result) == 1
    assert result[0].id == user.id


def test_get_user_found(db):
    user = _create_user(db)
    result = get_user(db, user.id)
    assert result is not None
    assert result.id == user.id


def test_get_user_not_found(db):
    assert get_user(db, 999) is None


def test_update_user_success(db):
    user = _create_user(db)
    data = UserUpdate(nombre_completo="Updated Name")
    result = update_user(db, user.id, data)
    assert result.nombre_completo == "Updated Name"


def test_update_user_password(db):
    user = _create_user(db)
    data = UserUpdate(password="newpass456")
    result = update_user(db, user.id, data)
    assert result.hashed_password != "newpass456"


def test_update_user_not_found(db):
    data = UserUpdate(nombre_completo="Nope")
    try:
        update_user(db, 999, data)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Usuario no encontrado" in str(e)


def test_toggle_active_deactivates(db):
    user = _create_user(db)
    assert user.is_active is True
    result = toggle_user_active(db, user.id)
    assert result.is_active is False


def test_toggle_active_reactivates(db):
    user = _create_user(db)
    user.is_active = False
    db.commit()
    result = toggle_user_active(db, user.id)
    assert result.is_active is True


def test_toggle_active_not_found(db):
    try:
        toggle_user_active(db, 999)
        assert False, "Should raise EntityNotFoundError"
    except EntityNotFoundError as e:
        assert "Usuario no encontrado" in str(e)
