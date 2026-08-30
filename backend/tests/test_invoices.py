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


def _invoice_payload(sup_id, prod_id, num, cajas=1, costo_usd=50, costo_bs=50):
    return {
        "proveedor_id": sup_id,
        "numero_factura": num,
        "moneda_principal": "USD",
        "tasa_bs": 1,
        "detalles": [{
            "producto_id": prod_id,
            "tipo_empaque": "CAJA",
            "cantidad": cajas,
            "costo_unitario_usd": costo_usd,
            "costo_unitario_bs": costo_bs,
        }],
    }


class TestCreateInvoice:

    def test_create_as_admin(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload(sup["id"], prod["id"], "F-TEST-001", cajas=2, costo_usd=60, costo_bs=60)
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["numero_factura"] == "F-TEST-001"
        assert data["proveedor_id"] == sup["id"]
        assert data["moneda_principal"] == "USD"
        assert data["tasa_bs"] == "1.00"
        assert data["total_usd"] == "120.00"
        assert data["total_bs"] == "120.00"
        assert len(data["detalles"]) == 1
        assert data["detalles"][0]["costo_unitario_bs"] == "60.00"
        assert "supplier" in data

    def test_create_unauthenticated(self, client):
        payload = {
            "proveedor_id": 1,
            "numero_factura": "F-UNAUTH",
            "moneda_principal": "USD",
            "tasa_bs": 1,
            "detalles": [],
        }
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 401

    def test_create_duplicate(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        payload = _invoice_payload(sup["id"], prod["id"], "F-DUP")
        client.post("/api/invoices", data={"data": json.dumps(payload)})
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 409

    def test_create_product_not_found(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-NF",
            "moneda_principal": "USD",
            "tasa_bs": 1,
            "detalles": [{"producto_id": 999, "tipo_empaque": "CAJA", "cantidad": 1, "costo_unitario_usd": 50, "costo_unitario_bs": 50}],
        }
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 404

    def test_create_invoice_with_tipo_documento(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload(sup["id"], prod["id"], "F-TIPO-001")
        payload["tipo_documento"] = "NOTA_ENTREGA"

        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["tipo_documento"] == "NOTA_ENTREGA"
        assert data["numero_factura"] == "F-TIPO-001"

    def test_create_invoice_default_tipo_documento(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        # No tipo_documento in payload — should default to "FACTURA"
        payload = _invoice_payload(sup["id"], prod["id"], "F-DEFAULT-001")

        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["tipo_documento"] == "FACTURA"


class TestListInvoices:

    def test_list_empty(self, client):
        _login(client)
        response = client.get("/api/invoices")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_pagination(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        for i in range(3):
            client.post("/api/invoices", data={"data": json.dumps(
                _invoice_payload(sup["id"], prod["id"], f"F-{i:03d}")
            )})
        response = client.get("/api/invoices?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3

    def test_list_filter_proveedor(self, client):
        _login(client)
        sup1 = _create_supplier(client).json()
        sup2 = client.post("/api/suppliers", json={"nombre": "Otro"}).json()
        prod = _create_product(client).json()
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup1["id"], prod["id"], "F-A")
        )})
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup2["id"], prod["id"], "F-B")
        )})
        response = client.get(f"/api/invoices?proveedor_id={sup1['id']}")
        assert len(response.json()["items"]) == 1

    def test_list_filter_tipo_documento(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        # Create one FACTURA and one NOTA_ENTREGA
        payload_factura = _invoice_payload(sup["id"], prod["id"], "F-FILT-001")
        client.post("/api/invoices", data={"data": json.dumps(payload_factura)})

        payload_nota = _invoice_payload(sup["id"], prod["id"], "F-FILT-002")
        payload_nota["tipo_documento"] = "NOTA_ENTREGA"
        client.post("/api/invoices", data={"data": json.dumps(payload_nota)})

        # Filter by FACTURA
        resp = client.get("/api/invoices?tipo_documento=FACTURA")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["tipo_documento"] == "FACTURA"

        # Filter by NOTA_ENTREGA
        resp = client.get("/api/invoices?tipo_documento=NOTA_ENTREGA")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["tipo_documento"] == "NOTA_ENTREGA"

        # No filter — should return both
        resp = client.get("/api/invoices")
        assert resp.status_code == 200
        assert resp.json()["total"] == 2


class TestGetInvoice:

    def test_get_by_id(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        created = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-GET", cajas=2, costo_usd=55, costo_bs=55)
        )}).json()

        response = client.get(f"/api/invoices/{created['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created["id"]
        assert data["moneda_principal"] == "USD"
        assert data["total_usd"] == "110.00"
        assert data["total_bs"] == "110.00"
        assert data["supplier"]["nombre"] == "Proveedor Test"
        assert len(data["detalles"]) == 1
        assert data["detalles"][0]["product"]["nombre"] == "Producto Test"
        assert data["detalles"][0]["costo_unitario_bs"] == "55.00"

    def test_get_by_id_not_found(self, client):
        _login(client)
        response = client.get("/api/invoices/999")
        assert response.status_code == 404


class TestAnalyzeInvoice:
    def test_analyze_unauthenticated(self, client):
        response = client.post("/api/invoices/analyze", files={"files": ("test.jpg", b"fake", "image/jpeg")})
        assert response.status_code == 401

    def test_analyze_empty_files(self, client):
        _login(client)
        response = client.post("/api/invoices/analyze")
        assert response.status_code == 422

    def test_analyze_invalid_file_type(self, client):
        _login(client)
        response = client.post(
            "/api/invoices/analyze",
            files={"files": ("test.exe", b"fake", "application/exe")},
        )
        assert response.status_code == 400


class TestPendingSummary:

    def test_pending_summary_unauthenticated(self, client):
        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 401

    def test_pending_summary_empty(self, client):
        _login(client)
        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_pendiente_usd"] == "0.00"

    def test_pending_summary_single_pending_invoice(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-PEND-001", cajas=2, costo_usd=50, costo_bs=50)
        )})

        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 200
        data = response.json()
        # 2 cajas * $50 = $100 total, no IVA (USD), no payments
        assert data["total_pendiente_usd"] == "100.00"

    def test_pending_summary_excludes_paid_invoices(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = client.post("/api/payment-methods", json={
            "nombre": "Transferencia", "moneda_default": "USD",
            "acepta_referencia": True, "activo": True,
        }).json()

        # Create invoice for $100
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-PAID-001", cajas=2, costo_usd=50, costo_bs=50)
        )}).json()

        # Pay it in full
        client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps({
                "metodo_pago_id": pm["id"],
                "monto_usd": 100,
                "monto_bs": 0,
            })},
        )

        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_pendiente_usd"] == "0.00"

    def test_pending_summary_partial_payment(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = client.post("/api/payment-methods", json={
            "nombre": "Transferencia", "moneda_default": "USD",
            "acepta_referencia": True, "activo": True,
        }).json()

        # Create invoice for $100
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-PARTIAL-001", cajas=2, costo_usd=50, costo_bs=50)
        )}).json()

        # Pay $40
        client.post(
            f"/api/invoices/{invoice['id']}/payments",
            data={"data": json.dumps({
                "metodo_pago_id": pm["id"],
                "monto_usd": 40,
                "monto_bs": 0,
            })},
        )

        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 200
        data = response.json()
        # $100 total - $40 paid = $60 pending
        assert data["total_pendiente_usd"] == "60.00"

    def test_pending_summary_multiple_invoices(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        # Two pending invoices: $100 + $200
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-MULTI-001", cajas=2, costo_usd=50, costo_bs=50)
        )})
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-MULTI-002", cajas=4, costo_usd=50, costo_bs=50)
        )})

        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_pendiente_usd"] == "300.00"

    def test_pending_summary_iva_calculation_bs(self, client):
        """IVA solo aplica en BS con aplica_iva=True"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-IVA-001",
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
        }
        client.post("/api/invoices", data={"data": json.dumps(payload)})

        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 200
        data = response.json()
        # base_bs=5000, iva=800 (16%), total_bs=5800, total_usd=5800/100=58.00
        assert data["total_pendiente_usd"] == "58.00"

    def test_pending_summary_iva_exento_bs(self, client):
        """Items EXENTOS no generan IVA"""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-EXENTO-001",
            "moneda_principal": "BS",
            "tasa_bs": 100,
            "aplica_iva": True,
            "detalles": [{
                "producto_id": prod["id"],
                "tipo_empaque": "CAJA",
                "cantidad": 1,
                "costo_unitario_usd": 50,
                "costo_unitario_bs": 5000,
                "tipo_iva": "EXENTO",
            }],
        }
        client.post("/api/invoices", data={"data": json.dumps(payload)})

        response = client.get("/api/invoices/pending-summary")
        assert response.status_code == 200
        data = response.json()
        # EXENTO: no IVA, total_bs=5000, total_usd=5000/100=50.00
        assert data["total_pendiente_usd"] == "50.00"
