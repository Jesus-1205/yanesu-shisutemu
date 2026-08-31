import json
from decimal import Decimal

_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}


def _login(client, user=_ADMIN):
    client.post("/api/auth/register", json=user)


def _create_supplier(client):
    return client.post("/api/suppliers", json={"nombre": "Proveedor Test"})


def _create_product(client):
    return client.post("/api/products", json={
        "nombre": "Producto Test",
        "precio_costo_caja_usd": 120,
        "precio_unidad_usd": 25,
        "precio_caja_usd": 600,
        "stock_unidades": 100,
        "unidades_por_caja": 12,
        "categoria_ids": [1],
    })


def _create_payment_method(client):
    return client.post("/api/payment-methods", json={
        "nombre": "Transferencia",
        "moneda_default": "USD",
        "acepta_referencia": True,
        "activo": True,
    })


def _invoice_payload(sup_id, prod_id, num, tasa_bs=800, cajas=1, costo_usd=10):
    costo_bs = costo_usd * tasa_bs
    return {
        "proveedor_id": sup_id,
        "numero_factura": num,
        "moneda_principal": "USD",
        "tasa_bs": tasa_bs,
        "detalles": [{
            "producto_id": prod_id,
            "tipo_empaque": "CAJA",
            "cantidad": cajas,
            "costo_unitario_usd": costo_usd,
            "costo_unitario_bs": costo_bs,
        }],
    }


class TestPaymentWithTasaBs:

    def test_register_payment_with_new_tasa(self, client):
        """Pago con tasa diferente a la de la factura"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-TASA-001", tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 10,
            "monto_bs": 0,
            "tasa_bs": 900,
            "monto_mora": 0,
        }
        response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["monto_usd"] == "10.00"
        assert data["monto_bs"] == "9000.00"
        assert data["tasa_bs"] == "9000.00" or data["tasa_bs"] == "900.00"
        assert data["monto_mora"] == "0.00"

    def test_register_payment_without_tasa_uses_invoice_tasa(self, client):
        """Pago sin tasa usa la tasa de la factura"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-TASA-002", tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 10,
            "monto_bs": 8000,
            "monto_mora": 0,
        }
        response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["monto_usd"] == "10.00"
        assert data["monto_bs"] == "8000.00"
        assert data["tasa_bs"] == "800.00"


class TestPaymentWithMora:

    def test_register_payment_with_mora(self, client):
        """Pago con mora"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-MORA-001", tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 10,
            "monto_bs": 0,
            "tasa_bs": 900,
            "monto_mora": 500,
        }
        response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["monto_usd"] == "10.00"
        assert data["monto_bs"] == "9000.00"
        assert data["monto_mora"] == "500.00"

    def test_mora_does_not_affect_invoice_status(self, client):
        """La mora no afecta el estado de la factura"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-MORA-002", tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 10,
            "monto_bs": 0,
            "tasa_bs": 800,
            "monto_mora": 500,
        }
        response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )
        assert response.status_code == 201

        summary = client.get(f"/api/invoices/{invoice['id']}/payments/summary").json()
        assert summary["estado_pago"] == "PAGADA"
        assert summary["total_mora_bs"] == "500.00"


class TestDiferenciaCambiaria:

    def test_diferencia_cambiaria_calculation(self, client):
        """Cálculo de diferencia cambiaria"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-DIF-001", tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 10,
            "monto_bs": 0,
            "tasa_bs": 900,
            "monto_mora": 0,
        }
        payment_response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )

        summary_response = client.get(f"/api/invoices/{invoice['id']}/payments/summary")
        summary = summary_response.json()
        assert summary["diferencia_cambiaria_bs"] == "1000.00"

    def test_diferencia_cambiaria_with_partial_payments(self, client):
        """Diferencia cambiaria con abonos parciales"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-DIF-002", tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment1 = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 5,
            "monto_bs": 0,
            "tasa_bs": 850,
            "monto_mora": 0,
        }
        resp1 = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment1)},
        )

        payment2 = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 5,
            "monto_bs": 0,
            "tasa_bs": 900,
            "monto_mora": 0,
        }
        resp2 = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment2)},
        )

        summary = client.get(f"/api/invoices/{invoice['id']}/payments/summary").json()
        expected_diferencia = Decimal("4250") + Decimal("4500") - (Decimal("10") * Decimal("800"))
        assert summary["diferencia_cambiaria_bs"] == str(expected_diferencia.quantize(Decimal("0.01")))

    def test_diferencia_cambiaria_zero_when_same_rate(self, client):
        """Diferencia cambiaria es 0 cuando la tasa es la misma"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-DIF-003", tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 10,
            "monto_bs": 0,
            "tasa_bs": 800,
            "monto_mora": 0,
        }
        client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )

        summary = client.get(f"/api/invoices/{invoice['id']}/payments/summary").json()
        assert summary["diferencia_cambiaria_bs"] == "0.00"


# ── Tests NUEVOS: Pagos con diferentes monedas ────────────────────────────


class TestPaymentCurrencyCombinations:

    def test_payment_bs_only(self, client):
        """Pago solo en BS (monto_usd=0) vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-BS-ONLY-001",
                             tasa_bs=800, cajas=1, costo_usd=10)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 0,
            "monto_bs": 8000,
            "monto_mora": 0,
        }
        response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["monto_usd"] == "0.00"
        assert data["monto_bs"] == "8000.00"

    def test_payment_mixed_usd_bs(self, client):
        """Pago mixto USD+BS vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-MIXED-001",
                             tasa_bs=1, cajas=1, costo_usd=100)
        )}).json()

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 50,
            "monto_bs": 50,
            "monto_mora": 0,
        }
        response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["monto_usd"] == "50.00"
        assert data["monto_bs"] == "50.00"


class TestPaymentOnBsInvoice:

    def test_payment_on_bs_invoice(self, client):
        """Pago sobre factura BS vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload_bs(sup["id"], prod["id"], "F-BS-PAY-001",
                                 tasa_bs=100, costo_bs=5000)
        )}).json()
        assert invoice["moneda_principal"] == "BS"

        payment_data = {
            "metodo_pago_id": pm["id"],
            "monto_usd": 25,
            "monto_bs": 0,
            "monto_mora": 0,
        }
        response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps(payment_data)},
        )
        assert response.status_code == 201

    def test_payment_summary_bs_invoice(self, client):
        """Summary de factura BS con IVA vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps({
            "proveedor_id": sup["id"],
            "numero_factura": "F-BS-SUM-001",
            "moneda_principal": "BS",
            "tasa_bs": 100,
            "aplica_iva": True,
            "detalles": [{
                "producto_id": prod["id"],
                "tipo_empaque": "CAJA",
                "cantidad": 1,
                "costo_unitario_usd": 50,
                "costo_unitario_bs": 5000,
                "tipo_iva": "GRAVADO",
            }],
        })}).json()

        # Pago parcial
        client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"],
            "monto_usd": 29,
            "monto_bs": 0,
            "monto_mora": 0,
        })})

        summary = client.get(f"/api/invoices/{invoice['id']}/payments/summary").json()
        # total_bs=5000, IVA=800, total=5800, USD=58.00
        assert summary["total_factura_bs"] == "5800.00"
        assert summary["total_factura_usd"] == "58.00"
        assert summary["total_pagado_usd"] == "29.00"
        assert summary["saldo_pendiente_usd"] == "29.00"


def _invoice_payload_bs(sup_id, prod_id, num, tasa_bs=36.5, cajas=1, costo_bs=1825):
    costo_usd = round(costo_bs / tasa_bs, 2)
    return {
        "proveedor_id": sup_id,
        "numero_factura": num,
        "moneda_principal": "BS",
        "tasa_bs": tasa_bs,
        "detalles": [{
            "producto_id": prod_id,
            "tipo_empaque": "CAJA",
            "cantidad": cajas,
            "costo_unitario_usd": costo_usd,
            "costo_unitario_bs": costo_bs,
        }],
    }
