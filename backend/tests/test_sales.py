from decimal import Decimal

_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}
_OPERATOR = {"username": "op", "email": "op@test.com", "password": "op123",
             "nombre_completo": "Op", "rol_id": 2}
_PRODUCT = {"nombre": "Producto Test",
            "precio_costo_caja_usd": 120, "precio_unidad_usd": 25,
            "precio_caja_usd": 600, "stock_unidades": 100, "unidades_por_caja": 12}


def _login(client, user):
    client.post("/api/auth/register", json=user)


def _create_product(client):
    return client.post("/api/products", json=_PRODUCT)


def _get_punto_venta_id(client):
    resp = client.get("/api/payment-methods?solo_activos=true")
    methods = resp.json()
    for m in methods:
        if m["nombre"] == "PUNTO_DE_VENTA":
            return m["id"]
    return 3


def _create_sale(client, product_id, cantidad=2, unidades=2, observaciones=None):
    pv_id = _get_punto_venta_id(client)
    payload = {
        "tasa_bcv_aplicada": 50,
        "items": [{
            "producto_id": product_id,
            "tipo_empaque": "UNIDAD",
            "cantidad": cantidad,
            "unidades_descontadas": unidades,
            "precio_unitario_usd": 10,
        }],
        "pagos": [{"metodo_pago_id": pv_id, "monto_usd": 20, "monto_ves": 0}],
    }
    if observaciones is not None:
        payload["observaciones"] = observaciones
    return client.post("/api/sales", json=payload)


class TestCreateSale:

    def test_create_as_admin(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        response = _create_sale(client, prod["id"], observaciones="Venta de prueba")
        assert response.status_code == 201
        data = response.json()
        assert data["usuario_id"] is not None
        assert Decimal(str(data["tasa_bcv_aplicada"])) == Decimal("50")
        assert data["observaciones"] == "Venta de prueba"
        assert len(data["items"]) == 1
        assert "id" in data
        assert "total_usd" in data
        assert "total_ves" in data

    def test_create_as_operator(self, client):
        _login(client, _OPERATOR)
        prod = _create_product(client).json()
        response = _create_sale(client, prod["id"])
        assert response.status_code == 201

    def test_create_unauthenticated(self, client):
        response = client.post("/api/sales", json={
            "tasa_bcv_aplicada": 50, "items": [],
        })
        assert response.status_code == 401

    def test_create_product_not_found(self, client):
        _login(client, _ADMIN)
        response = _create_sale(client, product_id=999)
        assert response.status_code == 404

    def test_create_insufficient_stock(self, client):
        _login(client, _ADMIN)
        prod = client.post("/api/products", json={**_PRODUCT, "stock_unidades": 1}).json()
        response = _create_sale(client, prod["id"], cantidad=5, unidades=5)
        assert response.status_code == 409
        assert "Stock insuficiente" in response.json()["detail"]

    def test_create_empty_items(self, client):
        _login(client, _ADMIN)
        pv_id = _get_punto_venta_id(client)
        response = client.post("/api/sales", json={
            "tasa_bcv_aplicada": 50, "items": [],
            "pagos": [{"metodo_pago_id": pv_id, "monto_usd": 20, "monto_ves": 0}],
        })
        assert response.status_code == 422

    def test_create_missing_fields(self, client):
        _login(client, _ADMIN)
        response = client.post("/api/sales", json={})
        assert response.status_code == 422

    def test_create_empty_pagos(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        response = client.post("/api/sales", json={
            "tasa_bcv_aplicada": 50,
            "items": [{"producto_id": prod["id"], "tipo_empaque": "UNIDAD",
                       "cantidad": 2, "unidades_descontadas": 2, "precio_unitario_usd": 10}],
            "pagos": [],
        })
        assert response.status_code == 422

    def test_create_metodo_pago_not_found(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        response = client.post("/api/sales", json={
            "tasa_bcv_aplicada": 50,
            "items": [{"producto_id": prod["id"], "tipo_empaque": "UNIDAD",
                       "cantidad": 2, "unidades_descontadas": 2, "precio_unitario_usd": 10}],
            "pagos": [{"metodo_pago_id": 999, "monto_usd": 20, "monto_ves": 0}],
        })
        assert response.status_code == 404

    def test_create_deducts_stock(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        _create_sale(client, prod["id"], cantidad=3, unidades=3)
        updated = client.get(f"/api/products/{prod['id']}").json()
        assert updated["stock_unidades"] == 97

    def test_create_with_observaciones(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        response = _create_sale(client, prod["id"], observaciones="Cliente frecuente")
        assert response.status_code == 201
        assert response.json()["observaciones"] == "Cliente frecuente"

    def test_create_without_observaciones(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        response = _create_sale(client, prod["id"])
        assert response.status_code == 201
        assert response.json()["observaciones"] is None


class TestListSales:

    def test_list_empty(self, client):
        _login(client, _ADMIN)
        response = client.get("/api/sales")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_admin_sees_all(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        _create_sale(client, prod["id"])
        response = client.get("/api/sales")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_list_operator_sees_current_week(self, client):
        _login(client, _OPERATOR)
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        _create_sale(client, prod["id"])
        client.post("/api/auth/login", json={"username": "op", "password": "op123"})
        response = client.get("/api/sales")
        assert response.status_code == 200
        assert len(response.json()) >= 1

    def test_list_unauthenticated(self, client):
        response = client.get("/api/sales")
        assert response.status_code == 401


class TestGetSale:

    def test_get_by_id_found(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        sale_id = _create_sale(client, prod["id"]).json()["id"]
        response = client.get(f"/api/sales/{sale_id}")
        assert response.status_code == 200
        assert response.json()["id"] == sale_id
        assert len(response.json()["items"]) == 1

    def test_get_by_id_not_found(self, client):
        _login(client, _ADMIN)
        response = client.get("/api/sales/999")
        assert response.status_code == 404


class TestSalesSummary:

    def test_summary_admin(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        _create_sale(client, prod["id"])
        response = client.get("/api/sales/summary")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_summary_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        response = client.get("/api/sales/summary")
        assert response.status_code == 403


class TestTopWeek:

    def test_top_week_admin_no_sales(self, client):
        _login(client, _ADMIN)
        response = client.get("/api/sales/top-week")
        assert response.status_code == 404

    def test_top_week_admin_with_sales(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        _create_sale(client, prod["id"])
        response = client.get("/api/sales/top-week")
        assert response.status_code == 200
        data = response.json()
        assert "periodo" in data
        assert "total_ventas" in data
        assert "total_usd" in data
        assert data["total_ventas"] >= 1

    def test_top_week_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        response = client.get("/api/sales/top-week")
        assert response.status_code == 403

    def test_top_week_unauthenticated(self, client):
        response = client.get("/api/sales/top-week")
        assert response.status_code == 401


def _get_method_ids(client):
    """Returns {nombre: id} map of active payment methods."""
    resp = client.get("/api/payment-methods?solo_activos=true")
    return {m["nombre"]: m["id"] for m in resp.json()}


def _create_sale_with_method(client, product_id, method_id):
    payload = {
        "tasa_bcv_aplicada": 50,
        "items": [{
            "producto_id": product_id,
            "tipo_empaque": "UNIDAD",
            "cantidad": 1,
            "unidades_descontadas": 1,
            "precio_unitario_usd": 10,
        }],
        "pagos": [{"metodo_pago_id": method_id, "monto_usd": 10, "monto_ves": 0}],
    }
    return client.post("/api/sales", json=payload)


class TestListSalesPaymentMethodFilter:

    def test_filter_single_method(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_method_ids(client)
        _create_sale_with_method(client, prod["id"], methods["DIVISAS"])
        _create_sale_with_method(client, prod["id"], methods["EFECTIVO"])
        resp = client.get(f"/api/sales?metodo_pago_ids={methods['DIVISAS']}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["pagos"][0]["metodo_pago_id"] == methods["DIVISAS"]

    def test_filter_multiple_methods_or(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_method_ids(client)
        _create_sale_with_method(client, prod["id"], methods["DIVISAS"])
        _create_sale_with_method(client, prod["id"], methods["EFECTIVO"])
        _create_sale_with_method(client, prod["id"], methods["PAGO_MOVIL"])
        ids = f"{methods['DIVISAS']},{methods['EFECTIVO']}"
        resp = client.get(f"/api/sales?metodo_pago_ids={ids}")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_multi_method_sale_appears_for_either(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_method_ids(client)
        payload = {
            "tasa_bcv_aplicada": 50,
            "items": [{
                "producto_id": prod["id"],
                "tipo_empaque": "UNIDAD",
                "cantidad": 2,
                "unidades_descontadas": 2,
                "precio_unitario_usd": 10,
            }],
            "pagos": [
                {"metodo_pago_id": methods["DIVISAS"], "monto_usd": 10, "monto_ves": 0},
                {"metodo_pago_id": methods["EFECTIVO"], "monto_usd": 10, "monto_ves": 0},
            ],
        }
        client.post("/api/sales", json=payload)
        resp_divisa = client.get(f"/api/sales?metodo_pago_ids={methods['DIVISAS']}")
        assert len(resp_divisa.json()) == 1
        resp_efectivo = client.get(f"/api/sales?metodo_pago_ids={methods['EFECTIVO']}")
        assert len(resp_efectivo.json()) == 1

    def test_no_match_returns_empty(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_method_ids(client)
        _create_sale_with_method(client, prod["id"], methods["DIVISAS"])
        resp = client.get(f"/api/sales?metodo_pago_ids={methods['PAGO_MOVIL']}")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_filter_combined_with_dates(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_method_ids(client)
        _create_sale_with_method(client, prod["id"], methods["DIVISAS"])
        _create_sale_with_method(client, prod["id"], methods["EFECTIVO"])
        today = "2026-08-01"
        resp = client.get(f"/api/sales?metodo_pago_ids={methods['DIVISAS']}&fecha_desde={today}&fecha_hasta={today}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_empty_filter_returns_all(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_method_ids(client)
        _create_sale_with_method(client, prod["id"], methods["DIVISAS"])
        _create_sale_with_method(client, prod["id"], methods["EFECTIVO"])
        resp = client.get("/api/sales")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_filter_paginated(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_method_ids(client)
        _create_sale_with_method(client, prod["id"], methods["DIVISAS"])
        _create_sale_with_method(client, prod["id"], methods["EFECTIVO"])
        resp = client.get(f"/api/sales?metodo_pago_ids={methods['DIVISAS']}&page=1&page_size=10")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
