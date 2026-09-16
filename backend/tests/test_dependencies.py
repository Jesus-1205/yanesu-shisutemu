from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import Config
from app.core.dependencies import decode_access_token


def _make_token(payload: dict | None = None) -> str:
    data = {"sub": "1", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    if payload:
        data.update(payload)
    return jwt.encode(data, Config.SECRET_KEY, algorithm=Config.ALGORITHM)


# --- decode_access_token ---

def test_decode_valid_token():
    token = _make_token()
    result = decode_access_token(token)
    assert result is not None
    assert result["sub"] == "1"


def test_decode_expired_token():
    token = _make_token({"exp": datetime.now(timezone.utc) - timedelta(hours=1)})
    result = decode_access_token(token)
    assert result is None


def test_decode_malformed_token():
    assert decode_access_token("not-a-valid-token") is None


# --- get_current_user via /auth/me ---

def test_get_current_user_valid(client):
    client.post("/api/auth/register", json={
        "username": "validuser", "email": "valid@test.com",
        "password": "pass123", "nombre_completo": "Valid", "rol_id": 2,
    })
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["username"] == "validuser"


def test_get_current_user_missing_cookie(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Token no proporcionado" in response.json()["detail"]


def test_get_current_user_invalid_token(client):
    client.cookies.set("access_token", "bogus.token.here")
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Token inválido o expirado" in response.json()["detail"]


def test_get_current_user_inactive(client):
    client.post("/api/auth/register", json={
        "username": "admin", "email": "admin@test.com",
        "password": "admin123", "nombre_completo": "Admin", "rol_id": 1,
    })
    client.post("/api/auth/register", json={
        "username": "operator", "email": "op@test.com",
        "password": "op123", "nombre_completo": "Op", "rol_id": 2,
    })
    operator_token = client.cookies.get("access_token")
    client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    client.patch("/api/users/2/toggle-active")
    client.cookies.set("access_token", operator_token)
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "inactivo" in response.json()["detail"]


# --- require_role via /admin-only ---

def test_require_role_correct(client):
    client.post("/api/auth/register", json={
        "username": "admin", "email": "admin@test.com",
        "password": "admin123", "nombre_completo": "Admin", "rol_id": 1,
    })
    response = client.get("/admin-only")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_require_role_wrong(client):
    client.post("/api/auth/register", json={
        "username": "operator", "email": "op@test.com",
        "password": "op123", "nombre_completo": "Op", "rol_id": 2,
    })
    response = client.get("/admin-only")
    assert response.status_code == 403
    assert "No tienes permisos" in response.json()["detail"]


# --- hash_api_key & verify_api_key ---

def test_hash_api_key():
    from app.core.dependencies import hash_api_key
    h1 = hash_api_key("my-token-123")
    h2 = hash_api_key("my-token-123")
    h3 = hash_api_key("other-token")
    assert h1 == h2
    assert h1 != h3
    assert len(h1) == 64

