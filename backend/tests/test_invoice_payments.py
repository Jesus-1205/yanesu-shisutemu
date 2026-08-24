"""Tests de integración para endpoints de pagos de facturas.

Cubre:
- POST /invoices/{id}/payments (con comprobantes)
- GET /invoices/{id}/payments (list + summary)
- GET /invoices/{id}/payments/summary
- DELETE /invoices/{id}/payments/{pid}
- GET /invoices/{id}/payments/{pid}/receipts/{rid} (download)
"""
import json
from decimal import Decimal
from io import BytesIO

import pytest

_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}

_OPERATOR = {"username": "op", "email": "op@test.com", "password": "op123",
             "nombre_completo": "Op", "rol_id": 2}


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


def _create_invoice(client, sup_id, prod_id, num="F-PAY-001", total=100,
                    moneda="USD", aplica_iva=False):
    payload = {
        "proveedor_id": sup_id,
        "numero_factura": num,
        "moneda_principal": moneda,
        "tasa_bs": "36.50" if moneda == "BS" else "1.00",
        "aplica_iva": aplica_iva,
        "detalles": [{
            "producto_id": prod_id,
            "tipo_empaque": "CAJA",
            "cantidad": 1,
            "costo_unitario_usd": total,
            "costo_unitario_bs": total,
        }],
    }
    return client.post("/api/invoices", data={"data": json.dumps(payload)})


def _get_payment_method_id(client, nombre="DIVISAS"):
    for m in client.get("/api/payment-methods?solo_activos=true").json():
        if m["nombre"] == nombre:
            return m["id"]
    return 1


def _register_payment(client, invoice_id, monto_usd="50", monto_bs="0",
                      metodo_pago_id=None, files=None):
    if metodo_pago_id is None:
        metodo_pago_id = _get_payment_method_id(client)
    payment_data = {
        "metodo_pago_id": metodo_pago_id,
        "monto_usd": monto_usd,
        "monto_bs": monto_bs,
    }

    if files:
        return client.post(
            f"/api/invoices/{invoice_id}/payments",
            data={"data": json.dumps(payment_data)},
            files=files,
        )
    return client.post(
        f"/api/invoices/{invoice_id}/payments",
        data={"data": json.dumps(payment_data)},
    )


# ── TestCreatePayment ──────────────────────────────────────────────────────


class TestCreatePayment:

    def test_create_payment_success(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-CP-001", 100).json()

        resp = _register_payment(client, inv["id"], monto_usd="50")
        assert resp.status_code == 201
        data = resp.json()
        assert data["monto_usd"] == "50.00"
        assert data["factura_id"] == inv["id"]
        assert "id" in data

    def test_create_payment_unauthenticated(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-CP-UA").json()
        client.cookies.clear()

        resp = _register_payment(client, inv["id"], monto_usd="50")
        assert resp.status_code == 401

    def test_create_payment_as_operator(self, client):
        _login(client, _OPERATOR)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-CP-OP").json()

        resp = _register_payment(client, inv["id"], monto_usd="50")
        assert resp.status_code == 201

    def test_create_payment_overpayment(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-CP-OV", 100).json()

        resp = _register_payment(client, inv["id"], monto_usd="150")
        assert resp.status_code == 409

    def test_create_payment_on_already_paid(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-CP-FULL", 100).json()

        _register_payment(client, inv["id"], monto_usd="100")
        resp = _register_payment(client, inv["id"], monto_usd="10")
        assert resp.status_code == 409

    def test_create_payment_invoice_not_found(self, client):
        _login(client)
        resp = _register_payment(client, 9999, monto_usd="50")
        assert resp.status_code == 404

    def test_create_payment_inactive_method(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-CP-INA").json()

        # Get inactive method id — create one via the existing payment methods
        # The seeded methods are all active, so we test with an invalid id
        resp = _register_payment(client, inv["id"], monto_usd="50", metodo_pago_id=999)
        assert resp.status_code == 404


# ── TestCreatePaymentWithFiles ─────────────────────────────────────────────


class TestCreatePaymentWithFiles:

    def test_single_file_upload(self, client):
        """Upload a single file (UploadFile | list[UploadFile] fix)."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-FILE-001").json()

        files = [("comprobantes", ("receipt.jpg", b"fake jpeg bytes", "image/jpeg"))]
        resp = _register_payment(client, inv["id"], monto_usd="50", files=files)
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["comprobantes"]) == 1
        assert data["comprobantes"][0]["nombre_original"] == "receipt.jpg"

    def test_multiple_files_upload(self, client):
        """Upload multiple files at once."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-FILE-002").json()

        files = [
            ("comprobantes", ("receipt1.jpg", b"fake1", "image/jpeg")),
            ("comprobantes", ("receipt2.png", b"fake2", "image/png")),
        ]
        resp = _register_payment(client, inv["id"], monto_usd="50", files=files)
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["comprobantes"]) == 2

    def test_file_size_exceeds_5mb(self, client):
        """Files >5MB should be rejected."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-FILE-BIG").json()

        # 6MB file
        big_data = b"x" * (6 * 1024 * 1024)
        files = [("comprobantes", ("big.jpg", big_data, "image/jpeg"))]
        resp = _register_payment(client, inv["id"], monto_usd="50", files=files)
        assert resp.status_code == 400
        assert "supera 5MB" in resp.json()["detail"]

    def test_invalid_file_type_rejected(self, client):
        """Non-allowed file types should be rejected."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-FILE-TYPE").json()

        files = [("comprobantes", ("malware.exe", b"fake", "application/exe"))]
        resp = _register_payment(client, inv["id"], monto_usd="50", files=files)
        assert resp.status_code == 400
        assert "Tipo no soportado" in resp.json()["detail"]

    def test_pdf_file_accepted(self, client):
        """PDF files should be accepted."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-FILE-PDF").json()

        files = [("comprobantes", ("receipt.pdf", b"fake pdf", "application/pdf"))]
        resp = _register_payment(client, inv["id"], monto_usd="50", files=files)
        assert resp.status_code == 201

    def test_no_file_still_works(self, client):
        """Payment without files should succeed."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-FILE-NO").json()

        resp = _register_payment(client, inv["id"], monto_usd="50")
        assert resp.status_code == 201
        assert resp.json()["comprobantes"] == []


# ── TestListPayments ───────────────────────────────────────────────────────


class TestListPayments:

    def test_list_empty(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-LP-001").json()

        resp = client.get(f"/api/invoices/{inv['id']}/payments")
        assert resp.status_code == 200
        data = resp.json()
        assert data["pagos"] == []
        assert data["resumen"]["estado_pago"] == "PENDIENTE"
        assert data["resumen"]["cantidad_pagos"] == 0

    def test_list_with_payments(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-LP-002", 200).json()

        _register_payment(client, inv["id"], monto_usd="100")
        _register_payment(client, inv["id"], monto_usd="50")

        resp = client.get(f"/api/invoices/{inv['id']}/payments")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["pagos"]) == 2
        assert data["resumen"]["total_pagado_usd"] == "150.00"
        assert data["resumen"]["saldo_pendiente_usd"] == "50.00"
        assert data["resumen"]["cantidad_pagos"] == 2
        assert data["resumen"]["porcentaje_pagado"] == pytest.approx(75.0)

    def test_list_unauthenticated(self, client):
        resp = client.get("/api/invoices/1/payments")
        assert resp.status_code == 401


# ── TestPaymentSummary ─────────────────────────────────────────────────────


class TestPaymentSummary:

    def test_summary_basic(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-SUM-001", 100).json()

        resp = client.get(f"/api/invoices/{inv['id']}/payments/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["estado_pago"] == "PENDIENTE"
        assert data["total_factura_usd"] == "100.00"
        assert data["total_pagado_usd"] == "0.00"
        assert data["saldo_pendiente_usd"] == "100.00"

    def test_summary_after_payment(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-SUM-002", 100).json()

        _register_payment(client, inv["id"], monto_usd="40")

        resp = client.get(f"/api/invoices/{inv['id']}/payments/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["estado_pago"] == "PARCIALMENTE_PAGADA"
        assert data["total_pagado_usd"] == "40.00"
        assert data["saldo_pendiente_usd"] == "60.00"

    def test_summary_not_found(self, client):
        _login(client)
        resp = client.get("/api/invoices/9999/payments/summary")
        assert resp.status_code == 404


# ── TestDeletePayment ──────────────────────────────────────────────────────


class TestDeletePayment:

    def test_delete_payment_success(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-DP-001", 100).json()

        pay_resp = _register_payment(client, inv["id"], monto_usd="50")
        payment_id = pay_resp.json()["id"]

        resp = client.delete(f"/api/invoices/{inv['id']}/payments/{payment_id}")
        assert resp.status_code == 204

        # Verify it's gone
        list_resp = client.get(f"/api/invoices/{inv['id']}/payments")
        assert len(list_resp.json()["pagos"]) == 0

    def test_delete_payment_recalculates_status(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-DP-002", 100).json()

        _register_payment(client, inv["id"], monto_usd="100")
        # Verify PAGADA
        summary = client.get(f"/api/invoices/{inv['id']}/payments/summary").json()
        assert summary["estado_pago"] == "PAGADA"

        # Delete the payment
        list_resp = client.get(f"/api/invoices/{inv['id']}/payments")
        payment_id = list_resp.json()["pagos"][0]["id"]
        client.delete(f"/api/invoices/{inv['id']}/payments/{payment_id}")

        # Verify PENDIENTE
        summary = client.get(f"/api/invoices/{inv['id']}/payments/summary").json()
        assert summary["estado_pago"] == "PENDIENTE"

    def test_delete_nonexistent_payment(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-DP-003").json()

        resp = client.delete(f"/api/invoices/{inv['id']}/payments/9999")
        assert resp.status_code == 404

    def test_delete_payment_unauthenticated(self, client):
        resp = client.delete("/api/invoices/1/payments/1")
        assert resp.status_code == 401


# ── TestDownloadReceipt ────────────────────────────────────────────────────


class TestDownloadReceipt:

    def test_download_existing_receipt(self, client):
        """Download a receipt that exists on disk."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-RC-001").json()

        files = [("comprobantes", ("receipt.jpg", b"fake image data", "image/jpeg"))]
        pay_resp = _register_payment(client, inv["id"], monto_usd="50", files=files)
        receipt_id = pay_resp.json()["comprobantes"][0]["id"]
        payment_id = pay_resp.json()["id"]

        resp = client.get(
            f"/api/invoices/{inv['id']}/payments/{payment_id}/receipts/{receipt_id}"
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/jpeg"

    def test_download_nonexistent_receipt(self, client):
        """Receipt ID not in DB → 404."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        inv = _create_invoice(client, sup["id"], prod["id"], "F-RC-002").json()

        resp = client.get(f"/api/invoices/{inv['id']}/payments/1/receipts/9999")
        assert resp.status_code == 404
        assert "Comprobante no encontrado" in resp.json()["detail"]

    def test_download_unauthenticated(self, client):
        resp = client.get("/api/invoices/1/payments/1/receipts/1")
        assert resp.status_code == 401
