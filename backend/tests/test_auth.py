def test_register_success(client):
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "secure123",
        "nombre_completo": "Test User",
        "rol_id": 2,
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert data["nombre_completo"] == "Test User"
    assert "id" in data

    cookies = response.headers.get("set-cookie")
    assert cookies is not None
    assert "access_token" in cookies
    assert "HttpOnly" in cookies


def test_register_duplicate_username(client):
    client.post("/auth/register", json={
        "username": "dupuser",
        "email": "first@example.com",
        "password": "secure123",
        "nombre_completo": "Dup User",
        "rol_id": 2,
    })
    response = client.post("/auth/register", json={
        "username": "dupuser",
        "email": "second@example.com",
        "password": "secure123",
        "nombre_completo": "Dup User",
        "rol_id": 2,
    })
    assert response.status_code == 409
    data = response.json()
    assert "detail" in data


def test_register_duplicate_email(client):
    client.post("/auth/register", json={
        "username": "user1",
        "email": "dup@example.com",
        "password": "secure123",
        "nombre_completo": "User One",
        "rol_id": 2,
    })
    response = client.post("/auth/register", json={
        "username": "user2",
        "email": "dup@example.com",
        "password": "secure123",
        "nombre_completo": "User Two",
        "rol_id": 2,
    })
    assert response.status_code == 409
    data = response.json()
    assert "detail" in data


def test_register_missing_fields(client):
    response = client.post("/auth/register", json={
        "username": "incomplete",
    })
    assert response.status_code == 422


def test_login_success(client):
    client.post("/auth/register", json={
        "username": "logintest",
        "email": "login@example.com",
        "password": "secure123",
        "nombre_completo": "Login Test",
        "rol_id": 2,
    })
    response = client.post("/auth/login", json={
        "username": "logintest",
        "password": "secure123",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "logintest"
    assert "id" in data

    cookies = response.headers.get("set-cookie")
    assert cookies is not None
    assert "access_token" in cookies
    assert "HttpOnly" in cookies


def test_login_invalid_credentials(client):
    response = client.post("/auth/login", json={
        "username": "nobody",
        "password": "wrong",
    })
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


def test_login_invalid_body(client):
    response = client.post("/auth/login", json={"username": "foo"})
    assert response.status_code == 422


def test_me_authenticated(client):
    client.post("/auth/register", json={
        "username": "meuser",
        "email": "me@example.com",
        "password": "secure123",
        "nombre_completo": "Me User",
        "rol_id": 2,
    })
    client.post("/auth/login", json={
        "username": "meuser",
        "password": "secure123",
    })

    response = client.get("/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "meuser"
    assert data["rol_nombre"] == "OPERADOR"
    assert data["email"] == "me@example.com"


def test_me_unauthenticated(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


def test_logout(client):
    client.post("/auth/register", json={
        "username": "logoutuser",
        "email": "logout@example.com",
        "password": "secure123",
        "nombre_completo": "Logout User",
        "rol_id": 2,
    })
    response = client.post("/auth/logout")
    assert response.status_code == 200

    cookie_header = response.headers.get("set-cookie", "")
    assert "access_token=" in cookie_header
    assert "Max-Age=0" in cookie_header or "expires=" in cookie_header.lower()


def test_admin_required(client):
    response = client.get("/admin-only")
    assert response.status_code == 401

    client.post("/auth/register", json={
        "username": "operator",
        "email": "op@example.com",
        "password": "secure123",
        "nombre_completo": "Operator",
        "rol_id": 2,
    })
    response = client.get("/admin-only")
    assert response.status_code == 403
