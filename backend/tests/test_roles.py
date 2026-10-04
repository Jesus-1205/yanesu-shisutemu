def _register_admin(client):
    client.post("/api/auth/register", json={
        "username": "admin",
        "email": "admin@test.com",
        "password": "admin123",
        "nombre_completo": "Admin",
        "rol_id": 1,
    })


def _register_operator(client):
    client.post("/api/auth/register", json={
        "username": "operator",
        "email": "op@test.com",
        "password": "op123",
        "nombre_completo": "Operator",
        "rol_id": 2,
    })


class TestListRoles:
    def test_list_as_admin(self, client):
        _register_admin(client)
        response = client.get("/api/roles")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        nombres = {r["nombre"] for r in data}
        assert nombres == {"ADMINISTRADOR", "OPERADOR"}

    def test_list_unauthenticated(self, client):
        response = client.get("/api/roles")
        assert response.status_code == 401

    def test_list_as_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/roles")
        assert response.status_code == 403


class TestGetRole:
    def test_get_by_id_found(self, client):
        _register_admin(client)
        response = client.get("/api/roles/1")
        assert response.status_code == 200
        assert response.json()["nombre"] == "ADMINISTRADOR"

    def test_get_by_id_not_found(self, client):
        _register_admin(client)
        response = client.get("/api/roles/999")
        assert response.status_code == 404
        assert "Rol no encontrado" in response.json()["detail"]

