import pytest
from fastapi import HTTPException
from sqlalchemy.orm import sessionmaker

from app.core.config import Config
from app.routes.exchange_rates import authenticate_stream_user
from app.services.auth_service import create_access_token


@pytest.fixture(autouse=True)
def patch_session_local(monkeypatch, db_session):
    test_sessionmaker = sessionmaker(bind=db_session.get_bind())
    monkeypatch.setattr("app.routes.exchange_rates.SessionLocal", test_sessionmaker)


def test_authenticate_stream_user_success(test_user):
    token = create_access_token({"sub": str(test_user.id)})
    user = authenticate_stream_user(access_token=token)
    assert user is not None
    assert user.id == test_user.id
    assert user.username == test_user.username
    assert user.role is not None
    assert user.role.nombre == "ADMINISTRADOR"


def test_authenticate_stream_user_missing_token():
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user(access_token=None)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token no proporcionado"


def test_authenticate_stream_user_empty_token():
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user(access_token="")
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token no proporcionado"


def test_authenticate_stream_user_invalid_token():
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user(access_token="invalid.jwt.token")
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token inválido o expirado"


def test_authenticate_stream_user_missing_sub():
    from datetime import datetime, timedelta, timezone
    from jose import jwt

    token = jwt.encode(
        {"exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        Config.SECRET_KEY,
        algorithm=Config.ALGORITHM,
    )
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user(access_token=token)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token inválido"


def test_authenticate_stream_user_user_not_found():
    token = create_access_token({"sub": "999999"})
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user(access_token=token)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Usuario no encontrado o inactivo"


def test_authenticate_stream_user_inactive_user(db_session, test_user):
    test_user.is_active = False
    db_session.commit()

    token = create_access_token({"sub": str(test_user.id)})
    with pytest.raises(HTTPException) as exc_info:
        authenticate_stream_user(access_token=token)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Usuario no encontrado o inactivo"


def test_stream_endpoint_unauthenticated(client):
    response = client.get("/api/exchange-rates/stream")
    assert response.status_code == 401
    assert response.json()["detail"] == "Token no proporcionado"


def test_stream_endpoint_invalid_token(client):
    client.cookies.set("access_token", "invalid.jwt.token")
    response = client.get("/api/exchange-rates/stream")
    assert response.status_code == 401
    assert response.json()["detail"] == "Token inválido o expirado"
