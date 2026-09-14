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


class TestListSuppliers:
    def test_list_empty(self, client):
        _register_admin(client)
        response = client.get("/api/suppliers")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_returns_all(self, client):
        _register_admin(client)
        client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        client.post("/api/suppliers", json={"nombre": "Proveedor B"})
        response = client.get("/api/suppliers")
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_list_unauthenticated(self, client):
        response = client.get("/api/suppliers")
        assert response.status_code == 401

    def test_list_as_operator_allowed(self, client):
        _register_operator(client)
        response = client.get("/api/suppliers")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestGetSupplier:
    def test_get_by_id_found(self, client):
        _register_admin(client)
        created = client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        sid = created.json()["id"]
        response = client.get(f"/api/suppliers/{sid}")
        assert response.status_code == 200
        assert response.json()["nombre"] == "Proveedor A"

    def test_get_by_id_not_found(self, client):
        _register_admin(client)
        response = client.get("/api/suppliers/999")
        assert response.status_code == 404
        assert "Proveedor no encontrado" in response.json()["detail"]


class TestCreateSupplier:
    def test_create_success(self, client):
        _register_admin(client)
        response = client.post("/api/suppliers", json={
            "nombre": "Nuevo Proveedor",
            "telefono": "04121234567",
            "email": "prov@test.com",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "Nuevo Proveedor"
        assert data["telefono"] == "04121234567"
        assert data["email"] == "prov@test.com"
        assert "id" in data

    def test_create_duplicate(self, client):
        _register_admin(client)
        client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        response = client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        assert response.status_code == 409
        assert "ya existe" in response.json()["detail"]

    def test_create_unauthenticated(self, client):
        response = client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        assert response.status_code == 401


class TestUpdateSupplier:
    def test_update_success(self, client):
        _register_admin(client)
        created = client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        sid = created.json()["id"]
        response = client.put(f"/api/suppliers/{sid}", json={
            "nombre": "Proveedor A Modificado",
            "telefono": "04169876543",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["nombre"] == "Proveedor A Modificado"
        assert data["telefono"] == "04169876543"

    def test_update_partial(self, client):
        _register_admin(client)
        created = client.post("/api/suppliers", json={
            "nombre": "Proveedor A",
            "telefono": "04121234567",
        })
        sid = created.json()["id"]
        response = client.put(f"/api/suppliers/{sid}", json={"telefono": "04160000000"})
        assert response.status_code == 200
        assert response.json()["telefono"] == "04160000000"
        assert response.json()["nombre"] == "Proveedor A"

    def test_update_not_found(self, client):
        _register_admin(client)
        response = client.put("/api/suppliers/999", json={"nombre": "Nadie"})
        assert response.status_code == 404
        assert "Proveedor no encontrado" in response.json()["detail"]

    def test_update_duplicate(self, client):
        _register_admin(client)
        client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        created_b = client.post("/api/suppliers", json={"nombre": "Proveedor B"})
        sid_b = created_b.json()["id"]
        response = client.put(f"/api/suppliers/{sid_b}", json={"nombre": "Proveedor A"})
        assert response.status_code == 409
        assert "ya está en uso" in response.json()["detail"]


class TestDeleteSupplier:
    def test_delete_success(self, client):
        _register_admin(client)
        created = client.post("/api/suppliers", json={"nombre": "Proveedor A"})
        sid = created.json()["id"]
        response = client.delete(f"/api/suppliers/{sid}")
        assert response.status_code == 204

    def test_delete_not_found(self, client):
        _register_admin(client)
        response = client.delete("/api/suppliers/999")
        assert response.status_code == 404
        assert "Proveedor no encontrado" in response.json()["detail"]


class TestSupplierAnalytics:
    def test_analytics_admin(self, client):
        _register_admin(client)
        response = client.get("/api/suppliers/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "total_proveedores" in data
        assert "proveedores" in data
        assert data["proveedores"] == []

    def test_analytics_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/suppliers/analytics")
        assert response.status_code == 403

    def test_analytics_with_data(self, client):
        _register_admin(client)
        client.post("/api/suppliers", json={"nombre": "Prov A"})
        response = client.get("/api/suppliers/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["total_proveedores"] == 1
        assert len(data["proveedores"]) == 1
        assert data["proveedores"][0]["nombre"] == "Prov A"

    def test_analytics_unauthenticated(self, client):
        response = client.get("/api/suppliers/analytics")
        assert response.status_code == 401


class TestCreateSupplierOperator:
    def test_operator_can_create_supplier(self, client):
        _register_operator(client)
        response = client.post("/api/suppliers", json={"nombre": "Distribuidora XYZ"})
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "Distribuidora XYZ"


class TestSupplierDetailAnalyticsAndPagination:

    def test_get_suppliers_paginated(self, client):
        _register_admin(client)
        for i in range(5):
            client.post("/api/suppliers", json={"nombre": f"Proveedor Pagi {i}"})
        resp = client.get("/api/suppliers?page=1&page_size=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2
        assert data["pages"] == 3

    def test_get_supplier_detail_analytics(self, client):
        _register_admin(client)
        created = client.post("/api/suppliers", json={"nombre": "Proveedor Detalle"}).json()
        resp = client.get(f"/api/suppliers/{created['id']}/analytics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created["id"]
        assert data["nombre"] == "Proveedor Detalle"

    def test_get_supplier_detail_analytics_not_found(self, client):
        _register_admin(client)
        resp = client.get("/api/suppliers/99999/analytics")
        assert resp.status_code == 404

