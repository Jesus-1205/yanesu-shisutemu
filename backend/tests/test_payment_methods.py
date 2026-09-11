import pytest


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


def _login_as_operator(client):
    client.post("/api/auth/login", json={
        "username": "operator",
        "password": "op123",
    })


class TestListPaymentMethods:
    def test_list_all(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.get("/api/payment-methods")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 4
        names = [m["nombre"] for m in data]
        assert "DIVISAS" in names
        assert "EFECTIVO" in names

    def test_list_solo_activos(self, client):
        _register_admin(client)
        _login_as_admin(client)
        client.post("/api/payment-methods", json={"nombre": "INACTIVO_TEST"})
        pm_id = client.get("/api/payment-methods").json()[-1]["id"]
        client.put(f"/api/payment-methods/{pm_id}", json={"activo": False})

        all_names = [m["nombre"] for m in client.get("/api/payment-methods").json()]
        assert "INACTIVO_TEST" in all_names

        active_names = [m["nombre"] for m in client.get("/api/payment-methods?solo_activos=true").json()]
        assert "INACTIVO_TEST" not in active_names

    def test_list_unauthenticated(self, client):
        response = client.get("/api/payment-methods")
        assert response.status_code == 401

    def test_list_as_operator_allowed(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.get("/api/payment-methods")
        assert response.status_code == 200


class TestGetPaymentMethod:
    def test_get_by_id_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.get("/api/payment-methods/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["nombre"] == "DIVISAS"

    def test_get_by_id_not_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.get("/api/payment-methods/999")
        assert response.status_code == 404

    def test_get_by_id_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.get("/api/payment-methods/1")
        assert response.status_code == 403

    def test_get_by_id_unauthenticated(self, client):
        response = client.get("/api/payment-methods/1")
        assert response.status_code == 401


class TestCreatePaymentMethod:
    def test_create_success(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/payment-methods", json={
            "nombre": "TARJETA",
            "activo": True,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "TARJETA"
        assert data["activo"] is True
        assert "id" in data

    def test_create_duplicate_nombre(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/payment-methods", json={"nombre": "DIVISAS"})
        assert response.status_code == 409

    def test_create_unauthenticated(self, client):
        response = client.post("/api/payment-methods", json={"nombre": "X"})
        assert response.status_code == 401

    def test_create_as_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.post("/api/payment-methods", json={"nombre": "HACK"})
        assert response.status_code == 403

    def test_create_missing_nombre(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/payment-methods", json={"activo": True})
        assert response.status_code == 422


class TestUpdatePaymentMethod:
    def test_update_nombre(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.put("/api/payment-methods/1", json={"nombre": "DIVISAS_UPD"})
        assert response.status_code == 200
        assert response.json()["nombre"] == "DIVISAS_UPD"

    def test_update_activo(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.put("/api/payment-methods/1", json={"activo": False})
        assert response.status_code == 200
        assert response.json()["activo"] is False

    def test_update_not_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.put("/api/payment-methods/999", json={"nombre": "X"})
        assert response.status_code == 404

    def test_update_duplicate_nombre(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.put("/api/payment-methods/1", json={"nombre": "EFECTIVO"})
        assert response.status_code == 409

    def test_update_same_nombre_no_conflict(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.put("/api/payment-methods/1", json={"nombre": "DIVISAS"})
        assert response.status_code == 200

    def test_update_unauthenticated(self, client):
        response = client.put("/api/payment-methods/1", json={"nombre": "X"})
        assert response.status_code == 401

    def test_update_as_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.put("/api/payment-methods/1", json={"nombre": "X"})
        assert response.status_code == 403


class TestDeletePaymentMethod:
    def test_delete_success(self, client):
        _register_admin(client)
        _login_as_admin(client)
        client.post("/api/payment-methods", json={"nombre": "TO_DELETE"})
        pm_id = client.get("/api/payment-methods").json()[-1]["id"]
        response = client.delete(f"/api/payment-methods/{pm_id}")
        assert response.status_code == 204

    def test_delete_not_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.delete("/api/payment-methods/999")
        assert response.status_code == 404

    def test_delete_unauthenticated(self, client):
        response = client.delete("/api/payment-methods/1")
        assert response.status_code == 401

    def test_delete_as_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.delete("/api/payment-methods/1")
        assert response.status_code == 403
