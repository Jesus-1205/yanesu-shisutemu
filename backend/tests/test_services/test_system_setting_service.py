from app.services.system_setting_service import (
    get_api_key,
    get_setting_by_clave,
    set_api_key,
    delete_api_key,
    has_api_key,
)


def test_set_and_get_api_key(db):
    set_api_key(db, "TEST_KEY", "secret-value-123", user_id=None, descripcion="test key")
    result = get_api_key(db, "TEST_KEY")
    assert result == "secret-value-123"


def test_set_api_key_encrypts_value(db):
    set_api_key(db, "ENCRYPT_TEST", "plain-secret")
    setting = get_setting_by_clave(db, "ENCRYPT_TEST")
    assert setting is not None
    assert setting.valor_cifrado != "plain-secret"
    assert setting.valor_cifrado.startswith("gAAAAA")


def test_get_api_key_not_found(db):
    result = get_api_key(db, "NONEXISTENT")
    assert result is None


def test_get_setting_by_clave_not_found(db):
    result = get_setting_by_clave(db, "NONEXISTENT")
    assert result is None


def test_set_api_key_upsert(db):
    set_api_key(db, "UPSERT_KEY", "first-value")
    set_api_key(db, "UPSERT_KEY", "second-value")
    result = get_api_key(db, "UPSERT_KEY")
    assert result == "second-value"


def test_set_api_key_with_user_id(db):
    from app.models.user import User
    from app.services.auth_service import hash_password

    user = User(
        username="testuser",
        email="test@test.com",
        hashed_password=hash_password("pass123"),
        nombre_completo="Test User",
        rol_id=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    setting = set_api_key(db, "USER_KEY", "value", user_id=user.id)
    assert setting.actualizado_por == user.id


def test_delete_api_key(db):
    set_api_key(db, "DELETE_KEY", "to-delete")
    assert has_api_key(db, "DELETE_KEY") is True
    deleted = delete_api_key(db, "DELETE_KEY")
    assert deleted is True
    assert has_api_key(db, "DELETE_KEY") is False


def test_delete_api_key_not_found(db):
    deleted = delete_api_key(db, "NONEXISTENT")
    assert deleted is False


def test_has_api_key(db):
    assert has_api_key(db, "HAS_KEY_TEST") is False
    set_api_key(db, "HAS_KEY_TEST", "value")
    assert has_api_key(db, "HAS_KEY_TEST") is True


def test_set_api_key_with_descripcion(db):
    set_api_key(db, "DESC_KEY", "val", descripcion="my description")
    setting = get_setting_by_clave(db, "DESC_KEY")
    assert setting is not None
    assert setting.descripcion == "my description"


def test_set_api_key_update_descripcion(db):
    set_api_key(db, "UPDATE_DESC", "val", descripcion="old")
    set_api_key(db, "UPDATE_DESC", "val", descripcion="new")
    setting = get_setting_by_clave(db, "UPDATE_DESC")
    assert setting is not None
    assert setting.descripcion == "new"
