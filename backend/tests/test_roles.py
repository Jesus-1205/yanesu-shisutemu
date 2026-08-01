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


class TestCreateRole:
    def test_create_success(self, client):
        _register_admin(client)
        response = client.post("/api/roles", json={"nombre": "VENTAS"})
        assert response.status_code == 201
        assert response.json()["nombre"] == "VENTAS"

    def test_create_duplicate(self, client):
        _register_admin(client)
        client.post("/api/roles", json={"nombre": "VENTAS"})
        response = client.post("/api/roles", json={"nombre": "VENTAS"})
        assert response.status_code == 409
        assert "ya existe" in response.json()["detail"]

    def test_create_unauthenticated(self, client):
        response = client.post("/api/roles", json={"nombre": "VENTAS"})
        assert response.status_code == 401

    def test_create_as_operator_forbidden(self, client):
        _register_operator(client)
        response = client.post("/api/roles", json={"nombre": "VENTAS"})
        assert response.status_code == 403


class TestUpdateRole:
    def test_update_success(self, client):
        _register_admin(client)
        response = client.put("/api/roles/2", json={"nombre": "OPERADOR_V2"})
        assert response.status_code == 200
        assert response.json()["nombre"] == "OPERADOR_V2"

    def test_update_not_found(self, client):
        _register_admin(client)
        response = client.put("/api/roles/999", json={"nombre": "NUEVO"})
        assert response.status_code == 404
        assert "Rol no encontrado" in response.json()["detail"]

    def test_update_duplicate(self, client):
        _register_admin(client)
        response = client.put("/api/roles/2", json={"nombre": "ADMINISTRADOR"})
        assert response.status_code == 409
        assert "ya está en uso" in response.json()["detail"]


class TestDeleteRole:
    def test_delete_success(self, client):
        _register_admin(client)
        client.post("/api/roles", json={"nombre": "VENTAS"})
        response = client.delete("/api/roles/3")
        assert response.status_code == 204

    def test_delete_not_found(self, client):
        _register_admin(client)
        response = client.delete("/api/roles/999")
        assert response.status_code == 404
        assert "Rol no encontrado" in response.json()["detail"]

    def test_delete_with_users_conflict(self, client):
        _register_admin(client)
        response = client.delete("/api/roles/1")
        assert response.status_code == 409
        assert "usuarios asociados" in response.json()["detail"]
