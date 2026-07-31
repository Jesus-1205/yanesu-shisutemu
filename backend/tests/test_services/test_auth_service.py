import pytest
from datetime import datetime, timezone

from jose import jwt

from app.core.config import Config
from app.core.exceptions import ConflictError
from app.schemas.user import UserCreate
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_user,
    hash_password,
    verify_password,
)


def test_hash_and_verify():
    hashed = hash_password("secure123")
    assert hashed != "secure123"
    assert verify_password("secure123", hashed)
    assert not verify_password("wrong", hashed)


def test_create_access_token():
    token = create_access_token({"sub": "42"})
    payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
    assert payload["sub"] == "42"
    assert "exp" in payload


def test_create_access_token_expires_in_future():
    token = create_access_token({"sub": "1"})
    payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    assert exp > datetime.now(timezone.utc)


def test_create_user(db):
    data = UserCreate(
        username="newuser",
        email="new@test.com",
        password="pass123",
        nombre_completo="New User",
        rol_id=2,
    )
    user = create_user(db, data)
    assert user.id is not None
    assert user.username == "newuser"
    assert user.email == "new@test.com"
    assert user.nombre_completo == "New User"
    assert user.rol_id == 2
    assert user.is_active is True


def test_create_user_duplicate_username(db):
    data = UserCreate(
        username="dupuser",
        email="first@test.com",
        password="pass123",
        nombre_completo="First",
        rol_id=2,
    )
    create_user(db, data)
    data_dup = UserCreate(
        username="dupuser",
        email="second@test.com",
        password="pass456",
        nombre_completo="Second",
        rol_id=2,
    )
    with pytest.raises(ConflictError, match="usuario ya está registrado"):
        create_user(db, data_dup)


def test_create_user_duplicate_email(db):
    data = UserCreate(
        username="user1",
        email="dup@test.com",
        password="pass123",
        nombre_completo="User One",
        rol_id=2,
    )
    create_user(db, data)
    data_dup = UserCreate(
        username="user2",
        email="dup@test.com",
        password="pass456",
        nombre_completo="User Two",
        rol_id=2,
    )
    with pytest.raises(ConflictError, match="email ya está registrado"):
        create_user(db, data_dup)


def test_authenticate_user_success(db):
    data = UserCreate(
        username="authuser",
        email="auth@test.com",
        password="mypassword",
        nombre_completo="Auth User",
        rol_id=1,
    )
    create_user(db, data)
    user = authenticate_user(db, "authuser", "mypassword")
    assert user is not None
    assert user.username == "authuser"


def test_authenticate_user_wrong_password(db):
    data = UserCreate(
        username="authuser2",
        email="auth2@test.com",
        password="correctpass",
        nombre_completo="Auth Two",
        rol_id=1,
    )
    create_user(db, data)
    user = authenticate_user(db, "authuser2", "wrongpass")
    assert user is None


def test_authenticate_user_not_found(db):
    user = authenticate_user(db, "nonexistent", "anypass")
    assert user is None
