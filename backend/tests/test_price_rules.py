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


def _create_product(client):
    r = client.post("/api/products", json={
        "nombre": "Ron",
        "categoria_ids": [1],
        "precio_unidad_usd": "10.00",
        "precio_caja_usd": "100.00",
    })
    return r.json()["id"]


def _create_payment_method(client):
    r = client.post("/api/payment-methods", json={"nombre": "PM_RULE"})
    return r.json()["id"]


def _create_price_rule(client, nombre="Regla test"):
    pid = _create_product(client)
    pmid = _create_payment_method(client)
    r = client.post("/api/price-rules", json={
        "nombre": nombre,
        "descripcion": "Descripcion test",
        "productos": [
            {"producto_id": pid, "tipo_empaque": "UNIDAD", "precio_usd": "12.00"}
        ],
        "metodo_pago_ids": [pmid],
    })
    return r.json()


class TestListPriceRules:
    def test_list_all(self, client):
        _register_admin(client)
        _login_as_admin(client)
        _create_price_rule(client)
        response = client.get("/api/price-rules")
        assert response.status_code == 200
        assert len(response.json()) >= 1

    def test_list_filter_activo_true(self, client):
        _register_admin(client)
        _login_as_admin(client)
        _create_price_rule(client, "Activa")
        response = client.get("/api/price-rules?activo=true")
        assert response.status_code == 200
        for rule in response.json():
            assert rule["activo"] is True

    def test_list_filter_activo_false(self, client):
        _register_admin(client)
        _login_as_admin(client)
        rule = _create_price_rule(client, "Inactiva")
        client.put(f"/api/price-rules/{rule['id']}", json={"activo": False})
        response = client.get("/api/price-rules?activo=false")
        assert response.status_code == 200
        ids = [r["id"] for r in response.json()]
        assert rule["id"] in ids

        active_response = client.get("/api/price-rules?activo=true")
        active_ids = [r["id"] for r in active_response.json()]
        assert rule["id"] not in active_ids

    def test_list_unauthenticated(self, client):
        response = client.get("/api/price-rules")
        assert response.status_code == 401

    def test_list_as_operator_allowed(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.get("/api/price-rules")
        assert response.status_code == 200


class TestGetPriceRule:
    def test_get_by_id_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        rule = _create_price_rule(client)
        response = client.get(f"/api/price-rules/{rule['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == rule["id"]

    def test_get_by_id_not_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.get("/api/price-rules/999")
        assert response.status_code == 404

    def test_get_by_id_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.get("/api/price-rules/1")
        assert response.status_code == 403

    def test_get_by_id_unauthenticated(self, client):
        response = client.get("/api/price-rules/1")
        assert response.status_code == 401


class TestCreatePriceRule:
    def test_create_success(self, client):
        _register_admin(client)
        _login_as_admin(client)
        pid = _create_product(client)
        pmid = _create_payment_method(client)
        response = client.post("/api/price-rules", json={
            "nombre": "Nueva regla",
            "productos": [
                {"producto_id": pid, "tipo_empaque": "UNIDAD", "precio_usd": "15.00"}
            ],
            "metodo_pago_ids": [pmid],
        })
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "Nueva regla"
        assert len(data["products"]) == 1
        assert len(data["payment_methods"]) == 1

    def test_create_unauthenticated(self, client):
        response = client.post("/api/price-rules", json={
            "nombre": "X",
            "productos": [],
            "metodo_pago_ids": [],
        })
        assert response.status_code == 401

    def test_create_as_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.post("/api/price-rules", json={
            "nombre": "X",
            "productos": [],
            "metodo_pago_ids": [],
        })
        assert response.status_code == 403

    def test_create_missing_nombre(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.post("/api/price-rules", json={
            "productos": [],
            "metodo_pago_ids": [],
        })
        assert response.status_code == 422

    def test_create_empty_productos(self, client):
        _register_admin(client)
        _login_as_admin(client)
        pmid = _create_payment_method(client)
        response = client.post("/api/price-rules", json={
            "nombre": "Sin productos",
            "productos": [],
            "metodo_pago_ids": [pmid],
        })
        assert response.status_code == 422


class TestUpdatePriceRule:
    def test_update_nombre(self, client):
        _register_admin(client)
        _login_as_admin(client)
        rule = _create_price_rule(client)
        response = client.put(f"/api/price-rules/{rule['id']}", json={
            "nombre": "Modificada",
        })
        assert response.status_code == 200
        assert response.json()["nombre"] == "Modificada"

    def test_update_descripcion(self, client):
        _register_admin(client)
        _login_as_admin(client)
        rule = _create_price_rule(client)
        response = client.put(f"/api/price-rules/{rule['id']}", json={
            "descripcion": "Nueva desc",
        })
        assert response.status_code == 200
        assert response.json()["descripcion"] == "Nueva desc"

    def test_update_not_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.put("/api/price-rules/999", json={"nombre": "X"})
        assert response.status_code == 404

    def test_update_unauthenticated(self, client):
        response = client.put("/api/price-rules/1", json={"nombre": "X"})
        assert response.status_code == 401

    def test_update_as_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.put("/api/price-rules/1", json={"nombre": "X"})
        assert response.status_code == 403


class TestDeletePriceRule:
    def test_delete_success(self, client):
        _register_admin(client)
        _login_as_admin(client)
        rule = _create_price_rule(client, "Para borrar")
        response = client.delete(f"/api/price-rules/{rule['id']}")
        assert response.status_code == 200
        assert "eliminada" in response.json()["detail"].lower()

        response = client.get(f"/api/price-rules/{rule['id']}")
        assert response.status_code == 404

    def test_delete_not_found(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.delete("/api/price-rules/999")
        assert response.status_code == 404

    def test_delete_unauthenticated(self, client):
        response = client.delete("/api/price-rules/1")
        assert response.status_code == 401

    def test_delete_as_operator_forbidden(self, client):
        _register_operator(client)
        _login_as_operator(client)
        response = client.delete("/api/price-rules/1")
        assert response.status_code == 403
