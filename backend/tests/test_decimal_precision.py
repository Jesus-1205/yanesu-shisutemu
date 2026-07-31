from decimal import Decimal

import pytest


_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}
_PRODUCT = {"nombre": "Test", "precio_costo_caja_usd": 100,
            "precio_unidad_usd": 25, "precio_caja_usd": 500}


def _login(client, user):
    client.post("/auth/register", json=user)


def _create_product(client, **overrides):
    data = {**_PRODUCT}
    data.update(overrides)
    return client.post("/products", json=data)


def _get_pv_id(client):
    for m in client.get("/payment-methods?solo_activos=true").json():
        if m["nombre"] == "PUNTO_DE_VENTA":
            return m["id"]
    return 3


def _create_sale(client, product_id, precio_unitario=10, cantidad=2, unidades=2):
    pv_id = _get_pv_id(client)
    return client.post("/sales", json={
        "tasa_bcv_aplicada": 50,
        "items": [{
            "producto_id": product_id,
            "tipo_empaque": "UNIDAD",
            "cantidad": cantidad,
            "unidades_descontadas": unidades,
            "precio_unitario_usd": precio_unitario,
        }],
        "pagos": [{"metodo_pago_id": pv_id, "monto_usd": precio_unitario * cantidad, "monto_ves": 0}],
    })


class TestProductPriceDecimals:
    """Verifica que los precios de producto se almacenan y devuelven con 2 decimales."""

    def test_precio_unidad_two_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_unidad_usd=25.50, precio_caja_usd=500)
        assert resp.status_code == 201
        assert resp.json()["precio_unidad_usd"] == "25.50"

    def test_precio_caja_two_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_unidad_usd=25, precio_caja_usd=500.75)
        assert resp.status_code == 201
        assert resp.json()["precio_caja_usd"] == "500.75"

    def test_precio_unidad_rejects_four_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_unidad_usd=25.1234, precio_caja_usd=500)
        assert resp.status_code == 422

    def test_precio_caja_rejects_four_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_unidad_usd=25, precio_caja_usd=500.5678)
        assert resp.status_code == 422

    def test_precio_unidad_integer_stored_as_two_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_unidad_usd=30, precio_caja_usd=500)
        assert resp.status_code == 201
        assert resp.json()["precio_unidad_usd"] == "30.00"

    def test_precio_caja_integer_stored_as_two_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_unidad_usd=25, precio_caja_usd=600)
        assert resp.status_code == 201
        assert resp.json()["precio_caja_usd"] == "600.00"

    def test_update_price_two_decimals(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        resp = client.put(f"/products/{created['id']}",
                          json={"precio_unidad_usd": 99.99})
        assert resp.status_code == 200
        assert resp.json()["precio_unidad_usd"] == "99.99"

    def test_update_price_rejects_four_decimals(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        resp = client.put(f"/products/{created['id']}",
                          json={"precio_unidad_usd": 99.9999})
        assert resp.status_code == 422

    def test_precio_sugerido_unidad_two_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_costo_caja_usd=70,
                               precio_unidad_usd=25, precio_caja_usd=500)
        assert resp.status_code == 201
        parts = resp.json()["precio_sugerido_unidad_usd"].split(".")
        assert len(parts[1]) == 2

    def test_precio_sugerido_caja_two_decimals(self, client):
        _login(client, _ADMIN)
        resp = _create_product(client, precio_costo_caja_usd=70,
                               precio_unidad_usd=25, precio_caja_usd=500)
        assert resp.status_code == 201
        parts = resp.json()["precio_sugerido_caja_usd"].split(".")
        assert len(parts[1]) == 2


class TestSalePriceDecimals:
    """Verifica que el precio unitario de venta se almacena con 2 decimales."""

    def test_sale_item_price_two_decimals(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client, precio_unidad_usd=10.50,
                               precio_caja_usd=250, stock_unidades=100).json()
        resp = _create_sale(client, prod["id"], precio_unitario=10.50)
        assert resp.status_code == 201
        assert resp.json()["items"][0]["precio_unitario_usd"] == "10.50"

    def test_sale_item_price_rejects_four_decimals(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client, precio_unidad_usd=10,
                               precio_caja_usd=250, stock_unidades=100).json()
        resp = _create_sale(client, prod["id"], precio_unitario=10.1234)
        assert resp.status_code == 422

    def test_sale_item_price_integer_two_decimals(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client, precio_unidad_usd=15,
                               precio_caja_usd=250, stock_unidades=100).json()
        resp = _create_sale(client, prod["id"], precio_unitario=15)
        assert resp.status_code == 201
        assert resp.json()["items"][0]["precio_unitario_usd"] == "15.00"


class TestExchangeRateDecimals:
    """Verifica que las tasas de cambio se mantienen en 4 decimales."""

    def test_tasa_ves_four_decimals(self, client):
        _login(client, _ADMIN)
        resp = client.post("/exchange-rates", json={
            "moneda": "USD", "tasa_ves": 90.50,
        })
        assert resp.status_code == 201
        assert resp.json()["tasa_ves"] == "90.5000"

    def test_tasa_ves_preserves_precision(self, client):
        _login(client, _ADMIN)
        resp = client.post("/exchange-rates", json={
            "moneda": "USD", "tasa_ves": 36.1234,
        })
        assert resp.status_code == 201
        assert resp.json()["tasa_ves"] == "36.1234"
