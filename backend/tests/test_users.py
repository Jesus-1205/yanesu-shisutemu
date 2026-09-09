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


def _login_as_admin(client):
    client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })


class TestCreateUser:
    def test_create_success(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/users", json={
            "username": "newuser",
            "email": "new@test.com",
            "password": "pass123",
            "nombre_completo": "Nuevo Usuario",
            "rol_id": 2,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "new@test.com"
        assert data["rol_nombre"] == "OPERADOR"
        assert data["is_active"] is True
        assert "created_at" in data

    def test_create_duplicate_username(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/users", json={
            "username": "admin",
            "email": "otro@test.com",
            "password": "pass123",
            "nombre_completo": "Duplicado",
            "rol_id": 2,
        })
        assert response.status_code == 409
        assert "nombre de usuario" in response.json()["detail"].lower()

    def test_create_duplicate_email(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/users", json={
            "username": "otrouser",
            "email": "admin@test.com",
            "password": "pass123",
            "nombre_completo": "Duplicado",
            "rol_id": 2,
        })
        assert response.status_code == 409
        assert "email" in response.json()["detail"].lower()

    def test_create_unauthenticated(self, client):
        response = client.post("/api/users", json={
            "username": "nobody",
            "email": "nobody@test.com",
            "password": "pass123",
            "nombre_completo": "Nobody",
            "rol_id": 2,
        })
        assert response.status_code == 401

    def test_create_as_operator_forbidden(self, client):
        _register_operator(client)
        response = client.post("/api/users", json={
            "username": "hacker",
            "email": "hacker@test.com",
            "password": "pass123",
            "nombre_completo": "Hacker",
            "rol_id": 1,
        })
        assert response.status_code == 403

    def test_create_missing_fields(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/users", json={"username": "incomplete"})
        assert response.status_code == 422


class TestListUsers:
    def test_list_as_admin(self, client):
        _register_admin(client)
        _register_operator(client)
        _login_as_admin(client)
        response = client.get("/api/users")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_unauthenticated(self, client):
        response = client.get("/api/users")
        assert response.status_code == 401

    def test_list_as_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/users")
        assert response.status_code == 403


class TestGetUser:
    def test_get_by_id_found(self, client):
        _register_admin(client)
        _register_operator(client)
        _login_as_admin(client)
        response = client.get("/api/users/2")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "operator"
        assert data["rol_nombre"] == "OPERADOR"
        assert "created_at" in data

    def test_get_by_id_not_found(self, client):
        _register_admin(client)
        response = client.get("/api/users/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Usuario no encontrado"


class TestUpdateUser:
    def test_update_success(self, client):
        _register_admin(client)
        _register_operator(client)
        _login_as_admin(client)
        response = client.put("/api/users/2", json={
            "nombre_completo": "Updated Operator",
        })
        assert response.status_code == 200
        assert response.json()["nombre_completo"] == "Updated Operator"

    def test_update_not_found(self, client):
        _register_admin(client)
        response = client.put("/api/users/999", json={"nombre_completo": "Nope"})
        assert response.status_code == 404
        assert "Usuario no encontrado" in response.json()["detail"]

    def test_update_unauthenticated(self, client):
        response = client.put("/api/users/1", json={"nombre_completo": "Nope"})
        assert response.status_code == 401

    def test_update_as_operator_forbidden(self, client):
        _register_operator(client)
        response = client.put("/api/users/1", json={"nombre_completo": "Nope"})
        assert response.status_code == 403


class TestToggleActive:
    def test_toggle_deactivates(self, client):
        _register_admin(client)
        _register_operator(client)
        _login_as_admin(client)
        response = client.patch("/api/users/2/toggle-active")
        assert response.status_code == 200
        assert response.json()["is_active"] is False

    def test_toggle_reactivates(self, client):
        _register_admin(client)
        _register_operator(client)
        _login_as_admin(client)
        client.patch("/api/users/2/toggle-active")
        response = client.patch("/api/users/2/toggle-active")
        assert response.status_code == 200
        assert response.json()["is_active"] is True

    def test_toggle_not_found(self, client):
        _register_admin(client)
        response = client.patch("/api/users/999/toggle-active")
        assert response.status_code == 404
        assert "Usuario no encontrado" in response.json()["detail"]


class TestDeleteUser:
    def test_delete_success(self, client):
        _register_admin(client)
        _register_operator(client)
        _login_as_admin(client)
        response = client.delete("/api/users/2")
        assert response.status_code == 204

        response = client.get("/api/users/2")
        assert response.status_code == 404

        all_users = client.get("/api/users").json()
        assert all(u["id"] != 2 for u in all_users)

    def test_delete_not_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.delete("/api/users/999")
        assert response.status_code == 404

    def test_delete_self_forbidden(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.delete("/api/users/1")
        assert response.status_code == 400
        assert "eliminarte a ti mismo" in response.json()["detail"]

    def test_delete_unauthenticated(self, client):
        response = client.delete("/api/users/1")
        assert response.status_code == 401

    def test_delete_as_operator_forbidden(self, client):
        _register_operator(client)
        client.post("/api/auth/login", json={
            "username": "operator",
            "password": "op123",
        })
        response = client.delete("/api/users/1")
        assert response.status_code == 403
