from decimal import Decimal

import pytest


_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}
_PRODUCT = {"nombre": "Test", "precio_costo_caja_usd": 100,
            "precio_unidad_usd": 25, "precio_caja_usd": 500}


def _login(client, user):
    client.post("/api/auth/register", json=user)


def _create_product(client, **overrides):
    data = {**_PRODUCT}
    data.update(overrides)
    return client.post("/api/products", json=data)


def _get_pv_id(client):
    for m in client.get("/api/payment-methods?solo_activos=true").json():
        if m["nombre"] == "PUNTO_DE_VENTA":
            return m["id"]
    return 3


def _create_sale(client, product_id, precio_unitario=10, cantidad=2, unidades=2):
    pv_id = _get_pv_id(client)
    base = Decimal(str(precio_unitario)) * cantidad
    iva = (base * Decimal("16") / Decimal("100")).quantize(Decimal("0.01"))
    total = base + iva
    return client.post("/api/sales", json={
        "tasa_bcv_aplicada": 50,
        "monto_exento_usd": 0,
        "base_imponible_usd": float(base),
        "monto_iva_usd": float(iva),
        "items": [{
            "producto_id": product_id,
            "tipo_empaque": "UNIDAD",
            "cantidad": cantidad,
            "unidades_descontadas": unidades,
            "precio_unitario_usd": precio_unitario,
        }],
        "pagos": [{"metodo_pago_id": pv_id, "monto_usd": float(total), "monto_ves": 0}],
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
        resp = client.put(f"/api/products/{created['id']}",
                          json={"precio_unidad_usd": 99.99})
        assert resp.status_code == 200
        assert resp.json()["precio_unidad_usd"] == "99.99"

    def test_update_price_rejects_four_decimals(self, client):
        _login(client, _ADMIN)
        created = _create_product(client).json()
        resp = client.put(f"/api/products/{created['id']}",
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
        resp = client.post("/api/exchange-rates/save-rates", json={
            "usd": 90.50, "eur": 98.00,
        })
        assert resp.status_code == 201
        assert resp.json()["tasa_usd"] == "90.5000"

    def test_tasa_ves_preserves_precision(self, client):
        _login(client, _ADMIN)
        resp = client.post("/api/exchange-rates/save-rates", json={
            "usd": 36.1234, "eur": 39.5678,
        })
        assert resp.status_code == 201
        assert resp.json()["tasa_usd"] == "36.1234"


class TestAggregationPrecision:
    """Verifica que las agregaciones SQL (func.sum) mantengan exactamente 2 decimales sin ruido binario."""

    def test_invoice_payment_summary_aggregation_precision(self, client):
        import json
        _login(client, _ADMIN)
        sup = client.post("/api/suppliers", json={"nombre": "Sup Dec"}).json()
        prod = client.post("/api/products", json={
            "nombre": "Prod Dec",
            "precio_costo_caja_usd": 100,
            "precio_unidad_usd": 10,
            "precio_caja_usd": 100,
            "stock_unidades": 100,
        }).json()
        pm = client.post("/api/payment-methods", json={
            "nombre": "PM Dec",
            "moneda_default": "USD",
            "acepta_referencia": False,
            "activo": True,
        }).json()

        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "INV-DEC-001",
            "moneda_principal": "USD",
            "tasa_bs": 100.00,
            "detalles": [{
                "producto_id": prod["id"],
                "tipo_empaque": "UNIDAD",
                "cantidad": 10,
                "costo_unitario_usd": 10.00,
                "costo_unitario_bs": 1000.00,
            }],
        }
        inv = client.post("/api/invoices", data={"data": json.dumps(payload)}).json()

        # Registrar 3 pagos con fracciones que en float binario generan ruido: 33.33 + 33.33 + 33.34 = 100.00
        client.post(f"/api/invoices/{inv['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"],
            "monto_usd": 33.33,
            "monto_bs": 0,
        })})
        client.post(f"/api/invoices/{inv['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"],
            "monto_usd": 33.33,
            "monto_bs": 0,
        })})
        client.post(f"/api/invoices/{inv['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"],
            "monto_usd": 33.34,
            "monto_bs": 0,
        })})

        summary_resp = client.get(f"/api/invoices/{inv['id']}/payments/summary")
        assert summary_resp.status_code == 200
        data = summary_resp.json()

        # Verificar que ningún campo monetario tenga más de 2 decimales o ruido de punto flotante
        for key in ["total_factura_usd", "total_factura_bs", "total_pagado_usd", "total_pagado_bs",
                    "total_mora_bs", "diferencia_cambiaria_bs", "saldo_pendiente_usd", "saldo_pendiente_bs"]:
            val_str = str(data[key])
            if "." in val_str:
                decimals = len(val_str.split(".")[1])
                assert decimals <= 2, f"Campo {key} tiene {decimals} decimales: {val_str}"

        assert data["total_pagado_usd"] == "100.00"
        assert data["saldo_pendiente_usd"] == "0.00"

    def test_category_analytics_aggregation_precision(self, client):
        _login(client, _ADMIN)
        cat = client.post("/api/categories", json={"nombre": "Cat Dec Precision"}).json()
        prod = client.post("/api/products", json={
            "nombre": "Prod Cat Dec",
            "precio_costo_caja_usd": 10,
            "precio_unidad_usd": 10.33,
            "precio_caja_usd": 100,
            "stock_unidades": 100,
            "categoria_ids": [cat["id"]],
        }).json()

        # Crear 3 ventas usando el helper _create_sale
        for _ in range(3):
            resp = _create_sale(client, prod["id"], precio_unitario=10.33, cantidad=1, unidades=1)
            assert resp.status_code == 201

        analytics_resp = client.get("/api/categories/analytics")
        assert analytics_resp.status_code == 200
        data = analytics_resp.json()
        
        target_cat = next((c for c in data["categorias"] if c["id"] == cat["id"]), None)
        assert target_cat is not None
        
        val_str = str(target_cat["ingresos_usd"])
        if "." in val_str:
            decimals = len(val_str.split(".")[1])
            assert decimals <= 2, f"ingresos_usd tiene {decimals} decimales: {val_str}"
        assert target_cat["ingresos_usd"] == "30.99"

