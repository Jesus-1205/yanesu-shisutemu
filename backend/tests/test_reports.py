import pytest


def _register_admin(client):
    client.post("/api/auth/register", json={
        "username": "admin",
        "email": "admin@test.com",
        "password": "admin123",
        "nombre_completo": "Admin",
        "rol_id": 1,
    })


def _login_as_admin(client):
    client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
    })


def _create_product(client, nombre="Ron"):
    r = client.post("/api/products", json={
        "nombre": nombre,
        "categoria_ids": [1],
        "precio_unidad_usd": "10.00",
        "precio_caja_usd": "100.00",
        "stock_unidades": 50,
    })
    return r.json()["id"]


class TestProductsMatrix:
    def test_empty_matrix(self, client):
        _register_admin(client)
        _login_as_admin(client)
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_matrix_with_products(self, client):
        _register_admin(client)
        _login_as_admin(client)
        pid = _create_product(client, "Cerveza")
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        product_ids = [p["id"] for p in data]
        assert pid in product_ids

    def test_matrix_includes_margen(self, client):
        _register_admin(client)
        _login_as_admin(client)
        _create_product(client)
        response = client.get("/api/reports/products-matrix")
        data = response.json()
        assert len(data) >= 1
        item = data[0]
        assert "margen_porcentaje" in item
        assert "total_vendido" in item
        assert "precio_unidad_usd" in item
        assert "precio_costo_usd" in item

    def test_matrix_unauthenticated(self, client):
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 401

    def test_matrix_as_operator_forbidden(self, client):
        client.post("/api/auth/register", json={
            "username": "operator",
            "email": "op@test.com",
            "password": "op123",
            "nombre_completo": "Operator",
            "rol_id": 2,
        })
        client.post("/api/auth/login", json={
            "username": "operator",
            "password": "op123",
        })
        response = client.get("/api/reports/products-matrix")
        assert response.status_code == 403

    def test_matrix_with_limit(self, client):
        _register_admin(client)
        _login_as_admin(client)
        for i in range(5):
            _create_product(client, f"Prod{i}")
        response = client.get("/api/reports/products-matrix?limit=3")
        assert response.status_code == 200
        assert len(response.json()) == 3
