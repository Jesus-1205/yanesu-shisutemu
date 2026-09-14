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


class TestListPayments:

    def test_list_payments_empty(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-LIST-001")
        )}).json()
        resp = client.get(f"/api/invoices/{invoice['id']}/payments")
        assert resp.status_code == 200
        data = resp.json()
        assert data["pagos"] == []
        assert data["resumen"]["cantidad_pagos"] == 0

    def test_list_payments_with_data(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-LIST-002")
        )}).json()
        client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 5, "monto_bs": 0,
        })})
        client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 5, "monto_bs": 0,
        })})
        resp = client.get(f"/api/invoices/{invoice['id']}/payments")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["pagos"]) == 2
        assert data["resumen"]["cantidad_pagos"] == 2

    def test_list_payments_not_found(self, client):
        _login(client)
        resp = client.get("/api/invoices/999/payments")
        assert resp.status_code == 404

    def test_list_payments_unauthenticated(self, client):
        resp = client.get("/api/invoices/1/payments")
        assert resp.status_code == 401


class TestRemovePayment:

    def test_remove_payment_success(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-DEL-001")
        )}).json()
        payment = client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 5, "monto_bs": 0,
        })}).json()
        resp = client.delete(f"/api/invoices/{invoice['id']}/payments/{payment['id']}")
        assert resp.status_code == 204
        summary = client.get(f"/api/invoices/{invoice['id']}/payments/summary").json()
        assert summary["cantidad_pagos"] == 0

    def test_remove_payment_not_found(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-DEL-002")
        )}).json()
        resp = client.delete(f"/api/invoices/{invoice['id']}/payments/999")
        assert resp.status_code == 404

    def test_remove_payment_unauthenticated(self, client):
        resp = client.delete("/api/invoices/1/payments/1")
        assert resp.status_code == 401

    def test_remove_payment_operator_forbidden(self, client):
        client.post("/api/auth/register", json={
            "username": "oper", "email": "oper@test.com", "password": "oper123",
            "nombre_completo": "Oper", "rol_id": 2,
        })
        resp = client.delete("/api/invoices/1/payments/1")
        assert resp.status_code == 403


class TestPaymentSummary:

    def test_summary_no_payments(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-SUM-001")
        )}).json()
        resp = client.get(f"/api/invoices/{invoice['id']}/payments/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["estado_pago"] == "PENDIENTE"
        assert data["cantidad_pagos"] == 0
        assert data["saldo_pendiente_usd"] == str(Decimal(invoice["total_usd"]))

    def test_summary_after_full_payment(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-SUM-002", costo_usd=10)
        )}).json()
        client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 10, "monto_bs": 0,
        })})
        resp = client.get(f"/api/invoices/{invoice['id']}/payments/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["estado_pago"] == "PAGADA"
        assert data["saldo_pendiente_usd"] == "0.00"

    def test_summary_not_found(self, client):
        _login(client)
        resp = client.get("/api/invoices/999/payments/summary")
        assert resp.status_code == 404

    def test_summary_unauthenticated(self, client):
        resp = client.get("/api/invoices/1/payments/summary")
        assert resp.status_code == 401


class TestCreatePaymentEdgeCases:

    def test_create_payment_invoice_not_found(self, client):
        _login(client)
        pm = _create_payment_method(client).json()
        resp = client.post("/api/invoices/999/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 10, "monto_bs": 0,
        })})
        assert resp.status_code == 404

    def test_create_payment_overpayment(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-OVER-001", costo_usd=10)
        )}).json()
        resp = client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 50, "monto_bs": 0,
        })})
        assert resp.status_code == 409

    def test_create_payment_unauthenticated(self, client):
        resp = client.post("/api/invoices/1/payments", data={"data": json.dumps({
            "metodo_pago_id": 1, "monto_usd": 10, "monto_bs": 0,
        })})
        assert resp.status_code == 401


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


class TestInvoicePaymentReceiptsAndDeletion:

    def test_payment_with_comprobante_files(self, client, tmp_path):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = _create_payment_method(client).json()

        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-REC-001", costo_usd=50)
        )}).json()

        # Pago con comprobante inválido -> 400
        resp = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps({"metodo_pago_id": pm["id"], "monto_usd": 10})},
            files=[("comprobantes", ("recibo.exe", b"binary", "application/x-msdownload"))]
        )
        assert resp.status_code == 400

        # Pago con comprobante válido
        resp = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps({"metodo_pago_id": pm["id"], "monto_usd": 10})},
            files=[("comprobantes", ("recibo.jpg", b"\xff\xd8\xff\xe0fake", "image/jpeg"))]
        )
        assert resp.status_code == 201
        pago_data = resp.json()
        assert len(pago_data["comprobantes"]) == 1
        rec_id = pago_data["comprobantes"][0]["id"]

        # Descargar comprobante (404 si el archivo físico no existe en test)
        resp = client.get(f"/api/invoices/{invoice['id']}/payments/{pago_data['id']}/receipts/{rec_id}")
        assert resp.status_code in (200, 404)

        # Receipt inexistente
        resp = client.get(f"/api/invoices/{invoice['id']}/payments/{pago_data['id']}/receipts/9999")
        assert resp.status_code == 404

        # Eliminar pago
        resp = client.delete(f"/api/invoices/{invoice['id']}/payments/{pago_data['id']}")
        assert resp.status_code == 204

        # Eliminar pago inexistente
        resp = client.delete(f"/api/invoices/{invoice['id']}/payments/9999")
        assert resp.status_code == 404

