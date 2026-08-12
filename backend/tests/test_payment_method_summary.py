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


def _payment_method_id(client, nombre):
    resp = client.get("/api/payment-methods?solo_activos=true")
    for m in resp.json():
        if m["nombre"] == nombre:
            return m["id"]
    return None


def _create_product(client):
    return client.post("/api/products", json=_PRODUCT)


def _create_sale(client, product_id, metodo_pago_id, monto_usd=0, monto_ves=0):
    return client.post("/api/sales", json={
        "tasa_bcv_aplicada": 50,
        "monto_exento_usd": 0,
        "base_imponible_usd": 20,
        "monto_iva_usd": 3.2,
        "items": [{
            "producto_id": product_id,
            "tipo_empaque": "UNIDAD",
            "cantidad": 2,
            "unidades_descontadas": 2,
            "precio_unitario_usd": 10,
        }],
        "pagos": [{"metodo_pago_id": metodo_pago_id, "monto_usd": monto_usd, "monto_ves": monto_ves}],
    })


class TestPaymentMethodSummary:

    def test_empty_returns_all_active_methods_with_zero(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/reports/payment-methods")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 4
        assert all(item["cantidad_pagos"] == 0 for item in data)
        assert all(Decimal(item["total_usd"]) == 0 for item in data)
        assert all(Decimal(item["total_ves"]) == 0 for item in data)
        assert all(Decimal(item["total_equivalente_usd"]) == 0 for item in data)

    def test_aggregates_totals_per_method(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        divisas_id = _payment_method_id(client, "DIVISAS")
        efectivo_id = _payment_method_id(client, "EFECTIVO")
        assert divisas_id is not None
        assert efectivo_id is not None
        _create_sale(client, prod["id"], divisas_id, monto_usd=100, monto_ves=0)
        _create_sale(client, prod["id"], divisas_id, monto_usd=50, monto_ves=0)
        _create_sale(client, prod["id"], efectivo_id, monto_usd=0, monto_ves=2000)

        resp = client.get("/api/reports/payment-methods")
        assert resp.status_code == 200
        data = {d["metodo_pago_nombre"]: d for d in resp.json()}
        assert data["DIVISAS"]["cantidad_pagos"] == 2
        assert Decimal(data["DIVISAS"]["total_usd"]) == Decimal("150.00")
        assert Decimal(data["DIVISAS"]["total_ves"]) == 0
        assert Decimal(data["DIVISAS"]["total_equivalente_usd"]) == Decimal("150.00")
        assert data["EFECTIVO"]["cantidad_pagos"] == 1
        assert Decimal(data["EFECTIVO"]["total_ves"]) == Decimal("2000.00")
        assert Decimal(data["EFECTIVO"]["total_usd"]) == 0
        # 2000 Bs a tasa 50 -> 40 USD equivalentes
        assert Decimal(data["EFECTIVO"]["total_equivalente_usd"]) == Decimal("40.00")

    def test_ves_payment_on_usd_method_counts_equivalent(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        divisas_id = _payment_method_id(client, "DIVISAS")
        assert divisas_id is not None
        # Pago en Bs (monto_usd=0) registrado en un método USD
        _create_sale(client, prod["id"], divisas_id, monto_usd=0, monto_ves=5000)

        resp = client.get("/api/reports/payment-methods")
        assert resp.status_code == 200
        data = {d["metodo_pago_nombre"]: d for d in resp.json()}
        assert data["DIVISAS"]["cantidad_pagos"] == 1
        assert Decimal(data["DIVISAS"]["total_usd"]) == 0
        assert Decimal(data["DIVISAS"]["total_ves"]) == Decimal("5000.00")
        # 5000 Bs a tasa 50 -> 100 USD equivalentes
        assert Decimal(data["DIVISAS"]["total_equivalente_usd"]) == Decimal("100.00")

    def test_date_filter_excludes_outside_range(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        divisas_id = _payment_method_id(client, "DIVISAS")
        assert divisas_id is not None
        _create_sale(client, prod["id"], divisas_id, monto_usd=100, monto_ves=0)

        resp = client.get("/api/reports/payment-methods", params={
            "fecha_desde": "2999-01-01",
            "fecha_hasta": "2999-12-31",
        })
        assert resp.status_code == 200
        data = {d["metodo_pago_nombre"]: d for d in resp.json()}
        assert data["DIVISAS"]["cantidad_pagos"] == 0
        assert Decimal(data["DIVISAS"]["total_usd"]) == 0

    def test_operator_forbidden(self, client):
        _login(client, _OPERATOR)
        resp = client.get("/api/reports/payment-methods")
        assert resp.status_code == 403

    def test_unauthenticated(self, client):
        resp = client.get("/api/reports/payment-methods")
        assert resp.status_code == 401
