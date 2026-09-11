_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}


def _login(client, user=_ADMIN):
    client.post("/api/auth/register", json=user)


def _create_product(client, nombre="Producto Test", stock_unidades=100):
    return client.post("/api/products", json={
        "nombre": nombre,
        "precio_costo_caja_usd": 120,
        "precio_unidad_usd": 25,
        "precio_caja_usd": 600,
        "stock_unidades": stock_unidades,
        "unidades_por_caja": 12,
        "categoria_ids": [1],
    })


def _create_supplier(client):
    return client.post("/api/suppliers", json={"nombre": "Proveedor Test"})


class TestDashboardStats:

    def test_empty_dashboard(self, client):
        _login(client)
        resp = client.get("/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_productos"] == 0
        assert data["sin_stock"] == 0
        assert data["total_categorias"] >= 0
        assert data["total_proveedores"] == 0

    def test_dashboard_with_products(self, client):
        _login(client)
        _create_product(client, "P1", stock_unidades=50)
        _create_product(client, "P2", stock_unidades=0)
        _create_product(client, "P3", stock_unidades=10)
        resp = client.get("/api/dashboard/stats")
        data = resp.json()
        assert data["total_productos"] == 3
        assert data["sin_stock"] == 1

    def test_dashboard_with_suppliers(self, client):
        _login(client)
        client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        client.post("/api/suppliers", json={"nombre": "Proveedor B"})
        resp = client.get("/api/dashboard/stats")
        data = resp.json()
        assert data["total_proveedores"] == 2

    def test_dashboard_public_endpoint(self, client):
        resp = client.get("/api/dashboard/stats")
        assert resp.status_code == 200

    def test_dashboard_includes_categories(self, client):
        _login(client)
        resp = client.get("/api/dashboard/stats")
        data = resp.json()
        assert data["total_categorias"] >= 0
