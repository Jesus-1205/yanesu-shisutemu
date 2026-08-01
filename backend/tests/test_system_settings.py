from unittest.mock import patch, MagicMock


def _login_as_admin(client):
    client.post("/api/auth/register", json={
        "username": "admin_settings",
        "email": "admin_settings@test.com",
        "password": "admin123",
        "nombre_completo": "Admin Settings",
        "rol_id": 1,
    })
    client.post("/api/auth/login", json={
        "username": "admin_settings",
        "password": "admin123",
    })


def test_get_api_key_status_not_configured(client):
    _login_as_admin(client)
    response = client.get("/api/settings/api-key/GEMINI_API_KEY")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is False
    assert data["clave"] == "GEMINI_API_KEY"


def test_save_and_get_api_key(client):
    _login_as_admin(client)
    response = client.post("/api/settings/api-key", json={
        "clave": "GEMINI_API_KEY",
        "valor": "test-api-key-12345",
        "descripcion": "Test key",
    })
    assert response.status_code == 200
    assert response.json()["message"] == "API key guardada correctamente"

    response = client.get("/api/settings/api-key/GEMINI_API_KEY")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True
    assert data["clave"] == "GEMINI_API_KEY"


def test_delete_api_key(client):
    _login_as_admin(client)
    client.post("/api/settings/api-key", json={
        "clave": "KEY_TO_DELETE",
        "valor": "delete-me",
    })

    response = client.delete("/api/settings/api-key/KEY_TO_DELETE")
    assert response.status_code == 200
    assert response.json()["message"] == "API key eliminada correctamente"

    response = client.get("/api/settings/api-key/KEY_TO_DELETE")
    assert response.json()["configured"] is False


def test_delete_api_key_not_found(client):
    _login_as_admin(client)
    response = client.delete("/api/settings/api-key/NONEXISTENT")
    assert response.status_code == 404


def test_test_connection_success(client):
    _login_as_admin(client)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"models": []}

    with patch("app.services.gemini_service.httpx.Client") as mock_client:
        mock_client.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client.return_value.__exit__ = MagicMock(return_value=False)
        mock_client.get.return_value = mock_response

        response = client.post("/api/settings/api-key/test", json={
            "clave": "GEMINI_API_KEY",
            "valor": "valid-key",
        })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Conexión exitosa" in data["message"]


def test_test_connection_invalid_key(client):
    _login_as_admin(client)

    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {
        "error": {"message": "API key not valid. Please pass a valid API key."}
    }
    mock_response.text = "invalid"

    with patch("app.services.gemini_service.httpx.Client") as mock_client:
        mock_client.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client.return_value.__exit__ = MagicMock(return_value=False)
        mock_client.get.return_value = mock_response

        response = client.post("/api/settings/api-key/test", json={
            "clave": "GEMINI_API_KEY",
            "valor": "bad-key",
        })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "API key no válida" in data["message"]


def test_unauthorized_access(client):
    response = client.get("/api/settings/api-key/GEMINI_API_KEY")
    assert response.status_code in (401, 403)
