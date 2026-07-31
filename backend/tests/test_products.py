from decimal import Decimal


# --- helpers ---

_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}
_OPERATOR = {"username": "op", "email": "op@test.com", "password": "op123",
             "nombre_completo": "Op", "rol_id": 2}
_PRODUCT = {"nombre": "Test Producto",
            "precio_costo_caja_usd": 120, "precio_unidad_usd": 25,
            "precio_caja_usd": 600}


def _login(client, user):
    client.post("/auth/register", json=user)


def _create_product(client):
    return client.post("/products", json=_PRODUCT)


class TestCreateProduct:

    def test_create_as_admin(self, client):
        _login(client, _ADMIN)
        response = _create_product(client)
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == _PRODUCT["nombre"]
        assert data["categories"] == []
        assert data["tipo_iva"] == "GRAVADO"
        assert data["stock_minimo"] == 5
        assert "id" in data

    def test_create_as_operator(self, client):
        _login(client, _OPERATOR)
        response = _create_product(client)
        assert response.status_code == 201

    def test_create_duplicate_barcode(self, client):
        _login(client, _ADMIN)
        client.post("/products", json={**_PRODUCT, "codigo_barra": "dup123"})
        response = client.post("/products", json={**_PRODUCT, "codigo_barra": "dup123",
                                                   "nombre": "Otro"})
        assert response.status_code == 409
        assert "código de barras" in response.json()["detail"]

    def test_create_unauthenticated(self, client):
        response = _create_product(client)
        assert response.status_code == 401

    def test_create_missing_fields(self, client):
        _login(client, _ADMIN)
        response = client.post("/products", json={"nombre": "incomplete"})
        assert response.status_code == 422


class TestListProducts:

    def test_list_empty(self, client):
        _login(client, _ADMIN)
        response = client.get("/products")
        assert response.status_code == 200
        assert response.json()["items"] == []

    def test_list_returns_all(self, client):
        _login(client, _ADMIN)
        _create_product(client)
        client.post("/products", json={**_PRODUCT, "nombre": "Producto B"})
        response = client.get("/products")
        assert response.status_code == 200
        assert len(response.json()["items"]) == 2

    def test_list_search(self, client):
        _login(client, _ADMIN)
        _create_product(client)
        response = client.get("/products?search=Test")
        assert len(response.json()["items"]) >= 1

    def test_list_as_operator(self, client):
        _login(client, _OPERATOR)
        response = client.get("/products")
        assert response.status_code == 200

    def test_list_unauthenticated(self, client):
        response = client.get("/products")
        assert response.status_code == 401

    def test_list_filter_stock_status_disponible(self, client):
        _login(client, _ADMIN)
        client.post("/products", json={**_PRODUCT, "nombre": "ConStock", "stock_unidades": 10})
        client.post("/products", json={**_PRODUCT, "nombre": "Agotado", "stock_unidades": 0})
        response = client.get("/products?stock_status=disponible")
        assert response.status_code == 200
        data = response.json()["items"]
        names = [p["nombre"] for p in data]
        assert "ConStock" in names
        assert "Agotado" not in names

    def test_list_filter_stock_status_agotado(self, client):
        _login(client, _ADMIN)
        client.post("/products", json={**_PRODUCT, "nombre": "ConStock", "stock_unidades": 10})
        client.post("/products", json={**_PRODUCT, "nombre": "Agotado", "stock_unidades": 0})
        response = client.get("/products?stock_status=agotado")
        assert response.status_code == 200
        data = response.json()["items"]
        names = [p["nombre"] for p in data]
        assert "Agotado" in names
        assert "ConStock" not in names

    def test_list_filter_tipo_iva(self, client):
        _login(client, _ADMIN)
        client.post("/products", json={**_PRODUCT, "nombre": "Gravado", "tipo_iva": "GRAVADO"})
        client.post("/products", json={**_PRODUCT, "nombre": "Exento", "tipo_iva": "EXENTO"})
        response = client.get("/products?tipo_iva=EXENTO")
        assert response.status_code == 200
        data = response.json()["items"]
        names = [p["nombre"] for p in data]
        assert "Exento" in names
        assert "Gravado" not in names

    def test_list_sort_by_precio_desc(self, client):
        _login(client, _ADMIN)
        client.post("/products", json={**_PRODUCT, "nombre": "Barato", "precio_unidad_usd": 5, "precio_costo_caja_usd": 24})
        client.post("/products", json={**_PRODUCT, "nombre": "Caro", "precio_unidad_usd": 50, "precio_costo_caja_usd": 24})
        response = client.get("/products?sort_by=precio&order=desc")
        assert response.status_code == 200
        data = response.json()["items"]
        assert data[0]["nombre"] == "Caro"
        assert data[-1]["nombre"] == "Barato"

    def test_list_sort_by_nombre_asc(self, client):
        _login(client, _ADMIN)
        client.post("/products", json={**_PRODUCT, "nombre": "Zeta"})
        client.post("/products", json={**_PRODUCT, "nombre": "Alpha"})
        response = client.get("/products?sort_by=nombre&order=asc")
        assert response.status_code == 200
        data = response.json()["items"]
        assert data[0]["nombre"] == "Alpha"
        assert data[-1]["nombre"] == "Zeta"



class TestGetProduct:

    def test_get_by_id_found(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        response = client.get(f"/products/{created['id']}")
        assert response.status_code == 200
        assert response.json()["nombre"] == created["nombre"]

    def test_get_by_id_not_found(self, client):
        _login(client, _ADMIN)
        response = client.get("/products/999")
        assert response.status_code == 404

    def test_get_by_id_as_operator(self, client):
        _login(client, _OPERATOR)
        _login(client, _ADMIN)
        created = _create_product(client).json()
        client.post("/auth/login", json={"username": "op", "password": "op123"})
        response = client.get(f"/products/{created['id']}")
        assert response.status_code == 200


class TestUpdateProduct:

    def test_update_success(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        response = client.put(f"/products/{created['id']}",
                               json={"nombre": "Actualizado"})
        assert response.status_code == 200
        assert response.json()["nombre"] == "Actualizado"

    def test_update_partial(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        response = client.put(f"/products/{created['id']}",
                               json={"precio_unidad_usd": 99})
        assert response.status_code == 200
        assert Decimal(str(response.json()["precio_unidad_usd"])) == Decimal("99")
        assert response.json()["nombre"] == _PRODUCT["nombre"]

    def test_update_not_found(self, client):
        _login(client, _ADMIN)
        response = client.put("/products/999", json={"nombre": "X"})
        assert response.status_code == 404

    def test_update_duplicate_barcode(self, client):
        _login(client, _ADMIN)
        _create_product(client)
        client.post("/products", json={**_PRODUCT, "nombre": "Segundo",
                                        "codigo_barra": "dupbar"}).json()
        p3 = client.post("/products", json={**_PRODUCT, "nombre": "Tercero",
                                              "codigo_barra": "uniqbar"}).json()
        response = client.put(f"/products/{p3['id']}",
                               json={"codigo_barra": "dupbar"})
        assert response.status_code == 409
        assert "código de barras" in response.json()["detail"]

    def test_update_as_operator(self, client):
        _login(client, _OPERATOR)
        _login(client, _ADMIN)
        created = _create_product(client).json()
        client.post("/auth/login", json={"username": "op", "password": "op123"})
        response = client.put(f"/products/{created['id']}",
                               json={"nombre": "OpEdit"})
        assert response.status_code == 200

    def test_update_unauthenticated(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        client.cookies.clear()
        response = client.put(f"/products/{created['id']}",
                               json={"nombre": "X"})
        assert response.status_code == 401


class TestDeleteProduct:

    def test_delete_success(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        response = client.delete(f"/products/{created['id']}")
        assert response.status_code == 204

    def test_delete_not_found(self, client):
        _login(client, _ADMIN)
        response = client.delete("/products/999")
        assert response.status_code == 404

    def test_delete_as_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        _login(client, _ADMIN)
        created = _create_product(client).json()
        client.post("/auth/login", json={"username": "op", "password": "op123"})
        response = client.delete(f"/products/{created['id']}")
        assert response.status_code == 403

    def test_delete_unauthenticated(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        client.cookies.clear()
        response = client.delete(f"/products/{created['id']}")
        assert response.status_code == 401


class TestTopSelling:

    def test_top_selling_admin(self, client):
        _login(client, _ADMIN)
        response = client.get("/products/top-selling")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_top_selling_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        response = client.get("/products/top-selling")
        assert response.status_code == 403


class TestTopMargin:

    def test_top_margin_admin(self, client):
        _login(client, _ADMIN)
        response = client.get("/products/top-margin")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_top_margin_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        response = client.get("/products/top-margin")
        assert response.status_code == 403


class TestLowestMargin:

    def test_lowest_margin_admin(self, client):
        _login(client, _ADMIN)
        response = client.get("/products/lowest-margin")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_lowest_margin_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        response = client.get("/products/lowest-margin")
        assert response.status_code == 403


class TestLowRotation:

    def test_low_rotation_admin(self, client):
        _login(client, _ADMIN)
        response = client.get("/products/low-rotation")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_low_rotation_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        response = client.get("/products/low-rotation")
        assert response.status_code == 403
