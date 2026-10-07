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


class TestListCategories:
    def test_list_empty(self, client):
        _register_admin(client)
        response = client.get("/api/categories")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_returns_all(self, client):
        _register_admin(client)
        client.post("/api/categories", json={"nombre": "Cat A"})
        client.post("/api/categories", json={"nombre": "Cat B"})
        response = client.get("/api/categories")
        assert response.status_code == 200
        assert len(response.json()) >= 2

    def test_list_unauthenticated(self, client):
        response = client.get("/api/categories")
        assert response.status_code == 401

    def test_list_as_operator_allowed(self, client):
        _register_operator(client)
        response = client.get("/api/categories")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestGetCategory:
    def test_get_by_id_found(self, client):
        _register_admin(client)
        created = client.post("/api/categories", json={"nombre": "Cat A"})
        cid = created.json()["id"]
        response = client.get(f"/api/categories/{cid}")
        assert response.status_code == 200
        assert response.json()["nombre"] == "Cat A"

    def test_get_by_id_not_found(self, client):
        _register_admin(client)
        response = client.get("/api/categories/999")
        assert response.status_code == 404
        assert "Categoría no encontrada" in response.json()["detail"]


class TestCreateCategory:
    def test_create_success(self, client):
        _register_admin(client)
        response = client.post("/api/categories", json={
            "nombre": "Premium",
            "descripcion": "Productos premium",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "Premium"
        assert data["descripcion"] == "Productos premium"
        assert "id" in data

    def test_create_duplicate(self, client):
        _register_admin(client)
        client.post("/api/categories", json={"nombre": "Premium"})
        response = client.post("/api/categories", json={"nombre": "Premium"})
        assert response.status_code == 409
        assert "ya existe" in response.json()["detail"]

    def test_create_unauthenticated(self, client):
        response = client.post("/api/categories", json={"nombre": "Cat"})
        assert response.status_code == 401


class TestUpdateCategory:
    def test_update_success(self, client):
        _register_admin(client)
        created = client.post("/api/categories", json={"nombre": "Cat A"})
        cid = created.json()["id"]
        response = client.put(f"/api/categories/{cid}", json={"nombre": "Cat A Mod"})
        assert response.status_code == 200
        assert response.json()["nombre"] == "Cat A Mod"

    def test_update_not_found(self, client):
        _register_admin(client)
        response = client.put("/api/categories/999", json={"nombre": "X"})
        assert response.status_code == 404

    def test_update_duplicate(self, client):
        _register_admin(client)
        client.post("/api/categories", json={"nombre": "Cat A"})
        created = client.post("/api/categories", json={"nombre": "Cat B"})
        cid = created.json()["id"]
        response = client.put(f"/api/categories/{cid}", json={"nombre": "Cat A"})
        assert response.status_code == 409


class TestDeleteCategory:
    def test_delete_success(self, client):
        _register_admin(client)
        created = client.post("/api/categories", json={"nombre": "ToDelete"})
        cid = created.json()["id"]
        response = client.delete(f"/api/categories/{cid}")
        assert response.status_code == 204

    def test_delete_not_found(self, client):
        _register_admin(client)
        response = client.delete("/api/categories/999")
        assert response.status_code == 404

    def test_delete_as_operator_forbidden(self, client):
        _register_operator(client)
        _register_admin(client)
        created = client.post("/api/categories", json={"nombre": "ToDelete"})
        cid = created.json()["id"]
        client.post("/api/auth/login", json={"username": "operator", "password": "op123"})
        response = client.delete(f"/api/categories/{cid}")
        assert response.status_code == 403

    def test_delete_unauthenticated(self, client):
        _register_admin(client)
        created = client.post("/api/categories", json={"nombre": "ToDelete"})
        cid = created.json()["id"]
        client.cookies.clear()
        response = client.delete(f"/api/categories/{cid}")
        assert response.status_code == 401


class TestCategoryAnalytics:
    def test_analytics_admin(self, client):
        _register_admin(client)
        response = client.get("/api/categories/analytics")
        assert response.status_code == 200
        assert "total_categorias" in response.json()

    def test_analytics_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/categories/analytics")
        assert response.status_code == 403


class TestCategoryTopSelling:
    def test_top_selling_admin(self, client):
        _register_admin(client)
        response = client.get("/api/categories/top-selling")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_top_selling_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/categories/top-selling")
        assert response.status_code == 403


class TestCategoryTopMargin:
    def test_top_margin_admin(self, client):
        _register_admin(client)
        response = client.get("/api/categories/top-margin")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_top_margin_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/categories/top-margin")
        assert response.status_code == 403


class TestCategoryLowestMargin:
    def test_lowest_margin_admin(self, client):
        _register_admin(client)
        response = client.get("/api/categories/lowest-margin")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_lowest_margin_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/categories/lowest-margin")
        assert response.status_code == 403


class TestCategoryLowRotation:
    def test_low_rotation_admin(self, client):
        _register_admin(client)
        response = client.get("/api/categories/low-rotation")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_low_rotation_operator_forbidden(self, client):
        _register_operator(client)
        response = client.get("/api/categories/low-rotation")
        assert response.status_code == 403


class TestCreateCategoryOperator:
    def test_operator_can_create_category(self, client):
        _register_operator(client)
        response = client.post("/api/categories", json={"nombre": "Cervezas Import"})
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "Cervezas Import"


class TestCategoryDetailAnalyticsRoute:

    def test_get_category_detail_analytics(self, client):
        _register_admin(client)
        created = client.post("/api/categories", json={"nombre": "Vinos Tintos"}).json()
        resp = client.get(f"/api/categories/{created['id']}/analytics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created["id"]
        assert data["nombre"] == "Vinos Tintos"

    def test_get_category_detail_analytics_not_found(self, client):
        _register_admin(client)
        resp = client.get("/api/categories/99999/analytics")
        assert resp.status_code == 404


class TestCategorySummaryRoute:
    def test_get_category_summary(self, client):
        _register_admin(client)
        client.post("/api/categories", json={"nombre": "Ron"})
        resp = client.get("/api/categories/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_categorias" in data
        assert "total_productos" in data
        assert data["total_categorias"] >= 1


