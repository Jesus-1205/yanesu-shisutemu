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

    def test_list_lightweight_payload_without_detalles(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-LIGHT-001")
        )})
        response = client.get("/api/invoices")
        assert response.status_code == 200
        item = response.json()["items"][0]
        assert "detalles" not in item
        assert "obsequios" not in item
        assert "total_con_iva_usd" in item
        assert "total_con_iva_bs" in item

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


# ── Tests NUEVOS: CreateInvoice - Monedas y conversiones ──────────────────


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


class TestCreateInvoiceCurrencyConversion:

    def test_create_bs_invoice_via_http(self, client):
        """Factura BS vía HTTP: conversión correcta de costos."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload_bs(sup["id"], prod["id"], "F-BS-HTTP-001",
                                       tasa_bs=36.5, costo_bs=1825)
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["moneda_principal"] == "BS"
        assert data["tasa_bs"] == "36.50"
        assert data["total_bs"] == "1825.00"
        assert data["total_usd"] == "50.00"
        assert data["detalles"][0]["costo_unitario_bs"] == "1825.00"

    def test_create_invoice_with_real_tasa(self, client):
        """Factura USD con tasa real: total_bs = total_usd * tasa."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-TASA-HTTP-001",
            "moneda_principal": "USD",
            "tasa_bs": 36.5,
            "detalles": [{
                "producto_id": prod["id"],
                "tipo_empaque": "CAJA",
                "cantidad": 2,
                "costo_unitario_usd": 50,
                "costo_unitario_bs": 1825,
            }],
        }
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["total_usd"] == "100.00"
        assert data["total_bs"] == "3650.00"

    def test_create_invoice_with_iva(self, client):
        """Factura BS + IVA vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-IVA-HTTP-001",
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
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["aplica_iva"] is True
        assert data["total_bs"] == "5000.00"

    def test_create_invoice_with_obsequios(self, client):
        """Factura con obsequios vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-OBS-HTTP-001",
            "moneda_principal": "USD",
            "tasa_bs": 1,
            "detalles": [{
                "producto_id": prod["id"],
                "tipo_empaque": "CAJA",
                "cantidad": 2,
                "costo_unitario_usd": 50,
                "costo_unitario_bs": 50,
            }],
            "obsequios": [{
                "producto_id": prod["id"],
                "tipo_empaque": "CAJA",
                "cantidad": 1,
                "justificacion": "Promoción proveedor",
            }],
        }
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["total_usd"] == "100.00"
        assert data["total_bs"] == "100.00"
        assert len(data["obsequios"]) == 1
        assert data["obsequios"][0]["cantidad"] == 1

    def test_create_invoice_with_observaciones(self, client):
        """Campo observaciones persiste vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload(sup["id"], prod["id"], "F-OBSV-HTTP-001")
        payload["observaciones"] = "Factura de prueba con observaciones"
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["observaciones"] == "Factura de prueba con observaciones"

    def test_create_invoice_with_fecha_limite_pago(self, client):
        """Campo fecha_limite_pago persiste vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload(sup["id"], prod["id"], "F-FLP-HTTP-001")
        payload["fecha_limite_pago"] = "2026-12-31"
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["fecha_limite_pago"] == "2026-12-31"

    def test_create_invoice_multiple_products(self, client):
        """Factura con múltiples productos vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod1 = client.post("/api/products", json={
            "nombre": "Producto 1",
            "precio_costo_caja_usd": 50,
            "precio_unidad_usd": 10,
            "precio_caja_usd": 120,
            "stock_unidades": 0,
            "unidades_por_caja": 12,
            "categoria_ids": [1],
        }).json()
        prod2 = client.post("/api/products", json={
            "nombre": "Producto 2",
            "precio_costo_caja_usd": 30,
            "precio_unidad_usd": 5,
            "precio_caja_usd": 60,
            "stock_unidades": 0,
            "unidades_por_caja": 12,
            "categoria_ids": [1],
        }).json()

        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-MULTI-HTTP-001",
            "moneda_principal": "USD",
            "tasa_bs": 1,
            "detalles": [
                {
                    "producto_id": prod1["id"],
                    "tipo_empaque": "CAJA",
                    "cantidad": 2,
                    "costo_unitario_usd": 50,
                    "costo_unitario_bs": 50,
                },
                {
                    "producto_id": prod2["id"],
                    "tipo_empaque": "CAJA",
                    "cantidad": 3,
                    "costo_unitario_usd": 30,
                    "costo_unitario_bs": 30,
                },
            ],
        }
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["total_usd"] == "190.00"
        assert len(data["detalles"]) == 2


# ── Tests NUEVOS: ListInvoices - Filtros y ordenamiento ───────────────────


class TestListInvoicesFiltersAndSorting:

    def test_list_filter_estado_pago(self, client):
        """Filtrar por estado_pago vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        # Crear factura PENDIENTE
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-EST-001")
        )})

        # Crear factura PAGADA
        invoice = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-EST-002")
        )}).json()
        pm = client.post("/api/payment-methods", json={
            "nombre": "Transferencia", "moneda_default": "USD",
            "acepta_referencia": True, "activo": True,
        }).json()
        client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"],
            "monto_usd": 50,
            "monto_bs": 0,
        })})

        resp = client.get("/api/invoices?estado_pago=PENDIENTE")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["numero_factura"] == "F-EST-001"

        resp = client.get("/api/invoices?estado_pago=PAGADA")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["numero_factura"] == "F-EST-002"

    def test_list_filter_fecha_desde_hasta(self, client):
        """Filtrar por rango de fechas vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        for i, fecha in enumerate(["2026-01-15", "2026-06-20", "2026-12-25"]):
            payload = _invoice_payload(sup["id"], prod["id"], f"F-FDATE-{i}")
            payload["fecha_factura"] = fecha
            client.post("/api/invoices", data={"data": json.dumps(payload)})

        resp = client.get("/api/invoices?fecha_desde=2026-03-01&fecha_hasta=2026-09-30")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["numero_factura"] == "F-FDATE-1"

    def test_list_sort_precio_desc(self, client):
        """Ordenar por precio descendente vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        for i, precio in enumerate([30, 100, 60]):
            client.post("/api/invoices", data={"data": json.dumps(
                _invoice_payload(sup["id"], prod["id"], f"F-SORTD-{i}", costo_usd=precio)
            )})

        resp = client.get("/api/invoices?sort_by=precio_desc")
        assert resp.status_code == 200
        items = resp.json()["items"]
        precios = [Decimal(item["total_usd"]) for item in items]
        assert precios == [Decimal("100.00"), Decimal("60.00"), Decimal("30.00")]

    def test_list_sort_fecha_limite_pago(self, client):
        """Ordenar por fecha_limite_pago vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        for i, fecha in enumerate(["2026-12-31", "2026-06-15", "2026-09-01"]):
            payload = _invoice_payload(sup["id"], prod["id"], f"F-SORTFLP-{i}")
            payload["fecha_limite_pago"] = fecha
            client.post("/api/invoices", data={"data": json.dumps(payload)})

        resp = client.get("/api/invoices?sort_by=fecha_limite_pago")
        assert resp.status_code == 200
        items = resp.json()["items"]
        # Primero los que tienen fecha_limite (ordenados asc), luego sin fecha
        assert items[0]["fecha_limite_pago"] == "2026-06-15"
        assert items[1]["fecha_limite_pago"] == "2026-09-01"
        assert items[2]["fecha_limite_pago"] == "2026-12-31"


# ── Tests NUEVOS: InvoiceStats ────────────────────────────────────────────


class TestInvoiceStats:

    def test_stats_endpoint(self, client):
        """GET /invoices/stats retorna conteo por estado."""
        _login(client)
        response = client.get("/api/invoices/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["pendientes"] == 0
        assert data["parciales"] == 0
        assert data["pagadas"] == 0
        assert data["total"] == 0

    def test_stats_with_mixed_statuses(self, client):
        """Stats con estados variados vía HTTP."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = client.post("/api/payment-methods", json={
            "nombre": "Transferencia", "moneda_default": "USD",
            "acepta_referencia": True, "activo": True,
        }).json()

        # PENDIENTE
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-STAT-001", costo_usd=100)
        )})

        # PAGADA
        invoice2 = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-STAT-002", costo_usd=50)
        )}).json()
        client.post(f"/api/invoices/{invoice2['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 50, "monto_bs": 0,
        })})

        # PARCIAL
        invoice3 = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-STAT-003", costo_usd=200)
        )}).json()
        client.post(f"/api/invoices/{invoice3['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"], "monto_usd": 50, "monto_bs": 0,
        })})

        resp = client.get("/api/invoices/stats")
        data = resp.json()
        assert data["pendientes"] == 1
        assert data["pagadas"] == 1
        assert data["parciales"] == 1
        assert data["total"] == 3


# ── Tests NUEVOS: TopSuppliers ────────────────────────────────────────────


class TestTopSuppliers:

    def test_top_suppliers_endpoint(self, client):
        """GET /invoices/top-suppliers retorna ranking."""
        _login(client)
        sup1 = _create_supplier(client).json()
        sup2 = client.post("/api/suppliers", json={"nombre": "Proveedor 2"}).json()
        prod = _create_product(client).json()

        # 2 facturas de sup1, 1 de sup2
        for i in range(2):
            client.post("/api/invoices", data={"data": json.dumps(
                _invoice_payload(sup1["id"], prod["id"], f"F-TOP-{i}")
            )})
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup2["id"], prod["id"], "F-TOP-2")
        )})

        resp = client.get("/api/invoices/top-suppliers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["supplier_id"] == sup1["id"]
        assert data[0]["invoice_count"] == 2
        assert data[1]["supplier_id"] == sup2["id"]
        assert data[1]["invoice_count"] == 1


# ── Tests NUEVOS: PendingSummary - BS-only payments ───────────────────────


class TestPendingSummaryExtended:

    def test_pending_summary_bs_only_payment(self, client):
        """Pago BS-only se convierte a USD en el resumen de pendientes."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        pm = client.post("/api/payment-methods", json={
            "nombre": "Transferencia", "moneda_default": "USD",
            "acepta_referencia": True, "activo": True,
        }).json()

        # Factura USD por $100, tasa=36.5
        invoice = client.post("/api/invoices", data={"data": json.dumps({
            "proveedor_id": sup["id"],
            "numero_factura": "F-PEND-BS-001",
            "moneda_principal": "USD",
            "tasa_bs": 36.5,
            "detalles": [{
                "producto_id": prod["id"],
                "tipo_empaque": "CAJA",
                "cantidad": 1,
                "costo_unitario_usd": 100,
                "costo_unitario_bs": 3650,
            }],
        })}).json()

        # Pago BS-only: 3650 BS = 100 USD
        client.post(f"/api/invoices/{invoice['id']}/payments", data={"data": json.dumps({
            "metodo_pago_id": pm["id"],
            "monto_usd": 0,
            "monto_bs": 3650,
        })})

        resp = client.get("/api/invoices/pending-summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_pendiente_usd"] == "0.00"

    def test_pending_summary_multiple_currencies(self, client):
        """Facturas en diferentes monedas se suman correctamente."""
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        # Factura USD: $100
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-MULTI-CUR-001", costo_usd=100)
        )})

        # Factura BS: 5000 BS, tasa=100, sin IVA → $50
        payload_bs = _invoice_payload_bs(sup["id"], prod["id"], "F-MULTI-CUR-002",
                                         tasa_bs=100, costo_bs=5000)
        payload_bs["aplica_iva"] = False
        client.post("/api/invoices", data={"data": json.dumps(payload_bs)})

        resp = client.get("/api/invoices/pending-summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_pendiente_usd"] == "150.00"


class TestInvoiceRouteUploadsAndAI:

    def test_analyze_endpoint_validation_and_flow(self, client):
        from unittest.mock import patch, MagicMock
        _login(client)

        # Sin archivos -> 422 o 400
        resp = client.post("/api/invoices/analyze")
        assert resp.status_code in (400, 422)

        # Archivo con tipo no soportado
        resp = client.post(
            "/api/invoices/analyze",
            files=[("files", ("test.txt", b"plain text", "text/plain"))]
        )
        assert resp.status_code == 400
        assert "Tipo de archivo no soportado" in resp.json()["detail"]

        # Archivo válido con mock
        mock_result = MagicMock()
        mock_result.model_dump.return_value = {
            "proveedor_nombre": "PROV AI",
            "numero_factura": "F-AI-01",
            "fecha_factura": "2026-05-01",
            "fecha_limite_pago": None,
            "moneda": "USD",
            "tipo_documento": "FACTURA",
            "productos": [],
            "raw_json_ia": {}
        }
        with patch("app.routes.invoices.analyze_invoice_from_image", return_value=mock_result):
            resp = client.post(
                "/api/invoices/analyze",
                files=[("files", ("factura.jpg", b"\xff\xd8\xff\xe0fakejpeg", "image/jpeg"))]
            )
            assert resp.status_code == 200

    def test_create_invoice_with_image_upload(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload(sup["id"], prod["id"], "F-IMG-001")
        resp = client.post(
            "/api/invoices",
            data={"data": json.dumps(payload), "procesada_por_ia": "true", "raw_json_ia": '{"test": 1}'},
            files={"image": ("factura.jpg", b"\xff\xd8\xff\xe0fake", "image/jpeg")}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["numero_factura"] == "F-IMG-001"

    def test_get_invoice_image_not_found(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload(sup["id"], prod["id"], "F-NO-IMG")
        inv = client.post("/api/invoices", data={"data": json.dumps(payload)}).json()

        resp = client.get(f"/api/invoices/{inv['id']}/image")
        assert resp.status_code == 404
        assert "no tiene imagen" in resp.json()["detail"]

